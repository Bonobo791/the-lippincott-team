const BLOCK_CONTAINERS = new Set(['root', 'blockquote', 'ul', 'ol', 'li', 'table', 'tr']);

const isNode = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

/**
 * Flatten a Tina rich-text AST to plain text (block-level siblings separated
 * by a single space). Used for JSON-LD structured data, where markup is
 * invalid.
 */
export function richTextToPlainText(node?: unknown): string {
	const walk = (value: unknown): string => {
		if (!isNode(value)) return '';
		const text = typeof value.text === 'string' ? value.text : '';
		const children = Array.isArray(value.children)
			? value.children.map(walk).filter(Boolean)
			: [];
		const type = typeof value.type === 'string' ? value.type : '';
		return [text, ...children].filter(Boolean).join(BLOCK_CONTAINERS.has(type) ? ' ' : '');
	};
	return walk(node).replace(/\s+/g, ' ').trim();
}

/**
 * True when a Tina rich-text field actually contains text. Tina hands back an
 * empty root-node object for unset rich-text fields, which is *truthy* — a
 * plain `data.note && ...` guard renders a phantom container (margins and
 * all). Use this in template conditionals instead.
 */
export function hasRichText(node?: unknown): boolean {
	if (typeof node === 'string') return node.trim().length > 0;
	return richTextToPlainText(node).length > 0;
}
