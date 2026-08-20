#!/usr/bin/env node
// Writes public/__moderaty_commit.txt with the exact commit SHA that produced
// this build. The CI purge workflow (.github/workflows/bunny-purge.yml) polls
// that file at the origin until it returns the pushed commit — i.e. the new
// code is actually serving — and only then purges the Bunny CDN cache. The
// odd path is deliberate: it is a tooling endpoint, not site content.
//
// Runs at build time, before `astro build` copies public/ into dist/, from
// the build scripts in package.json (Docker/Coolify, Netlify, local).
// Resolution order (first non-empty wins):
//   1. COMMIT_SHA      — explicit override for unusual builders
//   2. SOURCE_COMMIT   — Coolify (available to Docker builds when "Include
//                        Source Commit in Build" is enabled in General)
//   3. COMMIT_REF      — Netlify build environment
//   4. GITHUB_SHA      — GitHub Actions
//   5. git rev-parse HEAD — local builds (git is not present in the Docker
//                        build context — .dockerignore excludes .git — so
//                        Coolify MUST provide SOURCE_COMMIT)
// When none is available the file is written empty and the purge workflow
// refuses to purge blindly (it times out loudly instead of guessing).
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_KEYS = ['COMMIT_SHA', 'SOURCE_COMMIT', 'COMMIT_REF', 'GITHUB_SHA'];
const SHA_RE = /^[0-9a-f]{40}$/i;
const LINE_SPLIT_RE = /\r?\n/;
// Repo root from the script location (not cwd): robust against build tools
// that spawn the build from a different working directory.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Resolves the commit SHA by reading the .git directory directly — no
// PATH-resolved `git` subprocess (S4036). Handles: plain repos (.git dir),
// worktrees (.git is a FILE with `gitdir: <path>`; branch refs live in the
// common dir via `commondir`), detached HEAD (SHA in HEAD), and the
// packed-refs fallback. Returns '' on any failure — the marker is simply
// omitted and the CI purge workflow fails loudly instead of purging blindly.
function readCommonDir(gitDir) {
	try {
		const commondirFile = join(gitDir, 'commondir');
		if (existsSync(commondirFile)) {
			const rel = readFileSync(commondirFile, 'utf8').trim();
			if (rel) return resolve(join(gitDir, rel));
		}
	} catch { /* fall through */ }
	return gitDir;
}

// Locates the git directory: the repo's .git dir, or — for a linked worktree,
// the `gitdir: <path>` target from the .git FILE. Returns '' when absent.
function resolveGitDir() {
	const gitPath = join(REPO_ROOT, '.git');
	try {
		if (statSync(gitPath).isDirectory()) return gitPath;
	} catch {
		return '';
	}
	try {
		const text = readFileSync(gitPath, 'utf8');
		const nl = text.indexOf('\n');
		const line = (nl === -1 ? text : text.slice(0, nl)).trim();
		const value = line.startsWith('gitdir:') ? line.slice('gitdir:'.length).trim() : '';
		return value ? resolve(join(REPO_ROOT, value)) : '';
	} catch {
		return '';
	}
}

// Reads the branch ref: the loose ref file first, then packed-refs.
function readRefSha(commonDir, gitDir, ref) {
	const refFile = join(commonDir, ref);
	try {
		if (existsSync(refFile)) {
			const sha = readFileSync(refFile, 'utf8').trim();
			if (SHA_RE.test(sha)) return sha;
		}
	} catch { /* fall through to packed-refs */ }
	for (const packed of [join(commonDir, 'packed-refs'), join(gitDir, 'packed-refs')]) {
		try {
			if (!existsSync(packed)) continue;
			for (const line of readFileSync(packed, 'utf8').split(LINE_SPLIT_RE)) {
				const pm = /^([0-9a-f]{40})[ \t]+(\S+)$/i.exec(line.trim());
				if (pm?.[2] === ref) return pm[1];
			}
		} catch { /* ignore unreadable packed-refs */ }
	}
	return '';
}

function readGitHead() {
	const gitDir = resolveGitDir();
	if (!gitDir) return '';
	try {
		const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
		const refMatch = /^ref:[ \t]*(\S+)$/.exec(head);
		if (!refMatch) return head; // detached HEAD: the SHA is in the file
		const commonDir = readCommonDir(gitDir);
		return readRefSha(commonDir, gitDir, refMatch[1]);
	} catch { /* no .git in the build context (e.g. Docker) -> marker omitted */ }
	return '';
}

function resolveCommitSha() {
	for (const key of SOURCE_KEYS) {
		const value = process.env[key]?.trim();
		if (value) return value;
	}
	const sha = readGitHead();
	// Only trust well-formed full-length SHAs from git.
	if (SHA_RE.test(sha)) return sha;
	return '';
}

const markerPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', '__moderaty_commit.txt');
// Remove any marker a previous (possibly failed) build left behind before
// writing the current one, so stale content can never leak into a new build.
rmSync(markerPath, { force: true });
const sha = resolveCommitSha();
writeFileSync(markerPath, `${sha}\n`);
const summary = sha ? `Wrote ${sha}` : 'No commit SHA available; marker left empty';
console.log(`[commit-marker] ${summary} -> public/__moderaty_commit.txt`);
