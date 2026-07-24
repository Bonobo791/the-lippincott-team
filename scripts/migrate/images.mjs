// Task 3 of the WordPress→Tina migration: download every image referenced by
// the cached WP data into public/uploads/, preserving the wp-content/uploads
// path structure, and write scripts/migrate/data/url-map.json mapping each
// source URL to its local /uploads/... path (Tasks 4–7 resolve __IMG__ tokens
// and hero/photo fields through that map).
//
//   node scripts/migrate/images.mjs
//
// Sources scanned:
//   - content.rendered of every cached page/post (src / srcset / poster attrs)
//   - source_url of every media.json item
// Skipped: .mp4 / video mime types, decorative 32-hex-named SVGs, and any URL
// not under lippincottteam.com/wp-content/uploads/ (NitroPack CDN URLs are
// rewritten back to their origin uploads URL when recoverable; none currently
// occur in the cache). Media item 830 is an unreadable placeholder with a null
// source_url and is skipped gracefully.
//
// Idempotent: existing files are not re-downloaded. Exits non-zero only if a
// download fails.
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeMediaUrl } from './lib/convert.mjs';

const SITE = 'https://lippincottteam.com';
const UPLOADS_MARKER = '/wp-content/uploads/';
const UA =
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MIGRATE_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(MIGRATE_DIR, 'data');
const PUBLIC_UPLOADS = join(MIGRATE_DIR, '..', '..', 'public', 'uploads');

// Same rule as convert.mjs: 32-hex-named SVGs are Elementor/uichemy icons.
const DECORATIVE_SVG = /\/[0-9a-f]{32}\.svg(\?.*)?$/;
const VIDEO_EXT = /\.(mp4|mov|webm|m4v)(\?|#|$)/i;

function readJson(name) {
	return JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'));
}

// If a URL is CDN-wrapped (NitroPack) rather than an origin uploads URL,
// recover the origin URL from the embedded wp-content/uploads path. Returns
// null when no uploads path is present (URL is out of scope).
function toOriginUploadsUrl(url) {
	if (url.includes(UPLOADS_MARKER)) return url;
	const decoded = decodeURIComponent(url);
	const i = decoded.indexOf(UPLOADS_MARKER);
	if (i === -1) return null;
	return SITE + decoded.slice(i);
}

// Extract uploads URLs from one HTML string: src and poster hold a single URL,
// srcset holds comma-separated "<url> <descriptor>" entries. URLs may contain
// literal spaces (the site's video filenames do), so srcset descriptors are
// stripped from the end rather than splitting on whitespace.
function extractFromHtml(html, add) {
	for (const m of html.matchAll(/\b(?:src|poster)\s*=\s*"([^"]*wp-content\/uploads\/[^"]*)"/g)) {
		add(m[1]);
	}
	for (const m of html.matchAll(/\bsrcset\s*=\s*"([^"]*wp-content\/uploads\/[^"]*)"/g)) {
		for (const entry of m[1].split(',')) {
			const url = entry.trim().replace(/\s+\d+[wx]\s*$/, '');
			if (url.includes('/wp-content/uploads/')) add(url);
		}
	}
}

const main = async () => {
	const pages = readJson('pages.json');
	const posts = readJson('posts.json');
	const media = readJson('media.json');

	const found = new Set(); // normalized source URLs
	const rawVariant = new Map(); // normalized URL -> raw form (when they differ)
	let skippedVideos = 0;
	let skippedDecorative = 0;
	let skippedUnrecoverable = 0;

	const add = (raw, { isVideo = false } = {}) => {
		const trimmed = raw?.trim();
		const cleaned = normalizeMediaUrl(trimmed);
		if (!cleaned) return;
		const origin = toOriginUploadsUrl(cleaned);
		if (!origin) {
			skippedUnrecoverable++;
			return;
		}
		if (isVideo || VIDEO_EXT.test(origin)) {
			skippedVideos++;
			return;
		}
		if (DECORATIVE_SVG.test(origin)) {
			skippedDecorative++;
			return;
		}
		found.add(origin);
		// Some uploads genuinely have a zero-width space in the server-side
		// filename (the team photos): the cleaned URL 404s and the raw form is
		// needed to fetch them. Remember the raw variant for a fallback retry.
		if (trimmed !== cleaned) rawVariant.set(origin, toOriginUploadsUrl(trimmed) ?? trimmed);
	};

	for (const item of [...pages, ...posts]) extractFromHtml(item.content?.rendered ?? '', add);
	for (const m of media) {
		// Media 830 (null source_url, unreadable via REST) lands here.
		if (!m.source_url) continue;
		add(m.source_url, { isVideo: m.media_type === 'video' || m.mime_type?.startsWith('video/') });
	}

	// Deterministic destination paths: /uploads/<yyyy>/<mm>/<filename>, with
	// -2/-3/... suffixes if two different source URLs collide on one path.
	const usedPaths = new Set();
	const urlMap = {}; // source URL -> local /uploads/... path
	for (const url of [...found].sort()) {
		const { pathname } = new URL(url);
		const rel = decodeURIComponent(pathname.slice(pathname.indexOf(UPLOADS_MARKER) + UPLOADS_MARKER.length))
			.replace(/\.\./g, ''); // belt-and-braces against traversal
		const dot = rel.lastIndexOf('.');
		let candidate = rel;
		for (let n = 2; usedPaths.has(candidate); n++) {
			candidate = dot === -1 ? `${rel}-${n}` : `${rel.slice(0, dot)}-${n}${rel.slice(dot)}`;
		}
		usedPaths.add(candidate);
		urlMap[url] = `/uploads/${candidate}`;
	}

	// Download with a small concurrency pool; skip files already on disk.
	const entries = Object.entries(urlMap);
	let downloaded = 0;
	let alreadyExisted = 0;
	const failures = [];
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(6, entries.length) }, async () => {
			while (next < entries.length) {
				const [url, localPath] = entries[next++];
				const dest = join(PUBLIC_UPLOADS, localPath.slice('/uploads/'.length));
				if (existsSync(dest)) {
					alreadyExisted++;
					continue;
				}
				try {
					let res = await fetch(url, { headers: { 'User-Agent': UA } });
					// Retry once with the raw (un-normalized) URL: a few uploads
					// have a zero-width space in the real server-side filename.
					const raw = rawVariant.get(url);
					if (!res.ok && raw) {
						res = await fetch(raw, { headers: { 'User-Agent': UA } });
					}
					if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
					await mkdir(dirname(dest), { recursive: true });
					await writeFile(dest, Buffer.from(await res.arrayBuffer()));
					downloaded++;
				} catch (err) {
					failures.push(`${url} — ${err.message}`);
				}
			}
		}),
	);

	await writeJson(join(DATA_DIR, 'url-map.json'), urlMap);

	console.log(`found: ${found.size}`);
	console.log(`skipped-videos: ${skippedVideos}`);
	console.log(`skipped-decorative: ${skippedDecorative}`);
	if (skippedUnrecoverable) console.log(`skipped-non-origin (unrecoverable): ${skippedUnrecoverable}`);
	console.log(`downloaded: ${downloaded}`);
	console.log(`already-existed: ${alreadyExisted}`);
	console.log(`failed: ${failures.length}`);
	for (const f of failures) console.error(`  FAILED ${f}`);
	if (failures.length > 0) process.exit(1);
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

async function writeJson(path, value) {
	await writeFile(path, JSON.stringify(value, null, 2) + '\n');
}
