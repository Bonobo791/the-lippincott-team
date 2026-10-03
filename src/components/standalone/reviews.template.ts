import type { Template } from 'tinacms';
import { actionField, faqField, finalCtaField, bandHeadFields, seoFields } from './shared-fields.template';

import { headingField, objectListField, textField, titleBodyFields } from '../../../tina/schema-fields';

export const reviewsTemplate: Template = {
	name: 'reviews',
	label: 'Reviews Page',
	fields: [
		...seoFields(),
		{
			type: 'object',
			name: 'head',
			label: 'Page Head',
			fields: bandHeadFields(true),
		},
		{
			type: 'object',
			name: 'record',
			label: 'Record Band',
			fields: [
				...bandHeadFields(),
				objectListField('tiles', 'Stat Tiles', [
					textField('num', 'Number', { description: 'Shown as the big figure when Count-Up To is empty.' }),
					textField('tail', 'Number Suffix', { description: 'Styled suffix after the number, e.g. "+".' }),
					textField('slabel', 'Label'),
					textField('ssrc', 'Source Note'),
					textField('link', 'Link', { description: 'Optional — wraps the number.' }),
					{ type: 'boolean', name: 'gold', label: 'Gold Number' },
					{ type: 'number', name: 'count', label: 'Count-Up To' },
					textField('suffix', 'Count-Up Suffix'),
				], 'slabel'),
				actionField('cta', 'Section Link'),
			],
		},
		{
			type: 'object',
			name: 'featured',
			label: 'Featured Reviews Carousel',
			fields: [
				...bandHeadFields(true),
				objectListField('reviews', 'Reviews', [
					textField('quote', 'Quote', { ui: { component: 'textarea' }, required: true }),
					textField('src', 'Source Line'),
				], 'src'),
				actionField('cta', 'Section Link'),
			],
		},
		{
			type: 'object',
			name: 'feed',
			label: 'Live HAR.com Feed',
			fields: [
				...bandHeadFields(true),
				textField('memberNumber', 'HAR Member Number', { description: 'Powers the embedded ratings widget.' }),
				textField('profileUrl', 'HAR Profile URL'),
				textField('feedNote', 'Feed Note', { description: 'Line under the widget; {profile} renders the HAR.com link.' }),
				textField('feedNoteLabel', 'Feed Note Link Label', { description: 'Link text where {profile} appears, e.g. "HAR.com →".' }),
				actionField('cta', 'Section Link'),
			],
		},
		{
			type: 'object',
			name: 'verify',
			label: 'Verification Band',
			fields: [
				...bandHeadFields(true),
				objectListField('cards', 'Verification Cards', [
					textField('tag', 'Tag'),
					...titleBodyFields(true),
					textField('linkLabel', 'Link Label'),
					textField('link', 'Link'),
				]),
				textField('socialLabel', 'Social Row Label', { description: 'e.g. "Follow the team". Buttons come from Global Config → Contact Links.' }),
				actionField('cta', 'Section Link'),
			],
		},
		faqField(),
		finalCtaField([
			{ type: 'boolean', name: 'showPhone', label: 'Show Phone Link' },
		]),
		{
			type: 'object',
			name: 'agentSchema',
			label: 'Agent Structured Data',
			description: 'RealEstateAgent JSON-LD. Name and phone come from Global Config.',
			fields: [
				objectListField('areasServed', 'Areas Served', [
					textField('name', 'Name', { required: true }),
				], 'name'),
				textField('rating', 'Aggregate Rating'),
				textField('reviewCount', 'Review Count'),
			],
		},
	],
};

export const blogIndexTemplate: Template = {
	name: 'blogIndex',
	label: 'Blog Index',
	fields: [
		...seoFields(),
		textField('eyebrow', 'Eyebrow'),
		headingField(),
		textField('lede', 'Intro Paragraph', { ui: { component: 'textarea' } }),
		textField('featuredLabel', 'Featured Card Label', { description: 'e.g. "Latest" — precedes the category/date on the lead post.' }),
		textField('readLabel', 'Read Link Label', { description: 'e.g. "Read the article".' }),
		textField('fallbackCategory', 'Fallback Category', { description: 'Shown on post cards without a category.' }),
		{
			type: 'object',
			name: 'cta',
			label: 'Bottom CTA Band',
			fields: [
				headingField(),
				{ type: 'rich-text', name: 'body', label: 'Body' },
				actionField('primary', 'Primary Button'),
				actionField('secondary', 'Secondary Button'),
			],
		},
	],
};
