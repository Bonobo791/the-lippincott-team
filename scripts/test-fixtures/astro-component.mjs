import { createRequire } from 'node:module';
const require = createRequire(import.meta.resolve('astro/package.json'));
const { transform } = require('@astrojs/compiler-rs');

export async function compileAstro(source, filename = 'MediaFixture.astro') {
  const compiled = await transform(source, { filename, internalURL: 'astro/compiler-runtime', resultScopedSlot: true });
  const code = compiled.code
    .replace(', createMetadata as $$createMetadata', '')
    .replace(/^import \* as \$\$module[^\n]*\n/gm, '')
    .replace(/export const \$\$metadata[\s\S]*?(?=const \$\$Astro)/, '')
    .replace(/export const \$\$metadata = \$\$createMetadata\([\s\S]*?\n\}\);\n/, '')
    .replaceAll('"astro/compiler-runtime"', JSON.stringify(import.meta.resolve('astro/compiler-runtime')));
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}
