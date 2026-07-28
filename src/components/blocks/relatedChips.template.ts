import type { Template } from 'tinacms';

export const relatedChipsBlockSchema: Template = {
	name: 'relatedChips',
	label: 'Related Chips',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
		{
			type: 'object', label: 'Chips', name: 'chips', list: true,
			ui: { defaultItem: { label: 'Tomball', link: '/' }, itemProps: (i: { label?: string }) => ({ label: i.label ?? '' }) },
			fields: [
				{ type: 'string', label: 'Label', name: 'label' },
				{ type: 'string', label: 'Link', name: 'link' },
			],
		},
	],
	ui: {
		defaultItem: {
			title: 'Compare **nearby communities.**',
			chips: [{ label: 'Tomball', link: '/' }],
		},
	},
};
