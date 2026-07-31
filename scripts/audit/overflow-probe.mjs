// Overflow probe: loads a page at a given viewport and lists every element
// whose box extends past the viewport's right edge. Exits 1 when overflow
// exists (red), 0 when clean (green).
// Usage: node scripts/audit/overflow-probe.mjs --url <url> [--width 390] [--height 844]
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i === -1 ? d : args[i + 1]; };
const url = get('--url');
const width = Number(get('--width', '390'));
const height = Number(get('--height', '844'));
if (!url) { console.error('missing --url'); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

const result = await page.evaluate(() => {
	const vw = document.documentElement.clientWidth;
	const docW = document.documentElement.scrollWidth;
	// Elements inside a horizontal scrollport (overflow-x: auto/scroll) are
	// *meant* to extend past the viewport — clipping there is the fix, not a bug.
	const inScroller = (el) => {
		for (let a = el.parentElement; a; a = a.parentElement) {
			const ox = getComputedStyle(a).overflowX;
			if (ox === 'auto' || ox === 'scroll') return true;
		}
		return false;
	};
	const offenders = [];
	for (const el of document.querySelectorAll('body *')) {
		const r = el.getBoundingClientRect();
		if (r.width === 0 || r.height === 0) continue;
		if (r.right > vw + 1 || r.left < -1) {
			const cls = typeof el.className === 'string' ? el.className.slice(0, 90) : '';
			offenders.push({
				tag: el.tagName.toLowerCase(),
				cls,
				left: Math.round(r.left),
				right: Math.round(r.right),
				benign: inScroller(el),
				text: (el.childElementCount === 0 ? el.textContent : '')?.trim().slice(0, 60) ?? '',
			});
		}
	}
	const genuine = offenders.filter((o) => !o.benign);
	return { vw, docW, offenders: genuine.slice(0, 25), total: genuine.length, benign: offenders.length - genuine.length };
});

console.log(`viewport=${result.vw} scrollWidth=${result.docW} overflowX=${result.docW > result.vw}`);
console.log(`offenders=${result.total} (inside scrollports, expected: ${result.benign})`);
for (const o of result.offenders) {
	console.log(`  <${o.tag} class="${o.cls}"> [${o.left}..${o.right}] ${o.text}`);
}
await browser.close();
process.exit(result.docW > result.vw || result.total > 0 ? 1 : 0);
