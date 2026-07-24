// Task 5 of the WordPress→Tina migration: convert the 12 cached WP pages
// whose parent is the `about` page (scripts/migrate/data/pages.json) into
// src/content/team/<slug>.mdx matching the Tina team collection shape
// (tina/collections/team.ts):
//
//   ---
//   name: ...              (title.rendered, tags stripped)
//   role: ...              (hero .uc-meta-title; omitted when generic)
//   phone: ...             (sidebar contact span, best-effort scrape)
//   email: ...             (sidebar contact span, best-effort scrape)
//   photo: /uploads/...    (sidebar .uc-agent-img via url-map; featured_media fallback)
//   description: ...       (heads.json meta description)
//   order: ...             (menu_order)
//   ---
//
//   <markdown bio body>
//
// Filenames keep the WP slug INCLUDING the `-2` suffix (exact URL
// preservation; the about/[...slug].astro route renders /about/<slug>-2/).
// The Plan 2 sample amy-lippincott-2.mdx is deliberately overwritten.
//
// Body shaping: bio content.rendered is a fixed two-widget Elementor layout
// (uichemy-agent-hero + uichemy-main-content) — the only genuine bio prose
// lives in .uc-main .uc-paras. Everything else is site chrome: the hero
// (name/role already captured into fields), the sidebar contact card (data
// captured into phone/email/photo), stats counters, and the CTA block
// (generic — it even names the wrong person on some pages). One template
// tagline paragraph ("We combine market expertise…") repeats verbatim on 11
// of 12 bios and is dropped as boilerplate.
//
//   node scripts/migrate/team.mjs
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
	normalizeMediaUrl,
	drainStrippedVideos,
	decode,
	stripExternalImages,
} from './lib/convert.mjs';

const MIGRATE_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(MIGRATE_DIR, 'data');
const TEAM_DIR = join(MIGRATE_DIR, '..', '..', 'src', 'content', 'team');

function readJson(name) {
	return JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'));
}

const pages = readJson('pages.json');
const heads = readJson('heads.json');
const media = readJson('media.json');
const urlMap = new Map(Object.entries(readJson('url-map.json')));
const mediaById = new Map(media.map((m) => [m.id, m]));

const about = pages.find((p) => p.slug === 'about');
if (!about) throw new Error('about page not found in pages.json');
const bios = pages.filter((p) => p.parent === about.id);
if (bios.length !== 12) console.log(`WARNING: expected 12 bios, found ${bios.length}`);

const PHONE = /\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}/;
// Template tagline repeated verbatim across the bios — team-voice marketing,
// not bio prose. Dropped (see header comment).
const BOILERPLATE_PREFIX = 'We combine market expertise with a personal touch';
// Hero meta-title is the member's role only when it names one; the rest say
// just "The Lippincott Team" (site chrome, not a role).
const GENERIC_ROLE = /^the lippincott team$/i;

// Sidebar contact card: three spans (phone, email, address). Identify by
// shape — the address span never contains '@' or a phone pattern.
function scrapeContact(root) {
	const spans = root.querySelectorAll('.uc-sidebar .uc-contact-link span').map((s) => s.text.trim());
	const email = spans.find((t) => t.includes('@'));
	const phone = spans.find((t) => PHONE.test(t));
	return { phone, email };
}

function photoFor(page, root) {
	// First non-SVG content image is the sidebar agent portrait.
	const src = normalizeMediaUrl(root.querySelector('img.uc-agent-img')?.getAttribute('src'));
	if (src && urlMap.has(src)) return urlMap.get(src);
	if (src) console.log(`  NOTE ${page.slug}: agent image not in url-map (${src}), trying featured_media`);
	const item = mediaById.get(page.featured_media);
	if (item?.source_url) return urlMap.get(normalizeMediaUrl(item.source_url));
	return undefined;
}

let written = 0;
for (const page of bios) {
	const root = parse(page.content.rendered);

	const role = decode(root.querySelector('.uc-meta-title')?.text);
	const { phone, email } = scrapeContact(root);

	// Body: only the .uc-paras prose, minus the repeated template tagline.
	const paras = root
		.querySelectorAll('.uc-main .uc-paras p')
		.filter((p) => !p.text.trim().startsWith(BOILERPLATE_PREFIX));
	const fragment = paras.map((p) => p.toString()).join('\n');
	const { markdown, images } = htmlToMarkdown(fragment);
	const resolved = resolveImages(markdown, urlMap, images);
	const body = mdxEscape(stripExternalImages(resolved, page.slug));

	const target = join(TEAM_DIR, `${page.slug}.mdx`);
	const overwrote = existsSync(target);

	const file =
		frontmatter({
			name: decode(page.title.rendered),
			role: GENERIC_ROLE.test(role) ? undefined : role || undefined,
			phone,
			email,
			photo: photoFor(page, root),
			description: decode(heads[page.link]?.description) || undefined,
			order: page.menu_order,
		}) + `\n${body}\n`;

	await writeFile(target, file);
	written++;
	console.log(
		`WROTE src/content/team/${page.slug}.mdx${overwrote ? ' (overwrote existing)' : ''}` +
			` | role=${role || '—'} phone=${phone ?? '—'} email=${email ?? '—'} paras=${paras.length}`,
	);
}

const videos = drainStrippedVideos();
if (videos.length > 0) {
	console.log(`NOTE: ${videos.length} video(s) stripped from bio bodies:`);
	for (const v of videos) console.log(`  ${v}`);
}

console.log(`\nDone: ${written} written, ${bios.length} total.`);
