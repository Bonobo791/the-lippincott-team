import type { RichText } from './data';

interface RichTextNode {
	type?: string;
	text?: string;
	children?: RichTextNode[];
}

/**
 * Flatten a Tina rich-text AST to plain text (block-level siblings separated
 * by a single space). Used for JSON-LD structured data, where markup is
 * invalid.
 */
export function richTextToPlainText(node?: RichText | null): string {
	if (!node || typeof node !== 'object') return '';
	const walk = (n: RichTextNode): string => {
		let out = typeof n.text === 'string' ? n.text : '';
		for (const child of n.children ?? []) {
			const text = walk(child);
			if (!text) continue;
			// Block-level children get a space boundary so sentences don't run
			// together; inline children (text/link spans) concatenate directly.
			const isBlock = !!child.type && child.type !== 'text';
			if (out && isBlock) out += ' ';
			out += text;
		}
		return out;
	};
	return walk(node as RichTextNode).replace(/\s+/g, ' ').trim();
}
