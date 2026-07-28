import type { Template } from 'tinacms';

export const communityGridBlockSchema: Template = {
	name: 'communityGrid',
	label: 'Community Card Grid',
	fields: [
		{
			type: 'string', label: 'Variant', name: 'variant',
			options: [
				{ label: 'Grid (2-column cards)', value: 'grid' },
				{ label: 'Rail (pinned horizontal pan)', value: 'rail' },
			],
		},
		{ type: 'string', label: 'Title', name: 'title' },
		{ type: 'string', label: 'Description', name: 'description', ui: { component: 'textarea' } },
		{
			type: 'string', label: 'Section', name: 'prefix', required: true,
			description: 'Which collection subtree to show as cards.',
			options: [
				{ label: 'Communities', value: 'northwest-houston-real-estate' },
				{ label: 'Schools', value: 'northwest-houston-schools-real-estate' },
			],
		},
	],
	ui: { defaultItem: { title: 'Explore Communities', prefix: 'northwest-houston-real-estate' } },
};
