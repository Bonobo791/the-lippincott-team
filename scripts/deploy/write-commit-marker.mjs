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
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_KEYS = ['COMMIT_SHA', 'SOURCE_COMMIT', 'COMMIT_REF', 'GITHUB_SHA'];

function resolveCommitSha() {
	for (const key of SOURCE_KEYS) {
		const value = process.env[key]?.trim();
		if (value) return value;
	}
	try {
		const sha = execSync('git rev-parse HEAD', {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
		// Only trust well-formed full-length SHAs from git.
		if (/^[0-9a-f]{40}$/i.test(sha)) return sha;
	} catch {
		// No git in the build environment — the marker is simply omitted and
		// the purge workflow fails loudly rather than purging blindly.
	}
	return '';
}

const markerPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', '__moderaty_commit.txt');
const sha = resolveCommitSha();
writeFileSync(markerPath, `${sha}\n`);
console.log(`[commit-marker] ${sha ? `Wrote ${sha}` : 'No commit SHA available; marker left empty'} -> public/__moderaty_commit.txt`);
