import type { Template } from 'tinacms';
import type { TestimonialItem } from '../../lib/data';

export const testimonialShowcaseBlockSchema: Template = {
	name: 'testimonialShowcase',
	label: 'Testimonial Showcase (video + review carousel)',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as an italic accent.' },
		{ type: 'string', label: 'Video URL', name: 'videoUrl', description: 'MP4 URL for the client story video.' },
		{ type: 'image', label: 'Video Poster', name: 'poster' },
		{ type: 'string', label: 'Video Caption', name: 'caption' },
		{
			type: 'object', list: true, label: 'Reviews', name: 'testimonials',
			ui: { defaultItem: { quote: 'Amy\'s team was wonderful in every way.', author: 'Feedback on Lismore Lake Dr' }, itemProps: (i: TestimonialItem) => ({ label: `${i.author ?? ''}` }) },
			fields: [
				{ type: 'string', label: 'Quote', name: 'quote', ui: { component: 'textarea' } },
				{ type: 'string', label: 'Attribution', name: 'author' },
				{ type: 'string', label: 'Role', name: 'role' },
			],
		},
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
			title: 'Hear it from the families **we\'ve moved.**',
			action: { label: 'See All Reviews', link: '/reviews/' },
		},
	},
};
