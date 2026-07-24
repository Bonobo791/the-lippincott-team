// Task 8 of the WordPress→Tina migration: post-build URL verification.
// Run AFTER `pnpm build:local` (which regenerates dist/):
//
//   node scripts/migrate/verify.mjs
//
// Two checks, both against the static output in dist/client/:
//
// A. Migrated routes — all 50 migrated URLs (12 team + 13 community +
//    23 blog + 2 legal), derived from the keys of data/heads.json, must
//    have a built page at dist/client/<path>/index.html.
//
// B. Internal link check — every markdown link in the migrated MDX files
//    (src/content/{blog,team,community}, the two legal pages) that points
//    at lippincottteam.com or is root-relative must resolve to a built
//    page (or an existing file for asset-style paths like /uploads/...).
//
// Known gaps are reported but do NOT fail the run:
// - /opt-out-preferences/ — fetched WP page, deliberately unmigrated;
//   Plan 4 ships it as a redirect.
// - /contact-us/, /northwest-houston-real-estate/,
//   /northwest-houston-schools-real-estate/ — fetched WP pages held back
//   for Plan 4's hand-built pages (not part of the 50-URL content
//   migration scope).
// - thelippincottteam.com links — external Sierra platform, not this site.
// - The Complianz download.php link in terms-and-conditions — known dead
//   link on the source site, flagged for editors.
//
// Exit code is non-zero if any migrated route is missing or any internal
// link outside the known-gap list has no built target; every miss is
// listed.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATE_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(MIGRATE_DIR, '..', '..');
const DIST = join(ROOT, 'dist', 'client');
const CONTENT = join(ROOT, 'src', 'content');

const SITE_ORIGIN = 'https://lippincottteam.com';

// Paths a link may point at without a built page in this build — see the
// header comment for why each is exempt. Compared after normalization
// (fragment/query stripped, trailing slash enforced).
const KNOWN_GAP_PATHS = new Set([
	'/opt-out-preferences/',
	'/contact-us/',
	'/northwest-houston-real-estate/',
	'/northwest-houston-schools-real-estate/',
]);

// Individual dead links kept verbatim in the content for editors to fix.
const KNOWN_DEAD_LINKS = new Set([
	'https://lippincottteam.com/wp-content/plugins/complianz-terms-conditions/download.php',
]);

const errors = [];
const knownGapHits = new Map(); // path -> count

function fail(msg) {
	errors.push(msg);
}

// Normalize a link target to a site path with a single trailing slash
// (unless it looks like a file, e.g. /uploads/x.jpg or download.php).
function toPath(url) {
	let path;
	if (url.startsWith(SITE_ORIGIN)) path = url.slice(SITE_ORIGIN.length);
	else if (url.startsWith('/')) path = url;
	else return null;
	path = path.split('#')[0].split('?')[0];
	if (!path || !path.startsWith('/')) return null;
	if (/\.[a-z0-9]+$/i.test(path)) return path; // file-style path, keep as-is
	return path.endsWith('/') ? path : `${path}/`;
}

function builtPageExists(path) {
	if (/\.[a-z0-9]+$/i.test(path)) return existsSync(join(DIST, path));
	return existsSync(join(DIST, path, 'index.html'));
}

// --- Check A: the 50 migrated routes -------------------------------------

const heads = JSON.parse(readFileSync(join(MIGRATE_DIR, 'data', 'heads.json'), 'utf8'));
const urls = Object.keys(heads);
if (urls.length !== 50) fail(`expected 50 migrated URLs in heads.json, found ${urls.length}`);

let routesOk = 0;
for (const url of urls) {
	const path = toPath(url);
	if (builtPageExists(path)) routesOk++;
	else fail(`missing route: ${url} -> dist/client${path}index.html`);
}
console.log(`A. Migrated routes: ${routesOk}/${urls.length} present in dist/client/`);

// --- Check B: internal links in migrated MDX ------------------------------

function mdxFiles(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) out.push(...mdxFiles(full));
		else if (name.endsWith('.mdx')) out.push(full);
	}
	return out;
}

const files = [
	...mdxFiles(join(CONTENT, 'blog')),
	...mdxFiles(join(CONTENT, 'team')),
	...mdxFiles(join(CONTENT, 'community')),
	join(CONTENT, 'page', 'privacy-policy.mdx'),
	join(CONTENT, 'page', 'terms-and-conditions.mdx'),
];

// Markdown links [text](target); image embeds ![alt](src) are stripped
// first so only real links are checked. Link targets with a title
// ("url "title"") are not produced by the converter and not handled.
const LINK_RE = /\[[^\]]*\]\(([^)\s]+)\)/g;
let linksChecked = 0;
let linksSkippedExternal = 0;

for (const file of files) {
	const text = readFileSync(file, 'utf8').replace(/!\[[^\]]*\]\([^)]*\)/g, '');
	const rel = file.slice(ROOT.length + 1);
	for (const match of text.matchAll(LINK_RE)) {
		const target = match[1];
		if (/^(mailto:|tel:|#)/.test(target)) continue;
		if (target.includes('thelippincottteam.com')) {
			linksSkippedExternal++; // external Sierra platform
			continue;
		}
		if (KNOWN_DEAD_LINKS.has(target)) {
			knownGapHits.set(target, (knownGapHits.get(target) ?? 0) + 1);
			continue;
		}
		if (/^https?:\/\//.test(target) && !target.startsWith(SITE_ORIGIN)) {
			linksSkippedExternal++; // off-site link, nothing to verify
			continue;
		}
		const path = toPath(target);
		if (!path) continue;
		linksChecked++;
		if (builtPageExists(path)) continue;
		if (KNOWN_GAP_PATHS.has(path)) {
			knownGapHits.set(path, (knownGapHits.get(path) ?? 0) + 1);
			continue;
		}
		fail(`broken internal link in ${rel}: ${target}`);
	}
}

console.log(
	`B. Internal links: ${linksChecked} checked, ${linksSkippedExternal} external skipped`,
);
if (knownGapHits.size > 0) {
	console.log('   Known gaps (reported, not failures):');
	for (const [gap, count] of [...knownGapHits.entries()].sort()) {
		console.log(`   - ${gap} (${count} link${count === 1 ? '' : 's'})`);
	}
}

// --- Result ----------------------------------------------------------------

if (errors.length > 0) {
	console.error(`\nFAIL: ${errors.length} problem(s):`);
	for (const e of errors) console.error(`  - ${e}`);
	process.exit(1);
}
console.log('\nOK: all migrated routes and internal links verified.');
