import type { APIRoute } from 'astro';
import { clientIp, createRateLimiter, jsonError, readBody } from '../../lib/api-guards';
import { BunnyPurgeError, normalizeSiteUrl, purgeUrl } from '../../lib/bunny-purge';

// Protected per-URL Bunny cache purge endpoint. Lets a server-side caller
// (TinaCloud webhook, GitHub Action, manual curl) purge one or more page URLs
// immediately after a content edit, instead of waiting for the 10-minute HTML
// cache TTL. Deploy-time full-zone purges run from CI
// (.github/workflows/bunny-purge.yml), which waits for the new commit to be
// serving (/__moderaty_commit.txt) before purging with the key from
// repository secrets — not from the application environment.
//
// Auth: the shared BUNNY_PURGE_SECRET, passed as an `Authorization: Bearer`
// header, an `x-bunny-purge-token` header, or a `?token=` query parameter
// (prefer a header — query strings can appear in CDN access logs).
//
// Input: GET query params `url`/`path`/`urls` (repeatable, `urls` also
// comma-separated) or a POST body (JSON or form-encoded) with the same
// fields. Each value must be a site path or an absolute URL that matches the
// SITE_URL origin exactly — protocol, hostname, and port (see
// normalizeSiteUrl in scripts/bunny-url.mjs).
//
// The `*/api/*` edge rule already bypasses the CDN cache for this route.
export const prerender = false;

const MAX_BODY_BYTES = 4 * 1024;
const MAX_URL_BYTES = 8 * 1024;
const MAX_URLS = 10;

// Best-effort, single-instance abuse guard, same shape as /api/contact:
// 10 purges per IP per minute is plenty for webhook bursts; keyed by the
// proxy-set X-Real-IP / Client-IP header or the proxy-appended tail of
// X-Forwarded-For (see clientIp in src/lib/api-guards.ts). The token check
// runs after the limiter so secret-guessing attempts consume the attacker's
// own budget.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_WINDOW_CAP = 1000;
const isRateLimited = createRateLimiter(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, RATE_WINDOW_CAP);

// Auth schemes are case-insensitive per RFC 7235.
const BEARER_RE = /^Bearer\s/i;

function headerToken(request: Request): string | null {
	const auth = request.headers.get('authorization');
	if (auth && BEARER_RE.test(auth)) return auth.slice('Bearer '.length).trim() || null;
	return request.headers.get('x-bunny-purge-token');
}

// Constant-time comparison over the fixed-length SHA-256 digests: the digests
// are always 32 bytes, so the XOR loop runs the same number of iterations and
// never exits early, and the length difference of the plaintexts is folded
// into the accumulator rather than short-circuited — no timing oracle exists
// for either the content or the length of the secret. Web Crypto only —
// node:crypto needs a shim on Cloudflare Workers (the same reason
// sierra-contact.ts avoids it).
async function secretMatches(provided: string, expected: string): Promise<boolean> {
	const [a, b] = await Promise.all([
		crypto.subtle.digest('SHA-256', new TextEncoder().encode(provided)),
		crypto.subtle.digest('SHA-256', new TextEncoder().encode(expected)),
	]);
	const av = new Uint8Array(a);
	const bv = new Uint8Array(b);
	let diff = (provided.length ^ expected.length) >>> 0;
	for (let i = 0; i < av.length; i += 1) {
		diff |= av[i] ^ bv[i];
	}
	return diff === 0;
}

function pushField(raw: string[], key: string, value: unknown): boolean {
	if (typeof value === 'string') {
		if (key === 'urls') raw.push(...value.split(','));
		else raw.push(value);
		return true;
	}
	if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
		raw.push(...(value as string[]));
		return true;
	}
	return false;
}

type FieldsResult = { kind: 'ok'; raw: string[] } | { kind: 'error'; response: Response };

