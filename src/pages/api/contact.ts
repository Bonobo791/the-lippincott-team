import type { APIRoute } from 'astro';
import { ContactValidationError, forwardContactLead } from '../../lib/sierra-contact';

// Host-neutral contact endpoint: the contact form POSTs here and the lead is
// forwarded to Sierra directly, identically on every host (Netlify, Coolify/
// Docker, the standalone Node server, local dev). This replaced the old
// Netlify Forms + netlify/functions/contact-sierra.ts flow, which only worked
// on Netlify.
export const prerender = false;

const THANK_YOU_URL = '/contact-us/thank-you/';

// The form payload is name/email/phone/interest/message — 32 KiB is generous.
const MAX_BODY_BYTES = 32 * 1024;
// Best-effort, single-instance abuse guard (Netlify's Akismet spam filtering
// no longer applies to this path). 5 submissions per IP per 10 minutes is
// plenty for humans; callers are keyed by the proxy-set X-Real-IP / Client-IP
// header or the proxy-appended tail of X-Forwarded-For (see clientIp).
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
// Hard cap on tracked windows: beyond this, evict the oldest entries (Map
// insertion order), so rotated/spoofed identities cannot grow the map
// without bound between expiry cycles.
const RATE_WINDOW_CAP = 5000;
const rateWindows = new Map<string, { count: number; reset: number }>();

function thankYou() {
	return new Response(null, { status: 303, headers: { Location: THANK_YOU_URL } });
}

function jsonError(status: number, error: string) {
	return new Response(JSON.stringify({ error }), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

// Origins allowed to POST the contact form from a browser. SITE_URL is the
// canonical origin on every host; the platform URL envs cover deploy previews
// (Netlify injects URL on previews, Coolify/Cloudflare set theirs), and the
// localhost ports cover dev. Requests with no Origin header (curl and other
// non-browser clients) are allowed through — the honeypot, size cap, and
// rate limit remain the controls for them. This endpoint-level check exists
// because astro.config.mjs keeps `security.checkOrigin` disabled: Bunny CDN
// rewrites the Host header sent to the origin and does not forward the
// visitor host, so Astro's host-based guard would reject every browser POST.
function originAllowed(request: Request) {
	const origin = request.headers.get('origin');
	if (!origin) return true;
	for (const value of [process.env.SITE_URL, process.env.URL, process.env.COOLIFY_URL, process.env.CF_PAGES_URL]) {
		if (!value) continue;
		try {
			if (new URL(value).origin === origin) return true;
		} catch {
			// Ignore malformed env values and keep checking the rest.
		}
	}
	return origin === 'http://localhost:4321' || origin === 'http://localhost:4322';
}

// Bunny sets X-Real-IP to the true client address, Netlify sets Client-IP,
// and Coolify's Traefik overwrites both — so neither can be spoofed by the
// client when a proxy is in front. Fall back to the LAST X-Forwarded-For
// value (the proxy-appended tail); the first value is client-controlled and
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
	// Prune expired windows on every call (cheap at real-world sizes) so dead
	// entries never linger, then evict the oldest window when the hard cap is
	// hit — the map can never grow past RATE_WINDOW_CAP + 1.
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

type BodyResult = { kind: 'body'; buffer: ArrayBuffer } | { kind: 'error'; response: Response };

// Enforce MAX_BODY_BYTES while reading the stream, before formData() parses
// anything: a crafted multipart request with no trustworthy Content-Length
// must never get buffered and parsed in full first.
async function readBody(request: Request): Promise<BodyResult> {
	const declaredLength = Number(request.headers.get('content-length') ?? 0);
	if (declaredLength > MAX_BODY_BYTES) {
		return { kind: 'error', response: jsonError(413, 'Your message is too long. Please shorten it and try again.') };
	}
	if (!request.body) return { kind: 'body', buffer: new ArrayBuffer(0) };
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > MAX_BODY_BYTES) {
				await reader.cancel().catch(() => undefined);
				return { kind: 'error', response: jsonError(413, 'Your message is too long. Please shorten it and try again.') };
			}
			chunks.push(value);
		}
	} catch {
		return { kind: 'error', response: jsonError(400, 'Invalid request body.') };
	}
	const buffer = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		buffer.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return { kind: 'body', buffer: buffer.buffer };
}

export const POST: APIRoute = async ({ request }) => {
	// Browser CSRF guard first: reject cross-origin form posts before they
	// consume rate-limit budget or touch Sierra.
	if (!originAllowed(request)) {
		return jsonError(403, 'Cross-origin form submissions are not allowed.');
	}

	if (isRateLimited(clientIp(request), Date.now())) {
		return jsonError(429, 'Too many requests. Please wait a few minutes, or call or text us directly.');
	}

	const body = await readBody(request);
	if (body.kind === 'error') return body.response;
	const contentType = request.headers.get('content-type') ?? 'application/x-www-form-urlencoded';
	const formData = await new Request(request.url, {
		method: 'POST',
		headers: { 'content-type': contentType },
		body: body.buffer,
	}).formData();

	const data: Record<string, string> = {};
	let totalChars = 0;
	for (const [key, value] of formData.entries()) {
		// The form only ever submits strings — a File part means a crafted
		// multipart upload, which the size cap alone does not constrain.
		if (typeof value !== 'string') {
			return jsonError(400, 'Invalid form submission.');
		}
		data[key] = value;
		totalChars += value.length;
	}
	// Second layer (character count) on top of the byte cap.
	if (totalChars > MAX_BODY_BYTES) {
		return jsonError(413, 'Your message is too long. Please shorten it and try again.');
	}

	// Honeypot: humans never fill the hidden bot-field. Fake success (as
	// Netlify's spam filter did) so bots learn nothing.
	if (data['bot-field']?.trim()) return thankYou();

	if (data['form-name'] !== 'contact') {
		return jsonError(400, 'Unknown form.');
	}

	const apiKey = process.env.SIERRA_API_KEY;
	if (!apiKey) {
		console.error('[sierra-contact] SIERRA_API_KEY is not configured.');
		return jsonError(500, 'The contact form is not configured on this server.');
	}

	try {
		await forwardContactLead(data, apiKey);
	} catch (error) {
		if (error instanceof ContactValidationError) {
			return jsonError(400, error.message);
		}
		// Sierra outages / network failures are server errors; don't leak
		// Sierra response details to the client (they're logged below).
		console.error('[sierra-contact] Lead creation failed.', error instanceof Error ? error.message : 'Unknown error');
		return jsonError(500, "We couldn't send your request. Please try again, or call or text us directly.");
	}

	return thankYou();
};
