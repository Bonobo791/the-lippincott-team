import { richTextToPlainText } from './rich-text';

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
export function extractToc(body?: unknown): { id: string; text: string }[] {
	const children = (body as RichNode | undefined)?.children;
	if (!Array.isArray(children)) return [];
	return children
		.filter((node) => node?.type === 'h2')
		.map((node) => {
			const text = richTextToPlainText(node);
			return { id: slugify(text), text };
		})
		.filter((entry) => entry.id);
}

/** Whole-minute reading time at ~200 wpm, minimum 1. */
export function readingTimeMinutes(body?: unknown): number {
	const words = richTextToPlainText(body).split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 200));
}
