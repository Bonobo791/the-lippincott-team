import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

test('entrypoint selects startup behavior from the built record, not runtime public flags', () => {
  const script = readFileSync(new URL('../scripts/deploy/docker-entrypoint.sh', import.meta.url), 'utf8');
  const selector = script.match(/cdn_mode=\$\(node -e "([^"\n]+)"\)/)?.[1];
  assert.ok(selector, 'entrypoint must inspect the deployed build record');
  for (const mode of ['full-site', 'media-only']) {
    let value;
    runInNewContext(selector, { require: (path) => { assert.equal(path, '/app/dist/client/__bunny_config.json'); return { mode }; }, process: { stdout: { write: v => { value = v; } } } });
    assert.equal(value, mode);
  }
  assert.ok(script.indexOf('[ "$cdn_mode" = "media-only" ]') < script.indexOf('if [ "$purge_on_start" -eq 1 ]'));
  assert.doesNotMatch(script, /PUBLIC_CDN_MODE|PUBLIC_MEDIA_URL/);
});
