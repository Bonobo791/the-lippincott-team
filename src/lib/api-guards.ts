// Shared request guards for the server-side API endpoints (/api/contact,
// /api/bunny-purge): JSON error responses, client-IP resolution, the
// best-effort per-IP rate limiter, and streamed body reads with a byte cap.

/** JSON error response with the given HTTP status. */
export function jsonError(status: number, error: string): Response {
	return new Response(JSON.stringify({ error }), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

// Bunny sets X-Real-IP to the true client address, Netlify sets Client-IP,
// and Coolify's Traefik overwrites both — so neither can be spoofed by the
// client when a proxy is in front. Fall back to the LAST X-Forwarded-For
// value (the proxy-appended tail); the first value is client-controlled and
// must never be trusted, or a rotating forged header would bypass the rate
// limit entirely.
export function clientIp(request: Request): string {
	return (
		request.headers.get('x-real-ip')?.trim() ||
		request.headers.get('client-ip')?.trim() ||
		request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ||
		'unknown'
	);
}

/**
 * Best-effort, single-instance abuse guard: `max` requests per `windowMs`
 * per IP, with a hard cap on tracked windows (oldest evicted first) so
 * rotated/spoofed identities cannot grow the map without bound between
 * expiry cycles.
 */
export function createRateLimiter(max: number, windowMs: number, cap: number) {
	const rateWindows = new Map<string, { count: number; reset: number }>();
	return function isRateLimited(ip: string, now: number): boolean {
		// Prune expired windows on every call (cheap at real-world sizes) so
		// dead entries never linger, then evict the oldest window when the
		// hard cap is hit — the map can never grow past cap + 1.
		for (const [key, value] of rateWindows) {
			if (value.reset <= now) rateWindows.delete(key);
		}
		const entry = rateWindows.get(ip);
		if (!entry) {
			rateWindows.set(ip, { count: 1, reset: now + windowMs });
			if (rateWindows.size > cap) {
				const oldest = rateWindows.keys().next().value;
				if (oldest !== undefined) rateWindows.delete(oldest);
			}
			return false;
		}
		entry.count += 1;
		return entry.count > max;
	};
}

export type BodyResult = { kind: 'body'; buffer: ArrayBuffer } | { kind: 'error'; response: Response };

/**
 * Enforce `maxBytes` while reading the stream, before anything parses it: a
 * crafted request with no trustworthy Content-Length must never get buffered
 * and parsed in full first. The await-in-loop here is inherent to streaming —
 * each chunk only exists after the previous read resolves, so the reads must
 * be sequential (there is nothing to parallelize).
 */
export async function readBody(request: Request, maxBytes: number, tooLargeMessage: string): Promise<BodyResult> {
	const declaredLength = Number(request.headers.get('content-length') ?? 0);
	if (declaredLength > maxBytes) {
		return { kind: 'error', response: jsonError(413, tooLargeMessage) };
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
			if (total > maxBytes) {
				await reader.cancel().catch(() => undefined);
				return { kind: 'error', response: jsonError(413, tooLargeMessage) };
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
