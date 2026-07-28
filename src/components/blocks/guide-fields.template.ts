import type { TinaField } from 'tinacms';

export const guideIntroFields = (): TinaField[] => [
	{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
	{ type: 'rich-text', label: 'Summary', name: 'summary' },
];

export const guideItemFields = (): TinaField[] => [
	{
		type: 'object', label: 'Items', name: 'items', list: true,
		ui: { defaultItem: { text: '' }, itemProps: (i) => ({ label: i.text ?? '' }) },
		fields: [{ type: 'string', label: 'Text', name: 'text', ui: { component: 'textarea' } }],
	},
];
