import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { compiledMediaModule } from './test-fixtures/compiled-media.mjs';

let mode = 'full-site';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === '../../lib/media') return nextResolve(compiledMediaModule(mode), context);
  if (specifier.startsWith('../../lib/') && context.parentURL?.includes('/src/pages/api/bunny-purge.ts')) return nextResolve(new URL(`${specifier}.ts`, context.parentURL).href, context);
  return nextResolve(specifier, context);
} });
async function run(buildMode, path, token = 'route-secret') {
  mode = buildMode;
  const env = { ...process.env };
  const savedFetch = globalThis.fetch;
  const calls = [];
  Object.assign(process.env, { PUBLIC_CDN_MODE: buildMode === 'media-only' ? 'full-site' : 'media-only', SITE_URL: 'https://thelippincottteam.com', BUNNY_API_KEY: 'api-secret', BUNNY_PURGE_SECRET: 'route-secret' });
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return new Response(null, { status: 204 }); };
  try {
    const { GET } = await import(`../src/pages/api/bunny-purge.ts?mode=${mode}&id=${Math.random()}`);
    const url = new URL(`https://thelippincottteam.com/api/bunny-purge?path=${encodeURIComponent(path)}`);
    const response = await GET({ request: new Request(url, { headers: { authorization: `Bearer ${token}` } }), clientAddress: '127.0.0.1' });
    return { response, calls, body: await response.text() };
  } finally {
    globalThis.fetch = savedFetch;
    for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
  }
}
test('media-only page purge is disabled by compiled mode with no Bunny calls', async () => {
  const r = await run('media-only', '/blog/');
  assert.equal(r.response.status, 503);
  assert.match(r.body, /media-only/i);
  assert.equal(r.calls.length, 0);
});
test('full-site preserves authentication and same-origin target validation', async () => {
  assert.equal((await run('full-site', '/blog/', 'wrong')).response.status, 401);
  const foreign = await run('full-site', 'https://evil.test/blog/');
  assert.equal(foreign.response.status, 400);
  assert.equal(foreign.calls.length, 0);
  const r = await run('full-site', '/blog/');
  assert.equal(r.response.status, 204);
  assert.equal(r.calls.length, 1);
  assert.match(r.calls[0].url, /thelippincottteam/);
});
