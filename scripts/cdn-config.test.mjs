import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The implementation must export these contracts; a missing export is the
// initial RED gate, not a substitute resolver in the test.
const api = await import('./cdn-config.mjs').catch(() => ({}));
test('exports the shared build and rendering contracts', () => {
  for (const name of ['parseCdnConfig', 'resolveMediaUrl', 'parseCdnBuildRecord']) {
    assert.equal(typeof api[name], 'function', name);
  }
});
if (api.parseCdnConfig) {
  test('marker writer uses the current worktree commit and emits matching mode records', async () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    let gitDir = resolve(root, '.git');
    try { gitDir = resolve(root, readFileSync(gitDir, 'utf8').trim().slice(7).trim()); } catch { /* ordinary checkout */ }
    const head = readFileSync(resolve(gitDir, 'HEAD'), 'utf8').trim();
    let common = gitDir;
    try { common = resolve(gitDir, readFileSync(resolve(gitDir, 'commondir'), 'utf8').trim()); } catch { /* ordinary checkout */ }
    const sha = head.startsWith('ref: ') ? readFileSync(resolve(common, head.slice(5)), 'utf8').trim() : head;
    const saved = { ...process.env };
    try {
    for (const mode of ['full-site', 'media-only']) {
      Object.assign(process.env, { COMMIT_SHA: '', SOURCE_COMMIT: '', COMMIT_REF: '', GITHUB_SHA: '', PUBLIC_CDN_MODE: mode, PUBLIC_MEDIA_URL: 'https://media.example.invalid' });
      await import(`./deploy/write-commit-marker.mjs?test=${mode}`);
      assert.equal(readFileSync(new URL('../public/__moderaty_commit.txt', import.meta.url), 'utf8').trim(), sha);
      const record = JSON.parse(readFileSync(new URL('../public/__bunny_config.json', import.meta.url), 'utf8'));
      assert.equal(record.commit, sha);
      assert.equal(record.mode, mode);
      assert.equal(record.mediaUrl, mode === 'media-only' ? 'https://media.example.invalid' : null);
    }
    } finally {
      for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
      Object.assign(process.env, saved);
    }
  });
  const { parseCdnConfig, resolveMediaUrl, parseCdnBuildRecord } = api;
  const site = 'https://thelippincottteam.com';
  const media = parseCdnConfig({ PUBLIC_CDN_MODE: 'media-only', PUBLIC_MEDIA_URL: 'https://media.example.invalid/' });
  test('absent and blank mode preserve full-site delivery', () => {
    for (const mode of [undefined, '', '  ', 'full-site']) {
      assert.deepEqual(parseCdnConfig({ PUBLIC_CDN_MODE: mode, PUBLIC_MEDIA_URL: 'unused' }), { mode: 'full-site', mediaUrl: null });
    }
  });
  test('media-only requires an HTTPS origin and normalizes its trailing slash', () => {
    assert.deepEqual(media, { mode: 'media-only', mediaUrl: 'https://media.example.invalid' });
    assert.throws(() => parseCdnConfig({ PUBLIC_CDN_MODE: 'unknown' }), /PUBLIC_CDN_MODE/);
    for (const origin of [undefined, '', 'http://media.test', '//media.test', 'https://u:p@media.test', 'https://media.test/uploads', 'https://media.test/?q=1', 'https://media.test/#x']) {
      assert.throws(() => parseCdnConfig({ PUBLIC_CDN_MODE: 'media-only', PUBLIC_MEDIA_URL: origin }), /PUBLIC_MEDIA_URL/);
    }
  });
  test('rewrites only owned uploads while preserving encoded path and suffix', () => {
    for (const value of ['/uploads/2026/My%20Photo.JPG?q=%2F#view', `${site}/uploads/a.mp4?x=1#t=2`]) {
      assert.equal(resolveMediaUrl(value, media, site), `https://media.example.invalid${value.replace(site, '')}`);
    }
    for (const value of ['/uploads-other/a.jpg', '/logo.webp', '/_astro/a.webp', '/about/', 'https://assets.tina.io/uploads/a.png', 'https://other.test/uploads/a.jpg', '//thelippincottteam.com/uploads/a.jpg']) {
      assert.equal(resolveMediaUrl(value, media, site), value);
    }
    assert.equal(resolveMediaUrl(null, media, site), undefined);
    assert.equal(resolveMediaUrl(undefined, media, site), undefined);
  });
  test('malformed or traversal paths are never sent to the media origin', () => {
    for (const value of ['/uploads/../secret', '/uploads/%2e%2e/secret', '/uploads/a/../../secret', '/uploads/a%2f..%2f..%2fsecret', '/uploads/a\\..\\secret', '/uploads/%zz.jpg']) {
      assert.equal(resolveMediaUrl(value, media, site), value);
    }
  });
  test('full-site leaves owned paths and absolute URLs unchanged', () => {
    for (const value of ['/uploads/a.jpg', `${site}/uploads/a.jpg`]) {
      assert.equal(resolveMediaUrl(value, parseCdnConfig({}), site), value);
    }
  });
  test('build records validate mode, media origin, version and full SHA without leaking extra fields', () => {
    const record = { version: 1, commit: 'a'.repeat(40), ...media };
    assert.deepEqual(parseCdnBuildRecord({ ...record, secret: 'excluded' }), record);
    for (const value of [null, { ...record, version: 2 }, { ...record, commit: 'short' }, { ...record, mediaUrl: 'http://media.test' }, { ...record, mode: 'full-site' }]) {
      assert.throws(() => parseCdnBuildRecord(value), /Bunny build record/);
    }
  });
}
