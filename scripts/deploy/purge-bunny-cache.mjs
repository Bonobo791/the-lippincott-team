#!/usr/bin/env node
// Purges the Bunny cache: full pull-zone purge by default, or per-URL purges
// when called with site paths / URLs as arguments.
//
// Used automatically on Coolify: the Docker entrypoint runs this with no
// arguments when a new container starts (every deployment), so visitors
// always get fresh pages.
// Manual full purge:
//   BUNNY_API_KEY=... BUNNY_PULL_ZONE_ID=<id> node scripts/deploy/purge-bunny-cache.mjs
// Manual page-level purge (no zone ID needed; paths resolve against SITE_URL):
//   BUNNY_API_KEY=... SITE_URL=https://lippincottteam.com \
//     node scripts/deploy/purge-bunny-cache.mjs /pricing/ /blog/
//
// Env:
//   BUNNY_API_KEY      Bunny account AccessKey (dashboard: Account -> API).
//                      Secret — never commit it or prefix it with PUBLIC_.
//   BUNNY_PULL_ZONE_ID Numeric ID of the site's pull zone (in the zone URL).
//                      Required only for the full-zone purge.
//   SITE_URL           Canonical site URL; resolves relative path arguments.
//
// No-op (exit 0) when the required credentials are missing, so local builds/
// dev servers without Bunny credentials are unaffected. Invalid or
// un-normalizable URL arguments fail fast (exit 1) before any network call.
// Bunny APIs:
//   Full purge: POST https://api.bunny.net/pullzone/{id}/purgeCache  -> 204
//   URL purge:  POST https://api.bunny.net/purge?url=<url>            -> 204

const apiKey = process.env.BUNNY_API_KEY;
const pullZoneId = Number(process.env.BUNNY_PULL_ZONE_ID ?? '');
const siteUrl = process.env.SITE_URL ?? '';

if (!apiKey) {
	console.log('[bunny-purge] Skipped (BUNNY_API_KEY not set).');
	process.exit(0);
}

// Same normalization as normalizeSiteUrl in src/lib/bunny-purge.ts — keep in
// sync (the runtime image ships scripts/deploy without src/, so the two
// cannot share a module).
function normalizeSiteUrl(input, baseUrl) {
	const value = String(input ?? '').trim();
	if (!value || value.length > 1024) return null;
	// eslint-disable-next-line no-control-regex
	if (/[\u0000-\u001f\u007f]/.test(value)) return null;
	// Backslashes are treated as '/' by WHATWG URL parsing in http(s) paths,
	// which would let '/foo\..\' slip past the dot-segment check below and
	// normalize to the zone root (a prefix purge of everything). No site URL
	// contains one — reject outright.
	if (value.includes('\\')) return null;

	// RFC 3986 dot segments (raw or percent-encoded) in the path mean
	// malformed input — reject them before the URL parser can silently
	// normalize them away.
	const rawPath = value.split(/[?#]/, 1)[0].replace(/^https?:\/\/[^/]*/i, '');
	if (/(^|\/)(\.|\.\.|%2e|\.%2e|%2e\.|%2e%2e)(\/|$)/i.test(rawPath)) return null;

	let site;
	try {
		site = new URL(baseUrl);
	} catch {
		return null;
	}

	let candidate;
	if (/^https?:\/\//i.test(value)) {
		try {
			candidate = new URL(value);
		} catch {
			return null;
		}
		if (candidate.protocol !== site.protocol || candidate.hostname.toLowerCase() !== site.hostname.toLowerCase() || candidate.port !== site.port) return null;
	} else {
		if (!value.startsWith('/') || value.startsWith('//')) return null;
		try {
			candidate = new URL(value, site.origin);
		} catch {
			return null;
		}
	}

	candidate.hash = '';
	let decoded;
	try {
		decoded = decodeURIComponent(candidate.pathname);
	} catch {
		return null;
	}
	// Encoded slashes keep dot segments out of reach of the raw check above
	// (e.g. '/foo%2f..%2fbar'), so re-test the decoded path for them too.
	if (decoded.includes('*') || candidate.pathname.includes('*')) {
		return null;
	}
	if (/(^|\/)(\.|\.\.)(\/|$)/.test(decoded)) {
		return null;
	}
	return candidate.toString();
}

async function purgeUrl(url) {
	const response = await fetch(`https://api.bunny.net/purge?url=${encodeURIComponent(url)}`, {
		method: 'POST',
		headers: { AccessKey: apiKey },
		signal: AbortSignal.timeout(30_000),
	});
	if (!response.ok) {
		console.error(`[bunny-purge] URL purge failed: HTTP ${response.status}`);
		return false;
	}
	return true;
}

const targets = process.argv.slice(2);
if (targets.length > 0) {
	if (!siteUrl) {
		console.error('[bunny-purge] SITE_URL is required to resolve path arguments.');
		process.exit(1);
	}
	const urls = [];
	for (const target of targets) {
		const url = normalizeSiteUrl(target, siteUrl);
		if (!url) {
			// Strip control characters before echoing the rejected argument
			// so a crafted value cannot inject terminal escapes.
			const printable = target.replace(/[\u0000-\u001f\u007f]/g, '');
			console.error(`[bunny-purge] Invalid target (must be a ${siteUrl} URL/path): ${printable}`);
			process.exit(1);
		}
		urls.push(url);
	}
	let ok = true;
	for (const url of urls) {
		console.log(`[bunny-purge] Purging ${url}`);
		if (!(await purgeUrl(url))) ok = false;
	}
	process.exit(ok ? 0 : 1);
}

// Full-zone purge (default, no arguments).
if (!Number.isInteger(pullZoneId) || pullZoneId <= 0) {
	console.log('[bunny-purge] Skipped (BUNNY_PULL_ZONE_ID not set).');
	process.exit(0);
}

try {
	const response = await fetch(`https://api.bunny.net/pullzone/${pullZoneId}/purgeCache`, {
		method: 'POST',
		headers: { AccessKey: apiKey },
		signal: AbortSignal.timeout(30_000),
	});
	if (!response.ok) {
		// S5145: the Bunny API response body is external data and is never
		// interpolated into log output — a forged body could inject log lines
		// or terminal escape sequences (Sonar does not treat a
		// strip-control-characters pass as sanitization). The status code
		// alone identifies the failure class; reproduce the call with curl
		// for the full API error body.
		console.error(`[bunny-purge] Failed: HTTP ${response.status}`);
		process.exit(1);
	}
	console.log(`[bunny-purge] Pull zone ${pullZoneId} cache purged.`);
} catch (error) {
	console.error('[bunny-purge] Failed:', error instanceof Error ? error.message : 'Unknown error');
	process.exit(1);
}
