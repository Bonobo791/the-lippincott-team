import assert from 'node:assert/strict';
import test from 'node:test';
import { componentScripts } from './astro-script-test-helper.mjs';

test('component script extraction accepts case-insensitive opening and closing tags', () => {
	for (const [opening, closing] of [['SCRIPT', 'SCRIPT'], ['ScRiPt', 'sCrIpT'], ['script', 'SCRIPT']]) {
		const body = '\nconst title = "Preserve My Case";\n';
		assert.deepEqual(componentScripts(`<${opening}>${body}</${closing}>`), [body]);
	}
});

test('component script extraction preserves plain and inline script source order', () => {
	const source = '<h1>Fixture</h1><script>first();</script>\n<SCRIPT is:inline>second();</ScRiPt>';
	assert.deepEqual(componentScripts(source), ['first();', 'second();']);
});

test('component script extraction returns no scripts for unrelated markup', () => {
	assert.deepEqual(componentScripts('<h1>Fixture</h1><scripture>text</scripture><script-extra>text</script-extra>'), []);
});

test('component script extraction supports attributes and HTML closing-tag variations', () => {
	for (const closing of ['</script >', '</script foo="bar">', '</script\t\n bar>']) {
		assert.deepEqual(componentScripts(`<script is:inline data-astro-rerun>run();${closing}`), ['run();']);
	}
});

test('component script extraction skips Astro self-closing scripts', () => {
	const source = '<script type="application/ld+json" is:inline set:html={JSON.stringify(data)} /><script>run();</script>';
	assert.deepEqual(componentScripts(source), ['run();']);
});
