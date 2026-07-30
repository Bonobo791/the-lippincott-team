import type { Template } from 'tinacms';

export const checklistSplitBlockSchema: Template = {
	name: 'checklistSplit',
	label: 'Checklist Split',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
		{ type: 'rich-text', label: 'Body', name: 'body', description: 'Left-column prose next to the checklist.' },
		{
			type: 'object', label: 'Items', name: 'checks', list: true,
			ui: {
				defaultItem: { bold: 'Verify the exact attendance zone', text: 'for every address, before you tour' },
				itemProps: (i: { bold?: string; text?: string }) => ({ label: `${i.bold ?? ''} ${i.text ?? ''}`.trim() }),
			},
			fields: [
				{ type: 'string', label: 'Bold', name: 'bold', description: 'Bold lead-in phrase.' },
				{ type: 'string', label: 'Text', name: 'text' },
			],
		},
	],
	ui: {
		defaultItem: {
			title: 'How we map a **school-first search.**',
			checks: [{ bold: 'Verify the exact attendance zone', text: 'for every address, before you tour' }],
		},
	},
};
