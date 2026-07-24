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
