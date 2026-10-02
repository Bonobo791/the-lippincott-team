import type { TinaField } from 'tinacms';

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
		{ type: 'string', name: 'label', label: 'Label' },
		{ type: 'string', name: 'link', label: 'Link', description: 'e.g. /contact-us/ or a full URL' },
	],
});

/**
 * A section heading + eyebrow (+ optional lede) trio shared by v2 bands.
 * `withLede` only where the band's renderer actually outputs the paragraph —
 * an editable field that renders nothing is the exact bug class this
 * collection exists to remove.
 */
export const bandHeadFields = (withLede = false): TinaField[] => [
	{ type: 'string', name: 'eyebrow', label: 'Eyebrow' },
	{
		type: 'string',
		name: 'heading',
		label: 'Heading',
		description: 'Wrap the italic accent phrase in **…**.',
	},
	...(withLede ? [{ type: 'rich-text', name: 'lede', label: 'Intro Paragraph' } as TinaField] : []),
];

const statTileField = (name: string, label: string, countUp = true): TinaField => ({
	type: 'object',
	name,
	label,
	list: true,
	ui: { itemProps: (item: Record<string, string>) => ({ label: item.label ?? item.slabel ?? item.num ?? '' }) },
	fields: [
		{ type: 'string', name: 'num', label: 'Number', description: 'Shown as the big figure, e.g. "$345,000" or "52".' },
		{ type: 'string', name: 'tail', label: 'Number Suffix', description: 'Styled suffix after the number, e.g. "+", "%".' },
		{ type: 'string', name: 'label', label: 'Label' },
		{ type: 'string', name: 'source', label: 'Source Note' },
		{ type: 'string', name: 'link', label: 'Link', description: 'Optional — wraps the number.' },
		{ type: 'boolean', name: 'accent', label: 'Dark Tile', description: 'Render this tile with the dark accent style.' },
		...(countUp
			? ([
					{
						type: 'number',
						name: 'count',
						label: 'Count-Up To',
						description: 'If set, the number animates from 0 up to this value and the Number field is its formatted display.',
					},
					{ type: 'string', name: 'prefix', label: 'Count-Up Prefix', description: 'e.g. "$"' },
					{ type: 'string', name: 'suffix', label: 'Count-Up Suffix', description: 'Appended to the counted number, e.g. "M".' },
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
			{ type: 'string', name: 'eyebrow', label: 'Eyebrow' },
			{ type: 'string', name: 'heading', label: 'Heading', description: 'Wrap the italic accent phrase in **…**.' },
			{ type: 'image', name: 'image', label: 'Background Image' },
			{ type: 'string', name: 'imageAlt', label: 'Image Alt Text' },
			{
				type: 'object',
				name: 'chips',
				label: 'Stat Chips',
				list: true,
				ui: { itemProps: (item: Record<string, string>) => ({ label: item.bold ?? '' }) },
				fields: [
					{ type: 'string', name: 'bold', label: 'Bold Part', description: 'e.g. "1,463+"' },
					{ type: 'string', name: 'text', label: 'Rest of Line', description: 'Rendered directly after the bold part — include the leading space or punctuation.' },
				],
			},
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
			{
				type: 'object',
				name: 'jobs',
				label: 'Analysis Columns',
				list: true,
				ui: { itemProps: (item: Record<string, string>) => ({ label: item.tag ?? '' }) },
				fields: [
					{ type: 'string', name: 'tag', label: 'Tag' },
					{ type: 'rich-text', name: 'body', label: 'Body' },
				],
			},
			actionField('cta', 'Section Link'),
		],
	},
	{
		type: 'object',
		name: 'work',
		label: 'Four Factors Band',
		fields: [
			...bandHeadFields(),
			{
				type: 'object',
				name: 'jobs',
				label: 'Factors',
				list: true,
				ui: { itemProps: (item: Record<string, string>) => ({ label: item.tag ?? '' }) },
				fields: [
					{ type: 'string', name: 'tag', label: 'Tag', description: 'e.g. "01 · Price it right"' },
					{ type: 'string', name: 'title', label: 'Title' },
					{ type: 'rich-text', name: 'body', label: 'Body' },
				],
			},
			actionField('cta', 'Section Link'),
		],
	},
	{
		type: 'object',
		name: 'comparison',
		label: 'Solo vs Represented Band',
		fields: [
			...bandHeadFields(true),
			{
				type: 'object',
				name: 'vsTiles',
				label: 'Comparison Tiles',
				list: true,
				ui: { itemProps: (item: Record<string, string>) => ({ label: item.slabel ?? '' }) },
				fields: [
					{ type: 'string', name: 'slabel', label: 'Top Label' },
					{ type: 'string', name: 'num', label: 'Number' },
					{ type: 'string', name: 'cap', label: 'Caption' },
					{ type: 'boolean', name: 'gold', label: 'Gold Number' },
				],
			},
			{ type: 'rich-text', name: 'body', label: 'Body Paragraph' },
			{
				type: 'object',
				name: 'stats',
				label: 'Stat Tiles',
				list: true,
				ui: { itemProps: (item: Record<string, string>) => ({ label: item.slabel ?? '' }) },
				fields: [
					{ type: 'string', name: 'num', label: 'Number' },
					{ type: 'string', name: 'slabel', label: 'Label' },
					{ type: 'string', name: 'ssrc', label: 'Source Note' },
				],
			},
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
			{ type: 'string', name: 'intro', label: 'List Intro', ui: { component: 'textarea' } },
			{
				type: 'object',
				name: 'items',
				label: 'Checklist Items',
				list: true,
				ui: { itemProps: (item: Record<string, string>) => ({ label: item.bold ?? '' }) },
				fields: [
					{ type: 'string', name: 'bold', label: 'Bold Part' },
					{ type: 'string', name: 'text', label: 'Rest of Line', description: 'Rendered directly after the bold part — include the leading space or punctuation.' },
				],
			},
			{ type: 'rich-text', name: 'outro', label: 'Closing Paragraph' },
			{
				type: 'object',
				name: 'ctaCard',
				label: 'CTA Card',
				fields: [
					{ type: 'string', name: 'tag', label: 'Tag' },
					{ type: 'string', name: 'title', label: 'Title' },
					{ type: 'string', name: 'body', label: 'Body', ui: { component: 'textarea' } },
					{ type: 'string', name: 'ctaLabel', label: 'Button Label' },
					{ type: 'string', name: 'ctaLink', label: 'Button Link' },
					{ type: 'string', name: 'phoneNote', label: 'Phone Note', description: 'Text before the phone link, e.g. "Prefer to talk first?"' },
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
			{
				type: 'object',
				name: 'steps',
				label: 'Steps',
				list: true,
				ui: { itemProps: (item: Record<string, string>) => ({ label: item.title ?? '' }) },
				fields: [
					{ type: 'string', name: 'title', label: 'Title' },
					{ type: 'rich-text', name: 'body', label: 'Body' },
				],
			},
			actionField('cta', 'Section Link'),
		],
	},
	{
		type: 'object',
		name: 'record',
		label: 'Record Band',
		fields: [
			...bandHeadFields(),
			{ type: 'string', name: 'quote', label: 'Quote', ui: { component: 'textarea' } },
			{ type: 'string', name: 'quoteSource', label: 'Quote Source' },
			{ type: 'rich-text', name: 'ratingText', label: 'Rating Line' },
			actionField('ratingLink', 'Rating Link'),
			statTileField('tiles', 'Stat Tiles'),
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
			{
				type: 'object',
				name: 'items',
				label: 'Questions',
				list: true,
				ui: { itemProps: (item: Record<string, string>) => ({ label: item.question ?? '' }) },
				fields: [
					{ type: 'string', name: 'question', label: 'Question', required: true },
					{ type: 'rich-text', name: 'answer', label: 'Answer' },
				],
			},
			actionField('cta', 'Section Link'),
		],
	},
	{
		type: 'object',
		name: 'related',
		label: 'Keep Researching Band',
		fields: [
			{ type: 'string', name: 'heading', label: 'Heading', description: 'Wrap the italic accent phrase in **…**.' },
			{
				type: 'object',
				name: 'chips',
				label: 'Chips',
				list: true,
				ui: { itemProps: (item: Record<string, string>) => ({ label: item.label ?? '' }) },
				fields: [
					{ type: 'string', name: 'label', label: 'Label' },
					{ type: 'string', name: 'link', label: 'Link' },
				],
			},
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
			{ type: 'boolean', name: 'showPhone', label: 'Show Phone Link', description: 'Adds a "Call <number>" link using the phone from Global Config.' },
		],
	},
];

/** Minimal utility-page fields (404, thank-you). */
export const utilityFields = (): TinaField[] => [
	...seoFields(),
	{ type: 'string', name: 'eyebrow', label: 'Eyebrow' },
	{ type: 'string', name: 'heading', label: 'Heading' },
	{ type: 'string', name: 'body', label: 'Body', ui: { component: 'textarea' } },
	actionField('action', 'Button'),
];
