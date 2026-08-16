import type { Template } from 'tinacms';
import { chipsField } from './shared-fields';

export const guideHeroBlockSchema: Template = {
	name: 'guideHero',
	label: 'Guide Hero',
	fields: [
		{ type: 'string', label: 'Eyebrow', name: 'eyebrow', description: 'Small red-tick label above the headline (e.g. "Communities").' },
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.', ui: { component: 'textarea' } },
		{ type: 'image', label: 'Background Image', name: 'backgroundImage', description: 'Full-bleed photo behind the headline (dark scrim is added). Without one the hero renders as a solid dark band.' },
		{ type: 'image', label: 'Mobile Image', name: 'mobileImage', description: 'Optional. On page-collection heroes (e.g. About) the photo renders as the 5:4 mobile masthead frame at small screens and the framed figure beside the text at desktop widths; set this to an uncropped version when the background image is recomposed for desktop overlay text.' },
		{ type: 'number', label: 'Focal X', name: 'focalX', description: 'Horizontal focal point of the mobile 5:4 photo frame, in percent (default 50).', ui: { min: 0, max: 100 } },
		{ type: 'number', label: 'Focal Y', name: 'focalY', description: 'Vertical focal point of the mobile 5:4 photo frame, in percent (default 42).', ui: { min: 0, max: 100 } },
		chipsField({ bold: '$445,000', label: 'median list price' }),
		{
			type: 'object', label: 'Actions', name: 'actions', list: true,
			ui: { defaultItem: { label: 'Schedule a Consultation', type: 'button', link: '/contact-us/' }, itemProps: (i: { label?: string }) => ({ label: i.label ?? '' }) },
			fields: [
				{ type: 'string', label: 'Label', name: 'label' },
				{ type: 'string', label: 'Type', name: 'type', options: [{ label: 'Button', value: 'button' }, { label: 'Link', value: 'link' }] },
				{ type: 'string', label: 'Link', name: 'link' },
			],
		},
	],
	ui: {
		defaultItem: {
			eyebrow: 'Communities',
			title: 'Living in **Cypress, TX.**',
			focalX: 50,
			focalY: 42,
		},
	},
};
