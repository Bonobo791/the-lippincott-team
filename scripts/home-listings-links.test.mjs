import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const homePage = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const featuredListingsUrl = 'https://www.thelippincottteamlistings.com/featured-listings/';
const legacyListingsUrl = 'https://www.thelippincottteamlistings.com/property-search/results/';

test('all home-page live-listings links use the team featured listings page', () => {
	assert.equal(homePage.match(new RegExp(featuredListingsUrl, 'g'))?.length, 3);
	assert.equal(homePage.match(new RegExp(legacyListingsUrl, 'g'))?.length, 1);
});
