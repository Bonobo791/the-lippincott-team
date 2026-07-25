import type { Template } from 'tinacms';

export const trustStripBlockSchema: Template = {
	name: 'trustStrip',
	label: 'Trust Strip',
	fields: [
		{ type: 'string', label: 'Title', name: 'title' },
		{
			type: 'object', label: 'Items', name: 'items', list: true,
			ui: {
				defaultItem: { wordmark: 'HAR.com', rating: '4.9 RATING' },
				itemProps: (i: { wordmark?: string; imageAlt?: string; rating?: string }) => ({ label: i.wordmark ?? i.imageAlt ?? i.rating ?? '' }),
			},
			fields: [
				{ type: 'image', label: 'Logo Image', name: 'image' },
				{ type: 'string', label: 'Image Alt', name: 'imageAlt' },
				{ type: 'string', label: 'Wordmark (shown when no logo image)', name: 'wordmark' },
				{ type: 'image', label: 'Rating Image (e.g. star row)', name: 'ratingImage' },
				{ type: 'string', label: 'Rating', name: 'rating' },
				{ type: 'string', label: 'Caption', name: 'caption', ui: { component: 'textarea' } },
				{ type: 'string', label: 'Link', name: 'link' },
			],
		},
	],
	ui: {
		defaultItem: {
			title: 'Trusted by **1,000+ Houston Families**',
		},
	},
};
