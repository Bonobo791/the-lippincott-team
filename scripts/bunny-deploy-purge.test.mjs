import assert from 'node:assert/strict';
import { test } from 'node:test';
import { main } from './bunny-purge.mjs';

const sha = 'a'.repeat(40);
const args = ['--deploy-purge', sha, '--origin', 'https://origin.example', '--timeout', '0.04', '--interval', '0.005'];
const siteCreds = { BUNNY_API_KEY: 'site-secret', BUNNY_PULL_ZONE_ID: '12' };
const mediaCreds = { BUNNY_MEDIA_API_KEY: 'media-secret', BUNNY_MEDIA_PULL_ZONE_ID: '34' };
const record = mode => ({ version: 1, commit: sha, mode, mediaUrl: mode === 'media-only' ? 'https://media.example.invalid' : null });
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => typeof body === 'string' ? body : JSON.stringify(body) });
function fake(mode, mutate = () => undefined) {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    const override = mutate(String(url), calls);
    if (override) return override;
    if (String(url).includes('__moderaty_commit.txt')) return response(sha);
    if (String(url).includes('__bunny_config.json')) return response(record(mode));
    return response('', 204);
  };
  return { fetch, calls, purges: () => calls.filter(c => c.options.method === 'POST') };
}
async function run(env, f, argv = args) {
  const logs = [];
  const saved = [console.log, console.warn, console.error];
  for (const name of ['log', 'warn', 'error']) console[name] = (...values) => logs.push(values.join(' '));
  try { return { code: await main(argv, env, f.fetch), logs: logs.join('\n') }; }
  finally { [console.log, console.warn, console.error] = saved; }
}
test('media-only purges only the linked media zone, ignoring runtime mode and site credentials', async () => {
  const f = fake('media-only');
  assert.equal((await run({ ...mediaCreds, ...siteCreds, PUBLIC_CDN_MODE: 'full-site' }, f)).code, 0);
  assert.deepEqual(f.purges().map(c => c.url), ['https://api.bunny.net/pullzone/34/purgeCache']);
  assert.equal(f.purges()[0].options.headers.AccessKey, 'media-secret');
});
test('full-site purges media before site with independent keys', async () => {
  const f = fake('full-site');
  assert.equal((await run({ ...siteCreds, ...mediaCreds, BUNNY_PURGE_REQUIRED: 'true' }, f)).code, 0);
  assert.deepEqual(f.purges().map(c => [c.url, c.options.headers.AccessKey]), [['https://api.bunny.net/pullzone/34/purgeCache', 'media-secret'], ['https://api.bunny.net/pullzone/12/purgeCache', 'site-secret']]);
});
for (const mode of ['full-site', 'media-only']) {
  for (const required of [undefined, 'true']) {
    for (const mediaId of ['12', '0012']) {
      test(`${mode} rejects colliding zone roles before purging (required=${required}, media=${mediaId})`, async () => {
        const f = fake(mode);
        const result = await run({ ...siteCreds, ...mediaCreds, BUNNY_MEDIA_PULL_ZONE_ID: mediaId, BUNNY_PURGE_REQUIRED: required }, f);
        assert.equal(result.code, 1);
        assert.equal(f.purges().length, 0);
        assert.match(result.logs, /distinct.*zone/i);
        assert.doesNotMatch(result.logs, /media-secret|site-secret/);
      });
    }
  }
}
test('media-only still ignores malformed unrelated site credentials', async () => {
  const f = fake('media-only');
  assert.equal((await run({ ...mediaCreds, BUNNY_PULL_ZONE_ID: 'not-an-id', BUNNY_PURGE_REQUIRED: 'true' }, f)).code, 0);
  assert.deepEqual(f.purges().map(c => c.url), ['https://api.bunny.net/pullzone/34/purgeCache']);
});
test('optional legacy site-only credentials retain main purge with a media warning', async () => {
  const f = fake('full-site');
  const result = await run(siteCreds, f);
  assert.equal(result.code, 0);
  assert.match(result.logs, /media.*not configured/i);
  assert.equal(f.purges().length, 1);
});
test('required policy validates all relevant credentials before any purge', async () => {
  for (const [mode, env] of [['full-site', siteCreds], ['full-site', mediaCreds], ['media-only', siteCreds], ['media-only', {}]]) {
    const f = fake(mode);
    assert.equal((await run({ ...env, BUNNY_PURGE_REQUIRED: 'true' }, f)).code, 1);
    assert.equal(f.purges().length, 0);
  }
});
test('optional absent credentials warn and skip; partial or invalid zone credentials fail', async () => {
  const absent = fake('media-only');
  assert.equal((await run({}, absent)).code, 0);
  assert.equal(absent.purges().length, 0);
  for (const env of [{ BUNNY_MEDIA_API_KEY: 'media-secret' }, { BUNNY_MEDIA_PULL_ZONE_ID: '34' }, { ...mediaCreds, BUNNY_MEDIA_PULL_ZONE_ID: '34/x' }]) {
    const f = fake('media-only');
    assert.equal((await run(env, f)).code, 1);
    assert.equal(f.purges().length, 0);
  }
});
test('stale/invalid deployment records and markers never permit a purge', async () => {
  for (const [path, body] of [['__bunny_config.json', { ...record('media-only'), commit: 'b'.repeat(40) }], ['__bunny_config.json', { ...record('media-only'), version: 2 }], ['__moderaty_commit.txt', 'stale']]) {
    const f = fake('media-only', url => url.includes(path) ? response(body) : undefined);
    assert.equal((await run(mediaCreds, f)).code, 1);
    assert.equal(f.purges().length, 0);
    assert.ok(f.calls.length < 40, 'bounded polling');
  }
});
test('polling retries a stale record and only purges after both markers match', async () => {
  let polls = 0;
  const f = fake('media-only', url => url.includes('__bunny_config.json') && ++polls === 1 ? response({ ...record('media-only'), commit: 'b'.repeat(40) }) : undefined);
  assert.equal((await run(mediaCreds, f)).code, 0);
  assert.ok(polls >= 2);
  assert.equal(f.purges().length, 1);
});
test('deployment SHA identity is case-insensitive across the argument and both markers', async () => {
  for (const [argument, marker, configCommit] of [[sha.toUpperCase(), sha, sha], [sha, sha.toUpperCase(), sha.toUpperCase()]]) {
    const f = fake('media-only', url => url.includes('__moderaty_commit.txt') ? response(marker) : url.includes('__bunny_config.json') ? response({ ...record('media-only'), commit: configCommit }) : undefined);
    assert.equal((await run(mediaCreds, f, [args[0], argument, ...args.slice(2)])).code, 0);
    assert.equal(f.purges().length, 1);
  }
});
test('malformed JSON retries and cannot permit a purge until a valid record is served', async () => {
  let polls = 0;
  const recovering = fake('media-only', url => url.includes('__bunny_config.json') && ++polls === 1 ? response('{broken') : undefined);
  assert.equal((await run(mediaCreds, recovering)).code, 0);
  assert.ok(polls >= 2);
  assert.equal(recovering.purges().length, 1);
  const broken = fake('media-only', url => url.includes('__bunny_config.json') ? response('{broken') : undefined);
  assert.equal((await run(mediaCreds, broken)).code, 1);
  assert.equal(broken.purges().length, 0);
  assert.ok(broken.calls.length < 40);
});
test('failed media purge aborts the site purge and logs no key or upstream body', async () => {
  const f = fake('full-site', url => url.includes('/pullzone/34/') ? response('media-secret site-secret', 500) : undefined);
  const result = await run({ ...mediaCreds, ...siteCreds }, f);
  assert.equal(result.code, 1);
  assert.equal(f.purges().length, 1);
  assert.doesNotMatch(result.logs, /media-secret|site-secret/);
});
test('invalid deployment arguments fail before requests', async () => {
  for (const argv of [['--deploy-purge', 'short', '--origin', 'https://origin.example'], ['--deploy-purge', sha], ['--deploy-purge', sha, '--origin', 'https://user:secret@origin.example']]) {
    const f = fake('media-only');
    assert.equal((await run(mediaCreds, f, argv)).code, 1);
    assert.equal(f.calls.length, 0);
  }
});
