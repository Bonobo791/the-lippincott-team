import type { TinaField } from 'tinacms';
import { headingField, labelLinkFields, objectListField, textField, titleBodyFields } from '../../../tina/schema-fields';

/** Fields every standalone page shares: search/social metadata. */
export const seoFields = (): TinaField[] => [
	{
		type: 'string',
		name: 'seoTitle',
		label: 'Meta Title (SEO)',
		isTitle: true,
		required: true,
		description: 'Shown in the browser tab and search results — not on the page itself.',
	},
	{
		type: 'string',
		name: 'description',
		label: 'Meta Description (SEO)',
		ui: { component: 'textarea' },
		description: 'Shown in search results under the meta title.',
	},
	{
		type: 'image',
		name: 'socialImage',
		label: 'Social Share Image',
		description: 'Open Graph/Twitter card image. Falls back to the site default from Global Config.',
	},
];

/** A call-to-action object (label + link). */
export const actionField = (name: string, label: string): TinaField => ({
	type: 'object',
	name,
	label,
	fields: [
		textField('label', 'Label'),
		textField('link', 'Link', { description: 'e.g. /contact-us/ or a full URL' }),
	],
});

/** Shared FAQ schema; return fresh nested objects for each page template. */
export const faqField = (): TinaField => ({
	type: 'object', name: 'faq', label: 'FAQ Band',
	description: 'Also emitted as FAQPage structured data.',
	fields: [
		headingField(),
		objectListField('items', 'Questions', [
			textField('question', 'Question', { required: true }),
			{ type: 'rich-text', name: 'answer', label: 'Answer' },
		], 'question'),
		actionField('cta', 'Section Link'),
	],
});

/** Common CTA content followed by the page's own contact/secondary-action fields. */
export const finalCtaField = (extraFields: TinaField[] = []): TinaField => ({
	type: 'object', name: 'finalCta', label: 'Final CTA Band',
	fields: [
		headingField(),
		textField('body', 'Body', { ui: { component: 'textarea' } }),
		actionField('primary', 'Primary Button'),
		...extraFields,
	],
});

/**
 * A section heading + eyebrow (+ optional lede) trio shared by v2 bands.
 * `withLede` only where the band's renderer actually outputs the paragraph —
 * an editable field that renders nothing is the exact bug class this
 * collection exists to remove.
 */
export const bandHeadFields = (withLede = false): TinaField[] => [
	textField('eyebrow', 'Eyebrow'),
	headingField(),
	...(withLede ? [{ type: 'rich-text', name: 'lede', label: 'Intro Paragraph' } as TinaField] : []),
];

const statTileField = (name: string, label: string, countUp = true): TinaField => ({
	type: 'object',
	name,
	label,
	list: true,
	ui: { itemProps: (item: Record<string, string>) => ({ label: item.label ?? item.slabel ?? item.num ?? '' }) },
	fields: [
		textField('num', 'Number', { description: 'Shown as the big figure, e.g. "$345,000" or "52".' }),
		textField('tail', 'Number Suffix', { description: 'Styled suffix after the number, e.g. "+", "%".' }),
		textField('label', 'Label'),
		textField('source', 'Source Note'),
		textField('link', 'Link', { description: 'Optional — wraps the number.' }),
		{ type: 'boolean', name: 'accent', label: 'Dark Tile', description: 'Render this tile with the dark accent style.' },
		...(countUp
			? ([
					{
						type: 'number',
						name: 'count',
						label: 'Count-Up To',
						description: 'If set, the number animates from 0 up to this value and the Number field is its formatted display.',
					},
					textField('prefix', 'Count-Up Prefix', { description: 'e.g. "$"' }),
					textField('suffix', 'Count-Up Suffix', { description: 'Appended to the counted number, e.g. "M".' }),
				] as TinaField[])
			: []),
	],
});

/**
 * Fields shared by the Buy and Sell pages. Called once per template so each
 * gets its own field array.
 */
