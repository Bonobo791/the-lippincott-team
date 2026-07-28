import type { Template } from 'tinacms';

export const guideCtaBlockSchema: Template = {
	name: 'guideCta',
	label: 'Guide CTA (dark)',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic gold accent.', ui: { component: 'textarea' } },
		{ type: 'string', label: 'Description', name: 'description', ui: { component: 'textarea' } },
		{
			type: 'object', label: 'Actions', name: 'actions', list: true,
			ui: { defaultItem: { label: 'Schedule a Consultation', type: 'button', link: '/contact' }, itemProps: (i: { label?: string }) => ({ label: i.label ?? '' }) },
			fields: [
				{ type: 'string', label: 'Label', name: 'label' },
				{ type: 'string', label: 'Type', name: 'type', options: [{ label: 'Button', value: 'button' }, { label: 'Link', value: 'link' }] },
				{ type: 'string', label: 'Link', name: 'link' },
			],
		},
	],
	ui: {
		defaultItem: {
			title: 'See it with the team that **sells it.**',
			description: 'A consultation costs nothing and commits you to nothing.',
			actions: [{ label: 'Schedule a Consultation', type: 'button', link: '/contact' }],
		},
	},
};