// Gathers the purge targets from GET query params and (for POST) the request
// body — JSON or form-encoded — into one flat list of raw values.
async function collectRawFields(request: Request, url: URL): Promise<FieldsResult> {
	const raw: string[] = [];
	for (const key of ['url', 'path', 'urls']) {
		for (const value of url.searchParams.getAll(key)) {
			if (key === 'urls') raw.push(...value.split(','));
			else raw.push(value);
		}
	}

	if (request.method === 'POST') {
		const body = await readBody(request, MAX_BODY_BYTES, 'Request body is too large.');
		if (body.kind === 'error') return { kind: 'error', response: body.response };

		const contentType = request.headers.get('content-type') ?? 'application/x-www-form-urlencoded';
		// Media types are case-insensitive (RFC 6839) and may carry parameters
		// after a ';' — compare the normalized type, not a case-sensitive
		// substring (which would also misroute application/json-patch+json).
		const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();
		if (mediaType === 'application/json') {
			let parsed: unknown;
			try {
				parsed = JSON.parse(new TextDecoder().decode(body.buffer));
			} catch {
				return { kind: 'error', response: jsonError(400, 'Invalid JSON body.') };
			}
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				return { kind: 'error', response: jsonError(400, 'Invalid JSON body.') };
			}
			for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
				if (key !== 'url' && key !== 'path' && key !== 'urls' && key !== 'paths') continue;
				if (!pushField(raw, key, value)) return { kind: 'error', response: jsonError(400, 'Invalid JSON body.') };
			}
		} else {
			// formData() rejects malformed multipart bodies and unsupported
			// content types — treat those as a client error (400).
			let form: FormData;
			try {
				form = await new Request(request.url, {
					method: 'POST',
					headers: { 'content-type': contentType },
					body: body.buffer,
				}).formData();
			} catch {
				return { kind: 'error', response: jsonError(400, 'Invalid form body.') };
			}
			for (const key of ['url', 'path', 'urls']) {
				for (const value of form.getAll(key)) {
					if (!pushField(raw, key, value)) return { kind: 'error', response: jsonError(400, 'Invalid form body.') };
				}
			}
		}
	}
	return { kind: 'ok', raw };
}

// Purges each target in order, stopping at the first failure. Sequential is
// deliberate: Bunny's URL-purge API is rate-limited per account, and an early
// 429/5xx should abort the batch rather than fan out more calls.
async function purgeTargets(targets: string[], apiKey: string): Promise<Response | null> {
	for (const target of targets) {
		try {
			await purgeUrl(target, apiKey);
		} catch (error) {
			if (error instanceof BunnyPurgeError) {
				if (error.status === 429) {
					return jsonError(429, 'Bunny purge rate limit reached. Please wait a moment and try again.');
				}
				// S5145: never interpolate the Bunny API response body into
				// logs — the status code identifies the failure class; use
				// curl with the same call to see the full error body.
				console.error(`[bunny-purge] URL purge failed: Bunny answered HTTP ${error.status}.`);
				return jsonError(502, 'Bunny cache purge failed upstream.');
			}
			console.error('[bunny-purge] URL purge failed:', error instanceof Error ? error.message : 'Unknown error');
			return jsonError(502, 'Bunny cache purge failed upstream.');
		}
	}
	return null;
}

async function handle(request: Request, clientAddress?: string): Promise<Response> {
	if (request.url.length > MAX_URL_BYTES) {
		return jsonError(414, 'Request URL is too long.');
	}

	if (isRateLimited(clientIp(request, clientAddress), Date.now())) {
		return jsonError(429, 'Too many purge requests. Please wait a minute and try again.');
	}

	const secret = process.env.BUNNY_PURGE_SECRET;
	const apiKey = process.env.BUNNY_API_KEY;
	const siteUrl = process.env.SITE_URL ?? '';
	if (!secret || !apiKey || !siteUrl) {
		// Don't reveal which piece is missing to the caller.
		console.error('[bunny-purge] Endpoint not configured (BUNNY_PURGE_SECRET / BUNNY_API_KEY / SITE_URL missing).');
		return jsonError(503, 'Cache purging is not configured on this server.');
	}

	const url = new URL(request.url);
	const provided = headerToken(request) ?? url.searchParams.get('token');
	if (!provided || !(await secretMatches(provided, secret))) {
		return jsonError(401, 'Unauthorized.');
	}

	const fields = await collectRawFields(request, url);
	if (fields.kind === 'error') return fields.response;

	const inputs = fields.raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
	if (inputs.length === 0) {
		return jsonError(400, 'Provide at least one url or path to purge.');
	}
	if (inputs.length > MAX_URLS) {
		return jsonError(400, `At most ${MAX_URLS} URLs can be purged per request.`);
	}

	const targets: string[] = [];
	for (const input of inputs) {
		const normalized = normalizeSiteUrl(input, siteUrl);
		if (!normalized) {
			return jsonError(400, 'A provided URL is not a valid site URL.');
		}
		targets.push(normalized);
	}

	return (await purgeTargets(targets, apiKey)) ?? new Response(null, { status: 204 });
}

export const GET: APIRoute = ({ request, clientAddress }) => handle(request, clientAddress);
export const POST: APIRoute = ({ request, clientAddress }) => handle(request, clientAddress);
