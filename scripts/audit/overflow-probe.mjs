// Overflow probe: loads a page at a given viewport and lists every element
// whose box extends past the viewport's right edge. Elements inside a
// horizontal scrollport (overflow-x: auto/scroll) are *meant* to overflow —
// they're reported separately, not counted. Exits 1 when the document
// overflows or any non-scrollport element crosses the edge, 0 when clean.
// Usage: node scripts/audit/overflow-probe.mjs --url <url> [--width 390] [--height 844]
import { chromium } from 'playwright';

function parseArgs(argv) {
	const args = { url: null, width: 390, height: 844 };
	for (let i = 2; i < argv.length; i++) {
		if (argv[i] === '--url') args.url = argv[++i];
		else if (argv[i] === '--width') args.width = Number(argv[++i]);
		else if (argv[i] === '--height') args.height = Number(argv[++i]);
	}
	if (!args.url || !Number.isFinite(args.width) || args.width <= 0 || !Number.isFinite(args.height) || args.height <= 0) {
		console.error('Usage: node scripts/audit/overflow-probe.mjs --url <url> [--width 390] [--height 844]');
		process.exit(2);
	}
	return args;
}

async function main() {
	const { url, width, height } = parseArgs(process.argv);
	const browser = await chromium.launch();
	let code = 0;
	try {
		const page = await browser.newPage({ viewport: { width, height } });
		await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
		await page.locator('main, [role="main"]').first().waitFor({ state: 'visible', timeout: 10_000 });
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.waitForTimeout(500);

		const result = await page.evaluate(() => {
			const vw = document.documentElement.clientWidth;
			const docW = document.documentElement.scrollWidth;
			// Elements inside a horizontal scrollport (overflow-x: auto/scroll)
			// are meant to extend past the viewport — clipping there is the fix,
			// not a bug.
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
		code = result.docW > result.vw || result.total > 0 ? 1 : 0;
	} catch (err) {
		console.error(`overflow-probe failed: ${err.message}`);
		code = 2;
	} finally {
		await browser.close();
	}
	process.exit(code);
}

main();
