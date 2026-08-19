#!/usr/bin/env node
// Purges the Bunny CDN cache: full pull-zone purge by default, or per-URL
// purges when called with site paths / URLs as arguments, or the CI
// "wait for the deploy, then purge" mode used by
// .github/workflows/bunny-purge.yml.
//
// Deploy-time purge (primary path):
//   BUNNY_API_KEY=... BUNNY_PULL_ZONE_ID=<id> \
//     node scripts/bunny-purge.mjs --wait-for-commit <sha> --origin <url> [--timeout 1800]
//   Polls <origin>/__moderaty_commit.txt until it returns <sha> — i.e. the
//   build produced from that commit is actually serving — then full-purges
//   the pull zone. Refuses to purge blindly: a deploy that never serves the
//   marker (failed deploy, wrong origin, missing marker) times out and exits
//   non-zero. This is the repo's one deploy-time purge trigger.
//
// Manual full purge:
//   BUNNY_API_KEY=... BUNNY_PULL_ZONE_ID=<id> node scripts/bunny-purge.mjs
// Manual page-level purge (no zone ID needed; paths resolve against SITE_URL):
//   BUNNY_API_KEY=... SITE_URL=https://thelippincottteam.com \
//     node scripts/bunny-purge.mjs /pricing/ /blog/
//
// Env:
//   BUNNY_API_KEY       Bunny API key. Prefer the least-privilege
//                       pull-zone-scoped key (Pull Zone -> Security -> API
//                       Key), which can purge only that zone; fall back to
//                       the account AccessKey (dashboard: Account -> API).
//                       Secret — never commit it or prefix it with PUBLIC_,
//                       and keep it OUT of the application environment: the
//                       CI workflow reads it from repository secrets, so the
//                       running container never sees it.
//   BUNNY_PULL_ZONE_ID  Numeric ID of the site's pull zone (in the zone URL).
//                       Required for the full-zone purge and the CI wait mode.
//   SITE_URL            Canonical site URL; resolves relative path arguments
//                       and is the default origin for --wait-for-commit.
//   BUNNY_ORIGIN_URL    Direct origin (no CDN) polled by --wait-for-commit;
//                       overrides SITE_URL, overridden by --origin.
//
// No-op (exit 0) when the required credentials are missing, so local builds/
// dev servers without Bunny credentials are unaffected. With credentials set,
// a failed purge logs loudly and exits 1. Invalid or un-normalizable URL
// arguments fail fast (exit 1) before any network call.
// Bunny APIs:
//   Full purge: POST https://api.bunny.net/pullzone/{id}/purgeCache  -> 204
//   URL purge:  POST https://api.bunny.net/purge?url=<url>            -> 204

import { pathToFileURL } from 'node:url';
import { normalizeSiteUrl } from './bunny-url.mjs';

const BUNNY_API_BASE = 'https://api.bunny.net';
const MARKER_PATH = '/__moderaty_commit.txt';
const REQUEST_TIMEOUT_MS = 15_000;
const PURGE_TIMEOUT_MS = 30_000;
const DEFAULT_WAIT_TIMEOUT_S = 900;
const DEFAULT_WAIT_INTERVAL_S = 10;
// Module scope so the hot poll loop never recompiles it (S6397/S1442).
const SHA_RE = /^[0-9a-f]{7,64}$/i;

// Strips control characters (U+0000–U+001F and DEL) from a value before it is
// echoed to the terminal, so a crafted input cannot inject log lines or
// terminal escape sequences (S5145).
function printable(value) {
	let out = '';
	for (let i = 0; i < value.length; i += 1) {
		const code = value.codePointAt(i) ?? 0;
		if (code >= 0x20 && code !== 0x7f) out += value[i];
	}
	return out;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
	if (argv.includes('--wait-for-commit')) {
		const flagValue = (name) => {
			const index = argv.indexOf(name);
			return index !== -1 && argv[index + 1] !== undefined ? argv[index + 1] : undefined;
		};
		const timeout = Number(flagValue('--timeout') ?? String(DEFAULT_WAIT_TIMEOUT_S));
		const interval = Number(flagValue('--interval') ?? String(DEFAULT_WAIT_INTERVAL_S));
		return {
			mode: 'wait',
			sha: flagValue('--wait-for-commit'),
			origin: flagValue('--origin'),
			timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_WAIT_TIMEOUT_S,
			interval: Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_WAIT_INTERVAL_S,
		};
	}
	return { mode: argv.length > 0 ? 'urls' : 'full', targets: argv.slice() };
}