export const buySellFields = (audience: 'buyers' | 'sellers'): TinaField[] => [
	...seoFields(),
	{
		type: 'object',
		name: 'hero',
		label: 'Hero',
		fields: [
			textField('eyebrow', 'Eyebrow'),
			headingField(),
			{ type: 'image', name: 'image', label: 'Background Image' },
			textField('imageAlt', 'Image Alt Text'),
			objectListField('chips', 'Stat Chips', [
				textField('bold', 'Bold Part', { description: 'e.g. "1,463+"' }),
				textField('text', 'Rest of Line', { description: 'Rendered directly after the bold part — include the leading space or punctuation.' }),
			], 'bold'),
			actionField('primary', 'Primary Button'),
			actionField('secondary', 'Secondary Link'),
		],
	},
	{
		type: 'object',
		name: 'market',
		label: 'Market Reality Band',
		fields: [
			...bandHeadFields(true),
			statTileField('tiles', 'Market Tiles', false),
			objectListField('jobs', 'Analysis Columns', [
				textField('tag', 'Tag'),
				{ type: 'rich-text', name: 'body', label: 'Body' },
			], 'tag'),
			actionField('cta', 'Section Link'),
		],
	},
	{
		type: 'object',
		name: 'work',
		label: 'Four Factors Band',
		fields: [
			...bandHeadFields(),
			objectListField('jobs', 'Factors', [
				textField('tag', 'Tag', { description: 'e.g. "01 · Price it right"' }),
				...titleBodyFields(true),
			], 'tag'),
			actionField('cta', 'Section Link'),
		],
	},
	{
		type: 'object',
		name: 'comparison',
		label: 'Solo vs Represented Band',
		fields: [
			...bandHeadFields(true),
			objectListField('vsTiles', 'Comparison Tiles', [
				textField('slabel', 'Top Label'),
				textField('num', 'Number'),
				textField('cap', 'Caption'),
				{ type: 'boolean', name: 'gold', label: 'Gold Number' },
			], 'slabel'),
			{ type: 'rich-text', name: 'body', label: 'Body Paragraph' },
			objectListField('stats', 'Stat Tiles', [
				textField('num', 'Number'),
				textField('slabel', 'Label'),
				textField('ssrc', 'Source Note'),
			], 'slabel'),
			{ type: 'rich-text', name: 'note', label: 'Closing Note' },
			actionField('cta', 'Section Link'),
		],
	},
	{
		type: 'object',
		name: 'service',
		label: `What the Team Does Band (${audience})`,
		fields: [
			...bandHeadFields(),
			textField('intro', 'List Intro', { ui: { component: 'textarea' } }),
			objectListField('items', 'Checklist Items', [
				textField('bold', 'Bold Part'),
				textField('text', 'Rest of Line', { description: 'Rendered directly after the bold part — include the leading space or punctuation.' }),
			], 'bold'),
			{ type: 'rich-text', name: 'outro', label: 'Closing Paragraph' },
			{
				type: 'object',
				name: 'ctaCard',
				label: 'CTA Card',
				fields: [
					textField('tag', 'Tag'),
					...titleBodyFields(),
					textField('ctaLabel', 'Button Label'),
					textField('ctaLink', 'Button Link'),
					textField('phoneNote', 'Phone Note', { description: 'Text before the phone link, e.g. "Prefer to talk first?"' }),
				],
			},
		],
	},
	{
		type: 'object',
		name: 'process',
		label: 'Process Band',
		fields: [
			...bandHeadFields(),
			objectListField('steps', 'Steps', titleBodyFields(true)),
			actionField('cta', 'Section Link'),
		],
	},
	{
		type: 'object',
		name: 'record',
		label: 'Record Band',
		fields: [
			...bandHeadFields(),
			textField('quote', 'Quote', { ui: { component: 'textarea' } }),
			textField('quoteSource', 'Quote Source'),
			{ type: 'rich-text', name: 'ratingText', label: 'Rating Line' },
			actionField('ratingLink', 'Rating Link'),
			statTileField('tiles', 'Stat Tiles'),
			actionField('cta', 'Section Link'),
		],
	},
	faqField(),
	{
		type: 'object',
		name: 'related',
		label: 'Keep Researching Band',
		fields: [
			headingField(),
			objectListField('chips', 'Chips', labelLinkFields(), 'label'),
		],
	},
	finalCtaField([
		{ type: 'boolean', name: 'showPhone', label: 'Show Phone Link', description: 'Adds a "Call <number>" link using the phone from Global Config.' },
	]),
];

/** Minimal utility-page fields (404, thank-you). */
export const utilityFields = (): TinaField[] => [
	...seoFields(),
	textField('eyebrow', 'Eyebrow'),
	textField('heading', 'Heading'),
	textField('body', 'Body', { ui: { component: 'textarea' } }),
	actionField('action', 'Button'),
];
