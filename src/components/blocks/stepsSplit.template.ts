import type { Template } from 'tinacms';

export const stepsSplitBlockSchema: Template = {
	name: 'stepsSplit',
	label: 'Steps Split',
	fields: [
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic accent.' },
		{ type: 'rich-text', label: 'Summary', name: 'summary', description: 'Lede paragraph under the title (links allowed).' },
		{
			type: 'object', label: 'Steps', name: 'steps', list: true,
			ui: {
				defaultItem: { bold: 'Listing specialists', text: 'Pricing from a comparative market analysis, staging guidance, photography and negotiation on the sell side.' },
				itemProps: (i: { bold?: string }) => ({ label: i.bold ?? '' }),
			},
			fields: [
				{ type: 'string', label: 'Bold', name: 'bold', description: 'Step title in bold.' },
				{ type: 'string', label: 'Text', name: 'text', ui: { component: 'textarea' }, description: 'Paragraph under the step title.' },
			],
		},
	],
	ui: {
		defaultItem: {
			title: 'How the team **works for you.**',
			steps: [{ bold: 'Listing specialists', text: 'Pricing from a comparative market analysis, staging guidance, photography and negotiation on the sell side.' }],
		},
	},
};
