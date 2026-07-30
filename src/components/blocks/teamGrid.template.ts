import type { Template } from 'tinacms';

export const teamGridBlockSchema: Template = {
	name: 'teamGrid',
	label: 'Team Roster Grid',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
		{ type: 'string', label: 'Lead Body', name: 'leadBody', ui: { component: 'textarea' }, description: 'Paragraph inside the large lead (first) roster cell.' },
		{ type: 'string', label: 'Anchor ID', name: 'anchorId', description: 'Optional HTML id on the section so jump links can target it. Enter the id only (e.g. "team", no leading "#").' },
		{ type: 'string', label: 'Description', name: 'description', ui: { component: 'textarea' } },
	],
	ui: { defaultItem: { title: 'The people behind **the record.**' } },
};
