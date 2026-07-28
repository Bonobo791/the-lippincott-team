import type { Template } from 'tinacms';

export const tradeOffsBlockSchema: Template = {
	name: 'tradeOffs',
	label: 'Trade-offs',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
		{ type: 'rich-text', label: 'Summary', name: 'summary' },
		{
			type: 'object', label: 'Sides', name: 'sides', list: true,
			ui: {
				defaultItem: { label: 'Worth knowing', items: [{ text: 'Rush-hour congestion' }] },
				itemProps: (i: { label?: string }) => ({ label: i.label ?? '' }),
			},
			fields: [
				{ type: 'string', label: 'Label', name: 'label', required: true },
				{
					type: 'object', label: 'Items', name: 'items', list: true,
					ui: { defaultItem: { text: '' }, itemProps: (i: { text?: string }) => ({ label: i.text ?? '' }) },
					fields: [{ type: 'string', label: 'Text', name: 'text', ui: { component: 'textarea' } }],
				},
			],
		},
		{ type: 'string', label: 'Note Panel Label', name: 'noteLabel', description: 'Red label of the bordered note panel (e.g. "The flood question, straight").' },
		{ type: 'rich-text', label: 'Note', name: 'note', description: 'Bordered note panel body under the ledger.' },
	],
	ui: {
		defaultItem: {
			title: 'What are the downsides **of the area?**',
			sides: [{ label: 'Worth knowing', items: [{ text: 'Rush-hour congestion' }] }],
		},
	},
};
