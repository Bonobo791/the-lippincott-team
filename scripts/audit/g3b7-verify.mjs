#!/usr/bin/env node
/**
 * One-off G3b-7 verification shots (task-specific; not part of the audit suite).
 * Captures /reviews/ at desktop+mobile and the home testimonial band into
 * .launch/qa/verify/. Usage: node scripts/audit/g3b7-verify.mjs --base <url>
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseIndex = process.argv.indexOf('--base');
const base = baseIndex === -1 ? undefined : process.argv[baseIndex + 1];
const out = path.resolve('.launch/qa/verify');
if (!base) { console.error('Usage: node scripts/audit/g3b7-verify.mjs --base <url>'); process.exit(2); }

await mkdir(out, { recursive: true });
const browser = await chromium.launch();

async function shot(name, url, viewport, clipTo = null) {
	const context = await browser.newContext({ viewport });
	const page = await context.newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	await page.goto(base + url, { waitUntil: 'networkidle' });
	if (clipTo) {
		const el = page.locator(clipTo).first();
		await el.scrollIntoViewIfNeeded();
		await el.screenshot({ path: path.join(out, `${name}.png`) });
	} else {
		await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
	}
	console.log(`${name}: ${errors.length ? 'PAGE ERRORS: ' + errors.join('; ') : 'ok'}`);
	await context.close();
}

await shot('g3b7-reviews-desktop', '/reviews/', { width: 1440, height: 900 });
await shot('g3b7-reviews-mobile', '/reviews/', { width: 375, height: 812 });
// Home testimonial band = the dark navy panel (bg-secondary rounded block).
await shot('g3b7-home-testimonial', '/', { width: 1440, height: 900 }, 'div.rounded-3xl.bg-secondary');

await browser.close();
