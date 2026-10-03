import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const home = readFileSync(new URL('../src/components/standalone/HomeBody.astro', import.meta.url), 'utf8');
const sections = [...home.matchAll(/^\t\{([\w?.]+) && \(\n/gm)].map((match) => match[1]);

test('the complete team section follows the hero before any other homepage content', () => {
	assert.deepEqual(sections.slice(0, 2), ['hero', 'team']);
	assert.equal(sections.filter((section) => section === 'team').length, 1);
});

test('the other homepage sections retain their existing order', () => {
	assert.deepEqual(sections.filter((section) => section !== 'team'), [
		'hero', 'data?.capsule', 'trust', 'why', 'testi', 'seller', 'stats',
		'comms', 'buyer', 'market', 'fsbo', 'awards', 'faq', 'finalCta', 'next',
	]);
});
