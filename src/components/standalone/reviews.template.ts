import type { Template, TinaField } from 'tinacms';
import { actionField, bandHeadFields, seoFields } from './shared-fields.template';

const list = (name: string, label: string, fields: TinaField[], labelKey = 'title'): TinaField => ({
	type: 'object',
	name,
	label,
	list: true,
	ui: { itemProps: (item: Record<string, string>) => ({ label: item[labelKey] ?? '' }) },
	fields,
});

export const reviewsTemplate: Template = {
	name: 'reviews',
	label: 'Reviews Page',
	fields: [
		...seoFields(),
		{
			type: 'object',
			name: 'head',
			label: 'Page Head',
			fields: bandHeadFields(),
		},
		{
			type: 'object',
			name: 'record',
			label: 'Record Band',
			fields: [
				...bandHeadFields(),
				list('tiles', 'Stat Tiles', [
					{ type: 'string', name: 'num', label: 'Number', description: 'Shown as the big figure when Count-Up To is empty.' },
					{ type: 'string', name: 'tail', label: 'Number Suffix', description: 'Styled suffix after the number, e.g. "+".' },
					{ type: 'string', name: 'slabel', label: 'Label' },
					{ type: 'string', name: 'ssrc', label: 'Source Note' },
					{ type: 'string', name: 'link', label: 'Link', description: 'Optional — wraps the number.' },
					{ type: 'boolean', name: 'gold', label: 'Gold Number' },
					{ type: 'number', name: 'count', label: 'Count-Up To' },
					{ type: 'string', name: 'suffix', label: 'Count-Up Suffix' },
				], 'slabel'),
				actionField('cta', 'Section Link'),
			],
		},
		{
			type: 'object',
			name: 'featured',
			label: 'Featured Reviews Carousel',
			fields: [
				...bandHeadFields(),
				list('reviews', 'Reviews', [
					{ type: 'string', name: 'quote', label: 'Quote', ui: { component: 'textarea' }, required: true },
					{ type: 'string', name: 'src', label: 'Source Line' },
				], 'src'),
				actionField('cta', 'Section Link'),
			],
		},
		{
			type: 'object',
			name: 'feed',
			label: 'Live HAR.com Feed',
			fields: [
				...bandHeadFields(),
				{ type: 'string', name: 'memberNumber', label: 'HAR Member Number', description: 'Powers the embedded ratings widget.' },
				{ type: 'string', name: 'profileUrl', label: 'HAR Profile URL' },
				{ type: 'string', name: 'feedNote', label: 'Feed Note', description: 'Line under the widget; {profile} renders the HAR.com link.' },
				{ type: 'string', name: 'feedNoteLabel', label: 'Feed Note Link Label', description: 'Link text where {profile} appears, e.g. "HAR.com →".' },
				actionField('cta', 'Section Link'),
			],
		},
		{
			type: 'object',
			name: 'verify',
			label: 'Verification Band',
			fields: [
				...bandHeadFields(),
				list('cards', 'Verification Cards', [
					{ type: 'string', name: 'tag', label: 'Tag' },
					{ type: 'string', name: 'title', label: 'Title' },
					{ type: 'rich-text', name: 'body', label: 'Body' },
					{ type: 'string', name: 'linkLabel', label: 'Link Label' },
					{ type: 'string', name: 'link', label: 'Link' },
				]),
				{ type: 'string', name: 'socialLabel', label: 'Social Row Label', description: 'e.g. "Follow the team". Buttons come from Global Config → Contact Links.' },
				actionField('cta', 'Section Link'),
			],
		},
		{
			type: 'object',
			name: 'faq',
			label: 'FAQ Band',
			description: 'Also emitted as FAQPage structured data.',
			fields: [
				{ type: 'string', name: 'heading', label: 'Heading', description: 'Wrap the italic accent phrase in **…**.' },
				list('items', 'Questions', [
					{ type: 'string', name: 'question', label: 'Question' },
					{ type: 'rich-text', name: 'answer', label: 'Answer' },
				], 'question'),
				actionField('cta', 'Section Link'),
			],
		},
		{
			type: 'object',
			name: 'finalCta',
			label: 'Final CTA Band',
			fields: [
				{ type: 'string', name: 'heading', label: 'Heading', description: 'Wrap the italic accent phrase in **…**.' },
				{ type: 'string', name: 'body', label: 'Body', ui: { component: 'textarea' } },
				actionField('primary', 'Primary Button'),
				{ type: 'boolean', name: 'showPhone', label: 'Show Phone Link' },
			],
		},
		{
			type: 'object',
			name: 'agentSchema',
			label: 'Agent Structured Data',
			description: 'RealEstateAgent JSON-LD. Name and phone come from Global Config.',
			fields: [
				list('areasServed', 'Areas Served', [
					{ type: 'string', name: 'name', label: 'Name', required: true },
				], 'name'),
				{ type: 'string', name: 'rating', label: 'Aggregate Rating' },
				{ type: 'string', name: 'reviewCount', label: 'Review Count' },
			],
		},
	],
};

export const blogIndexTemplate: Template = {
	name: 'blogIndex',
	label: 'Blog Index',
	fields: [
		...seoFields(),
		{ type: 'string', name: 'eyebrow', label: 'Eyebrow' },
		{ type: 'string', name: 'heading', label: 'Heading', description: 'Wrap the italic accent phrase in **…**.' },
		{ type: 'string', name: 'lede', label: 'Intro Paragraph', ui: { component: 'textarea' } },
		{ type: 'string', name: 'featuredLabel', label: 'Featured Card Label', description: 'e.g. "Latest" — precedes the category/date on the lead post.' },
		{ type: 'string', name: 'readLabel', label: 'Read Link Label', description: 'e.g. "Read the article".' },
		{ type: 'string', name: 'fallbackCategory', label: 'Fallback Category', description: 'Shown on post cards without a category.' },
		{
			type: 'object',
			name: 'cta',
			label: 'Bottom CTA Band',
			fields: [
				{ type: 'string', name: 'heading', label: 'Heading', description: 'Wrap the italic accent phrase in **…**.' },
				{ type: 'rich-text', name: 'body', label: 'Body' },
				actionField('primary', 'Primary Button'),
				actionField('secondary', 'Secondary Button'),
			],
		},
	],
};
