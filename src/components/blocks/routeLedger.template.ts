import type { Template } from 'tinacms';

export const routeLedgerBlockSchema: Template = {
	name: 'routeLedger',
	label: 'Route Ledger',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
		{ type: 'rich-text', label: 'Summary', name: 'summary' },
		{
			type: 'object', label: 'Chips', name: 'chips', list: true,
			ui: { defaultItem: { bold: '25-30 mi', label: 'to downtown Houston' }, itemProps: (i: { bold?: string; label?: string }) => ({ label: `${i.bold ?? ''} ${i.label ?? ''}`.trim() }) },
			fields: [
				{ type: 'string', label: 'Bold', name: 'bold' },
				{ type: 'string', label: 'Label', name: 'label' },
			],
		},
		{
			type: 'object', label: 'Routes', name: 'routes', list: true,
			ui: {
				defaultItem: { name: 'US-290 · Northwest Fwy' },
				itemProps: (i: { name?: string }) => ({ label: i.name ?? '' }),
			},
			fields: [
				{ type: 'string', label: 'Name', name: 'name', required: true },
				{ type: 'rich-text', label: 'Destination', name: 'destination', description: 'Where this corridor leads (links and bold allowed).' },
			],
		},
		{ type: 'rich-text', label: 'Note', name: 'note' },
	],
	ui: {
		defaultItem: {
			title: 'How far is it **from Houston?**',
			routes: [{ name: 'US-290 · Northwest Fwy' }],
		},
	},
};
