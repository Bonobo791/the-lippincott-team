// Task 7 of the WordPress→Tina migration: convert the two cached WP legal
// pages — `privacy-policy` and `terms-and-conditions` (scripts/migrate/data/
// pages.json) — into src/content/page/<slug>.mdx matching the page
// collection's block-based shape (tina/collections/page.ts):
//
//   ---
//   seoTitle: ...           (heads.json <title>, keyed by page.link;
//                            fallback: decoded page title)
//   blocks:
//     - body: |
//         <converted markdown>
//       _template: content
//   ---
//
// Body pipeline (see lib/convert.mjs header): htmlToMarkdown() →
// resolveImages() with the explicit 3-arg form → strip external images →
// mdxEscape(). privacy-policy is plain Gutenberg; terms-and-conditions is a
// Complianz-generated document inside an Elementor text-editor widget — the
// converter's stripElementor() unwraps the wrapper, so no chrome cutting is
// needed beyond it (the page-title hero/CTA chrome on the live pages comes
// from the WP theme, not content.rendered).
//
//   node scripts/migrate/legal.mjs
import { writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import {
	htmlToMarkdown,
	resolveImages,
	mdxEscape,
	frontmatter,
	drainStrippedVideos,
} from './lib/convert.mjs';

const MIGRATE_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(MIGRATE_DIR, 'data');
const PAGE_DIR = join(MIGRATE_DIR, '..', '..', 'src', 'content', 'page');

function readJson(name) {
	return JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'));
}

const pages = readJson('pages.json');
const heads = readJson('heads.json');
const urlMap = new Map(Object.entries(readJson('url-map.json')));

const decode = (s) => parse(s ?? '').text.trim();

const SLUGS = ['privacy-policy', 'terms-and-conditions'];
const targets = SLUGS.map((slug) => {
	const page = pages.find((p) => p.slug === slug);
	if (!page) throw new Error(`page not found in pages.json: ${slug}`);
	return page;
});

// Remove any image still pointing at an absolute http(s) URL after
// resolution, same contract as blog.mjs / team.mjs / community.mjs.
function stripExternalImages(markdown, slug) {
	return markdown.replace(/!\[[^\]]*\]\((https?:[^)\s]+)[^)]*\)/g, (_match, url) => {
		console.log(`  STRIPPED external image in ${slug}: ${url}`);
		return '';
	});
}

let written = 0;
let skipped = 0;
for (const page of targets) {
	const target = join(PAGE_DIR, `${page.slug}.mdx`);
	if (existsSync(target)) {
		console.log(`SKIP ${page.slug} — ${target} already exists (slug collision)`);
		skipped++;
		continue;
	}

	const { markdown, images } = htmlToMarkdown(page.content.rendered);
	const resolved = resolveImages(markdown, urlMap, images);
	const body = mdxEscape(stripExternalImages(resolved, page.slug));

	const file =
		frontmatter({
			seoTitle: decode(heads[page.link]?.title) || decode(page.title.rendered),
			blocks: [{ body, _template: 'content' }],
		}) + '\n';

	await writeFile(target, file);
	written++;
	console.log(`WROTE src/content/page/${page.slug}.mdx (${images.length} image(s))`);
}

const videos = drainStrippedVideos();
if (videos.length > 0) {
	console.log(`NOTE: ${videos.length} video(s) stripped from legal page bodies:`);
	for (const v of videos) console.log(`  ${v}`);
}

console.log(`\nDone: ${written} written, ${skipped} skipped, ${targets.length} total.`);
