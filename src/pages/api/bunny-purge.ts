import type { APIRoute } from 'astro';
import { BunnyPurgeError, normalizeSiteUrl, purgeUrl } from '../../lib/bunny-purge';

// Protected per-URL Bunny cache purge endpoint. Lets a server-side caller
// (TinaCloud webhook, GitHub Action, manual curl) purge one or more page URLs
// immediately after a content edit, instead of waiting for the 10-minute HTML
// cache TTL. Full-zone purges still happen automatically on every Coolify
// deploy via the Docker entrypoint (scripts/deploy/purge-bunny-cache.mjs).
//
// Auth: the shared BUNNY_PURGE_SECRET, passed as an `Authorization: Bearer`
// header, an `x-bunny-purge-token` header, or a `?token=` query parameter
// (prefer a header — query strings can appear in CDN access logs).
//
// Input: GET query params `url`/`path`/`urls` (repeatable, `urls` also
// comma-separated) or a POST body (JSON or form-encoded) with the same
// fields. Each value must be a site path or a URL on SITE_URL's host.
//
// The `*/api/*` edge rule already bypasses the CDN cache for this route.
export const prerender = false;

const MAX_BODY_BYTES = 4 * 1024;
const MAX_URL_BYTES = 8 * 1024;
const MAX_URLS = 10;

// Best-effort, single-instance abuse guard, same shape as /api/contact:
// 10 purges per IP per minute is plenty for webhook bursts; keyed by the
// proxy-set X-Real-IP / Client-IP header or the proxy-appended tail of
// X-Forwarded-For (see clientIp). The token check runs after the limiter so
// secret-guessing attempts consume the attacker's own budget.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_WINDOW_CAP = 1000;
const rateWindows = new Map<string, { count: number; reset: number }>();

function json(status: number, error: string) {
	return new Response(JSON.stringify({ error }), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

// Bunny sets X-Real-IP to the true client address and Coolify's Traefik
// overwrites it — the first X-Forwarded-For value is client-controlled and
// must never be trusted, or a rotating forged header would bypass the rate
// limit entirely.
function clientIp(request: Request) {
	return (
		request.headers.get('x-real-ip')?.trim() ||
		request.headers.get('client-ip')?.trim() ||
		request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ||
		'unknown'
	);
}

function isRateLimited(ip: string, now: number) {
	for (const [key, value] of rateWindows) {
		if (value.reset <= now) rateWindows.delete(key);
	}
	const entry = rateWindows.get(ip);
	if (!entry) {
		rateWindows.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
		if (rateWindows.size > RATE_WINDOW_CAP) {
			const oldest = rateWindows.keys().next().value;
			if (oldest !== undefined) rateWindows.delete(oldest);
		}
		return false;
	}
	entry.count += 1;
	return entry.count > RATE_LIMIT_MAX;
}

function headerToken(request: Request): string | null {
	const auth = request.headers.get('authorization');
	// Auth schemes are case-insensitive per RFC 7235.
	if (auth && /^Bearer\s/i.test(auth)) return auth.slice('Bearer '.length).trim() || null;
	return request.headers.get('x-bunny-purge-token');
}

// Constant-time comparison on equal-length digests: length never leaks and
// no early exit gives a timing oracle. Web Crypto only — node:crypto needs a
// shim on Cloudflare Workers (the same reason sierra-contact.ts avoids it).
async function secretMatches(provided: string, expected: string): Promise<boolean> {
	const [a, b] = await Promise.all([
		crypto.subtle.digest('SHA-256', new TextEncoder().encode(provided)),
		crypto.subtle.digest('SHA-256', new TextEncoder().encode(expected)),
	]);
	const av = new Uint8Array(a);
	const bv = new Uint8Array(b);
	let diff = 0;
	for (let i = 0; i < av.length; i += 1) {
		diff |= av[i] ^ bv[i];
	}
	return diff === 0;
}

type BodyResult = { kind: 'body'; buffer: ArrayBuffer } | { kind: 'error'; response: Response };

// Enforce MAX_BODY_BYTES while reading the stream, before anything parses it.
async function readBody(request: Request): Promise<BodyResult> {
	const declaredLength = Number(request.headers.get('content-length') ?? 0);
	if (declaredLength > MAX_BODY_BYTES) {
		return { kind: 'error', response: json(413, 'Request body is too large.') };
	}
	if (!request.body) return { kind: 'body', buffer: new Uint8Array(0).buffer };
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		// The await-in-loop here is inherent to streaming: each chunk only
		// exists after the previous read resolves, so the reads must be
		// sequential (there is nothing to parallelize).
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > MAX_BODY_BYTES) {
				await reader.cancel().catch(() => undefined);
				return { kind: 'error', response: json(413, 'Request body is too large.') };
			}
			chunks.push(value);
		}
	} catch {
		return { kind: 'error', response: json(400, 'Invalid request body.') };
	}
	const buffer = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		buffer.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return { kind: 'body', buffer: buffer.buffer };
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

