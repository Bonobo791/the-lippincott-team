#!/usr/bin/env node
/**
 * Screenshot capture for the design-fidelity audit (Plan 5 / concept-to-launch G4).
 *
 * Usage:
 *   node scripts/audit/shoot.mjs --base https://lippincottteam.com --out .launch/qa/live
 *   node scripts/audit/shoot.mjs --base http://localhost:4321 --out .launch/qa/branch
 *
 * Captures full-page screenshots of every audit template at desktop/tablet/mobile,
 * plus scripted interaction shots (nav dropdown hover, FAQ accordion click), and
 * writes manifest.json with per-shot console/page errors.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Captured copy of the rendered HAR widget page (see
// scripts/audit/capture-har-widget.mjs). HAR's widget endpoint is
// PerimeterX-gated, so headless Chromium always gets the bot-check page —
// when a capture exists, the audit serves it for the iframe so reviews
// screenshots show the feed.
const HAR_CAPTURE = path.join(__dirname, '..', '..', '.launch', 'qa', 'reviews', 'har-widget-capture.html');

const TEMPLATES = [
	{ name: 'home', path: '/' },
	{ name: 'about', path: '/about/' },
	{ name: 'team-bio', path: '/about/amy-lippincott-2/' },
	{ name: 'contact', path: '/contact-us/' },
	{ name: 'reviews', path: '/reviews/' },
	{ name: 'hub-communities', path: '/northwest-houston-real-estate/' },
	{ name: 'hub-schools', path: '/northwest-houston-schools-real-estate/' },
	{ name: 'community', path: '/northwest-houston-real-estate/cypress-tx-real-estate/' },
	{ name: 'isd', path: '/northwest-houston-schools-real-estate/katy-isd-real-estate/' },
	{ name: 'blog-index', path: '/blog/' },
	{
		name: 'blog-post',
		path: '/blog/bridgeland-breakdown-where-every-village-has-its-own-personality-and-splash-pad/',
	},
];

const VIEWPORTS = [
	{ name: 'desktop', width: 1440, height: 900 },
	{ name: 'tablet', width: 768, height: 1024 },
	{ name: 'mobile', width: 375, height: 812 },
];

function parseArgs(argv) {
	const args = { base: null, out: null };
	for (let i = 2; i < argv.length; i++) {
		if (argv[i] === '--base') args.base = argv[++i];
		else if (argv[i] === '--out') args.out = argv[++i];
	}
	if (!args.base || !args.out) {
		console.error('Usage: node scripts/audit/shoot.mjs --base <url> --out <dir>');
		process.exit(2);
	}
	return args;
}

async function main() {
	const { base, out } = parseArgs(process.argv);
	await mkdir(out, { recursive: true });
	const browser = await chromium.launch();
	const manifest = { base, capturedAt: new Date().toISOString(), shots: [] };

	for (const viewport of VIEWPORTS) {
		const context = await browser.newContext({
			viewport: { width: viewport.width, height: viewport.height },
			deviceScaleFactor: 1,
		});
		for (const tpl of TEMPLATES) {
			const page = await context.newPage();
			if (existsSync(HAR_CAPTURE)) {
				await page.route('**/mopx_services/**', (route) =>
					route.fulfill({ path: HAR_CAPTURE, contentType: 'text/html' }),
				);
			}
			const errors = [];
			page.on('console', (msg) => {
				if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
			});
			page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
			const url = new URL(tpl.path, base).toString();
			const entry = { template: tpl.name, viewport: viewport.name, url, errors, files: [] };
			try {
				const response = await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
				entry.status = response?.status() ?? null;
				// Locator-based waits for the chrome we screenshot (never
				// networkidle — long-polling analytics keep it from settling).
				await page.locator('header').first().waitFor({ state: 'visible', timeout: 10_000 });
				await page.locator('main, [role="main"]').first().waitFor({ state: 'visible', timeout: 10_000 });
				// Let webfonts and lazy images settle.
				await page.evaluate(() => document.fonts.ready);
				await page.waitForTimeout(500);

				// Scroll to the bottom in steps so loading="lazy" images below
				// the fold load before the fullPage capture (fixes grey-card
				// artifacts in the home/hub audits), then settle back at top.
				await page.evaluate(
					() =>
						new Promise((resolve) => {
							let y = 0;
							const step = window.innerHeight;
							const timer = setInterval(() => {
								y += step;
								window.scrollTo(0, y);
								if (y >= document.documentElement.scrollHeight - window.innerHeight) {
									clearInterval(timer);
									resolve();
								}
							}, 200);
						}),
				);
				// Wait for the images the scroll brought into view to finish
				// loading (bounded, so one stuck asset can't hang the audit).
				await page.evaluate(
					() =>
						Promise.race([
							Promise.all(
								[...document.images]
									.filter((img) => !img.complete)
									.map((img) => new Promise((done) => { img.onload = img.onerror = done; })),
							),
							new Promise((done) => setTimeout(done, 15_000)),
						]),
				);
				await page.evaluate(() => window.scrollTo(0, 0));
				await page.waitForTimeout(300);

				const shotFile = `${tpl.name}-${viewport.name}.png`;
				await page.screenshot({ path: path.join(out, shotFile), fullPage: true });
				entry.files.push(shotFile);

				if (viewport.name === 'desktop') {
					// Interaction: hover the first nav item that has a dropdown.
					const navItem = page.locator('header nav li:has(ul), header nav li:has(div)').first();
					if (await navItem.count()) {
						await navItem.hover();
						await page.waitForTimeout(300);
						const f = `${tpl.name}-desktop-nav-dropdown.png`;
						await page.screenshot({ path: path.join(out, f) });
						entry.files.push(f);
					}
					// Interaction: open the first FAQ accordion item, if present.
					const faq = page.locator('details summary, [data-faq] button, button[aria-expanded]').first();
					if (await faq.count()) {
						await faq.click().catch(() => {});
						await page.waitForTimeout(300);
						const f = `${tpl.name}-desktop-faq-open.png`;
						await page.screenshot({ path: path.join(out, f) });
						entry.files.push(f);
					}
				}
				if (viewport.name === 'mobile') {
					// Interaction: open the mobile menu, if a toggle exists.
					const toggle = page.locator('header button[aria-expanded], header button[aria-controls]').first();
					if (await toggle.count()) {
						await toggle.click().catch(() => {});
						await page.waitForTimeout(300);
						const f = `${tpl.name}-mobile-menu-open.png`;
						await page.screenshot({ path: path.join(out, f) });
						entry.files.push(f);
					}
				}
			} catch (err) {
				entry.errors.push(`capture: ${err.message}`);
			}
			manifest.shots.push(entry);
			await page.close();
		}
		await context.close();
	}

	await browser.close();
	await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
	const errCount = manifest.shots.reduce((n, s) => n + s.errors.length, 0);
	console.log(`Captured ${manifest.shots.length} template/viewport combos to ${out} (${errCount} errors).`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
