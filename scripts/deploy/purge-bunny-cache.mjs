#!/usr/bin/env node
// Purges the Bunny pull-zone cache (all URLs).
//
// Used automatically on Coolify: the Docker entrypoint runs this when a new
// container starts (every deployment), so visitors always get fresh pages.
// Also runnable manually from the repo root:
//
//   BUNNY_API_KEY=... BUNNY_PULL_ZONE_ID=<id> node scripts/deploy/purge-bunny-cache.mjs
//
// Env:
//   BUNNY_API_KEY      Bunny account AccessKey (dashboard: Account -> API).
//                      Secret — never commit it or prefix it with PUBLIC_.
//   BUNNY_PULL_ZONE_ID Numeric ID of the site's pull zone (in the zone URL).
//
// No-op (exit 0) when the env vars are missing, so local builds/dev servers
// without Bunny credentials are unaffected.
// Bunny API: POST https://api.bunny.net/pullzone/{id}/purgeCache -> 204.

const apiKey = process.env.BUNNY_API_KEY;
const pullZoneId = Number(process.env.BUNNY_PULL_ZONE_ID ?? '');

if (!apiKey || !Number.isInteger(pullZoneId) || pullZoneId <= 0) {
	console.log('[bunny-purge] Skipped (BUNNY_API_KEY / BUNNY_PULL_ZONE_ID not set).');
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
