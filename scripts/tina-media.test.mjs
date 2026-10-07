import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('new Tina repository uploads stay under public/uploads', () => {
  const config = readFileSync(new URL('../tina/config.ts', import.meta.url), 'utf8');
  const tinaMedia = config.match(/media:\s*\{\s*tina:\s*\{([^}]+)/)?.[1];
  assert.ok(tinaMedia, 'Tina media provider is configured');
  assert.match(tinaMedia, /mediaRoot:\s*["']uploads["']/);
  assert.match(tinaMedia, /publicFolder:\s*["']public["']/);
});
