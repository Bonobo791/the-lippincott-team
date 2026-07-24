import type { Template } from 'tinacms';

export const faqBlockSchema: Template = {
	name: 'faq',
	label: 'FAQ Accordion',
	fields: [
		{ type: 'string', label: 'Title', name: 'title' },
		{ type: 'string', label: 'Description', name: 'description', ui: { component: 'textarea' } },
		{
			type: 'object', label: 'Questions', name: 'items', list: true,
			ui: { itemProps: (i: { question?: string }) => ({ label: i.question ?? '' }) },
			fields: [
				{ type: 'string', label: 'Question', name: 'question', required: true },
				{ type: 'rich-text', label: 'Answer', name: 'answer' },
			],
		},
	],
	ui: { defaultItem: { title: 'Frequently Asked Questions' } },
};
