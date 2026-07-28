import assert from 'node:assert/strict';
import { richTextToPlainText } from './rich-text.js';

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
