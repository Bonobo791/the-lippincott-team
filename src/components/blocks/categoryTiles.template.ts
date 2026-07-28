import type { Template } from 'tinacms';
import { guideIntroFields, guideItemFields } from './guide-fields.template';

export const categoryTilesBlockSchema: Template = {
	name: 'categoryTiles',
	label: 'Category Tiles',
	fields: [
		...guideIntroFields(),
		{
			type: 'object', label: 'Tiles', name: 'tiles', list: true,
			ui: {
				defaultItem: { label: 'On the water', items: [{ text: 'Towne Lake 300-acre boating lake' }] },
				itemProps: (i: { label?: string }) => ({ label: i.label ?? '' }),
			},
			fields: [
				{ type: 'string', label: 'Label', name: 'label' },
				...guideItemFields(),
			],
		},
		{ type: 'rich-text', label: 'Note', name: 'note' },
	],
	ui: {
		defaultItem: {
			title: 'What is there to do **here?**',
			tiles: [{ label: 'On the water', items: [{ text: 'Towne Lake 300-acre boating lake' }] }],
		},
	},
};
