// Task 4 of the WordPress→Tina migration: convert the 23 cached WP posts
// (scripts/migrate/data/posts.json) into src/content/blog/<slug>.mdx matching
// the starter demo posts' shape:
//
//   ---
//   title: ...
//   description: ...        (heads.json meta description, excerpt fallback)
//   pubDate: ...            (date_gmt → ISO with Z, unquoted)
//   updatedDate: ...        (modified_gmt)
//   heroImage: /uploads/... (featured_media → media.json → url-map.json)
//   ---
//
//   <markdown body>
//
// Body pipeline (see lib/convert.mjs header): htmlToMarkdown() →
// resolveImages() with the explicit 3-arg form → mdxEscape(). Any image that
// still points at an external URL after resolution (e.g. comment/avatar
// markup) is stripped and logged — migrated output must contain zero
// unresolved external images.
//
// Starter demo posts are kept: an existing target file is a slug collision —
// logged and skipped, never overwritten.
//
//   node scripts/migrate/blog.mjs
import { writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	htmlToMarkdown,
	resolveImages,
	mdxEscape,
	frontmatter,
	normalizeMediaUrl,
	drainStrippedVideos,
	decode,
	stripExternalImages,
} from './lib/convert.mjs';

const MIGRATE_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(MIGRATE_DIR, 'data');
const BLOG_DIR = join(MIGRATE_DIR, '..', '..', 'src', 'content', 'blog');

function readJson(name) {
	return JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'));
}

const posts = readJson('posts.json');
const heads = readJson('heads.json');
const media = readJson('media.json');
const urlMap = new Map(Object.entries(readJson('url-map.json')));
const mediaById = new Map(media.map((m) => [m.id, m]));

// WP's gmt datetime → ISO-8601 with Z (matches the starter's frontmatter
// style). Missing dates yield undefined (the field is simply omitted).
const iso = (wpGmt) => (wpGmt ? new Date(`${wpGmt}Z`).toISOString() : undefined);

function excerptFallback(post) {
	const text = decode(post.excerpt.rendered);
	return text.endsWith('[…]') ? text.slice(0, -'[…]'.length).trimEnd() : text;
}

// heads.json descriptions are scraped from the live <meta> tags and two
// failure modes showed up in review: (a) table dumps auto-generated from the
// first table on the page ("Top 10 ... ; 1, 77433 — Cypress, TX, 3,638 ; ..."),
// and (b) values truncated mid-clause by the SEO plugin's character cap. Both
// are worse than the WP excerpt, so fall back in those cases.
const TABLE_DUMP = /;\s*\d+,/;
const ELLIPSIS = /(?:\.\.\.|…)\s*$/;
const TERMINAL_PUNCT = /[.!?"”’)]\s*$/;

function descriptionFor(post) {
	const head = decode(heads[post.link]?.description);
	const excerpt = excerptFallback(post);
	if (!head || TABLE_DUMP.test(head) || ELLIPSIS.test(head)) return excerpt || undefined;
	if (!TERMINAL_PUNCT.test(head) && excerpt.length > head.length) return excerpt;
	return head;
}

// Featured image via url-map; falls back to the first resolvable content
// image (same pattern as community.mjs / team.mjs).
function heroImageFor(post, images) {
	if (post.featured_media) {
		const item = mediaById.get(post.featured_media);
		if (item?.source_url) {
			const local = urlMap.get(normalizeMediaUrl(item.source_url));
			if (local) return local;
			console.log(
				`  NOTE ${post.slug}: featured_media ${post.featured_media} not in url-map, using first content image`,
			);
		}
	}
	const first = images.find((img) => urlMap.has(img.src));
	if (first) return urlMap.get(first.src);
	return undefined;
}

let written = 0;
let skipped = 0;
for (const post of posts) {
	const target = join(BLOG_DIR, `${post.slug}.mdx`);
	if (existsSync(target)) {
		console.log(`SKIP ${post.slug} — ${target} already exists (slug collision)`);
		skipped++;
		continue;
	}

	const description = descriptionFor(post);

	const { markdown, images } = htmlToMarkdown(post.content.rendered);
	const resolved = resolveImages(markdown, urlMap, images);
	const body = mdxEscape(stripExternalImages(resolved, post.slug));

	const file =
		frontmatter({
			title: decode(post.title.rendered),
			description,
			pubDate: iso(post.date_gmt),
			updatedDate: iso(post.modified_gmt),
			heroImage: heroImageFor(post, images),
		}) + `\n${body}\n`;

	await writeFile(target, file);
	written++;
	console.log(`WROTE src/content/blog/${post.slug}.mdx (${images.length} image(s))`);
}

const videos = drainStrippedVideos();
if (videos.length > 0) {
	console.log(`NOTE: ${videos.length} video(s) stripped from post bodies:`);
	for (const v of videos) console.log(`  ${v}`);
}

console.log(`\nDone: ${written} written, ${skipped} skipped, ${posts.length} total.`);
