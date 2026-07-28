// Viewport shots at specific scroll positions — verifies scroll-driven
// states that full-page captures can't (count-up completion, GSAP clip-path
// reveal, pinned community rail pan).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ?? 'http://localhost:4322';
const outputRoot = path.resolve('.launch/qa');
const out = path.resolve(process.argv[3] ?? path.join(outputRoot, 'scroll'));
const relativeOut = path.relative(outputRoot, out);
if (relativeOut.startsWith('..') || path.isAbsolute(relativeOut)) {
	throw new Error(`Output directory must be within ${outputRoot}`);
}
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`${base}/`, { waitUntil: 'networkidle' });

// Scroll helper: jump, let observers/ScrollTrigger settle, shoot.
const shootAt = async (selector, name, extra = 0) => {
	await page.evaluate(({ selector, extra }) => {
		const el = document.querySelector(selector);
		if (!el) throw new Error(`scroll target not found: ${selector}`);
		const y = el.getBoundingClientRect().top + window.scrollY;
		window.scrollTo(0, Math.max(0, y + extra));
	}, { selector, extra });
	await page.waitForTimeout(2200);
	await page.screenshot({ path: `${out}/${name}.png` });
	console.log('shot', name);
};

await shootAt('[data-stats-section]', 'stats-counted', -200);
await shootAt('[data-testimonial-showcase]', 'testimonial-revealed', -100);
// Community rail: scroll into the pinned region and partway through the pan.
await shootAt('[data-comm-rail]', 'communities-pin-start', -100);
await page.evaluate(() => {
	const rail = document.querySelector('[data-comm-rail]');
	if (!rail) throw new Error('scroll target not found: [data-comm-rail]');
	const y = rail.getBoundingClientRect().top + window.scrollY;
	window.scrollTo(0, y + window.innerHeight * 1.2);
});
await page.waitForTimeout(2200);
await page.screenshot({ path: `${out}/communities-pin-mid.png` });
console.log('shot communities-pin-mid');

console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console/page errors');
await browser.close();
