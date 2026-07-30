import type { Template } from 'tinacms';
import { chipsField } from './shared-fields';

export const routeLedgerBlockSchema: Template = {
	name: 'routeLedger',
	label: 'Route Ledger',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
		{ type: 'rich-text', label: 'Summary', name: 'summary' },
		chipsField({ bold: '25-30 mi', label: 'to downtown Houston' }),
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
