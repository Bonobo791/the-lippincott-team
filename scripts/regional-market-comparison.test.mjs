import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { createComponent } from 'astro/runtime/server/index.js';
import { parse } from 'node-html-parser';

const require = createRequire(import.meta.resolve('astro/package.json'));
const { transform } = require('@astrojs/compiler-rs');
const source = readFileSync(new URL('../src/components/v2/RegionalMarketComparison.astro', import.meta.url), 'utf8');
// Inject only the CMS loaders; compile and render the complete real component.
const prepared = source
	.replace("import { getConfig, getPage } from '../../lib/data';", 'const { getConfig, getPage } = Astro.props;')
	.replace(/^import type [^\n]*\n/gm, '')
	.replace("'../../lib/url'", JSON.stringify(new URL('../src/lib/url.ts', import.meta.url).href))
	.replace("'../../lib/rich-text'", JSON.stringify(new URL('../src/lib/rich-text.ts', import.meta.url).href));
const compiled = await transform(prepared, {
	filename: 'RegionalMarketComparison.astro', internalURL: 'astro/compiler-runtime', resultScopedSlot: true,
});
const code = compiled.code
	.replace(', createMetadata as $$createMetadata', '')
	.replace(/^import \* as \$\$module[^\n]*\n/gm, '')
	.replace(/export const \$\$metadata[\s\S]*?(?=const \$\$Astro)/, '')
	.replaceAll('"astro/compiler-runtime"', JSON.stringify(import.meta.resolve('astro/compiler-runtime')));
const { default: RegionalMarketComparison } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const container = await AstroContainer.create();

/** Override the container's route flag while preserving its real Astro context and component markup. */
const PrerenderedComparison = createComponent((result, props, slots) => {
	const createAstro = result.createAstro;
	result.createAstro = (...args) => Object.assign(createAstro(...args), { isPrerendered: true });
	return RegionalMarketComparison(result, props, slots);
});
const getPage = (page) => async () => ({ data: { page } });
/** Render the compiled comparison with injected CMS data in either route mode. */
const render = (page, { isPrerendered = false, marketTable } = {}) => container.renderToString(
	isPrerendered ? PrerenderedComparison : RegionalMarketComparison,
	{ props: { getPage: getPage(page), getConfig: async () => ({ data: { config: { marketTable } } }) } },
);

/** Create a complete, independently editable regional table matching the CMS shape. */
function fixture() {
	return { blocks: [{
		__typename: 'PageBlocksDataTable', anchorId: 'communities',
		summary: { type: 'root', children: [{ type: 'p', children: [{ text: 'HAR.com city listings, September 2026; Bridgeland uses Realtor.com, June 2026.' }] }] },
		headers: ['Area', 'Median list', 'For sale', 'Days on market', 'Character'].map((heading) => ({ heading })),
		rows: ['Cypress', 'Bridgeland', 'Magnolia', 'Tomball', 'Katy', 'Waller', 'Hockley'].map((market) => ({
			cells: [{ text: market }, { text: '$445,000' }, { text: '2,178' }, { text: '71' }, { text: 'Community character' }],
		})),
	}] };
}

const missingTable = 'Regional market comparison requires the Northwest Houston #communities data table.';
const invalidColumns = 'Regional market comparison requires Median list and Days on market in columns 2 and 4.';
const invalidRows = 'Regional market comparison requires six market rows plus Bridgeland — including Cypress and Bridgeland — with median list price and days on market.';
const invalidCases = [
	['missing table', (page) => { page.blocks = []; }, missingTable],
	['missing row', (page) => { page.blocks[0].rows.splice(2, 1); }, invalidRows],
	['extra row', (page) => { page.blocks[0].rows.push(structuredClone(page.blocks[0].rows[2])); }, invalidRows],
	['cleared cell', (page) => { page.blocks[0].rows[0].cells[1].text = ''; }, invalidRows],
	['renamed required market', (page) => { page.blocks[0].rows[0].cells[0].text = 'Cypress, TX'; }, invalidRows],
	['reordered columns', (page) => {
		const table = page.blocks[0];
		[table.headers[2], table.headers[3]] = [table.headers[3], table.headers[2]];
		for (const row of table.rows) [row.cells[2], row.cells[3]] = [row.cells[3], row.cells[2]];
	}, invalidColumns],
	['removed For sale column', (page) => {
		page.blocks[0].headers.splice(2, 1);
		for (const row of page.blocks[0].rows) row.cells.splice(2, 1);
	}, invalidColumns],
	['missing header', (page) => { page.blocks[0].headers[1] = null; }, invalidColumns],
];

