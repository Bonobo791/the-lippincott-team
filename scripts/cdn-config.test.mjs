import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The implementation must export these contracts; a missing export is the
// initial RED gate, not a substitute resolver in the test.
const api = await import('./cdn-config.mjs').catch(() => ({}));
test('exports the shared build and rendering contracts', () => {
  for (const name of ['parseCdnConfig', 'resolveMediaUrl', 'parseCdnBuildRecord']) {
    assert.equal(typeof api[name], 'function', name);
  }
});
function markerFixture(gitLayout = 'loose') {
  const root = mkdtempSync(join(tmpdir(), 'bunny-marker-'));
  const sha = 'a'.repeat(40);
  mkdirSync(join(root, 'scripts', 'deploy'), { recursive: true });
  mkdirSync(join(root, 'public'));
  copyFileSync(new URL('./cdn-config.mjs', import.meta.url), join(root, 'scripts', 'cdn-config.mjs'));
  copyFileSync(new URL('./deploy/write-commit-marker.mjs', import.meta.url), join(root, 'scripts', 'deploy', 'write-commit-marker.mjs'));
  symlinkSync(fileURLToPath(new URL('../node_modules', import.meta.url)), join(root, 'node_modules'), 'dir');
  const gitDir = join(root, gitLayout === 'worktree' ? 'linked-git' : '.git');
  mkdirSync(join(gitDir, 'refs', 'heads'), { recursive: true });
  if (gitLayout === 'worktree') writeFileSync(join(root, '.git'), `gitdir: ${gitDir}\n`);
  writeFileSync(join(gitDir, 'HEAD'), gitLayout === 'detached' ? `${sha}\n` : 'ref: refs/heads/dev\n');
  if (gitLayout === 'packed') writeFileSync(join(gitDir, 'packed-refs'), `# pack-refs\n${sha} refs/heads/dev\n`);
  else writeFileSync(join(gitDir, 'refs', 'heads', 'dev'), `${sha}\n`);
  return {
    root, sha,
    run(settings = {}) {
      const env = { ...process.env };
      for (const key of ['COMMIT_SHA', 'SOURCE_COMMIT', 'COMMIT_REF', 'GITHUB_SHA', 'PUBLIC_CDN_MODE', 'PUBLIC_MEDIA_URL']) delete env[key];
      const result = spawnSync(process.execPath, [join(root, 'scripts', 'deploy', 'write-commit-marker.mjs')], { cwd: root, env: { ...env, ...settings }, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const record = JSON.parse(readFileSync(join(root, 'public', '__bunny_config.json'), 'utf8'));
      assert.equal(readFileSync(join(root, 'public', '__moderaty_commit.txt'), 'utf8').trim(), record.commit);
      return record;
    },
    remove: () => rmSync(root, { recursive: true, force: true }),
  };
}
if (api.parseCdnConfig) {
  for (const layout of ['loose', 'worktree', 'packed', 'detached']) {
    test(`marker writer emits matching records in an isolated ${layout} checkout`, () => {
      const fixture = markerFixture(layout);
      try {
        for (const mode of ['full-site', 'media-only']) {
          assert.deepEqual(fixture.run({ PUBLIC_CDN_MODE: mode, PUBLIC_MEDIA_URL: 'https://media.example.invalid' }), { version: 1, commit: fixture.sha, mode, mediaUrl: mode === 'media-only' ? 'https://media.example.invalid' : null });
        }
      } finally { fixture.remove(); }
    });
  }
  test('marker settings follow production env-file precedence and shell overrides', () => {
    const fixture = markerFixture();
    try {
      writeFileSync(join(fixture.root, '.env'), 'PUBLIC_CDN_MODE=full-site\nPUBLIC_MEDIA_URL=https://base.example.invalid\n');
      writeFileSync(join(fixture.root, '.env.production'), 'PUBLIC_CDN_MODE=media-only\nPUBLIC_MEDIA_URL=https://production.example.invalid\n');
      assert.equal(fixture.run().mode, 'media-only');
      assert.equal(fixture.run().mediaUrl, 'https://production.example.invalid');
      writeFileSync(join(fixture.root, '.env.production.local'), 'PUBLIC_MEDIA_URL=https://local.example.invalid\n');
      assert.equal(fixture.run().mediaUrl, 'https://local.example.invalid');
      assert.equal(fixture.run({ PUBLIC_MEDIA_URL: 'https://shell.example.invalid' }).mediaUrl, 'https://shell.example.invalid');
      assert.equal(fixture.run({ PUBLIC_CDN_MODE: 'full-site' }).mode, 'full-site');
    } finally { fixture.remove(); }
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
    for (const value of ['/uploads/../secret', '/uploads/%2e%2e/secret', '/uploads/a/../../secret', '/uploads/a%2f..%2f..%2fsecret', '/uploads/a\\..\\secret', '/uploads/%zz.jpg', '/uploads/%E0%A4%A', '/uploads/a\u0000.jpg', '/uploads/a\n.jpg', '/uploads/%00.jpg', '/uploads/%0A.jpg', '/uploads/%7F.jpg']) {
      assert.equal(resolveMediaUrl(value, media, site), value);
    }
  });
  test('valid encoded filename characters stay encoded without recursive decoding', () => {
    for (const value of ['/uploads/100%25.webp', '/uploads/literal%2500.webp', '/uploads/Photo%20One.webp']) {
      assert.equal(resolveMediaUrl(value, media, site), `https://media.example.invalid${value}`);
    }
  });
  test('invalid media origins fail with a constant message and no supplied value', () => {
    for (const value of [undefined, '', '   ', 'https://user:private-value@media.example.invalid']) {
      assert.throws(() => parseCdnConfig({ PUBLIC_CDN_MODE: 'media-only', PUBLIC_MEDIA_URL: value }), { message: 'PUBLIC_MEDIA_URL must be an HTTPS origin without credentials, path, query or fragment' });
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
