import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { parse } from 'node-html-parser';
import { compiledMediaModule } from './test-fixtures/compiled-media.mjs';
import { compileAstro } from './test-fixtures/astro-component.mjs';
import { setMediaIsland } from './test-fixtures/media-island.mjs';

const routeURL = pathToFileURL(fileURLToPath(new URL('../src/pages/tina-island/[name].ts', import.meta.url))).href;
const dataURL = new URL('../src/lib/data.ts', import.meta.url).href;
registerHooks({ resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ?? '';
  if (parent === routeURL && specifier === '../../lib/islands') return nextResolve(new URL('./test-fixtures/media-island.mjs', import.meta.url).href, context);
  if (parent === routeURL && specifier === '../../lib/data') return nextResolve(dataURL, context);
  if (parent === dataURL && specifier === '../../tina/__generated__/client') return nextResolve(new URL('./test-fixtures/tina-config.mjs', import.meta.url).href, context);
  return nextResolve(specifier, context);
} });
const { ALL } = await import(routeURL);
const section = await compileAstro('<div><slot /></div>', 'Section.astro');
const empty = await compileAstro('<div></div>', 'UnusedEmbed.astro');
const source = readFileSync(new URL('../src/components/blocks/Video.astro', import.meta.url), 'utf8');

for (const mode of ['full-site', 'media-only']) {
  test(`${mode}: actual video island uses compiled settings and preserves Tina metadata`, async () => {
    const prepared = source
      .replace("'../../lib/media'", JSON.stringify(compiledMediaModule(mode)))
      .replace("'@tinacms/astro/tina-field'", JSON.stringify(import.meta.resolve('@tinacms/astro/tina-field')))
      .replace("'../ui/Section.astro'", JSON.stringify(section))
      .replace("'../ui/YouTubeFacade.astro'", JSON.stringify(empty))
      .replace(/^import type [^\n]*\n/gm, '');
    const { default: Video } = await import(await compileAstro(prepared, `Video-${mode}.astro`));
    const previous = process.env.PUBLIC_CDN_MODE;
    process.env.PUBLIC_CDN_MODE = mode === 'media-only' ? 'full-site' : 'media-only';
    try {
      for (const video of ['/uploads/video.mp4?version=2#t=3', 'https://thelippincottteam.com/uploads/video.mp4', 'https://assets.tina.io/uploads/preview.mp4']) {
        setMediaIsland(Video, video);
        const url = new URL('https://thelippincottteam.com/tina-island/page?slug=test');
        const response = await ALL({ params: { name: 'page' }, url, request: new Request(url, { method: 'POST', headers: { 'content-type': 'application/x-tina-preview+json', 'X-Tina-Prime': '1' }, body: '{}' }) });
        const html = await response.text();
        assert.equal(response.status, 200, html);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        const dom = parse(html);
        const expected = mode === 'media-only' && !video.startsWith('https://assets.tina.io') ? `https://media.example.invalid${video.replace('https://thelippincottteam.com', '')}` : video;
        assert.equal(dom.querySelector('source').getAttribute('src'), expected);
        assert.equal(dom.querySelectorAll('source')[1].getAttribute('src'), expected.replace('.mp4', '.webm'));
        assert.equal(dom.querySelector('video').getAttribute('poster'), mode === 'media-only' ? 'https://media.example.invalid/uploads/poster.webp' : '/uploads/poster.webp');
        assert.ok(dom.querySelector('[data-tina-field]'));
        assert.ok(dom.querySelector('[data-tina-form]'));
        assert.ok(dom.querySelector('[data-tina-island]'));
        assert.ok(html.includes(video.replaceAll('&', '&amp;')), 'original query content remains in editor payload');
      }
    } finally { if (previous === undefined) delete process.env.PUBLIC_CDN_MODE; else process.env.PUBLIC_CDN_MODE = previous; }
  });
}
