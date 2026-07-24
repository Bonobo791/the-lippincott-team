// Smoke run for the HTML → MDX converter (Task 2 verification, not part of
// the migration pipeline). Pipes the 3 cached samples through convert.mjs and
// prints the resulting frontmatter + markdown for eyeball review:
//
//   node scripts/migrate/smoke-convert.mjs
import { readFile } from 'node:fs/promises';
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

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), 'data');

const pages = JSON.parse(await readFile(join(DATA_DIR, 'pages.json'), 'utf8'));
const posts = JSON.parse(await readFile(join(DATA_DIR, 'posts.json'), 'utf8'));

// WP's gmt datetime → ISO-8601 with Z (matches the starter's frontmatter style).
const iso = (wpGmt) => new Date(`${wpGmt}Z`).toISOString();

function run(label, item, fm) {
	const { markdown, images } = htmlToMarkdown(item.content.rendered);
	const resolved = resolveImages(markdown, new Map()); // no map yet: original URLs
	const safe = mdxEscape(resolved);
	console.log('='.repeat(78));
	console.log(`### ${label} — ${item.slug}`);
	console.log('='.repeat(78));
	console.log(frontmatter(fm));
	console.log(safe);
	console.log();
	console.log(`[${images.length} image(s) extracted]`);
	for (const img of images) console.log(`  ${img.token} alt=${JSON.stringify(img.alt)} src=${img.src}`);
	console.log();
}

// Team bio (Elementor).
const amy = pages.find((p) => p.slug === 'amy-lippincott-2');
run('TEAM', amy, {
	name: amy.title.rendered,
	role: undefined, // sourced from heads.json/ACF in Task 5
	description: undefined,
	order: 1,
});

// Community page (Elementor, 54KB).
const bridgeland = pages.find((p) => p.slug === 'bridgeland-real-estate');
run('COMMUNITY', bridgeland, {
	title: bridgeland.title.rendered,
	description: 'Homes for sale and living in Bridgeland, Texas.',
	intro: undefined, // comes from the first paragraph in Task 6
	faqs: [], // omitted entirely when empty
});

// Blog post (WP blocks). Task 4 will prefer heads.json meta descriptions;
// here the WP excerpt is entity-decoded and stripped of tags for the preview.
const post = posts.find((p) => p.slug === 'how-real-estate-agents-price-homes');
const excerptText = parse(post.excerpt.rendered).text.trim().replace(/\s*\[…\]$/, '');
run('BLOG', post, {
	title: post.title.rendered,
	description: excerptText,
	pubDate: iso(post.date_gmt),
	updatedDate: iso(post.modified_gmt),
	heroImage: undefined, // Task 3 fills from featured_media
});

console.log('='.repeat(78));
console.log('Stripped videos (drainStrippedVideos):');
console.log(drainStrippedVideos());
console.log('After drain:', drainStrippedVideos());
