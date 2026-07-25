// One-off migration fetch script: caches all WordPress source data locally so
// later migration steps never re-hit the live site.
//
//   node scripts/migrate/fetch.mjs
//
// Writes into scripts/migrate/data/ (gitignored):
//   pages.json  — all 35 WP pages (full objects)
//   posts.json  — all 23 WP posts (full objects)
//   media.json  — all 188 media items (id, source_url, media_type, mime_type)
//   heads.json  — <title> + meta description for each of the 50 migrated URLs
//   videos.txt  — mp4 source URLs + pages referencing mp4s (YouTube checklist)
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const SITE = 'https://lippincottteam.com';
const API = `${SITE}/wp-json/wp/v2`;
const UA =
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), 'data');
const FETCH_TIMEOUT_MS = 30_000;

const HUB_SLUGS = ['northwest-houston-real-estate', 'northwest-houston-schools-real-estate'];
const LEGAL_SLUGS = ['privacy-policy', 'terms-and-conditions'];

async function fetchJson(url) {
	const res = await fetch(url, {
		headers: { 'User-Agent': UA },
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});
	if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
	return { body: await res.json(), headers: res.headers };
}

async function fetchText(url) {
	const res = await fetch(url, {
		headers: { 'User-Agent': UA },
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});
	if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
	return res.text();
}

// Fetch a paginated WP REST collection in full.
async function fetchCollection(path) {
	const first = await fetchJson(`${API}/${path}&page=1`);
	const totalPages = Number(first.headers.get('X-WP-TotalPages') ?? 1);
	const total = Number(first.headers.get('X-WP-Total') ?? first.body.length);
	const rest = await Promise.all(
		Array.from({ length: totalPages - 1 }, (_, i) => fetchJson(`${API}/${path}&page=${i + 2}`)),
	);
	return { items: [first.body, ...rest.map((r) => r.body)].flat(), total };
}

// The REST API reports X-WP-Total: 188 media but only lists 187 — attachment
// 830 (uploaded 2026-05-25) is attached to a non-public post and 401s on every
// read (found by probing the ID gap). Cached as a placeholder so the count
// stays honest; its source_url is unknowable without auth.
const UNREADABLE_MEDIA = [
	{
		id: 830,
		source_url: null,
		media_type: null,
		mime_type: null,
		note: 'unreadable via REST API (HTTP 401; attached to a non-public post)',
	},
];

async function fetchMedia() {
	const { items, total } = await fetchCollection('media?per_page=100&_fields=id,source_url,media_type,mime_type');
	const ids = new Set(items.map((m) => m.id));
	for (const extra of UNREADABLE_MEDIA) if (!ids.has(extra.id)) items.push(extra);
	if (items.length !== total) {
		console.warn(`warning: media count ${items.length} != X-WP-Total ${total}`);
	}
	return items;
}

async function writeJson(name, value) {
	await writeFile(join(DATA_DIR, name), JSON.stringify(value, null, 2) + '\n');
}

// Run async tasks with a small concurrency limit.
async function pool(items, limit, fn) {
	const results = new Array(items.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			while (next < items.length) {
				const i = next++;
				results[i] = await fn(items[i], i);
			}
		}),
	);
	return results;
}

// The 50 migrated URLs: 12 team bios (children of /about/), 13 community/school
// pages (descendants of the two hubs, hubs themselves excluded), 23 posts, and
// the 2 legal pages. Everything else (home, about, contact-us, blog index, the
// hubs, team-member-page-design, opt-out-preferences) is excluded.
function migratedUrls(pages, posts) {
	const hubIds = new Set(pages.filter((p) => HUB_SLUGS.includes(p.slug)).map((p) => p.id));
	const aboutId = pages.find((p) => p.slug === 'about')?.id;
	const byId = new Map(pages.map((p) => [p.id, p]));

	const isDescendantOfHub = (page) => {
		let cur = page;
		while (cur && cur.parent) {
			if (hubIds.has(cur.parent)) return true;
			cur = byId.get(cur.parent);
		}
		return false;
	};

	const urls = [];
	for (const p of pages) {
		if (LEGAL_SLUGS.includes(p.slug) || p.parent === aboutId || isDescendantOfHub(p)) {
			urls.push(p.link);
		}
	}
	for (const post of posts) urls.push(post.link);
	// Code-unit comparator: identical ordering to the default sort.
	return urls.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function extractHead(html) {
	const doc = parse(html);
	const title = doc.querySelector('title')?.text.trim() ?? '';
	const description =
		doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';
	return { title, description };
}

function extractGtmId(html) {
	return html.match(/googletagmanager\.com\/gtm\.js\?id=([A-Za-z0-9-]+)/)?.[1] ?? null;
}

// Fallback: the site actually loads GA4 gtag (via Complianz), not a GTM container.
function extractGa4Id(html) {
	return html.match(/googletagmanager\.com\/gtag\/js\?id=([A-Za-z0-9-]+)/)?.[1] ?? null;
}

const main = async () => {
	await mkdir(DATA_DIR, { recursive: true });

	// Pages and posts each fit in one page of 100; media spans two.
	const [pages, posts, media] = await Promise.all([
		fetchCollection('pages?per_page=100').then((r) => r.items),
		fetchCollection('posts?per_page=100').then((r) => r.items),
		fetchMedia(),
	]);

	await writeJson('pages.json', pages);
	await writeJson('posts.json', posts);
	await writeJson('media.json', media);

	// Live HTML heads for the migrated URLs (SEO titles/descriptions; the REST
	// API does not expose the rendered <head>).
	const urls = migratedUrls(pages, posts);
	const heads = {};
	let gtmId = null;
	let ga4Id = null;
	await pool(urls, 5, async (url) => {
		const html = await fetchText(url);
		heads[url] = extractHead(html);
		gtmId ??= extractGtmId(html);
		ga4Id ??= extractGa4Id(html);
	});
	await writeJson('heads.json', heads);

	// videos.txt — owner's YouTube upload checklist.
	const mp4s = media.filter((m) => m.mime_type === 'video/mp4').map((m) => m.source_url);
	const referencing = [...pages, ...posts]
		.filter((item) => item.content?.rendered?.includes('.mp4'))
		.map((item) => item.link);
	const videosTxt = [
		gtmId
			? `# GTM container (Plan 4 handoff): ${gtmId}`
			: `# GTM container (Plan 4 handoff): none found on the live site (checked all ${urls.length} migrated URLs).` +
				` The only Google tag is GA4 gtag ${ga4Id ?? '(none found)'}, loaded via Complianz (which the spec drops).`,
		'',
		`# mp4 source URLs (${mp4s.length}) — upload to YouTube, skip in image migration`,
		...mp4s,
		'',
		`# Pages/posts whose content references an mp4 (${referencing.length})`,
		...referencing,
		'',
	].join('\n');
	await writeFile(join(DATA_DIR, 'videos.txt'), videosTxt);

	console.log(`pages: ${pages.length}`);
	console.log(`posts: ${posts.length}`);
	console.log(`media: ${media.length}`);
	console.log(`head entries: ${Object.keys(heads).length}`);
	console.log(`mp4s: ${mp4s.length}`);
	console.log(`pages referencing mp4: ${referencing.length}`);
	const gtmSummary = gtmId ?? `none (GA4 only: ${ga4Id ?? 'none found'})`;
	console.log(`GTM container: ${gtmSummary}`);
};

try {
	await main();
} catch (err) {
	console.error(err);
	process.exit(1);
}
