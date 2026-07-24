// Shared WordPress HTML → MDX conversion library for the content migration
// (Tasks 4–7). Plain ESM, no TypeScript.
//
// Pipeline intended for callers:
//
//   import { htmlToMarkdown, resolveImages, mdxEscape, frontmatter } from './lib/convert.mjs';
//
//   const { markdown, images } = htmlToMarkdown(wpItem.content.rendered);
//   // images: [{ token: '__IMG_0__', src, alt }] — tokens are left in the
//   // markdown so Task 3 can download files first and then rewrite URLs:
//   const resolved = resolveImages(markdown, urlMap);   // Map<srcUrl, localPath>
//   const safe = mdxEscape(resolved);                   // escape MDX hazards
//   const file = frontmatter(fmObject) + '\n' + safe;
//
// Design notes:
// - stripElementor() runs on the raw HTML first (node-html-parser): it drops
//   Elementor wrapper junk, style/script/noscript, decorative 32-hex-named SVG
//   icons, empty elements, non-YouTube/Vimeo iframes, and <video> tags (whose
//   srcs are collected for videos.txt — see drainStrippedVideos()).
// - YouTube iframes become <YouTubeEmbed videoId="..." /> tags (the MDX
//   component registered in src/components/mdx/). Vimeo iframes become plain
//   links (no Vimeo MDX component exists; none occur in the source content).
// - mdxEscape() escapes {, } and stray < AFTER the YouTubeEmbed tags are
//   already in the markdown; it protects capitalized JSX-looking tags
//   (/<\/?[A-Z].../) so intended MDX components survive. That ordering is why
//   callers can escape last without breaking embeds.
// - Media URLs are normalized when extracted: trailing zero-width spaces
//   (U+200B, present in some cached uploads URLs) are stripped, and `#t=...`
//   fragments (present on mp4 URLs) are removed.
import TurndownService from 'turndown';
import { parse } from 'node-html-parser';

// ---------------------------------------------------------------------------
// URL normalization
// ---------------------------------------------------------------------------

