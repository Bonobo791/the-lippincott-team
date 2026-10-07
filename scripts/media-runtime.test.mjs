import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compiledMediaModule } from './test-fixtures/compiled-media.mjs';

test('compiled canonical site resolves absolute uploads in contextless Tina containers', async () => {
  const { mediaUrl } = await import(compiledMediaModule('media-only'));
  assert.equal(mediaUrl('https://thelippincottteam.com/uploads/a.jpg', 'http://localhost'), 'https://media.example.invalid/uploads/a.jpg');
  assert.equal(mediaUrl('https://localhost/uploads/a.jpg', 'http://localhost'), 'https://localhost/uploads/a.jpg');
});
for (const mode of ['full-site', 'media-only']) {
  test(`${mode}: compiled renderer ignores conflicting runtime variables`, async () => {
    const { mediaUrl, cdnConfig } = await import(compiledMediaModule(mode));
    const saved = { PUBLIC_CDN_MODE: process.env.PUBLIC_CDN_MODE, PUBLIC_MEDIA_URL: process.env.PUBLIC_MEDIA_URL };
    try {
      process.env.PUBLIC_CDN_MODE = mode === 'full-site' ? 'media-only' : 'full-site';
      process.env.PUBLIC_MEDIA_URL = 'https://wrong.example.invalid';
      assert.equal(cdnConfig.mode, mode);
      assert.equal(mediaUrl('/uploads/a.jpg', 'http://localhost'), mode === 'full-site' ? '/uploads/a.jpg' : 'https://media.example.invalid/uploads/a.jpg');
    } finally {
      for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    }
  });
}
