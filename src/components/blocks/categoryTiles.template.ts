import type { Template } from 'tinacms';

export const categoryTilesBlockSchema: Template = {
	name: 'categoryTiles',
	label: 'Category Tiles',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
		{ type: 'rich-text', label: 'Summary', name: 'summary' },
		{
			type: 'object', label: 'Tiles', name: 'tiles', list: true,
			ui: {
				defaultItem: { label: 'On the water', items: [{ text: 'Towne Lake 300-acre boating lake' }] },
				itemProps: (i: { label?: string }) => ({ label: i.label ?? '' }),
			},
			fields: [
				{ type: 'string', label: 'Label', name: 'label' },
				{
					type: 'object', label: 'Items', name: 'items', list: true,
					ui: { defaultItem: { text: '' }, itemProps: (i: { text?: string }) => ({ label: i.text ?? '' }) },
					fields: [{ type: 'string', label: 'Text', name: 'text', ui: { component: 'textarea' } }],
				},
			],
		},
		{ type: 'rich-text', label: 'Note', name: 'note' },
	],
	ui: {
		defaultItem: {
			title: 'What is there to do **here?**',
			tiles: [{ label: 'On the water', items: [{ text: 'Towne Lake 300-acre boating lake' }] }],
		},
	},
};
