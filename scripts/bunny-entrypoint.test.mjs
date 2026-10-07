import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { parseCdnBuildRecord } from './cdn-config.mjs';

test('entrypoint selects startup behavior from the built record, not runtime public flags', () => {
  const script = readFileSync(new URL('../scripts/deploy/docker-entrypoint.sh', import.meta.url), 'utf8');
  const selector = script.match(/cdn_mode=\$\(node -e "([^"\n]+)"\)/)?.[1];
  assert.ok(selector, 'entrypoint must inspect the deployed build record');
  for (const mode of ['full-site', 'media-only']) {
    let value;
    runInNewContext(selector, { require: (path) => path === '/app/scripts/cdn-config.mjs' ? { parseCdnBuildRecord } : { version: 1, commit: 'a'.repeat(40), mode, mediaUrl: mode === 'media-only' ? 'https://media.example.invalid' : null }, process: { stdout: { write: v => { value = v; } } } });
    assert.equal(value, mode);
  }
  const mediaGuard = script.indexOf('[ "$cdn_mode" = "media-only" ]');
  const purgeGuard = script.indexOf('if [ "$purge_on_start" -eq 1 ]');
  assert.ok(mediaGuard >= 0 && purgeGuard >= 0 && mediaGuard < purgeGuard);
  assert.doesNotMatch(script, /PUBLIC_CDN_MODE|PUBLIC_MEDIA_URL/);
});

test('entrypoint skips startup purges for incomplete, malformed or missing records', () => {
  const script = readFileSync(new URL('./deploy/docker-entrypoint.sh', import.meta.url), 'utf8');
  const selector = script.match(/cdn_mode=\$\(node -e "([^"\n]+)"\)/)[1];
  const valid = { version: 1, commit: 'a'.repeat(40), mode: 'full-site', mediaUrl: null };
  for (const record of [{ mode: 'full-site' }, { ...valid, version: 2 }, { ...valid, commit: 'short' }, { ...valid, mediaUrl: 'https://media.example.invalid' }, { ...valid, mode: 'media-only', mediaUrl: 'http://media.example.invalid' }, null, new SyntaxError('broken JSON'), new Error('missing file')]) {
    let value;
    runInNewContext(selector, { require: (path) => {
      if (path === '/app/scripts/cdn-config.mjs') return { parseCdnBuildRecord };
      assert.equal(path, '/app/dist/client/__bunny_config.json');
      if (record instanceof Error) throw record;
      return record;
    }, process: { stdout: { write: v => { value = v; } } } });
    assert.equal(value, 'invalid', JSON.stringify(record));
  }
  const invalidGuard = script.indexOf('[ "$cdn_mode" = "invalid" ]');
  assert.ok(invalidGuard >= 0 && invalidGuard < script.indexOf('if [ "$purge_on_start" -eq 1 ]'));
});
