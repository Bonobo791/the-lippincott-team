import type { Template } from 'tinacms';

export const teamBannerBlockSchema: Template = {
	name: 'teamBanner',
	label: 'Team Banner (crimson photo)',
	fields: [
		{ type: 'image', label: 'Background Image', name: 'backgroundImage' },
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as an italic accent.' },
		{ type: 'string', label: 'Body', name: 'description', ui: { component: 'textarea' } },
		{
			type: 'object', label: 'Call to Action', name: 'action',
			fields: [
				{ type: 'string', label: 'Label', name: 'label' },
				{ type: 'string', label: 'Link', name: 'link' },
			],
		},
	],
	ui: {
		defaultItem: {
			title: 'A full team. **One track record.**',
			action: { label: 'Meet the Full Team', link: '/about/' },
		},
	},
};
