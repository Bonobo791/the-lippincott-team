import type { Template } from 'tinacms';
import { textField, titleBodyFields } from '../../../tina/schema-fields';

export const contactFormBlockSchema: Template = {
	name: 'contactForm',
	label: 'Contact Form',
	fields: [
		textField('heading', 'Heading'),
		textField('intro', 'Intro', { ui: { component: 'textarea' } }),
		{
			type: 'object', label: 'What Happens Next Steps', name: 'steps', list: true,
			description: 'Overrides the default three steps in the contact rail when set.',
			ui: {
				defaultItem: { title: 'We review your note', body: 'A specialist reads your goals before anyone calls you.' },
				itemProps: (item: { title?: string }) => ({ label: item.title ?? '' }),
			},
			fields: titleBodyFields(),
		},
		{
			type: 'object', label: 'Form Labels', name: 'form',
			description: 'Labels, placeholders, and microcopy inside the contact form. Blank fields fall back to the defaults — except Phone Hint, which an empty value hides intentionally.',
			fields: [
				textField('nameLabel', 'Name Label'),
				textField('namePlaceholder', 'Name Placeholder'),
				textField('phoneLabel', 'Phone Label'),
				textField('phonePlaceholder', 'Phone Placeholder'),
				textField('phoneHint', 'Phone Hint', { description: 'Small line under the phone field.' }),
				textField('emailLabel', 'Email Label'),
				textField('emailPlaceholder', 'Email Placeholder'),
				textField('interestLabel', 'Interest Label', { description: 'Label for the "I want to" dropdown.' }),
				textField('messageLabel', 'Message Label'),
				textField('messagePlaceholder', 'Message Placeholder'),
				textField('submitLabel', 'Submit Button Label'),
				textField('disclaimer', 'Privacy Note', { ui: { component: 'textarea' }, description: 'Small reassurance line under the submit button.' }),
			],
		},
		{
			type: 'object', label: '"I want to" Options', name: 'interestOptions', list: true,
			description: 'Options in the interest dropdown. Overrides the five defaults when set. Each maps to a Sierra lead type so submissions route correctly.',
			ui: {
				itemProps: (item: { label?: string }) => ({ label: item.label ?? '' }),
			},
			fields: [
				textField('label', 'Label', { required: true }),
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
				textField('phoneLabel', 'Phone Label'),
				textField('emailLabel', 'Email Label'),
				textField('stepsLabel', 'Steps Label'),
			],
		},
		{
			type: 'object', label: 'Assurance Strip', name: 'assurances', list: true,
			description: 'The three reassurance cards in the band below the form. Overrides the defaults when set.',
			ui: {
				itemProps: (item: { title?: string }) => ({ label: item.title ?? '' }),
			},
			fields: titleBodyFields(),
		},
	],
	ui: { defaultItem: { heading: 'Contact Us' } },
};
