import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCdnConfig } from './cdn-config.mjs';

const api = await import('./audit/media-output.mjs').catch(() => ({}));
test('output auditor exports semantic HTML and build checks', () => {
  assert.equal(typeof api.auditMediaHtml, 'function');
  assert.equal(typeof api.auditMediaBuild, 'function');
});
if (api.auditMediaHtml) {
  const site = 'https://thelippincottteam.com';
  const config = parseCdnConfig({ PUBLIC_CDN_MODE: 'media-only', PUBLIC_MEDIA_URL: 'https://media.example.invalid' });
  const media = `${config.mediaUrl}/uploads/a.webp`;
  const valid = `<html><head><link rel="canonical" href="${site}/"><link rel="preload" as="image" href="${media}"><meta property="og:image" content="${media}"></head><body><img src="${media}" srcset="${media} 400w, ${media} 800w"><video poster="${media}"><source src="${config.mediaUrl}/uploads/a.mp4"></video><a href="${config.mediaUrl}/uploads/a.pdf">Download</a><a href="/about/">About</a><img src="https://assets.tina.io/uploads/preview.webp"><script type="application/ld+json">{"@type":"Person","image":"${media}"}</script><script>const example='/uploads/not-an-attribute';</script></body></html>`;
  test('audits media attributes, srcsets and structured images without changing navigation or prose', () => {
    assert.ok(api.auditMediaHtml(valid, config, site).media >= 7);
  });
  for (const snippet of ['<img src="/uploads/a.jpg">', '<video poster="/uploads/a.jpg">', '<source src="/uploads/a.mp4">', '<a href="/uploads/a.pdf">Download</a>', '<link rel="preload" as="image" href="/uploads/a.webp">', '<meta property="twitter:image" content="/uploads/a.jpg">', '<img srcset="/uploads/a.jpg 400w">', `<script type="application/ld+json">{"image":"${site}/uploads/a.jpg"}</script>`]) {
    test(`rejects unconverted owned output: ${snippet}`, () => assert.throws(() => api.auditMediaHtml(snippet, config, site), /Unresolved owned media/));
  }
  test('full-site accepts existing root-relative and same-site media', () => {
    assert.doesNotThrow(() => api.auditMediaHtml(`<img src="/uploads/a.jpg"><source src="${site}/uploads/a.mp4">`, parseCdnConfig({}), site));
  });
  if (process.env.BUNNY_AUDIT_DIST) {
    test('built site uses its recorded CDN mode consistently', () => {
      const result = api.auditMediaBuild(process.env.BUNNY_AUDIT_DIST, site);
      assert.ok(result.pages > 30);
      assert.ok(result.media > 100);
      console.log(JSON.stringify(result));
    });
  }
}
