import assert from 'node:assert/strict';
import test from 'node:test';
import { hasRichText, richTextToPlainText } from './rich-text.js';

test('richTextToPlainText flattens paragraphs and strips link markup', () => {
	assert.equal(
		richTextToPlainText({
			type: 'root',
			children: [
				{ type: 'p', children: [{ type: 'text', text: 'Before' }, { type: 'a', url: '/example', children: [{ type: 'text', text: 'link' }] }, { type: 'text', text: 'After' }] },
				{ type: 'p', children: [{ type: 'text', text: 'Next paragraph' }] },
			],
		}),
		'BeforelinkAfter Next paragraph',
	);
});

// Pins the phantom-container convention: Tina returns an empty root-node
// object for unset rich-text fields, and templates rely on hasRichText to
// treat that (and strings) correctly.
test('hasRichText treats the empty root node and blank strings as unset', () => {
	assert.equal(hasRichText({ type: 'root', children: [] }), false);
	assert.equal(hasRichText(undefined), false);
	assert.equal(hasRichText('   '), false);
	assert.equal(
		hasRichText({ type: 'root', children: [{ type: 'p', children: [{ type: 'text', text: 'x' }] }] }),
		true,
	);
	assert.equal(hasRichText('hello'), true);
});
