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
// plenty for humans; callers behind a proxy are keyed by X-Forwarded-For.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
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

function clientIp(request: Request) {
	return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function isRateLimited(ip: string, now: number) {
	const entry = rateWindows.get(ip);
	if (!entry || entry.reset <= now) {
		rateWindows.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
	} else {
		entry.count += 1;
	}
	// Bound the map: prune expired windows once it grows past a hard cap.
	if (rateWindows.size > 5000) {
		for (const [key, value] of rateWindows) {
			if (value.reset <= now) rateWindows.delete(key);
		}
	}
	return (rateWindows.get(ip)?.count ?? 0) > RATE_LIMIT_MAX;
}

export const POST: APIRoute = async ({ request }) => {
	if (isRateLimited(clientIp(request), Date.now())) {
		return jsonError(429, 'Too many requests. Please wait a few minutes, or call or text us directly.');
	}

	const declaredLength = Number(request.headers.get('content-length') ?? 0);
	if (declaredLength > MAX_BODY_BYTES) {
		return jsonError(413, 'Your message is too long. Please shorten it and try again.');
	}

	const formData = await request.formData();
	const data: Record<string, string> = {};
	let totalChars = 0;
	for (const [key, value] of formData.entries()) {
		if (typeof value === 'string') {
			data[key] = value;
			totalChars += value.length;
		}
	}
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