// Strip zero-width spaces and media fragments (`#t=0`) from a media URL. The
// zero-width space (U+200B) shows up both literally (media.json source_urls)
// and percent-encoded as %E2%80%8B (some content img srcs) — the server keeps
// it in those filenames, but map keys and local filenames must be clean.
export function normalizeMediaUrl(url) {
	if (!url) return url;
	return url.replace(/\u200B/g, '').replace(/%e2%80%8b/gi, '').replace(/#t=[\d.]*$/, '');
}

// ---------------------------------------------------------------------------
// Video collection (videos.txt handoff)
// ---------------------------------------------------------------------------

const strippedVideos = [];

// Return the list of video srcs stripped so far and clear it. The caller
// appends the result to scripts/migrate/data/videos.txt.
export function drainStrippedVideos() {
	return strippedVideos.splice(0, strippedVideos.length);
}

// ---------------------------------------------------------------------------
// stripElementor
// ---------------------------------------------------------------------------

const DECORATIVE_SVG = /\/[0-9a-f]{32}\.svg(\?.*)?$/;
const YOUTUBE_IFRAME = /(?:youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([\w-]{11})/;
const VIMEO_IFRAME = /player\.vimeo\.com\/video\/(\d+)/;

// Tags that may be dropped when they carry no meaningful content.
const EMPTY_DROPPABLE = new Set(['DIV', 'SPAN', 'P', 'A', 'SUP', 'SUB', 'SECTION', 'ASIDE']);

// Parse raw WP content HTML and return a cleaned HTML string with all
// Elementor/uichemy wrapper markup removed but semantic content kept.
export function stripElementor(html) {
	const root = parse(html, { blockTextElements: { script: true, style: true, noscript: true } });

	// Drop non-content tags outright.
	for (const el of root.querySelectorAll('style, script, noscript, template')) el.remove();

	// <video>: record the src for the videos.txt handoff, then drop.
	for (const el of root.querySelectorAll('video')) {
		const source = el.querySelector('source');
		const src = normalizeMediaUrl(el.getAttribute('src') ?? source?.getAttribute('src'));
		if (src) strippedVideos.push(src);
		el.remove();
	}

	// Iframes: YouTube → placeholder we can turn into an MDX tag; Vimeo →
	// placeholder for a plain link; everything else (e.g. the Google Maps
	// commute widget) is dropped. The placeholder keeps the video URL as its
	// text: turndown routes empty elements to its blankRule before custom
	// rules, and the URL doubles as a graceful fallback if the rule misses.
	for (const el of root.querySelectorAll('iframe')) {
		const src = el.getAttribute('src') ?? '';
		const yt = src.match(YOUTUBE_IFRAME);
		const vimeo = src.match(VIMEO_IFRAME);
		if (yt) {
			el.replaceWith(`<p data-youtube-id="${yt[1]}">https://youtu.be/${yt[1]}</p>`);
		} else if (vimeo) {
			el.replaceWith(`<p data-vimeo-url="https://vimeo.com/${vimeo[1]}">https://vimeo.com/${vimeo[1]}</p>`);
		} else {
			el.remove();
		}
	}

	// Decorative icon images: 32-hex-char-named SVGs (Elementor/uichemy icons)
	// and images with no usable src.
	for (const el of root.querySelectorAll('img')) {
		const src = el.getAttribute('src') ?? '';
		if (!src || DECORATIVE_SVG.test(src) || src.startsWith('data:')) el.remove();
	}

	// Unwrap all spans (uc-accent headings, badge rows, icon spans) — keep the
	// text, lose the styling hooks.
	for (const el of root.querySelectorAll('span')) el.replaceWith(...el.childNodes);

	// Drop empty wrappers (repeat: removing inner empties makes outer ones
	// empty). Keep anything that still holds media or a hard break.
	const hasContent = (el) =>
		el.querySelector('img, video, iframe, br, hr') !== null || el.text.trim() !== '';
	let changed = true;
	while (changed) {
		changed = false;
		for (const el of root.querySelectorAll([...EMPTY_DROPPABLE].join(','))) {
			if (!hasContent(el)) {
				el.remove();
				changed = true;
			}
		}
	}

	return root.toString();
}

// ---------------------------------------------------------------------------
// htmlToMarkdown
// ---------------------------------------------------------------------------

// Convert WP content HTML to markdown. Returns { markdown, images } where
// every content image is replaced by an `__IMG_<n>__` token and described in
// `images` so Task 3 can rewrite URLs after downloading. Elementor cleanup is
// applied first; YouTube/Vimeo iframes are converted inline.
export function htmlToMarkdown(html) {
	const cleaned = stripElementor(html);
	const images = [];

	const turndown = new TurndownService({
		headingStyle: 'atx',
		bulletListMarker: '-',
		codeBlockStyle: 'fenced',
		emDelimiter: '*',
	});

	// Images → __IMG_<n>__ tokens (Task 3 rewrites via resolveImages).
	turndown.addRule('imgToken', {
		filter: 'img',
		replacement: (_content, node) => {
			const src = normalizeMediaUrl(node.getAttribute('src') ?? '');
			if (!src) return '';
			const alt = (node.getAttribute('alt') ?? '').trim();
			const token = `__IMG_${images.length}__`;
			images.push({ token, src, alt });
			return token;
		},
	});

	// YouTube placeholder → MDX component tag (capitalized, survives mdxEscape).
	turndown.addRule('youtubeEmbed', {
		filter: (node) => node.nodeName === 'P' && node.getAttribute('data-youtube-id'),
		replacement: (_content, node) =>
			`\n\n<YouTubeEmbed videoId="${node.getAttribute('data-youtube-id')}" />\n\n`,
	});

	// Vimeo placeholder → plain link (no Vimeo MDX component exists).
	turndown.addRule('vimeoLink', {
		filter: (node) => node.nodeName === 'P' && node.getAttribute('data-vimeo-url'),
		replacement: (_content, node) => {
			const url = node.getAttribute('data-vimeo-url');
			return `\n\n[Watch this video on Vimeo](${url})\n\n`;
		},
	});

	// GFM-style tables (turndown core flattens them). Reads the DOM directly
	// instead of the already-converted cell content. Domino's NodeLists are
	// not iterable, so descend via childNodes manually.
	turndown.addRule('gfmTable', {
		filter: 'table',
		replacement: (_content, node) => {
			const descendants = (el) =>
				[...(el.childNodes ?? [])].flatMap((c) =>
					c.nodeType === 1 ? [c, ...descendants(c)] : [],
				);
			// textContent glues adjacent block descendants ("parks and trailsNew
			// construction"), so walk recursively and join block-level elements
			// with a space while inline content keeps its natural spacing.
			const BLOCK = new Set([
				'P',
				'DIV',
				'UL',
				'OL',
				'LI',
				'BLOCKQUOTE',
				'H1',
				'H2',
				'H3',
				'H4',
				'H5',
				'H6',
			]);
			const joinBlocks = (el) => {
				const parts = [];
				let inline = '';
				for (const c of el.childNodes ?? []) {
					if (c.nodeType === 1 && BLOCK.has(c.nodeName)) {
						if (inline.trim()) parts.push(inline);
						inline = '';
						parts.push(joinBlocks(c));
					} else {
						inline += c.textContent;
					}
				}
				if (inline.trim()) parts.push(inline);
				return parts.join(' ');
			};
			const cellText = (cell) =>
				joinBlocks(cell)
					.replace(/\s+/g, ' ')
					.trim()
					.replace(/\|/g, '\\|');
		const rows = descendants(node)
				.filter((n) => n.nodeName === 'TR')
				.map((tr) =>
					descendants(tr)
						.filter((n) => n.nodeName === 'TH' || n.nodeName === 'TD')
						.map(cellText),
				);
			if (rows.length === 0 || rows[0].length === 0) return '';
			const header = rows[0];
			const divider = header.map(() => '---');
			const line = (cells) => `| ${cells.join(' | ')} |`;
			return ['', line(header), line(divider), ...rows.slice(1).map(line), ''].join('\n');
		},
	});

	const markdown = turndown
		.turndown(cleaned)
		.replace(/\u00A0/g, ' ') // &nbsp; → plain space
		.replace(/^(\s*(?:[-*+]|\d+\.))[ \t]+/gm, '$1 ') // '-   x' → '- x'
		.replace(/[ \t]+\n/g, '\n') // trailing whitespace
		.replace(/\n{3,}/g, '\n\n') // collapse blank runs
		.trim();

	lastImages = images;
	return { markdown, images };
}

// ---------------------------------------------------------------------------
// resolveImages
// ---------------------------------------------------------------------------

// The most recent htmlToMarkdown() image list, so resolveImages can be called
// with the brief's 2-arg form. Callers doing batch work should resolve each
// document before converting the next (or pass `images` explicitly).
let lastImages = [];

// Replace __IMG_<n>__ tokens with markdown images. `urlMap` maps the original
// source URL to a local path (Task 3's download map). Unmapped tokens fall
// back to the original URL so output is never broken.
export function resolveImages(markdown, urlMap, images = lastImages) {
	return markdown.replace(/__IMG_(\d+)__/g, (match, n) => {
		const img = images[Number(n)];
		if (!img) return match;
		const alt = img.alt.replace(/[[\]]/g, '');
		return `![${alt}](${urlMap.get(img.src) ?? img.src})`;
	});
}

// ---------------------------------------------------------------------------
// mdxEscape
// ---------------------------------------------------------------------------

// Escape MDX hazards: `{`/`}` (JS expressions) and `<` that does not start an
// intended MDX component tag. Capitalized JSX-looking tags (e.g. the
// <YouTubeEmbed ... /> tags htmlToMarkdown already emitted) are protected:
// they are pulled out before escaping and restored after. Add new MDX
// components freely — anything matching /<[A-Z]/ is preserved.
export function mdxEscape(markdown) {
	const protectedTags = [];
	const staged = markdown.replace(/<\/?[A-Z][\w]*(?:\s[^<>]*?)?\s*\/?>/g, (tag) => {
		protectedTags.push(tag);
		return `MDXTAG${protectedTags.length - 1}ENDMDXTAG`;
	});
	// Note: existing backslashes (turndown's own markdown escapes) are left
	// alone — doubling them would render literal backslashes in MDX.
	return staged
		.replace(/[{}]/g, (c) => `\\${c}`)
		.replace(/</g, '\\<')
		.replace(/MDXTAG(\d+)ENDMDXTAG/g, (_m, n) => protectedTags[Number(n)]);
}

// ---------------------------------------------------------------------------
// frontmatter
// ---------------------------------------------------------------------------

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
// A plain (unquoted) YAML scalar is unsafe when it contains `: ` or a trailing
// colon, ` #`, leading/trailing whitespace, or starts with an indicator char.
const PLAIN_UNSAFE = /:(?:\s|$)|\s#|^\s|\s$|^[-?:,[\]{}#&*!|>'"%@`]/;
const YAML_KEYWORDS = /^(true|false|null|yes|no|on|off|~|-?\d+(\.\d+)?)$/i;

// Serialize a scalar to a YAML-safe single-line form.
function yamlScalar(value) {
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (value instanceof Date) return value.toISOString();
	const s = String(value);
	if (ISO_DATETIME.test(s)) return s; // unquoted, matches the starter's style
	if (!PLAIN_UNSAFE.test(s) && !YAML_KEYWORDS.test(s)) return s;
	return JSON.stringify(s); // valid YAML double-quoted scalar
}

// Emit one key/value pair (possibly nested) at the given indent.
function emitEntry(lines, key, value, indent) {
	const pad = ' '.repeat(indent);
	if (Array.isArray(value)) {
		lines.push(`${pad}${key}:`);
		for (const item of value) emitArrayItem(lines, item, indent + 2);
		return;
	}
	if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
		lines.push(`${pad}${key}:`);
		for (const [k, v] of Object.entries(value)) {
			if (v === undefined || v === null || v === '') continue;
			emitEntry(lines, k, v, indent + 2);
		}
		return;
	}
	if (typeof value === 'string' && value.includes('\n')) {
		lines.push(`${pad}${key}: |`);
		for (const line of value.split('\n')) lines.push(`${pad}  ${line}`);
		return;
	}
	lines.push(`${pad}${key}: ${yamlScalar(value)}`);
}

function emitArrayItem(lines, item, indent) {
	const pad = ' '.repeat(indent);
	if (typeof item !== 'object' || item === null || item instanceof Date || Array.isArray(item)) {
		lines.push(`${pad}- ${yamlScalar(item)}`);
		return;
	}
	// Object item: first key on the `- ` line, the rest aligned under it.
	const entries = Object.entries(item).filter(([, v]) => v !== undefined && v !== null && v !== '');
	entries.forEach(([k, v], i) => {
		if (i === 0 && typeof v !== 'object') {
			if (typeof v === 'string' && v.includes('\n')) {
				lines.push(`${pad}- ${k}: |`);
				for (const line of v.split('\n')) lines.push(`${pad}    ${line}`);
			} else {
				lines.push(`${pad}- ${k}: ${yamlScalar(v)}`);
			}
		} else if (i === 0) {
			lines.push(`${pad}- ${k}:`);
			if (Array.isArray(v)) for (const sub of v) emitArrayItem(lines, sub, indent + 4);
			else for (const [sk, sv] of Object.entries(v)) emitEntry(lines, sk, sv, indent + 4);
		} else {
			emitEntry(lines, k, v, indent + 2);
		}
	});
}

// Serialize an object to a full `---`-fenced YAML frontmatter block (trailing
// newline included). undefined / null / empty-string values and empty arrays
// are omitted (so an empty `faqs` list simply disappears). Key order follows
// the object's insertion order — callers control the field order.
export function frontmatter(obj) {
	const lines = [];
	for (const [k, v] of Object.entries(obj)) {
		if (v === undefined || v === null || v === '') continue;
		if (Array.isArray(v) && v.length === 0) continue;
		emitEntry(lines, k, v, 0);
	}
	return `---\n${lines.join('\n')}\n---\n`;
}
