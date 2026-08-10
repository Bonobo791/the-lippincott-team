import type { Template } from 'tinacms';
import { chipsField } from './shared-fields';

export const guideHeroBlockSchema: Template = {
	name: 'guideHero',
	label: 'Guide Hero',
	fields: [
		{ type: 'string', label: 'Eyebrow', name: 'eyebrow', description: 'Small red-tick label above the headline (e.g. "Communities").' },
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.', ui: { component: 'textarea' } },
		{ type: 'image', label: 'Background Image', name: 'backgroundImage', description: 'Full-bleed photo behind the headline (dark scrim is added). Without one the hero renders as a solid dark band.' },
		{ type: 'string', label: 'Hero Image Description', name: 'imageAlt', description: 'Describe the photograph for screen readers. Leave empty only when the image is decorative.' },
		{ type: 'number', label: 'Mobile Focal Point X', name: 'focalX', description: 'Horizontal crop focus from 0 (left) to 100 (right). Defaults to 50.' },
		{ type: 'number', label: 'Mobile Focal Point Y', name: 'focalY', description: 'Vertical crop focus from 0 (top) to 100 (bottom). Defaults to 38.' },
		{ type: 'image', label: 'Mobile Image', name: 'mobileImage', description: 'Optional. On page-collection heroes (e.g. About) the photo renders as a card above the text on small screens; set this to an uncropped version when the background image is recomposed for desktop overlay text.' },
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
		{ type: 'boolean', label: 'Show Actions Only on Mobile', name: 'mobileActionsOnly', description: 'Use the page-level CTA on desktop while showing these hero actions below the mobile stat strip.' },
	],
	ui: {
		defaultItem: {
			eyebrow: 'Communities',
			title: 'Living in **Cypress, TX.**',
		},
	},
};
