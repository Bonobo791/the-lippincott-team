import type { Template } from 'tinacms';

export const proofStageBlockSchema: Template = {
	name: 'proofStage',
	label: 'Proof Stage (dark)',
	fields: [
		{ type: 'string', label: 'Eyebrow', name: 'eyebrow' },
		{ type: 'string', label: 'Title', name: 'title', description: 'Wrap a phrase in **double asterisks** to render it as the italic gold accent.', ui: { component: 'textarea' } },
		{ type: 'boolean', label: 'Metrics first', name: 'metricsFirst', description: 'Render the metrics ledger above the quote split.' },
		{
			type: 'object', label: 'Quote', name: 'quote',
			fields: [
				{ type: 'string', label: 'Text', name: 'text', ui: { component: 'textarea' } },
				{ type: 'string', label: 'Attribution', name: 'attribution' },
			],
		},
		{ type: 'rich-text', label: 'Rating', name: 'rating', description: 'Serif rating line next to the quote card (e.g. "Rated 4.9 on Google and HAR.com…").' },
		{
			type: 'object', label: 'Link', name: 'action',
			fields: [
				{ type: 'string', label: 'Label', name: 'label' },
				{ type: 'string', label: 'Link', name: 'link' },
			],
		},
		{
			type: 'object', label: 'Metrics', name: 'metrics', list: true,
			ui: {
				defaultItem: { value: 1463, suffix: '+', label: 'Homes sold', source: 'Team sales records' },
				itemProps: (i: { value?: number; label?: string }) => ({ label: `${i.value ?? ''} ${i.label ?? ''}`.trim() }),
			},
			fields: [
				{ type: 'number', label: 'Value', name: 'value', required: true, description: 'Counts up when scrolled into view.' },
				{ type: 'string', label: 'Suffix', name: 'suffix', description: 'Red mark after the number (e.g. "+", "×").' },
				{ type: 'string', label: 'Label', name: 'label' },
				{ type: 'string', label: 'Source', name: 'source' },
				{ type: 'string', label: 'Link (optional)', name: 'link', description: 'Makes the whole tile clickable — e.g. link the reviews tile to the Google review page.' },
			],
		},
	],
	ui: {
		defaultItem: {
			eyebrow: 'The record',
			title: 'Trusted since before it was a **boomtown.**',
			metrics: [
				{ value: 1463, suffix: '+', label: 'Homes sold', source: 'Team sales records, Northwest Houston' },
				{ value: 750, suffix: '+', label: 'Five-star reviews', source: 'Google and HAR.com' },
			],
		},
	},
};
