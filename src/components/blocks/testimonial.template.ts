import type { Template } from 'tinacms';
import type { Action, TestimonialItem } from '../../lib/data';

export const testimonialBlockSchema: Template = {
	name: 'testimonial',
	label: 'Testimonial',
	fields: [
		{ type: 'string', label: 'Title', name: 'title' },
		{ type: 'string', label: 'Description', name: 'description', ui: { component: 'textarea' } },
		{
			type: 'object', label: 'Actions', name: 'actions', list: true,
			ui: {
				defaultItem: { label: 'Get Started', type: 'button', link: '/' },
				itemProps: (item: Action) => ({ label: item.label ?? '' }),
			},
			fields: [
				{ type: 'string', label: 'Label', name: 'label' },
				{ type: 'string', label: 'Type', name: 'type', options: [
					{ label: 'Button', value: 'button' }, { label: 'Link', value: 'link' } ] },
				{ type: 'string', label: 'Icon (Tabler name)', name: 'icon' },
				{ type: 'string', label: 'Link', name: 'link' },
			],
		},
		{
			type: 'object', list: true, label: 'Testimonials', name: 'testimonials',
			ui: { defaultItem: { quote: 'There are only two hard things in Computer Science: cache invalidation and naming things.', author: 'Phil Karlton' }, itemProps: (i: TestimonialItem) => ({ label: `${i.quote ?? ''} - ${i.author ?? ''}` }) },
			fields: [
				{ type: 'string', label: 'Quote', name: 'quote', ui: { component: 'textarea' } },
				{ type: 'string', label: 'Author', name: 'author' },
				{ type: 'string', label: 'Role', name: 'role' },
				{ type: 'image', label: 'Avatar', name: 'avatar' },
			],
		},
	],
	ui: {
		defaultItem: {
			title: 'Loved by developers',
			testimonials: [ { quote: 'There are only two hard things in Computer Science: cache invalidation and naming things.', author: 'Phil Karlton' } ],
		},
	},
};
