import type { Template } from 'tinacms';

export const priceLadderBlockSchema: Template = {
	name: 'priceLadder',
	label: 'Price Ladder',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
		{ type: 'rich-text', label: 'Summary', name: 'summary' },
		{
			type: 'object', label: 'Rows', name: 'rows', list: true,
			ui: {
				defaultItem: { name: 'Towne Lake', figure: '$740,000', weight: 100, highlight: true },
				itemProps: (i: { name?: string; figure?: string }) => ({ label: `${i.name ?? ''} ${i.figure ?? ''}`.trim() }),
			},
			fields: [
				{ type: 'string', label: 'Name', name: 'name', required: true },
				{ type: 'string', label: 'Figure', name: 'figure' },
				{ type: 'string', label: 'Link', name: 'link' },
				{ type: 'number', label: 'Bar Weight (0–100)', name: 'weight', description: 'Bar length as a percentage of the top row.' },
				{ type: 'boolean', label: 'Highlight (red bar)', name: 'highlight' },
			],
		},
		{ type: 'rich-text', label: 'Note', name: 'note' },
	],
	ui: {
		defaultItem: {
			title: 'What does your budget buy **here?**',
			rows: [
				{ name: 'Towne Lake', figure: '$740,000', weight: 100, highlight: true },
				{ name: 'Coles Crossing', figure: '$525,000', weight: 71 },
			],
		},
	},
};
