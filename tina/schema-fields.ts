import type { TinaField } from 'tinacms';

type WithoutIdentity<T> = T extends unknown ? Omit<T, 'type' | 'name' | 'label'> : never;
type TextOptions = WithoutIdentity<Extract<TinaField, { type: 'string' }>>;

/** Fresh fields keep Tina's per-template normalization from leaking between schemas. */
export const textField = (name: string, label: string, options: TextOptions = {}): TinaField => ({
	type: 'string', name, label, ...options,
});

export const headingField = (): TinaField => textField('heading', 'Heading', {
	description: 'Wrap the italic accent phrase in **…**.',
});

export const titleBodyFields = (richText = false): TinaField[] => [
	textField('title', 'Title'),
	richText
		? { type: 'rich-text', name: 'body', label: 'Body' }
		: textField('body', 'Body', { ui: { component: 'textarea' } }),
];

export const labelLinkFields = (required = false): TinaField[] => {
	const options = required ? { required: true } : {};
	return [textField('label', 'Label', options), textField('link', 'Link', options)];
};

export const objectListField = (
	name: string, label: string, fields: TinaField[], labelKey = 'title',
): TinaField => ({
	type: 'object', name, label, list: true,
	ui: { itemProps: (item: Record<string, string>) => ({ label: item[labelKey] ?? '' }) },
	fields,
});
