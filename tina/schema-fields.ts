import type { TinaField } from 'tinacms';

type WithoutIdentity<T> = T extends unknown ? Omit<T, 'type' | 'name' | 'label'> : never;
type TextOptions = WithoutIdentity<Extract<TinaField, { type: 'string' }>>;

/** Fresh fields keep Tina's per-template normalization from leaking between schemas. */
export const textField = (name: string, label: string, options: TextOptions = {}): TinaField => ({
	type: 'string', name, label, ...options,
});

/** Build the shared heading field with the editor accent convention. */
export const headingField = (): TinaField => textField('heading', 'Heading', {
	description: 'Wrap the italic accent phrase in **…**.',
});

/** Create a title/body pair, choosing the body type without sharing field objects. */
export const titleBodyFields = (richText = false): TinaField[] => [
	textField('title', 'Title'),
	richText
		? { type: 'rich-text', name: 'body', label: 'Body' }
		: textField('body', 'Body', { ui: { component: 'textarea' } }),
];

/** Create link-label fields, preserving each button's required flag and URL guidance. */
export const labelLinkFields = (required = false, linkDescription?: string): TinaField[] => {
	const options = required ? { required: true } : {};
	const linkOptions = linkDescription === undefined ? options : { ...options, description: linkDescription };
	return [textField('label', 'Label', options), textField('link', 'Link', linkOptions)];
};

/** Build an object list whose editor item label comes from the selected field. */
export const objectListField = (
	name: string, label: string, fields: TinaField[], labelKey = 'title',
): TinaField => ({
	type: 'object', name, label, list: true,
	ui: { itemProps: (item: Record<string, string>) => ({ label: item[labelKey] ?? '' }) },
	fields,
});