for (const [name, change, message] of invalidCases) {
	test(`on-demand rendering omits the comparison for ${name}`, async () => {
		const page = fixture();
		change(page);
		assert.equal(parse(await render(page)).querySelectorAll('.regional-market-comparison').length, 0);
	});
	test(`prerendering rejects ${name} with the expected validation error`, async () => {
		const page = fixture();
		change(page);
		await assert.rejects(render(page, { isPrerendered: true }), { message });
	});
}

test('valid data and ordinary edits emit complete comparison HTML in both render modes', async () => {
	const page = fixture();
	for (const edit of [false, true]) {
		if (edit) {
			page.blocks[0].rows.reverse();
			page.blocks[0].rows[0].cells[1].text = '$460,000';
			page.blocks[0].rows[0].cells[3].text = '60';
			page.blocks[0].summary.children[0].children[0].text = 'Updated reporting period and source <not markup>.';
			page.blocks[0].headers[1].heading = ' MEDIAN LIST ';
			page.blocks[0].headers[3].heading = ' days on MARKET ';
		}
		const labels = edit ? {
			heading: 'Current regional markets', caption: 'Compare communities',
			areaLabel: 'Market', medianLabel: 'Asking price', daysLabel: 'Time on market',
			link: '/updated-market-sources/', linkLabel: 'Full data',
		} : {
			heading: 'Northwest Houston at a Glance', caption: 'Northwest Houston market and community comparison',
			areaLabel: 'Area', medianLabel: 'Median list', daysLabel: 'Days on market',
			link: '/northwest-houston-real-estate/#communities', linkLabel: 'Sources & full comparison',
		};
		const outputs = [];
		for (const isPrerendered of [false, true]) {
			const output = await render(page, { isPrerendered, marketTable: edit ? labels : undefined });
			outputs.push(output);
			const html = parse(output);
			const rows = html.querySelectorAll('tbody tr').map((row) => row.querySelectorAll('th, td').map((cell) => cell.text));
			assert.deepEqual(rows, page.blocks[0].rows.map(({ cells }) => [cells[0].text, cells[1].text, cells[3].text]), `rows with isPrerendered=${isPrerendered}`);
			assert.equal(html.querySelector('h3').text, labels.heading);
			assert.equal(html.querySelector('caption').text, labels.caption);
			assert.deepEqual(html.querySelectorAll('thead th').map((cell) => cell.text), [labels.areaLabel, labels.medianLabel, labels.daysLabel]);
			assert.equal(html.querySelector('a').getAttribute('href'), labels.link);
			assert.equal(html.querySelector('a').text, labels.linkLabel);
			assert.equal(html.querySelector('p').text, page.blocks[0].summary.children[0].children[0].text);
			assert.ok(output.indexOf(html.querySelector('p').outerHTML) < output.indexOf('<table'), 'source and reporting period must precede the figures');
		}
		assert.equal(outputs[1], outputs[0], 'valid published and editor HTML must match');
	}
});

test('restoring complete data restores the comparison on the next render', async () => {
	const page = fixture();
	const expected = await render(page);
	page.blocks[0].rows[0].cells[3].text = '';
	assert.equal(parse(await render(page)).querySelectorAll('table').length, 0);
	page.blocks[0].rows[0].cells[3].text = '71';
	assert.equal(await render(page), expected);
});
