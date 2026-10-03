// Run with: node --test scripts/social-image.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const readComponent = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const pageURL = new URL('https://example.com/northwest-houston-real-estate/cypress/');
const emptyImages = ['', ' \t\n ', undefined, null];

// Exercise the expressions in the actual Astro templates, without loading the
// CMS or unrelated layout dependencies. This avoids copying fallback logic into
// tests or requiring generated Tina files / external services.
function imageProp(source, component, scope) {
	const expression = source.match(new RegExp(`<${component}\\b[^>]*\\bimage=\\{([^}]+)\\}`))?.[1];
	assert.ok(expression, `${component} must receive an image expression`);
	return runInNewContext(expression, scope);
}

const layoutSource = readComponent('layouts/Base.astro');
const headSource = readComponent('components/BaseHead.astro');
const headFrontmatter = stripTypeScriptTypes(
	headSource.split('---')[1].replace(/^import .+;$/gm, ''),
);

function socialImageURLs(image) {
	const Astro = { props: { title: 'Test', description: 'Test', image }, url: pageURL, site: pageURL.origin };
	return ['og:image', 'twitter:image'].map((property) => {
		const expression = headSource.match(new RegExp(`<meta property="${property}" content=\\{([^}]+)\\}`))?.[1];
		assert.ok(expression, `${property} must have a content expression`);
		return runInNewContext(`${headFrontmatter}\nString(${expression})`, { Astro, URL });
	});
}

function layoutImage(image, config) {
	return imageProp(layoutSource, 'BaseHead', { image, config });
}

function assertImageURLs(image, expected) {
	assert.deepEqual(socialImageURLs(image), [expected, expected]);
}

test('BaseHead falls back to the logo for missing or cleared image props', () => {
	for (const image of emptyImages) {
		assertImageURLs(image, 'https://example.com/logo.webp');
	}
});

test('BaseHead keeps populated relative and absolute image URLs', () => {
	assertImageURLs('/uploads/page.webp', 'https://example.com/uploads/page.webp');
	assertImageURLs('https://images.example.com/page.webp', 'https://images.example.com/page.webp');
});

test('Base uses the global social image when the page image is missing or cleared', () => {
	for (const image of emptyImages) {
		assertImageURLs(layoutImage(image, { seo: { socialImage: '/uploads/global.webp' } }), 'https://example.com/uploads/global.webp');
	}
});

test('Base falls through missing or cleared global images to the logo', () => {
	for (const image of emptyImages) {
		for (const socialImage of emptyImages) {
			assertImageURLs(layoutImage(image, { seo: { socialImage } }), 'https://example.com/logo.webp');
		}
		assertImageURLs(layoutImage(image, null), 'https://example.com/logo.webp');
		assertImageURLs(layoutImage(image, {}), 'https://example.com/logo.webp');
	}
});

test('Base prefers a populated page image over the global social image', () => {
	assertImageURLs(layoutImage('/uploads/page.webp', { seo: { socialImage: '/uploads/global.webp' } }), 'https://example.com/uploads/page.webp');
});

for (const route of ['northwest-houston-real-estate', 'northwest-houston-schools-real-estate']) {
	const source = readComponent(`pages/${route}/[...slug].astro`);
	const communityImage = (data) => imageProp(source, 'Base', { data });

	test(`${route} falls back to the hero when its social image is missing or cleared`, () => {
		for (const socialImage of emptyImages) {
			assertImageURLs(layoutImage(communityImage({ socialImage, heroImage: '/uploads/hero.webp' }), { seo: { socialImage: '/uploads/global.webp' } }), 'https://example.com/uploads/hero.webp');
		}
	});

	test(`${route} falls through cleared social and hero images to the global image or logo`, () => {
		for (const socialImage of emptyImages) {
			for (const heroImage of emptyImages) {
				const image = communityImage({ socialImage, heroImage });
				assertImageURLs(layoutImage(image, { seo: { socialImage: '/uploads/global.webp' } }), 'https://example.com/uploads/global.webp');
				assertImageURLs(layoutImage(image, { seo: { socialImage: '  ' } }), 'https://example.com/logo.webp');
			}
		}
	});

	test(`${route} prefers its populated social image over the hero and global image`, () => {
		const image = communityImage({ socialImage: '/uploads/community.webp', heroImage: '/uploads/hero.webp' });
		assertImageURLs(layoutImage(image, { seo: { socialImage: '/uploads/global.webp' } }), 'https://example.com/uploads/community.webp');
	});
}
