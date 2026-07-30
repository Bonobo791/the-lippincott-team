import type { Template } from 'tinacms';

type TemplateField = NonNullable<Template['fields']>[number];

// Shared "chips" object-list field (bold + label pairs) used by the
// guideHero and routeLedger block templates.
export const chipsField = (defaultItem: { bold: string; label: string }): TemplateField => ({
	type: 'object', label: 'Chips', name: 'chips', list: true,
	ui: { defaultItem, itemProps: (i: { bold?: string; label?: string }) => ({ label: `${i.bold ?? ''} ${i.label ?? ''}`.trim() }) },
	fields: [
		{ type: 'string', label: 'Bold', name: 'bold' },
		{ type: 'string', label: 'Label', name: 'label' },
	],
});
