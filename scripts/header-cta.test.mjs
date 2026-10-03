import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { before, test } from 'node:test';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { parse } from 'node-html-parser';

const require = createRequire(import.meta.resolve('astro/package.json'));
const { transform } = require('@astrojs/compiler-rs');
const source = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
const anchors = [...source.matchAll(/<a\b[\s\S]*?<\/a>/g)]
	.map(([anchor]) => anchor).filter((anchor) => anchor.includes('headerCta'));
before(() => assert.equal(anchors.length, 2, 'exercise both desktop and mobile CTA anchors'));

// Render the real CTA templates and frontmatter without loading unrelated nav
// icons or a CMS build. Removing either template's link attrs must fail here.
const frontmatter = source.split('---')[1]
	.replace(/^import (?:type |\{ Icon \}|\{ cn \})[^\n]*\n/gm, '')
	.replaceAll('"@tinacms/astro/tina-field"', JSON.stringify(import.meta.resolve('@tinacms/astro/tina-field')))
	.replaceAll("'../lib/url'", JSON.stringify(new URL('../src/lib/url.ts', import.meta.url).href));
const compiled = await transform(`---\n${frontmatter}\n---\n${anchors.join('\n')}`, {
	filename: 'HeaderCtas.astro', internalURL: 'astro/compiler-runtime', resultScopedSlot: true,
});
const code = compiled.code
	.replace(', createMetadata as $$createMetadata', '')
	.replace(/^import \* as \$\$module[^\n]*\n/gm, '')
	.replace(/export const \$\$metadata[\s\S]*?(?=const \$\$Astro)/, '')
	.replaceAll('"astro/compiler-runtime"', JSON.stringify(import.meta.resolve('astro/compiler-runtime')));
const { default: HeaderCtas } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const container = await AstroContainer.create();

/** Render both real CTA templates without relying on browser link repair. */
async function renderCtas(link) {
	const html = await container.renderToString(HeaderCtas, {
		props: { config: { headerCta: { label: 'Contact us', link } } },
	});
	const rendered = parse(html).querySelectorAll('a');
	assert.equal(rendered.length, 2);
	return rendered;
}

test('external header CTAs emit new-tab protection before browser scripts run', async () => {
	for (const link of ['https://example.com/book', ' \tHTTPS://example.com/book\n ']) {
		for (const anchor of await renderCtas(link)) {
			assert.equal(anchor.getAttribute('href'), link.trim());
			assert.equal(anchor.getAttribute('target'), '_blank');
			assert.equal(anchor.getAttribute('rel'), 'noopener');
		}
	}
});

test('internal and invalid header CTA URLs retain their same-tab behavior', async () => {
	for (const link of ['/contact-us/', '', ' \t ', null, undefined, 'javascript:alert(1)', '//example.com/book']) {
		for (const anchor of await renderCtas(link)) {
			assert.equal(anchor.getAttribute('href'), '/contact-us/');
			assert.equal(anchor.getAttribute('target'), undefined);
			assert.equal(anchor.getAttribute('rel'), undefined);
		}
	}
});
