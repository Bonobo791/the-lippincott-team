// Task G4b-3 of the design-fidelity plan: convert the migrated community/ISD
// MDX bodies (produced by scripts/migrate/community.mjs) into frontmatter
// `blocks:` per .superpowers/sdd/g4-blockify-design.md §2/§3.
//
//   node scripts/migrate/blockify-community.mjs                 # dry-run coverage report, all 13 docs
//   node scripts/migrate/blockify-community.mjs --only <slug>   # convert + rewrite one doc in place
//
// <slug> is the MDX basename, e.g. `cypress-tx-real-estate`.
//
// Copy rule (hard constraint): every string emitted into a block is lifted
// character-exact from the doc's current body/frontmatter. The only added
// markup is the `**...**` SplitHeading accent in split/cta titles. Nothing is
// reworded, reordered within a section, or invented. Unmatched lines are
// reported (never guessed into blocks); per-doc waivers below document the
// deliberate drops.
//
// Frontmatter parsing is a minimal flat-scalar reader (the community docs
// only carry title/description/heroImage/intro today) — no YAML dependency is
// added; serialization reuses the migration's own frontmatter() so output
// style matches the existing MDX files byte-for-byte.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontmatter } from './lib/convert.mjs';

const MIGRATE_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(MIGRATE_DIR, '..', '..');
const COMMUNITY_DIR = join(ROOT, 'src', 'content', 'community');

// ---------------------------------------------------------------------------
// Per-doc overrides + waivers (design doc Task 3: "per-doc override map")
// ---------------------------------------------------------------------------
// Waived lines are exact body strings deliberately dropped from the generated
// blocks (reported as WAIVED, not UNMATCHED). Everything else must map.
const DOC_OVERRIDES = {
	'cypress-tx-real-estate': {
		// The Faq block has no actions field; the FAQ section's trailing
		// "Ask Us a Question" button duplicates /contact-us/ links already
		// carried by both Split blocks and the final Cta — dropped, not
		// guessed into another section.
		waived: ['[Ask Us a Question](/contact-us/)'],
	},
};

// ---------------------------------------------------------------------------
// MDX + frontmatter reading (flat scalars only — see header note)
// ---------------------------------------------------------------------------
function readDoc(path) {
	const raw = readFileSync(path, 'utf8');
	const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!m) throw new Error(`no frontmatter fence in ${path}`);
	const fm = {};
	for (const line of m[1].split('\n')) {
		const kv = line.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
		// Non-flat frontmatter (a `blocks:` list from a prior conversion, or
		// anything nested) marks the doc as already converted — caller skips.
		if (!kv || kv[1] === 'blocks') return null;
		let value = kv[2];
		if (value.startsWith('"') && value.endsWith('"')) value = JSON.parse(value);
		fm[kv[1]] = value;
	}
	return { fm, body: m[2] };
}

// ---------------------------------------------------------------------------
// Line classification helpers
// ---------------------------------------------------------------------------
const isBlank = (l) => l.trim() === '';
const isH2 = (l) => /^##(?!#)\s/.test(l);
const isH3 = (l) => /^###(?!#)\s/.test(l);
const LINK_ONLY = /^\[([^\]]+)\]\(([^)]+)\)$/;
const IMAGE_ONLY = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const parseLink = (l) => {
	const m = l.trim().match(LINK_ONLY);
	return m ? { label: m[1], link: m[2] } : null;
};
const parseImage = (l) => {
	const m = l.trim().match(IMAGE_ONLY);
	return m ? { alt: m[1], src: m[2] } : null;
};
// A "plain" line is prose with no markdown structure — the Elementor eyebrow
// texts ("Cypress Community Guide", "Living in Cypress TX", ...) survive as
// bare lines in the migrated bodies.
const isPlain = (l) => {
	const t = l.trim();
	return (
		t !== '' &&
		!/^[#\-*|>[`]/.test(t) &&
		!/^\d+[.)]\s/.test(t) &&
		!LINK_ONLY.test(t) &&
		!IMAGE_ONLY.test(t) &&
		!t.includes('](')
	);
};
const hasGfmTable = (lines) => lines.some((l) => l.trim().startsWith('|'));

