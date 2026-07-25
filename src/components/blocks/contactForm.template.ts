import type { Template } from 'tinacms';

export const contactFormBlockSchema: Template = {
	name: 'contactForm',
	label: 'Contact Form',
	fields: [
		{ type: 'string', label: 'Heading', name: 'heading' },
		{ type: 'string', label: 'Intro', name: 'intro', ui: { component: 'textarea' } },
	],
	ui: { defaultItem: { heading: 'Contact Us' } },
};
