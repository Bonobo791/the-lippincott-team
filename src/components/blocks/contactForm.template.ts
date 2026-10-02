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
		{
			type: 'object', label: 'Form Labels', name: 'form',
			description: 'Labels, placeholders, and microcopy inside the contact form. Empty fields fall back to the defaults.',
			fields: [
				{ type: 'string', label: 'Name Label', name: 'nameLabel' },
				{ type: 'string', label: 'Name Placeholder', name: 'namePlaceholder' },
				{ type: 'string', label: 'Phone Label', name: 'phoneLabel' },
				{ type: 'string', label: 'Phone Placeholder', name: 'phonePlaceholder' },
				{ type: 'string', label: 'Phone Hint', name: 'phoneHint', description: 'Small line under the phone field.' },
				{ type: 'string', label: 'Email Label', name: 'emailLabel' },
				{ type: 'string', label: 'Email Placeholder', name: 'emailPlaceholder' },
				{ type: 'string', label: 'Interest Label', name: 'interestLabel', description: 'Label for the "I want to" dropdown.' },
				{ type: 'string', label: 'Message Label', name: 'messageLabel' },
				{ type: 'string', label: 'Message Placeholder', name: 'messagePlaceholder' },
				{ type: 'string', label: 'Submit Button Label', name: 'submitLabel' },
				{ type: 'string', label: 'Privacy Note', name: 'disclaimer', ui: { component: 'textarea' }, description: 'Small reassurance line under the submit button.' },
			],
		},
		{
			type: 'object', label: '"I want to" Options', name: 'interestOptions', list: true,
			description: 'Options in the interest dropdown. Overrides the five defaults when set. Each maps to a Sierra lead type so submissions route correctly.',
			ui: {
				itemProps: (item: { label?: string }) => ({ label: item.label ?? '' }),
			},
			fields: [
				{ type: 'string', label: 'Label', name: 'label', required: true },
				{
					type: 'string', label: 'Lead Type', name: 'leadType', required: true,
					options: [
						{ label: 'Buyer', value: '1' },
						{ label: 'Seller', value: '2' },
						{ label: 'Buyer + Seller', value: '3' },
					],
					description: 'Sierra lead classification for submissions choosing this option.',
				},
			],
		},
		{
			type: 'object', label: 'Contact Rail Labels', name: 'rail',
			description: 'Small uppercase headings in the column next to the form.',
			fields: [
				{ type: 'string', label: 'Phone Label', name: 'phoneLabel' },
				{ type: 'string', label: 'Email Label', name: 'emailLabel' },
				{ type: 'string', label: 'Steps Label', name: 'stepsLabel' },
			],
		},
		{
			type: 'object', label: 'Assurance Strip', name: 'assurances', list: true,
			description: 'The three reassurance cards in the band below the form. Overrides the defaults when set.',
			ui: {
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
