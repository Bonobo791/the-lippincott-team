import type { Template } from 'tinacms';

export const contactFormBlockSchema: Template = {
	name: 'contactForm',
	label: 'Contact Form',
	fields: [
		{ type: 'string', label: 'Heading', name: 'heading' },
		{ type: 'string', label: 'Intro', name: 'intro', ui: { component: 'textarea' } },
		{
			type: 'object', label: 'What Happens Next Steps', name: 'steps', list: true,
			description: 'Overrides the default three steps in the contact rail when set.',
			ui: {
				defaultItem: { title: 'We review your note', body: 'A specialist reads your goals before anyone calls you.' },
				itemProps: (item: { title?: string }) => ({ label: item.title ?? '' }),
			},
			fields: [
				{ type: 'string', label: 'Title', name: 'title' },
				{ type: 'string', label: 'Body', name: 'body', ui: { component: 'textarea' } },
			],
		},
	],
	ui: { defaultItem: { heading: 'Contact Us' } },
};
