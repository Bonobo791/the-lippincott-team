import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { parse } from 'node-html-parser';
import ts from 'typescript';
import { safeHref } from '../src/lib/url.ts';

const require = createRequire(import.meta.resolve('astro/package.json'));
const { transform } = require('@astrojs/compiler-rs');
const source = readFileSync(new URL('../src/components/v2/RegionalMarketComparison.astro', import.meta.url), 'utf8');
// Inject only the CMS loaders; compile and render the complete real component.
const prepared = source
	.replace("import { getConfig, getPage } from '../../lib/data';", 'const { getConfig, getPage } = Astro.props;')
	.replace(/^import type [^\n]*\n/gm, '')
	.replace("'../../lib/url'", JSON.stringify(new URL('../src/lib/url.ts', import.meta.url).href));
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

// AstroContainer always creates on-demand routes. Exercise the same frontmatter
// separately with the build flag to prove publication still rejects invalid data.
const frontmatter = ts.transpileModule(source.split('---')[1].replace(/^import[^\n]*\n/gm, ''), {
	compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const prerender = new AsyncFunction('getPage', 'getConfig', 'safeHref', 'Astro', frontmatter);
const getConfig = async () => ({ data: { config: {} } });
const getPage = (page) => async () => ({ data: { page } });
const render = (page) => container.renderToString(RegionalMarketComparison, {
	props: { getPage: getPage(page), getConfig },
});
const build = (page) => prerender(getPage(page), getConfig, safeHref, { isPrerendered: true });

function fixture() {
	return { blocks: [{
		__typename: 'PageBlocksDataTable', anchorId: 'communities',
		headers: ['Realtor.com · Jun 2026', 'Median list', 'For sale', 'Days on market', 'Character'].map((heading) => ({ heading })),
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
		await assert.rejects(build(page), { message });
	});
}

test('valid data and ordinary edits render the complete comparison in row order', async () => {
	const page = fixture();
	for (const edit of [false, true]) {
		if (edit) {
			page.blocks[0].rows.reverse();
			page.blocks[0].rows[0].cells[1].text = '$460,000';
			page.blocks[0].rows[0].cells[3].text = '60';
			page.blocks[0].headers[0].heading = 'Updated regional source';
			page.blocks[0].headers[1].heading = ' MEDIAN LIST ';
			page.blocks[0].headers[3].heading = ' days on MARKET ';
		}
		await build(page);
		const html = parse(await render(page));
		const rows = html.querySelectorAll('tbody tr').map((row) => row.querySelectorAll('th, td').map((cell) => cell.text));
		assert.deepEqual(rows, page.blocks[0].rows.map(({ cells }) => [cells[0].text, cells[1].text, cells[3].text]));
		assert.equal(html.querySelector('h3').text, 'Northwest Houston at a Glance');
		assert.equal(html.querySelector('a').getAttribute('href'), '/northwest-houston-real-estate/#communities');
		assert.ok(html.querySelector('p').text.startsWith(page.blocks[0].headers[0].heading));
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
