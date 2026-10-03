import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const routes = ['index', 'buy', 'sell', 'reviews', 'blog/index', '[...slug]', '404', 'contact-us/thank-you'];
for (const route of routes) {
	const source = readFileSync(new URL(`../src/pages/${route}.astro`, import.meta.url), 'utf8');
	const titleExpression = source.match(/<Base\b[\s\S]*?\btitle=\{([^}]+)\}/)?.[1];
	assert.ok(titleExpression, `${route} must supply a page title`);
	const title = (seoTitle, globalTitle = 'Site Title') => runInNewContext(titleExpression, {
		data: { seoTitle }, config: { seo: { title: globalTitle } },
	});
	test(`${route} treats cleared SEO titles as unset and trims populated titles`, () => {
		const fallback = title(undefined);
		for (const value of ['', ' \t\n ', null]) assert.equal(title(value), fallback);
		assert.equal(title(' Page Title '), 'Page Title');
		assert.ok(title(' ', ' ').trim().length > 0);
	});
}
