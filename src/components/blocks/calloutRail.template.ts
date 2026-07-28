import type { Template } from 'tinacms';

export const calloutRailBlockSchema: Template = {
	name: 'calloutRail',
	label: 'Callout Rail',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
		{ type: 'rich-text', label: 'Body', name: 'body', description: 'Left-column prose (links allowed).' },
		{
			type: 'object', label: 'Stat Cards', name: 'figures', list: true,
			ui: {
				defaultItem: { source: 'Niche · 2026', figure: 'A', text: 'District overall grade.' },
				itemProps: (i: { figure?: string; source?: string }) => ({ label: `${i.figure ?? ''} ${i.source ?? ''}`.trim() }),
			},
			fields: [
				{ type: 'string', label: 'Source', name: 'source', description: 'Small uppercase attribution (e.g. "Niche · 2026").' },
				{ type: 'string', label: 'Figure', name: 'figure', required: true },
				{ type: 'string', label: 'Text', name: 'text', ui: { component: 'textarea' } },
			],
		},
		{ type: 'rich-text', label: 'Note', name: 'note', description: 'Small muted caption under the split.' },
	],
	ui: {
		defaultItem: {
			title: 'How good are the schools **here?**',
			figures: [{ source: 'Niche · 2026', figure: 'A', text: 'District overall grade.' }],
		},
	},
};