async function handle(request: Request): Promise<Response> {
	if (request.url.length > MAX_URL_BYTES) {
		return json(414, 'Request URL is too long.');
	}

	if (isRateLimited(clientIp(request), Date.now())) {
		return json(429, 'Too many purge requests. Please wait a minute and try again.');
	}

	const secret = process.env.BUNNY_PURGE_SECRET;
	const apiKey = process.env.BUNNY_API_KEY;
	const siteUrl = process.env.SITE_URL ?? '';
	if (!secret || !apiKey || !siteUrl) {
		// Don't reveal which piece is missing to the caller.
		console.error('[bunny-purge] Endpoint not configured (BUNNY_PURGE_SECRET / BUNNY_API_KEY / SITE_URL missing).');
		return json(503, 'Cache purging is not configured on this server.');
	}

	const url = new URL(request.url);
	const provided = headerToken(request) ?? url.searchParams.get('token');
	if (!provided || !(await secretMatches(provided, secret))) {
		return json(401, 'Unauthorized.');
	}

	const raw: string[] = [];
	for (const key of ['url', 'path', 'urls']) {
		for (const value of url.searchParams.getAll(key)) {
			if (key === 'urls') raw.push(...value.split(','));
			else raw.push(value);
		}
	}

	if (request.method === 'POST') {
		const body = await readBody(request);
		if (body.kind === 'error') return body.response;

		const contentType = request.headers.get('content-type') ?? 'application/x-www-form-urlencoded';
		if (contentType.includes('application/json')) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(new TextDecoder().decode(body.buffer));
			} catch {
				return json(400, 'Invalid JSON body.');
			}
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				return json(400, 'Invalid JSON body.');
			}
			for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
				if (key !== 'url' && key !== 'path' && key !== 'urls' && key !== 'paths') continue;
				if (!pushField(raw, key, value)) return json(400, 'Invalid JSON body.');
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
				return json(400, 'Invalid form body.');
			}
			for (const key of ['url', 'path', 'urls']) {
				for (const value of form.getAll(key)) {
					if (!pushField(raw, key, value)) return json(400, 'Invalid form body.');
				}
			}
		}
	}

	const inputs = raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
	if (inputs.length === 0) {
		return json(400, 'Provide at least one url or path to purge.');
	}
	if (inputs.length > MAX_URLS) {
		return json(400, `At most ${MAX_URLS} URLs can be purged per request.`);
	}

	const targets: string[] = [];
	for (const input of inputs) {
		const normalized = normalizeSiteUrl(input, siteUrl);
		if (!normalized) {
			return json(400, 'A provided URL is not a valid site URL.');
		}
		targets.push(normalized);
	}

	for (const target of targets) {
		try {
			await purgeUrl(target, apiKey);
		} catch (error) {
			if (error instanceof BunnyPurgeError) {
				if (error.status === 429) {
					return json(429, 'Bunny purge rate limit reached. Please wait a moment and try again.');
				}
				// S5145: never interpolate the Bunny API response body into
				// logs — the status code identifies the failure class; use
				// curl with the same call to see the full error body.
				console.error(`[bunny-purge] URL purge failed: Bunny answered HTTP ${error.status}.`);
				return json(502, 'Bunny cache purge failed upstream.');
			}
			console.error('[bunny-purge] URL purge failed:', error instanceof Error ? error.message : 'Unknown error');
			return json(502, 'Bunny cache purge failed upstream.');
		}
	}

	return new Response(null, { status: 204 });
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
