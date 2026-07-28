import type { Template } from 'tinacms';

export const dataTableBlockSchema: Template = {
	name: 'dataTable',
	label: 'Data Table',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
		{ type: 'rich-text', label: 'Summary', name: 'summary' },
		{
			type: 'object', label: 'Headers', name: 'headers', list: true,
			ui: { defaultItem: { heading: 'Column' }, itemProps: (i: { heading?: string }) => ({ label: i.heading ?? '' }) },
			fields: [{ type: 'string', label: 'Heading', name: 'heading', required: true }],
		},
		{
			type: 'object', label: 'Rows', name: 'rows', list: true,
			ui: {
				defaultItem: { cells: [{ text: 'Label' }, { text: '0' }] },
				itemProps: (i: { cells?: ({ text?: string } | null)[] | null }) => ({ label: i.cells?.[0]?.text ?? 'Row' }),
			},
			fields: [
				{
					type: 'object', label: 'Cells', name: 'cells', list: true,
					ui: { defaultItem: { text: '' }, itemProps: (i: { text?: string }) => ({ label: i.text ?? '' }) },
					fields: [{ type: 'string', label: 'Text', name: 'text' }],
				},
			],
		},
		{ type: 'rich-text', label: 'Note', name: 'note' },
	],
	ui: {
		defaultItem: {
			headers: [{ heading: 'Name' }, { heading: 'Rank' }, { heading: 'Rate' }],
			rows: [{ cells: [{ text: 'Example' }, { text: '#1' }, { text: '97%' }] }],
		},
	},
};
