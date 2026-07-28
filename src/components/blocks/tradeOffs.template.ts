import type { Template } from 'tinacms';
import { guideIntroFields, guideItemFields } from './guide-fields.template';

export const tradeOffsBlockSchema: Template = {
	name: 'tradeOffs',
	label: 'Trade-offs',
	fields: [
		...guideIntroFields(),
		{
			type: 'object', label: 'Sides', name: 'sides', list: true,
			ui: {
				defaultItem: { label: 'Worth knowing', items: [{ text: 'Rush-hour congestion' }] },
				itemProps: (i: { label?: string }) => ({ label: i.label ?? '' }),
			},
			fields: [
				{ type: 'string', label: 'Label', name: 'label', required: true },
				...guideItemFields(),
			],
		},
		{ type: 'string', label: 'Note Panel Label', name: 'noteLabel', description: 'Red label of the bordered note panel (e.g. "The flood question, straight").' },
		{ type: 'rich-text', label: 'Note', name: 'note', description: 'Bordered note panel body under the ledger.' },
	],
	ui: {
		defaultItem: {
			title: 'What are the downsides **of the area?**',
			sides: [{ label: 'Worth knowing', items: [{ text: 'Rush-hour congestion' }] }],
		},
	},
};
