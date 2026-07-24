import type { Template } from 'tinacms';

export const teamGridBlockSchema: Template = {
	name: 'team_grid',
	label: 'Team Roster Grid',
	fields: [
		{ type: 'string', label: 'Title', name: 'title' },
		{ type: 'string', label: 'Description', name: 'description', ui: { component: 'textarea' } },
	],
	ui: { defaultItem: { title: 'Meet the Team' } },
};
