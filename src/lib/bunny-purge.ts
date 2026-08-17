// Bunny CDN purge helpers shared by the /api/bunny-purge endpoint.
//
// The standalone scripts/deploy/purge-bunny-cache.mjs keeps its own copy of
// the URL normalization and the fetch call: the Docker runtime image ships
// scripts/deploy without src/, so the two cannot share a module. Keep the
// duplicated normalization in sync with that script.

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
 * Normalizes a site-relative path or an absolute URL on the site's own host
 * into an absolute URL safe to hand to Bunny's URL-purge API. Returns null
 * when the input is not a purgeable site URL.
 *
 * Rejected: URLs with a different scheme, host, or port than SITE_URL (a
 * userinfo or port trick lands on a foreign hostname/port, so it is caught
 * by the same comparison), wildcards (a trailing slash already makes Bunny
 * treat the purge as a prefix purge — no caller needs `*`), path-traversal
 * segments (raw and percent-encoded), backslashes, and control characters.
 * Fragments are accepted and stripped (the edge never caches by fragment).
 */
export function normalizeSiteUrl(input: string, siteUrl: string): string | null {
	if (typeof input !== 'string') return null;
	const value = input.trim();
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

	let site: URL;
	try {
		site = new URL(siteUrl);
	} catch {
		return null;
	}

	let candidate: URL;
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

	// Check both the raw and the percent-decoded path so encodings cannot
	// smuggle a traversal segment or a wildcard past the checks. A URL whose
	// decoded form is not valid UTF-8 can't be a site URL we serve anyway.
	let decoded: string;
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
