// `/(?!/)` rejects protocol-relative URLs (`//host`) — those would navigate
// off-site while looking like same-site relative paths.
const SAFE_URL = /^(\/(?!\/)[^\\]*|#[^\\]*|(https?|mailto|tel):[^\s]*)$/i;

/**
 * Sanitize a CMS-provided URL for use in `href`. Allows relative paths,
 * anchors, and http/https/mailto/tel URLs; anything else (e.g.
 * `javascript:`/`data:`/protocol-relative `//host`) returns `undefined` so
 * the attribute is omitted.
 */
export function safeHref(href?: string | null): string | undefined {
	if (!href) return undefined;
	const value = href.trim();
	return SAFE_URL.test(value) ? value : undefined;
}

/** True for absolute http(s) URLs — external links open in a new tab. */
export function isExternal(link: string | undefined | null): boolean {
	return !!link && /^https?:\/\//i.test(link.trim());
}

/**
 * Anchor attrs for links that should open in a new tab: absolute http(s)
 * URLs (external) and downloadable files (`.pdf`/`.docx`/`.zip`/office
 * docs). Download links are relative (`/uploads/…`), so they need their own
 * rule — `isExternal` alone would leave them navigating in-place. Everything
 * else gets `{}`.
 */
export function linkTargetAttrs(link: string | undefined | null): Record<string, string> {
	if (!link) return {};
	const value = link.trim();
	const opensInNewTab = /^https?:\/\//i.test(value) || /\.(pdf|docx?|xlsx?|pptx?|zip)$/i.test(value);
	return opensInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

/** Build a `tel:` href from a display phone number (US 10-digit numbers get the leading 1). */
export function telHref(phone?: string | null): string | undefined {
	if (!phone) return undefined;
	const digits = phone.replace(/\D/g, '');
	if (!digits) return undefined;
	return `tel:+${digits.length === 10 ? '1' : ''}${digits}`;
}
