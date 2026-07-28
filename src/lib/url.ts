const SAFE_URL = /^(\/[^\\]*|#[^\\]*|(https?|mailto|tel):[^\s]*)$/i;

/**
 * Sanitize a CMS-provided URL for use in `href`. Allows relative paths,
 * anchors, and http/https/mailto/tel URLs; anything else (e.g.
 * `javascript:`/`data:`) returns `undefined` so the attribute is omitted.
 */
export function safeHref(href?: string | null): string | undefined {
	if (!href) return undefined;
	const value = href.trim();
	return SAFE_URL.test(value) ? value : undefined;
}

/** True for absolute http(s) URLs — external links open in a new tab. */
export function isExternal(link: string | undefined | null): boolean {
	return !!link && /^https?:\/\//.test(link);
}

/** Build a `tel:` href from a display phone number (US 10-digit numbers get the leading 1). */
export function telHref(phone?: string | null): string | undefined {
	if (!phone) return undefined;
	const digits = phone.replace(/\D/g, '');
	if (!digits) return undefined;
	return `tel:+${digits.length === 10 ? '1' : ''}${digits}`;
}
