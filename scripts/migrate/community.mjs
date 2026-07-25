// Task 6 of the WordPress→Tina migration: convert the 13 cached WP pages
// (scripts/migrate/data/pages.json) that descend from the two hub pages —
// `northwest-houston-real-estate` (9 pages incl. nested bridgeland,
// towne-lake, elyson) and `northwest-houston-schools-real-estate` (4 ISDs) —
// into src/content/community/<full-nested-path>.mdx matching the Tina
// community collection shape (tina/collections/community.ts):
//
//   ---
//   title: ...              (title.rendered, decoded)
//   description: ...        (heads.json meta description, keyed by page.link)
//   heroImage: /uploads/... (featured_media → media.json → url-map;
//                            fallback: first content image)
//   intro: ...              (first substantive paragraph, plain text)
//   ---
//
//   <markdown body — the remainder after the intro paragraph is lifted out>
//
// `faqs` is omitted entirely (per task brief). Note: 12 of the 13 pages DO
// carry an Elementor n-accordion widget, but it is the same generic 5-question
// "Why Work With The Lippincott Team?" FAQ on every page (only Q2 is
// localized) — team boilerplate, not community FAQ. It stays in the body as
// ordinary headings/paragraphs for editors to trim in Tina.
//
// Path layout: the WP page hierarchy (walk `parent` ids from the hub down)
// becomes the directory structure, preserving the source URLs, e.g.
//   src/content/community/northwest-houston-real-estate/cypress-tx-real-estate/bridgeland-real-estate.mdx
// The Plan 2 sample cypress-tx-real-estate.mdx is deliberately overwritten.
//
// Body shaping: 12 of the 13 pages share one Elementor template (hero +
// "Serving X" main content + closing CTA). Cut before conversion:
// - the hardcoded market-stats row ("342+ Active Listings / $450K Median
//   Price / CFISD Schools Top Rated / 100+ Miles Parks & Trails") — identical
//   on all 12 template pages (it even claims "CFISD Schools" on the other
//   ISDs' pages), non-portable stale data. Identified structurally: an e-con
//   container of >= 6 heading widgets with no text-editor, image, or link.
// Everything else (eyebrow texts, icon-grid linked images, the generic team
// FAQ, the closing CTA sections) is kept — editors trim in Tina. IDX
// iframes/scripts and Google Maps embeds are dropped by the converter itself.
//
//   node scripts/migrate/community.mjs
import { writeFile, mkdir, appendFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
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
const COMMUNITY_DIR = join(MIGRATE_DIR, '..', '..', 'src', 'content', 'community');

function readJson(name) {
	return JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'));
}

const pages = readJson('pages.json');
const heads = readJson('heads.json');
const media = readJson('media.json');
const urlMap = new Map(Object.entries(readJson('url-map.json')));
const mediaById = new Map(media.map((m) => [m.id, m]));

// The 13 targets: descendants of the two hub pages (hubs excluded), ordered
// by menu_order within each level for deterministic output.
const HUB_SLUGS = ['northwest-houston-real-estate', 'northwest-houston-schools-real-estate'];
function collectTargets() {
	const out = [];
	const walk = (parentId, path) => {
		const children = pages
			.filter((p) => p.parent === parentId)
			.sort((a, b) => a.menu_order - b.menu_order);
		for (const child of children) {
			const childPath = [...path, child.slug];
			out.push({ page: child, path: childPath });
			walk(child.id, childPath);
		}
	};
	for (const slug of HUB_SLUGS) {
		const hub = pages.find((p) => p.slug === slug);
		if (!hub) throw new Error(`hub page not found in pages.json: ${slug}`);
		walk(hub.id, [hub.slug]);
	}
	return out;
}
const targets = collectTargets();
if (targets.length !== 13) console.log(`WARNING: expected 13 community pages, found ${targets.length}`);

// Remove the hardcoded market-stats row (see header). The widget nests two
// matching containers; only the outermost is removed.
function removeStatsRows(root) {
	const matches = root.querySelectorAll('.e-con').filter((c) => {
		const headingWidgets = c.querySelectorAll('[class*=elementor-widget-heading]');
		return (
			headingWidgets.length >= 6 &&
			!c.querySelector('[class*=elementor-widget-text-editor]') &&
			!c.querySelector('img') &&
			!c.querySelector('a')
		);
	});
	const matchSet = new Set(matches);
	let removed = 0;
	for (const m of matches) {
		let ancestor = m.parentNode;
		let nested = false;
		while (ancestor) {
			if (matchSet.has(ancestor)) {
				nested = true;
				break;
			}
			ancestor = ancestor.parentNode;
		}
		if (!nested) {
			m.remove();
			removed++;
		}
	}
	return removed;
}

// Lift the first substantive paragraph out of the body for the `intro` field:
// the first <p> with >= 40 chars of text outside links (skips eyebrow labels
// and link-only CTA paragraphs) and no image inside. Returns plain text.
const MIN_INTRO_LEN = 40;
function extractIntro(root) {
	for (const p of root.querySelectorAll('p')) {
		if (p.querySelector('img')) continue;
		const ownText = p.childNodes
			.filter((n) => n.nodeName !== 'A')
			.map((n) => n.text)
			.join('')
			.replace(/\s+/g, ' ')
			.trim();
		if (ownText.length >= MIN_INTRO_LEN) {
			p.remove();
			return p.text.replace(/\s+/g, ' ').trim();
		}
	}
	return undefined;
}

function heroImageFor(page, images) {
	const item = mediaById.get(page.featured_media);
	if (item?.source_url) {
		const local = urlMap.get(normalizeMediaUrl(item.source_url));
		if (local) return local;
		console.log(`  NOTE ${page.slug}: featured_media ${page.featured_media} not in url-map, using first content image`);
	}
	const first = images.find((img) => urlMap.has(img.src));
	if (first) return urlMap.get(first.src);
	return undefined;
}

let written = 0;
for (const { page, path } of targets) {
	const root = parse(page.content.rendered);

	const statsRemoved = removeStatsRows(root);
	const intro = extractIntro(root);

	const { markdown, images } = htmlToMarkdown(root.toString());
	const resolved = resolveImages(markdown, urlMap, images);
	const body = mdxEscape(stripExternalImages(resolved, page.slug));

	const relPath = `${path.join('/')}.mdx`;
	const target = join(COMMUNITY_DIR, relPath);
	const overwrote = existsSync(target);

	const file =
		frontmatter({
			title: decode(page.title.rendered),
			description: decode(heads[page.link]?.description) || undefined,
			heroImage: heroImageFor(page, images),
			intro,
		}) + `\n${body}\n`;

	await mkdir(dirname(target), { recursive: true });
	await writeFile(target, file);
	written++;
	console.log(
		`WROTE src/content/community/${relPath}${overwrote ? ' (overwrote existing)' : ''}` +
			` | stats=${statsRemoved} intro=${intro ? intro.length + ' chars' : '—'} images=${images.length}`,
	);
}

// Append newly stripped video URLs to videos.txt (deduped against what's
// already recorded there from earlier tasks).
const videos = drainStrippedVideos();
if (videos.length > 0) {
	const videosTxt = join(DATA_DIR, 'videos.txt');
	const existing = readFileSync(videosTxt, 'utf8');
	const fresh = videos.filter((v) => !existing.includes(v));
	if (fresh.length > 0) {
		await appendFile(videosTxt, `\n# additional mp4s stripped during community migration (Task 6)\n${fresh.join('\n')}\n`);
		console.log(`NOTE: appended ${fresh.length} new video URL(s) to videos.txt`);
	} else {
		console.log(`NOTE: ${videos.length} video(s) stripped from community bodies (all already in videos.txt)`);
	}
}

console.log(`\nDone: ${written} written, ${targets.length} total.`);
