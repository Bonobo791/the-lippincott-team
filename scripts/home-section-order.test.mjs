import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

// Use the same parser as the pinned Astro runtime, without a second compiler dependency.
const astroRequire = createRequire(import.meta.resolve('astro'));
const { parse } = await import(astroRequire.resolve('@astrojs/compiler-rs'));
const home = readFileSync(new URL('../src/components/standalone/HomeBody.astro', import.meta.url), 'utf8');

function topLevelElements(node) {
	if (!node || typeof node !== 'object') return [];
	if (node.type === 'JSXElement') return [node];
	return Object.values(node).flatMap(topLevelElements);
}

function sectionClass(element) {
	const value = element.openingElement.attributes.find((attribute) => attribute.name?.name === 'class')?.value?.value;
	return value?.split(/\s+/)[0] ?? element.openingElement.name.name;
}

function sectionOrder(source) {
	const { ast, diagnostics } = parse(source);
	assert.deepEqual(diagnostics, [], 'the homepage template must parse successfully');
	const root = topLevelElements(ast.body).find((element) => sectionClass(element) === 'home-v2');
	assert.ok(root, 'the homepage must have its home-v2 wrapper');
	return topLevelElements(root.children).map(sectionClass);
}

const sections = sectionOrder(home);

test('the complete team section follows the hero before any other homepage content', () => {
	assert.deepEqual(sections.slice(0, 2), ['hero', 'team']);
	assert.equal(sections.filter((section) => section === 'team').length, 1);
});

test('the order check detects an unconditional section inserted before the team', () => {
	const source = [
		'<div class="home-v2">',
		'{hero && <section class="hero" />}',
		'<section class="unexpected" />',
		'{team && <section class="team dark" />}',
		'</div>',
	].join('\n');
	assert.deepEqual(sectionOrder(source), ['hero', 'unexpected', 'team']);
});

test('the order check detects a differently formatted conditional section before the team', () => {
	const source = [
		'<div class="home-v2">',
		'{hero && <section class="hero" />}',
		'{data.banner && <section class="unexpected" />}',
		'{team && <section class="team dark" />}',
		'</div>',
	].join('\n');
	assert.deepEqual(sectionOrder(source), ['hero', 'unexpected', 'team']);
});

test('section order is independent of indentation and line endings', () => {
	assert.deepEqual(sectionOrder(home.replace(/\t/g, '  ').replace(/\n/g, '\r\n')), sections);
});

test('the other homepage sections retain their existing order', () => {
	assert.deepEqual(sections.filter((section) => section !== 'team'), [
		'hero', 'capsule', 'trust', 'svc', 'testi', 'help-sell', 'stats',
		'comm', 'help-buy', 'market', 'fsbo', 'awards', 'faq', 'final', 'next',
	]);
});
