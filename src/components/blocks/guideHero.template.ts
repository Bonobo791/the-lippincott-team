import type { Template } from 'tinacms';

export const guideHeroBlockSchema: Template = {
	name: 'guideHero',
	label: 'Guide Hero',
	fields: [
		{ type: 'string', label: 'Eyebrow', name: 'eyebrow', description: 'Small red-tick label above the headline (e.g. "Communities").' },
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.', ui: { component: 'textarea' } },
		{ type: 'string', label: 'Answer Label', name: 'answerLabel', description: 'Eyebrow inside the answer capsule (e.g. "The short answer").' },
		{ type: 'rich-text', label: 'Answer', name: 'answer', description: 'Short direct-answer capsule shown under the headline.' },
		{
			type: 'object', label: 'Chips', name: 'chips', list: true,
			ui: { defaultItem: { bold: '$445,000', label: 'median list price' }, itemProps: (i: { bold?: string; label?: string }) => ({ label: `${i.bold ?? ''} ${i.label ?? ''}`.trim() }) },
			fields: [
				{ type: 'string', label: 'Bold', name: 'bold' },
				{ type: 'string', label: 'Label', name: 'label' },
			],
		},
	],
	ui: {
		defaultItem: {
			eyebrow: 'Communities',
			title: 'Living in **Cypress, TX.**',
			answerLabel: 'The short answer',
		},
	},
};
