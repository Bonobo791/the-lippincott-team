import type { Template } from 'tinacms';

export const awardsBlockSchema: Template = {
	name: 'awards',
	label: 'Awards (sticky intro + numbered list)',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as an italic accent.' },
		{ type: 'string', label: 'Lede', name: 'description', ui: { component: 'textarea' } },
		{
			type: 'object', label: 'Call to Action', name: 'action',
			fields: [
				{ type: 'string', label: 'Label', name: 'label' },
				{ type: 'string', label: 'Link', name: 'link' },
			],
		},
		{
			type: 'object', label: 'Awards', name: 'items', list: true,
			ui: {
			defaultItem: { title: 'Award name', summary: 'What it takes to win it.' },
				itemProps: (i: { title?: string }) => ({ label: i.title ?? '' }),
			},
			fields: [
				{ type: 'string', label: 'Award', name: 'title' },
				{ type: 'string', label: 'Description', name: 'summary', ui: { component: 'textarea' } },
			],
		},
	],
	ui: {
		defaultItem: {
			title: 'Awards are nice. **What they took to win** is nicer.',
			action: { label: 'Schedule a Consultation', link: '/contact-us/' },
		},
	},
};
