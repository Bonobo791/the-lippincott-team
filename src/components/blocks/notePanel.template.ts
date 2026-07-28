import type { Template } from 'tinacms';

export const notePanelBlockSchema: Template = {
	name: 'notePanel',
	label: 'Note Panel',
	fields: [
		{ type: 'string', label: 'Label', name: 'label', required: true, description: 'Red uppercase label (e.g. "How we use this").' },
		{ type: 'rich-text', label: 'Body', name: 'body' },
	],
	ui: {
		defaultItem: { label: 'How we use this' },
	},
};
