import type { Template } from 'tinacms';

export const photoCardGridBlockSchema: Template = {
	name: 'photoCardGrid',
	label: 'Photo Card Grid',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
		{ type: 'rich-text', label: 'Summary', name: 'summary' },
		{
			type: 'string', label: 'Columns', name: 'columns',
			options: [
				{ label: '2 columns', value: '2' },
				{ label: '3 columns', value: '3' },
			],
		},
		{
			type: 'object', label: 'Cards', name: 'cards', list: true,
			ui: {
				defaultItem: { title: 'Bridgeland', line: 'Lakes, trails and new villages', action: '$400s to $1M+' },
				itemProps: (i: { title?: string }) => ({ label: i.title ?? '' }),
			},
			fields: [
				{ type: 'image', label: 'Image', name: 'image' },
				{ type: 'string', label: 'Title', name: 'title', required: true },
				{ type: 'string', label: 'Line', name: 'line', description: 'Small description line under the title.' },
				{ type: 'string', label: 'Action', name: 'action', description: 'Accent line (price range or "View listing →").' },
				{ type: 'string', label: 'Link', name: 'link' },
			],
		},
		{ type: 'rich-text', label: 'Note', name: 'note' },
		{
			type: 'object', label: 'Footer Action', name: 'footerAction',
			fields: [
				{ type: 'string', label: 'Label', name: 'label' },
				{ type: 'string', label: 'Link', name: 'link' },
			],
		},
	],
	ui: {
		defaultItem: {
			title: 'Which community **fits you?**',
			columns: '2',
			cards: [{ title: 'Bridgeland', line: 'Lakes, trails and new villages', action: '$400s to $1M+' }],
		},
	},
};
