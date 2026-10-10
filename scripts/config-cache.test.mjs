import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setConfigLoader } from './test-fixtures/tina-config.mjs';

const routeURL = pathToFileURL(fileURLToPath(new URL('../src/pages/tina-island/[name].ts', import.meta.url))).href;
const dataURL = new URL('../src/lib/data.ts', import.meta.url).href;
const islandsURL = new URL('../src/lib/islands.ts', import.meta.url).href;
const clientURL = new URL('./test-fixtures/tina-config.mjs', import.meta.url).href;
const componentURL = new URL('./test-fixtures/config-island.mjs', import.meta.url).href;
let testId = 0;

// Keep the real endpoint, registry, data loaders, Astro rendering, and Tina
// request/overlay handling. Substitute only the CMS network and page templates.
const aliases = new Map([
	['../../lib/islands', [routeURL, islandsURL]],
	['../../lib/data', [routeURL, dataURL]],
	['./data', [islandsURL, dataURL]],
	['../../src/lib/data.ts', [componentURL, dataURL]],
	['../../tina/__generated__/client', [dataURL, clientURL]],
]);
registerHooks({
	resolve(specifier, context, nextResolve) {
		const parent = context.parentURL ?? '';
		const [expectedParent, target] = aliases.get(specifier) ?? [];
		if (expectedParent && parent.startsWith(expectedParent)) {
			const suffix = target === clientURL ? '' : `?test=${testId}`;
			return nextResolve(target + suffix, context);
		}
		if (parent.startsWith(islandsURL) && specifier.endsWith('.astro')) {
			return nextResolve(`${componentURL}?test=${testId}`, context);
		}
		return nextResolve(specifier, context);
	},
});

const query = 'query Config($relativePath: String!) { config(relativePath: $relativePath) { agentPages { eyebrow } } }';
const copy = (label) => ({
	agentPages: { eyebrow: label }, blogPost: { tocLabel: label }, marketTable: { heading: label },
});

async function setup() {
	testId += 1;
	let saved = 'original';
	let queries = 0;
	setConfigLoader(async (variables) => {
		queries += 1;
		return { data: { config: copy(saved) }, query, variables };
	});
	const data = await import(`${dataURL}?test=${testId}`);
	const { ALL } = await import(`${routeURL}?test=${testId}`);
	const { pauseBeforeNestedLoad } = await import(`${componentURL}?test=${testId}`);
	return {
		...data,
		pauseBeforeNestedLoad,
		save: (label) => { saved = label; },
		queries: () => queries,
		render: async (name = 'team', { slug = 'agent', overlay = {}, prime = false } = {}) => {
			const url = new URL(`https://example.com/tina-island/${name}?slug=${slug}`);
			const response = await ALL({
				params: { name }, url,
				request: new Request(url, {
					method: 'POST',
					headers: {
						'content-type': 'application/x-tina-preview+json',
						...(prime ? { 'X-Tina-Prime': '1' } : {}),
					},
					body: JSON.stringify(overlay),
				}),
			});
			assert.equal(response.status, 200);
			assert.equal(response.headers.get('cache-control'), 'no-store');
			return response.text();
		},
	};
}

function assertCopy(html, label) {
	assert.ok(html.includes(`first=${label}; nested=${label}; blog=${label}; market=${label}`), html);
}

test('static rendering retains the shared in-flight and resolved config promise', async () => {
	const app = await setup();
	const first = app.getConfig();
	assert.equal(first, app.getConfig());
	await first;
	assert.equal(first, app.getConfig());
	assert.equal(app.queries(), 1);
});

for (const island of ['global', 'team']) {
	test(`${island} refetches saved config between island requests after the static cache is populated`, async () => {
		const app = await setup();
		await app.getConfig();
		assertCopy(await app.render(island), 'original');
		app.save('saved edit');
		assertCopy(await app.render(island), 'saved edit');
		assert.equal(app.queries(), 3, 'one static fetch and one deduplicated fetch per island request');
	});
}

test('request overlays override saved config and are collected on every priming request', async () => {
	const app = await setup();
	const { id } = await app.getConfig();
	for (const label of ['unsaved one', 'unsaved two']) {
		const html = await app.render('team', { overlay: { [id]: { config: copy(label) } }, prime: true });
		assertCopy(html, label);
		assert.ok(html.includes('data-tina-form='));
		assert.ok(html.includes('query Config('), 'the nested config read registers its form each time');
	}
	assertCopy(await app.render('team'), 'original');
	assert.equal((await app.getConfig()).data.config.agentPages.eyebrow, 'original');
});

test('concurrent island requests keep their own config for nested reads', async () => {
	const app = await setup();
	const { id } = await app.getConfig();
	const paused = Promise.withResolvers();
	const resume = Promise.withResolvers();
	app.pauseBeforeNestedLoad(async (slug) => {
		if (slug === 'first') {
			paused.resolve();
			await resume.promise;
		}
	});
	const first = app.render('team', { slug: 'first', overlay: { [id]: { config: copy('first editor') } } });
	await paused.promise;
	try {
		assertCopy(await app.render('team', { slug: 'second', overlay: { [id]: { config: copy('second editor') } } }), 'second editor');
	} finally {
		resume.resolve();
	}
	assertCopy(await first, 'first editor');
});
