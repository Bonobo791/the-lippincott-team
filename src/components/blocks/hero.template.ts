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
				{ label: 'Video (full-viewport video, bottom-left text)', value: 'video' },
			],
		},
		{ type: 'image', label: 'Background Image', name: 'backgroundImage', description: 'Full-bleed photo (photo/glass variants); video poster frame (video variant).' },
		{ type: 'string', label: 'Background Video URL', name: 'backgroundVideo', description: 'MP4 URL for the video variant (e.g. a https:// media link). Leave empty for photo variants.' },
		{ type: 'string', label: 'Eyebrow', name: 'eyebrow', description: 'Small pill label above the headline (photo/glass variants).' },
		{ type: 'string', label: 'Headline', name: 'headline', description: 'Wrap a phrase in **double asterisks** to render it bold. Video variant: use a line break to split the animated reveal lines.', ui: { component: 'textarea' } },
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
