import { richTextToPlainText } from './rich-text';

/** Module-level so `readingTimeMinutes` doesn't reallocate it per call. */
const WHITESPACE_REGEX = /\s+/;

/**
 * Article-template helpers for the blog redesign: stable heading slugs shared
 * by the TOC and the h2 override (so `href="#x"` and `id="x"` always agree),
 * plus a reading-time estimate.
 */

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[’']/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

interface RichNode {
	type?: string;
	children?: RichNode[];
}

/** H2 entries of a Tina rich-text body, in document order, for the article TOC. */
export function extractToc(body?: unknown): { id: string; text: string }[] {	const children = (body as RichNode | undefined)?.children;
	if (!Array.isArray(children)) return [];
	return children
		.filter((node) => node?.type === 'h2')
		.map((node) => {
			const text = richTextToPlainText(node);
			return { id: slugify(text), text };
		})
		.filter((entry) => entry.id);
}

/**
 * Decode the HTML entities Tina's renderer emits inside text nodes. ArticleH2
 * slugs rendered HTML, `extractToc` slugs raw rich text — both must see the
 * same characters before `slugify` runs or TOC deep-links break on headings
 * containing `&`, quotes, etc.
 */
export function decodeEntities(html: string): string {
	return html
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;|&apos;/g, "'");
}

/** Whole-minute reading time at ~200 wpm, minimum 1. */
export function readingTimeMinutes(body?: unknown): number {
	const words = (richTextToPlainText(body) || '').split(WHITESPACE_REGEX).filter(Boolean).length;
	return Math.max(1, Math.round(words / 200));
}