// Polls the origin's deploy-commit marker until the commit is serving.
// Returns true when the marker matched (caller then purges), false on
// invalid arguments or timeout — never purges blindly.
// Parses and validates the origin URL; returns the absolute marker URL or null.
function resolveMarkerUrl(candidate) {
	let base;
	try {
		base = new URL(candidate);
	} catch {
		return null;
	}
	if (base.protocol !== 'https:' && base.protocol !== 'http:') return null;
	return new URL(MARKER_PATH, base.origin).toString();
}

// One poll of the commit marker. Returns { matched, error } — transient fetch
// failures (rolling updates answering 503, dropped connections) are normal
// during a deploy, so they are reported to the caller as error, not thrown.
async function pollMarker(markerUrl, sha, fetchImpl) {
	try {
		const response = await fetchImpl(markerUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
		if (response.ok && (await response.text()).trim() === sha) return { matched: true, error: null };
		return { matched: false, error: null };
	} catch (error) {
		return { matched: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

async function waitForCommitMarker({ sha, origin, timeout, interval }, { originUrl, siteUrl, fetchImpl }) {
	if (!sha || typeof sha !== 'string' || !SHA_RE.test(sha.trim())) {
		console.error('[bunny-purge] --wait-for-commit requires the commit SHA as its argument.');
		return false;
	}
	sha = sha.trim();
	const candidate = origin ?? originUrl ?? siteUrl;
	if (!candidate) {
		console.error('[bunny-purge] --wait-for-commit needs an origin: pass --origin, or set BUNNY_ORIGIN_URL / SITE_URL.');
		return false;
	}
	const markerUrl = resolveMarkerUrl(candidate);
	if (!markerUrl) {
		console.error(`[bunny-purge] Invalid origin URL (must be an http(s) site URL): ${printable(candidate)}`);
		return false;
	}
	const deadline = Date.now() + timeout * 1000;
	console.log(`[bunny-purge] Waiting for commit ${sha} at ${markerUrl} (timeout ${timeout}s)...`);
	let attempt = 0;
	let lastError = null;
	while (Date.now() < deadline) {
		attempt += 1;
		const { matched, error } = await pollMarker(markerUrl, sha, fetchImpl);
		if (matched) {
			console.log(`[bunny-purge] Commit ${sha} is serving; purging the cache.`);
			return true;
		}
		lastError = error;
		if (attempt % 6 === 0) {
			console.log(`[bunny-purge] Still waiting for commit ${sha} (${Math.max(0, Math.round((deadline - Date.now()) / 1000))}s left)...`);
		}
		// Never sleep past the deadline — the loop would otherwise take up to
		// a full interval longer than the configured timeout.
		const remaining = deadline - Date.now();
		if (remaining <= 0) break;
		await sleep(Math.min(interval * 1000, remaining));
	}
	console.error(
		`[bunny-purge] Commit ${sha} was never observed serving at ${markerUrl} within ${timeout}s` +
			(lastError ? ` (last poll error: ${printable(lastError)})` : '') +
			'. Refusing to purge blindly. Check that the deploy succeeded, that the marker is being built ' +
			'(Coolify: enable "Include Source Commit in Build"; Netlify sets COMMIT_REF automatically), ' +
			'and that the origin is the direct origin, not the CDN host.'
	);
	return false;
}

async function purgePullZone({ apiKey, pullZoneId, fetchImpl }) {
	try {
		const response = await fetchImpl(`${BUNNY_API_BASE}/pullzone/${pullZoneId}/purgeCache`, {
			method: 'POST',
			headers: { AccessKey: apiKey },
			signal: AbortSignal.timeout(PURGE_TIMEOUT_MS),
		});
		if (!response.ok) {
			// S5145: the Bunny API response body is external data and is never
			// interpolated into log output — a forged body could inject log
			// lines or terminal escape sequences. The status code alone
			// identifies the failure class; reproduce the call with curl for
			// the full API error body.
			console.error(`[bunny-purge] Failed: HTTP ${response.status}`);
			return false;
		}
		console.log(`[bunny-purge] Pull zone ${pullZoneId} cache purged.`);
		return true;
	} catch (error) {
		console.error('[bunny-purge] Failed:', error instanceof Error ? error.message : 'Unknown error');
		return false;
	}
}

// Purges each target in order, stopping at the first failure. Sequential is
// deliberate: Bunny's URL-purge API is rate-limited per account, and an early
// 429/5xx should abort the batch rather than fan out more calls.
async function purgeTargets(targets, { apiKey, siteUrl }, fetchImpl) {
	if (!siteUrl) {
		console.error('[bunny-purge] SITE_URL is required to resolve path arguments.');
		return 1;
	}
	const urls = [];
	for (const target of targets) {
		const url = normalizeSiteUrl(target, siteUrl);
		if (!url) {
			console.error(`[bunny-purge] Invalid target (must be a ${siteUrl} URL/path): ${printable(target)}`);
			return 1;
		}
		urls.push(url);
	}
	let ok = true;
	for (const url of urls) {
		console.log(`[bunny-purge] Purging ${url}`);
		try {
			const response = await fetchImpl(`${BUNNY_API_BASE}/purge?url=${encodeURIComponent(url)}`, {
				method: 'POST',
				headers: { AccessKey: apiKey },
				signal: AbortSignal.timeout(PURGE_TIMEOUT_MS),
			});
			if (!response.ok) {
				// S5145: status code only (see purgePullZone).
				console.error(`[bunny-purge] URL purge failed: HTTP ${response.status}`);
				ok = false;
			}
		} catch (error) {
			ok = false;
			console.error('[bunny-purge] URL purge failed:', error instanceof Error ? error.message : 'Unknown error');
		}
	}
	return ok ? 0 : 1;
}

/**
 * Entry point shared by the CLI and the tests. Returns the process exit code
 * (0 = ok or intentionally skipped, 1 = loud failure) instead of calling
 * process.exit(), so the tests can drive it with a fake fetch.
 */
export async function main(args, env = process.env, fetchImpl = fetch) {
	const apiKey = env.BUNNY_API_KEY;
	const pullZoneId = Number(env.BUNNY_PULL_ZONE_ID ?? '');
	const siteUrl = env.SITE_URL ?? '';
	const originUrl = env.BUNNY_ORIGIN_URL ?? '';
	const parsed = parseArgs(args);

	// Validate CLI arguments FIRST so a malformed command fails predictably
	// even when credentials are absent (otherwise `--wait-for-commit nope`
	// would exit 0 in an unconfigured checkout).
	if (parsed.mode === 'wait' && (!parsed.sha || !SHA_RE.test(parsed.sha.trim()))) {
		console.error('[bunny-purge] --wait-for-commit requires the commit SHA as its argument.');
		return 1;
	}
	if (parsed.mode === 'wait' && !(parsed.origin ?? originUrl ?? siteUrl)) {
		console.error('[bunny-purge] --wait-for-commit needs an origin: pass --origin, or set BUNNY_ORIGIN_URL / SITE_URL.');
		return 1;
	}
	if (parsed.mode === 'urls' && !siteUrl) {
		console.error('[bunny-purge] SITE_URL is required to resolve path arguments.');
		return 1;
	}

	if (!apiKey) {
		console.log('[bunny-purge] Skipped (BUNNY_API_KEY not set).');
		return 0;
	}

	if (parsed.mode === 'urls') {
		return purgeTargets(parsed.targets, { apiKey, siteUrl }, fetchImpl);
	}

	// Full-zone purge (mode 'full') or wait-then-purge (mode 'wait'): the zone
	// ID is required. With a key set but no zone ID the configuration is
	// wrong, not absent — fail loudly instead of pretending the purge ran.
	if (!Number.isInteger(pullZoneId) || pullZoneId <= 0) {
		console.error('[bunny-purge] BUNNY_PULL_ZONE_ID is required for a full-zone purge when BUNNY_API_KEY is set.');
		return 1;
	}

	if (parsed.mode === 'wait') {
		const matched = await waitForCommitMarker(parsed, { originUrl, siteUrl, fetchImpl });
		if (!matched) return 1;
	}

	return (await purgePullZone({ apiKey, pullZoneId, fetchImpl })) ? 0 : 1;
}

// Run only when executed directly (not when imported by the tests).
const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
	process.exitCode = await main(process.argv.slice(2));
}
