/**
 * Split-heading helper for the brand's mixed-weight heading device.
 * Editors mark the accented phrase in plain Tina string fields with
 * `**...**` (e.g. "Browse by **Community**"). The parser splits the raw
 * string into plain/accent segments; unmatched `**` markers are stripped
 * and the remaining text renders literally (never throws).
 */

export interface HeadingSegment {
	text: string;
	accent: boolean;
}

export function splitHeading(raw: string | null | undefined): HeadingSegment[] {
	if (!raw) return [];
	const segments: HeadingSegment[] = [];
	const pattern = /\*\*([^*]+)\*\*/g;
	let last = 0;
	let match: RegExpExecArray | null;

	const pushPlain = (text: string) => {
		// Strip stray `**` left over from unmatched markers.
		const cleaned = text.replace(/\*\*/g, '');
		if (cleaned) segments.push({ text: cleaned, accent: false });
	};

	while ((match = pattern.exec(raw)) !== null) {
		pushPlain(raw.slice(last, match.index));
		segments.push({ text: match[1], accent: true });
		last = match.index + match[0].length;
	}
	pushPlain(raw.slice(last));

	return segments;
}
