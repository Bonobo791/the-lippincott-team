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
// context.request shares the browser context's storage state, so the
// Cloudflare-cleared session carries over; response.body() streams straight
// to disk as a Buffer (no in-page Base64 round-trip).
const request = page.context().request;
try {
	for (const job of jobs) {
		const response = await request.get(job.url);
		if (!response.ok()) throw new Error(`HTTP ${response.status()} fetching ${job.url}`);
		const body = await response.body();
		writeFileSync(job.out, body);
		console.log('saved', job.out, body.length, 'bytes');
	}
} finally {
	await browser.close();
}
