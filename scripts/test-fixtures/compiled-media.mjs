import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Compile the real wrapper's two public settings as Vite does, for container
// tests that deliberately bypass Vite. Runtime process.env is never consulted.
export function compiledMediaModule(mode = 'full-site', origin = 'https://media.example.invalid') {
  const source = readFileSync(new URL('../../src/lib/media.ts', import.meta.url), 'utf8')
    .replace("'../../scripts/cdn-config.mjs'", JSON.stringify(new URL('../cdn-config.mjs', import.meta.url).href))
    .replaceAll('import.meta.env.PUBLIC_CDN_MODE', JSON.stringify(mode))
    .replaceAll('import.meta.env.PUBLIC_MEDIA_URL', JSON.stringify(origin));
  const code = stripTypeScriptTypes(source);
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}