// ---------------------------------------------------------------------------
// Segmentation: split on `## ` boundaries; a trailing plain line belongs to
// the NEXT segment as its eyebrow (live renders it above the section title).
// ---------------------------------------------------------------------------
// Eyebrow hoisting: a trailing plain line in one segment is the NEXT
// segment's eyebrow (live renders it above the section title).
function hoistEyebrows(segments) {
	for (let i = 0; i < segments.length - 1; i++) {
		const seg = segments[i];
		let j = seg.lines.length - 1;
		while (j >= 0 && isBlank(seg.lines[j])) j--;
		if (j >= 0 && isPlain(seg.lines[j])) {
			const [eyebrow] = seg.lines.splice(j, 1);
			segments[i + 1].eyebrow = eyebrow.trim();
		}
	}
}

function segment(body) {
	const lines = body.split('\n');
	const segments = [{ heading: null, lines: [] }];
	for (const line of lines) {
		if (isH2(line)) segments.push({ heading: line.replace(/^##\s+/, '').trim(), lines: [] });
		else segments.at(-1).lines.push(line);
	}
	hoistEyebrows(segments);
	for (const seg of segments) {
		while (seg.lines.length && isBlank(seg.lines[0])) seg.lines.shift();
		while (seg.lines.length && isBlank(seg.lines.at(-1))) seg.lines.pop();
	}
	return segments;
}

const joinVerbatim = (lines) => lines.join('\n');
// Drop leading/trailing blank lines (segment edges), keeping interior blanks.
const trimBlanks = (lines) => {
	while (lines.length && isBlank(lines[0])) lines.shift();
	while (lines.length && isBlank(lines[lines.length - 1])) lines.pop();
	return lines;
};

// ---------------------------------------------------------------------------
// Block builders (community template, design doc §3)
// ---------------------------------------------------------------------------
function heroBlock(seg, fm, sierraCheck) {
	const block = { _template: 'hero', variant: 'photo' };
	const leftovers = [];
	let teamPhoto = null;
	for (const line of seg.lines) {
		if (isBlank(line)) continue;
		const h1 = line.match(/^#(?!#)\s+(.*)$/);
		const link = parseLink(line);
		const image = parseImage(line);
		if (h1) block.headline = h1[1].trim();
		else if (link) block.actions = [{ label: link.label, type: 'button', link: link.link }];
		else if (image) teamPhoto = image; // body team photo → why-work split image
		else if (isPlain(line) && !block.eyebrow) block.eyebrow = line.trim();
		else leftovers.push(line);
	}
	// The body H1 is the on-page headline (live shows it verbatim, e.g.
	// "Cypress TX Real Estate Listings"); fall back to frontmatter title.
	if (!block.headline) block.headline = fm.title;
	block.tagline = fm.intro;
	block.backgroundImage = fm.heroImage;
	if (block.actions?.[0]) sierraCheck(block.actions[0].link);
	// Field order mirrors src/content/page/home.mdx.
	const ordered = {
		headline: block.headline,
		tagline: block.tagline,
		variant: block.variant,
		backgroundImage: block.backgroundImage,
		eyebrow: block.eyebrow,
		actions: block.actions,
		_template: 'hero',
	};
	return { blocks: [ordered], leftovers, teamPhoto };
}

function splitBlock(seg, { title, reverse, image }) {
	const leftovers = [];
	const bodyLines = [];
	let action = null;
	let localImage = image ?? null;
	for (const line of seg.lines) {
		const link = parseLink(line);
		const img = parseImage(line);
		if (link) action = { label: link.label, type: 'button', link: link.link };
		else if (img) localImage = img;
		else bodyLines.push(line);
	}
	while (bodyLines.length && isBlank(bodyLines[0])) bodyLines.shift();
	while (bodyLines.length && isBlank(bodyLines[bodyLines.length - 1])) bodyLines.pop();
	const block = {
		eyebrow: seg.eyebrow,
		title: title ?? seg.heading,
		body: joinVerbatim(bodyLines),
		image: localImage ? { src: localImage.src, alt: localImage.alt } : undefined,
		reverse: reverse ? true : undefined,
		actions: action ? [action] : undefined,
		_template: 'split',
	};
	return { blocks: [block], leftovers };
}

// Features from `### ` subsections: heading→title, trailing link-only
// paragraph→per-item action, everything between→item text (verbatim).
function featuresItems(subsectionLines) {
	const items = [];
	const leftovers = [];
	let current = null;
	for (const line of subsectionLines) {
		if (isH3(line)) {
			current = { title: line.replace(/^###\s+/, '').trim(), lines: [] };
			items.push(current);
			continue;
		}
		if (!current) {
			if (!isBlank(line)) leftovers.push(line);
			continue;
		}
		const link = parseLink(line);
		if (link) current.action = { label: link.label, link: link.link };
		else current.lines.push(line);
	}
	return {
		items: items.map((it) => ({
			title: it.title,
			text: joinVerbatim(trimBlanks(it.lines)),
			action: it.action,
		})),
		leftovers,
	};
}

function featuresBlock(seg) {
	// Intro lines before the first `###` become the block description.
	const intro = [];
	const rest = [];
	let seenH3 = false;
	for (const line of seg.lines) {
		if (isH3(line)) seenH3 = true;
		(seenH3 ? rest : intro).push(line);
	}
	const { items, leftovers } = featuresItems(rest);
	const description = joinVerbatim(trimBlanks(intro));
	const block = {
		title: seg.heading,
		// The detached eyebrow line has no Features field; folded into the
		// description so the copy survives verbatim (documented deviation —
		// live renders it as a red uppercase chip the block cannot express).
		description: seg.eyebrow ? `${seg.eyebrow}\n\n${description}` : description,
		items,
		_template: 'features',
	};
	return { blocks: [block], leftovers };
}

// Neighborhoods segment: gfm-table head → Content block (verbatim, eyebrow
// and `##` heading included), `###` subsections → 6-item Features block.
function neighborhoodsBlocks(seg) {
	const head = [];
	const rest = [];
	let seenH3 = false;
	for (const line of seg.lines) {
		if (isH3(line)) seenH3 = true;
		(seenH3 ? rest : head).push(line);
	}
	while (head.length && isBlank(head[head.length - 1])) head.pop();
	const contentBody = [
		...(seg.eyebrow ? [seg.eyebrow, ''] : []),
		`## ${seg.heading}`,
		'',
		...head,
	];
	const { items, leftovers } = featuresItems(rest);
	return {
		blocks: [
			{ body: joinVerbatim(contentBody), _template: 'content' },
			{ items, _template: 'features' },
		],
		leftovers,
	};
}

function faqBlock(seg, waived) {
	const items = [];
	const leftovers = [];
	let current = null;
	for (const line of seg.lines) {
		if (isH3(line)) {
			current = { question: line.replace(/^###\s+/, '').trim(), lines: [] };
			items.push(current);
			continue;
		}
		if (!current) {
			if (!isBlank(line)) leftovers.push(line);
			continue;
		}
		if (parseLink(line)) {
			if (!waived.includes(line.trim())) leftovers.push(line);
			continue; // waived or reported, never folded into an answer
		}
		current.lines.push(line);
	}
	const block = {
		title: seg.heading,
		// Eyebrow line ("Frequently Asked Questions") folded into description —
		// same no-eyebrow-field deviation as Features above.
		description: seg.eyebrow,
		items: items.map((it) => ({
			question: it.question,
			answer: joinVerbatim(trimBlanks(it.lines)),
		})),
		_template: 'faq',
	};
	return { blocks: [block], leftovers };
}

function ctaBlock(seg) {
	const actions = [];
	const prose = [];
	for (const line of seg.lines) {
		const link = parseLink(line);
		if (link) actions.push(link);
		else if (!isBlank(line)) prose.push(line.trim());
	}
	// Design doc §3: title carries the `**New Home?**` SplitHeading accent;
	// first link is the red button, the rest render as ghost links.
	const title = seg.heading.replace(/New Home\?$/, '**New Home?**');
	return {
		blocks: [
			{
				title,
				description: [...(seg.eyebrow ? [seg.eyebrow] : []), ...prose].join('\n\n'),
				actions: actions.map((a, i) => ({
					label: a.label,
					type: i === 0 ? 'button' : 'link',
					link: a.link,
				})),
				_template: 'cta',
			},
		],
		leftovers: [],
	};
}

// ---------------------------------------------------------------------------
// Sierra cross-check (URLs recovered into src/lib/sierra-links.ts)
// ---------------------------------------------------------------------------
function loadSierraLinks() {
	const src = readFileSync(join(ROOT, 'src', 'lib', 'sierra-links.ts'), 'utf8');
	const map = {};
	for (const m of src.matchAll(/'([^']+)':\s*'([^']+)'/g)) map[m[1]] = m[2];
	return map;
}

// ---------------------------------------------------------------------------
// Doc conversion
// ---------------------------------------------------------------------------
function convertDoc(path, sierraLinks) {
	const slug = basename(path, '.mdx');
	const docKey = relative(COMMUNITY_DIR, path).replace(/\.mdx$/, '');
	const overrides = DOC_OVERRIDES[slug] ?? {};
	const waived = overrides.waived ?? [];
	let doc;
	try {
		doc = readDoc(path);
	} catch (err) {
		// A doc without a frontmatter fence must not abort the whole batch —
		// report it as unmatched and carry on with the remaining docs.
		const report = { slug, path, mapped: [], unmatched: [`READ ERROR: ${err.message}`], waived: [] };
		return { report, output: null };
	}
	if (!doc) return { report: { slug, path, alreadyConverted: true, mapped: [], unmatched: [], waived: [] }, output: null };
	const { fm, body } = doc;
	const report = { slug, path, mapped: [], unmatched: [], waived: [] };

	const sierraCheck = (url) => {
		const expected = sierraLinks[docKey];
		if (expected && expected !== url)
			report.unmatched.push(`SIERRA MISMATCH: body link ${url} != sierra-links.ts ${expected}`);
	};

	const segments = segment(body);
	const blocks = [];
	let teamPhoto = null;

	for (const seg of segments) {
		const label = seg.heading ?? '(preamble)';
		let result = null;
		if (seg.heading === null) {
			result = heroBlock(seg, fm, sierraCheck);
			teamPhoto = result.teamPhoto;
		} else if (/^why work with/i.test(seg.heading)) {
			// Live renders this heading fully emphasized → whole title accented.
			result = splitBlock(seg, {
				title: `**${seg.heading}**`,
				reverse: true,
				image: teamPhoto,
			});
		} else if (/home search resource/i.test(seg.heading)) {
			result = splitBlock(seg, {});
		} else if (/faq/i.test(seg.heading)) {
			result = faqBlock(seg, waived);
		} else if (/ready to find your new home/i.test(seg.heading)) {
			result = ctaBlock(seg);
		} else if (hasGfmTable(seg.lines)) {
			result = neighborhoodsBlocks(seg);
		} else if (seg.lines.some(isH3)) {
			result = featuresBlock(seg);
		}
		if (!result) {
			report.unmatched.push(`SEGMENT "${label}":\n${joinVerbatim(seg.lines)}`);
			continue;
		}
		// Waived lines consumed on purpose are logged, not unmatched.
		const waivedHit = seg.lines.filter((l) => waived.includes(l.trim()));
		report.waived.push(...waivedHit.map((l) => l.trim()));
		report.mapped.push(`${label} → ${result.blocks.map((b) => b._template).join(' + ')}`);
		report.unmatched.push(...result.leftovers.map((l) => `in "${label}": ${l}`));
		blocks.push(...result.blocks);
	}

	const out = {
		title: fm.title,
		description: fm.description,
		blocks,
	};
	return { report, output: frontmatter(out) };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function findDocs(dir) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		const p = join(dir, entry);
		if (statSync(p).isDirectory()) out.push(...findDocs(p));
		else if (entry.endsWith('.mdx')) out.push(p);
	}
	return out.sort();
}

// Convert one doc, print its coverage report, and (in --only mode) write it
// back in place. Returns 1 when the doc has UNMATCHED lines, else 0.
function reportDoc(path, sierraLinks, only) {
	const { report, output } = convertDoc(path, sierraLinks);
	console.log(`\n=== ${relative(ROOT, path)} ===`);
	if (report.alreadyConverted) {
		console.log('  SKIPPED   already converted (frontmatter has blocks:)');
		return 0;
	}
	for (const m of report.mapped) console.log(`  MAPPED    ${m}`);
	for (const w of report.waived) console.log(`  WAIVED    ${w}`);
	for (const u of report.unmatched) console.log(`  UNMATCHED ${u}`);
	console.log(
		`  → ${report.mapped.length} segments mapped, ${report.waived.length} waived, ${report.unmatched.length} unmatched`,
	);
	if (!only) return 0;
	if (report.unmatched.length > 0) {
		console.log('  (not written — resolve UNMATCHED lines or add a documented waiver)');
		return 1;
	}
	writeFileSync(path, output);
	console.log(`  WROTE ${relative(ROOT, path)}`);
	return 0;
}

function main() {
	const argv = process.argv.slice(2);
	const onlyIdx = argv.indexOf('--only');
	const only = onlyIdx >= 0 ? argv[onlyIdx + 1] : null;
	const sierraLinks = loadSierraLinks();
	const docs = findDocs(COMMUNITY_DIR).filter((p) => !only || basename(p, '.mdx') === only);
	if (only && docs.length === 0) {
		console.error(`no community doc matches --only ${only}`);
		process.exit(2);
	}
	let failures = 0;
	for (const path of docs) failures += reportDoc(path, sierraLinks, only);
	if (only) process.exit(failures > 0 ? 1 : 0);
}

main();
