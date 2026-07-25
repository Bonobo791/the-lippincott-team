import type { Template } from 'tinacms';
import type { Action } from '../../lib/data';

export const heroBlockSchema: Template = {
	name: 'hero',
	label: 'Hero',
	fields: [
		{
			type: 'string', label: 'Variant', name: 'variant',
			options: [
				{ label: 'Photo (full-bleed photo, centered text)', value: 'photo' },
				{ label: 'Glass (full-bleed photo, frosted-glass card)', value: 'glass' },
			],
		},
		{ type: 'image', label: 'Background Image', name: 'backgroundImage' },
		{ type: 'string', label: 'Eyebrow', name: 'eyebrow', description: 'Small pill label above the headline (photo/glass variants).' },
		{ type: 'string', label: 'Headline', name: 'headline', description: 'Wrap a phrase in **double asterisks** to render it bold.' },
		{ type: 'string', label: 'Tagline', name: 'tagline' },
		{
			type: 'object', label: 'Actions', name: 'actions', list: true,
			ui: { defaultItem: { label: 'Get Started', type: 'button', link: '/' }, itemProps: (i: Action) => ({ label: i.label ?? '' }) },
			fields: [
				{ type: 'string', label: 'Label', name: 'label' },
				{ type: 'string', label: 'Type', name: 'type', options: [{ label: 'Button', value: 'button' }, { label: 'Link', value: 'link' }] },
				{ type: 'string', label: 'Icon (Tabler name)', name: 'icon' },
				{ type: 'string', label: 'Link', name: 'link' },
			],
		},
		{
			type: 'object', label: 'Image', name: 'image',
			fields: [
				{ name: 'src', label: 'Image Source', type: 'image' },
				{ name: 'alt', label: 'Alt Text', type: 'string' },
			],
		},
	],
	ui: {
		defaultItem: {
			variant: 'photo',
			tagline: "Here's some text above the other text",
			headline: 'Astro + TinaCMS, ready to ship',
		},
	},
};
