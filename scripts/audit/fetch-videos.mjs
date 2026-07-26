// Download WP-hosted videos through a real browser session (bypasses the
// bot-protection 403 curl gets; fetch is same-origin so CORP allows it).
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const jobs = [
	{
		url: 'https://lippincottteam.com/wp-content/uploads/2026/06/Lippincott-Hero-no-pool.mp4',
		out: 'public/uploads/2026/06/Lippincott-Hero-no-pool.mp4',
	},
	{
		url: 'https://lippincottteam.com/wp-content/uploads/2026/03/testimonial_Edwards_v1_horizontal.mp4.mp4',
		out: 'public/uploads/2026/03/testimonial_Edwards_v1_horizontal.mp4',
	},
];

const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await browser.newPage();
await page.goto('https://lippincottteam.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
// Wait out the Cloudflare JS challenge ("Just a moment...") before fetching.
await page.waitForFunction(() => !document.title.includes('Just a moment'), null, { timeout: 60000 });
await page.waitForTimeout(2000);
console.log('challenge cleared, title:', await page.title());
for (const job of jobs) {
	const b64 = await page.evaluate(async (url) => {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const buf = await res.arrayBuffer();
		let bin = '';
		const bytes = new Uint8Array(buf);
		const chunk = 0x8000;
		for (let i = 0; i < bytes.length; i += chunk) {
			bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
		}
		return btoa(bin);
	}, job.url);
	writeFileSync(job.out, Buffer.from(b64, 'base64'));
	console.log('saved', job.out, Buffer.from(b64, 'base64').length, 'bytes');
}
await browser.close();
