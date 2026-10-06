import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

// Use Tina's existing YAML parser to inspect the actual CMS content, including
// metadata, hero chips, tables and FAQ answers that also feed structured data.
const require = createRequire(import.meta.resolve('tinacms'));
const { parse } = require('yaml');
const readContent = (path) => parse(readFileSync(new URL(path, import.meta.url), 'utf8').split('---')[1]);
const northpointe = readContent('../src/content/community/northwest-houston-real-estate/tomball-tx-real-estate/villages-of-northpointe-real-estate.mdx');
const regional = readContent('../src/content/page/northwest-houston-real-estate.mdx');

test('Northpointe omits non-HAR market sources and their figures from every CMS field', () => {
	const content = JSON.stringify(northpointe);
	assert.doesNotMatch(content, /realtor\.com\/local\/market/i);
	assert.doesNotMatch(content, /14%|106%|\$417,495|\$430,000|\$425,000|\$408,500|\$319,000|48.days? on market|48-day/i);
});

test('regional metadata, buyer copy and FAQ omit the unsupported June buyer-market snapshot', () => {
	assert.doesNotMatch(JSON.stringify(regional), /Realtor\.com|June 2026|Jun 2026|95 to 98|95–98/i);
});

test('Northpointe keeps HAR appraisal context, dated inventory sources and team proof', () => {
	const appraisal = northpointe.blocks.find((block) => block.tiles?.some((tile) => /appraised values/i.test(tile.label ?? '')));
	assert.ok(appraisal, 'the HAR appraised-value explanation must remain');
	assert.match(JSON.stringify(appraisal), /2025/);
	assert.match(JSON.stringify(appraisal), /\$422,656/);
	assert.match(JSON.stringify(appraisal), /\$337,000–\$543,000/);
	assert.match(JSON.stringify(appraisal), /919 single-family properties/);
	const inventory = northpointe.blocks.find((block) => block._template === 'dataTable');
	assert.match(inventory.note, /HAR.*October 3, 2026/);
	assert.deepEqual(inventory.rows.map(({ cells }) => [cells[0].text, cells.at(-1).text]), [
		['Raleigh Creek', '2'], ['Wimbledon Falls', '6'], ['Villages of Northpointe', '8'],
		['Canyon Gate at Northpointe', '15'], ['Northpointe East', '11'],
	]);
	const proof = northpointe.blocks.find((block) => block._template === 'proofStage');
	assert.deepEqual(proof.metrics.map(({ value }) => value), [1463, 750, 9]);
	assert.match(proof.rating, /4\.9 on Google and HAR\.com/);
});
