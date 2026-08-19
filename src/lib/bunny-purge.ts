// Bunny CDN purge helpers for the /api/bunny-purge endpoint.
//
// normalizeSiteUrl lives in scripts/deploy/bunny-url.mjs (plain JS, shared
// with scripts/deploy/purge-bunny-cache.mjs — the Docker runtime image ships
// scripts/deploy but not src/, so the shared module lives there and this file
// re-exports it; Vite bundles the .mjs into the server bundle).

export { normalizeSiteUrl } from '../../scripts/deploy/bunny-url.mjs';

const BUNNY_API_BASE = 'https://api.bunny.net';

/** Thrown when the Bunny purge API answers with a non-2xx status. */
export class BunnyPurgeError extends Error {
	readonly status: number;

	constructor(status: number) {
		super(`Bunny purge API returned HTTP ${status}`);
		this.name = 'BunnyPurgeError';
		this.status = status;
	}
}

/**
 * Purges a single URL across all of the account's pull zones.
 * Bunny API: POST https://api.bunny.net/purge?url=<url> -> 204 on success.
 * Throws BunnyPurgeError on a non-2xx status (429 = account purge rate
 * limit), and a generic Error on network failures / timeouts.
 */
export async function purgeUrl(url: string, apiKey: string): Promise<void> {
	const response = await fetch(`${BUNNY_API_BASE}/purge?url=${encodeURIComponent(url)}`, {
		method: 'POST',
		headers: { AccessKey: apiKey },
		signal: AbortSignal.timeout(30_000),
	});
	if (!response.ok) {
		// S5145: the Bunny API response body is external data and is never
		// interpolated into log output — a forged body could inject log lines
		// or terminal escape sequences. The status code alone identifies the
		// failure class; reproduce the call with curl for the full error body.
		throw new BunnyPurgeError(response.status);
	}
}
