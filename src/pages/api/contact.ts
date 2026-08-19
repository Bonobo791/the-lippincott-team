import type { APIRoute } from 'astro';
import { clientIp, createRateLimiter, jsonError, readBody } from '../../lib/api-guards';
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
// plenty for humans; the limiter keys on the proxy-set client IP (see
// clientIp in src/lib/api-guards.ts).
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_WINDOW_CAP = 5000;
const isRateLimited = createRateLimiter(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, RATE_WINDOW_CAP);

function thankYou() {
	return new Response(null, { status: 303, headers: { Location: THANK_YOU_URL } });
}

// Origins allowed to POST the contact form from a browser. SITE_URL is the
// canonical origin on every host; the platform URL envs cover deploy previews
// (Netlify's per-deploy origins come from DEPLOY_PRIME_URL/DEPLOY_URL — its
// URL var stays the production address on previews — Coolify/Cloudflare set
// theirs); CONTACT_ALLOWED_ORIGINS is a comma-separated list of extra origins
// for hosts no platform var expresses — a Bunny edge hostname
// (https://<zone>.b-cdn.net) or a second custom domain in front of the same
// app, for example. The brand's thelippincottteam.com origins (canonical and
// www alias) and the localhost ports are hardcoded below. Requests with no Origin header (curl
// and other non-browser clients) are allowed through — the honeypot, size
// cap, and rate limit remain the controls for them. This endpoint-level check
// exists because astro.config.mjs keeps `security.checkOrigin` disabled:
// Bunny CDN rewrites the Host header sent to the origin and does not forward
// the visitor host, so Astro's host-based guard would reject every browser
// POST.
function originAllowed(request: Request) {
	const origin = request.headers.get('origin');
	if (!origin) return true;
	const allowed = [
		process.env.SITE_URL,
		process.env.URL,
		process.env.DEPLOY_PRIME_URL,
		process.env.DEPLOY_URL,
		process.env.COOLIFY_URL,
		process.env.CF_PAGES_URL,
		// Extra origins (comma-separated) that host the same app — staging
		// Bunny/CDN hostnames, a www alias served without a redirect, etc.
		...(process.env.CONTACT_ALLOWED_ORIGINS ?? '').split(','),
	];
	for (const value of allowed) {
		if (!value) continue;
		try {
			if (new URL(value.trim()).origin === origin) return true;
		} catch {
			// Ignore malformed env values and keep checking the rest.
		}
	}
	// Brand domains (hardcoded, like the localhost ports): the canonical
	// thelippincottteam.com domain and its www alias may serve the site or
	// carry a visitor's Origin.
	return (
		origin === 'https://thelippincottteam.com' ||
		origin === 'https://www.thelippincottteam.com' ||
		origin === 'http://localhost:4321' ||
		origin === 'http://localhost:4322'
	);
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

	const body = await readBody(request, MAX_BODY_BYTES, 'Your message is too long. Please shorten it and try again.');
	if (body.kind === 'error') return body.response;
	const contentType = request.headers.get('content-type') ?? 'application/x-www-form-urlencoded';
	// formData() rejects malformed multipart bodies and unsupported content
	// types — treat those as a client error (400) rather than letting the
	// rejection surface as a 500.
	let formData: FormData;
	try {
		formData = await new Request(request.url, {
			method: 'POST',
			headers: { 'content-type': contentType },
			body: body.buffer,
		}).formData();
	} catch {
		return jsonError(400, 'Invalid form submission.');
	}

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
