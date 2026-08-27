#!/usr/bin/env node
/**
 * Computed-style probe for the design-fidelity audit.
 *
 * Usage:
 *   node scripts/audit/probe-styles.mjs --base https://thelippincottteam.com --out .launch/qa/live-styles.json
 *
 * Visits every audit template on the live site at desktop (1440x900) and mobile
 * (402x900) and extracts exact getComputedStyle() values for typography, buttons,
 * header/footer, containers, cards, eyebrows, and the recurring brand palette.
 * Also records HTTP status of each page and any 4xx sub-resource responses.
 * Third-party trackers (GA/Complianz/FB) are aborted so the run stays fast.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TEMPLATES = [
	{ name: 'home', path: '/' },
	{ name: 'about', path: '/about/' },
	{ name: 'team-bio', path: '/about/amy-lippincott-2/' },
	{ name: 'contact', path: '/contact-us/' },
	{ name: 'reviews', path: '/reviews/' },
	{ name: 'hub-communities', path: '/northwest-houston-real-estate/' },
	{ name: 'hub-schools', path: '/northwest-houston-schools-real-estate/' },
	{ name: 'community', path: '/northwest-houston-real-estate/cypress-tx-real-estate/' },
	{ name: 'isd', path: '/northwest-houston-schools-real-estate/katy-isd-real-estate/' },
	{ name: 'blog-index', path: '/blog/' },
	{
		name: 'blog-post',
		path: '/blog/bridgeland-breakdown-where-every-village-has-its-own-personality-and-splash-pad/',
	},
];

const BLOCKED_HOSTS = [
	'googletagmanager.com',
	'google-analytics.com',
	'googlesyndication.com',
	'doubleclick.net',
	'facebook.net',
	'facebook.com',
	'connect.facebook',
	'complianz.io',
	'hotjar.com',
	'clarity.ms',
];

// Resolve a CLI-supplied output path against the working directory and
// refuse anything that escapes it — the value drives mkdir/writeFile
// targets, so an absolute or `../` path would write outside the repo
// (S8707).
function resolveInsideCwd(outPath) {
	const root = process.cwd();
	const resolved = path.resolve(root, outPath);
	if (resolved !== root && !resolved.startsWith(root + path.sep)) {
		console.error(`Refusing to write outside the working directory (${root}): ${resolved}`);
		process.exit(2);
	}
	return resolved;
}

function parseArgs(argv) {
	const args = { base: 'https://thelippincottteam.com', out: '.launch/qa/live-styles.json' };
	for (let i = 2; i < argv.length; i++) {
		if (argv[i] === '--base') args.base = argv[++i];
		else if (argv[i] === '--out') args.out = argv[++i];
	}
	args.out = resolveInsideCwd(args.out);
	return args;
}

// Runs in the browser. Returns the full desktop style probe.
function desktopProbe() {
	const pick = (el, props) => {
		if (!el) return null;
		const cs = getComputedStyle(el);
		const out = { tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 60) };
		for (const p of props) out[p] = cs[p];
		return out;
	};
	const TYPO = [
		'fontFamily',
		'fontSize',
		'fontWeight',
		'lineHeight',
		'letterSpacing',
		'textTransform',
		'color',
		'marginTop',
		'marginBottom',
		'fontStyle',
	];

	const body = pick(document.body, ['fontFamily', 'fontSize', 'lineHeight', 'color', 'backgroundColor']);

	// Webfonts actually loaded.
	const fontsLoaded = [];
	document.fonts.forEach((f) => {
		if (f.status === 'loaded') fontsLoaded.push(`${f.family} ${f.weight} ${f.style}`);
	});
	const fontLinks = [...document.querySelectorAll('link[href*="fonts.g"], link[href*="typekit"], link[href*="use.typekit"]')].map(
		(l) => l.href,
	);

	const headings = {};
	for (const tag of ['h1', 'h2', 'h3']) {
		const el = document.querySelector(tag);
		headings[tag] = pick(el, TYPO);
		if (el) {
			const r = el.getBoundingClientRect();
			headings[tag].pageY = Math.round(r.top + window.scrollY);
		}
	}

	// Buttons: first two Elementor buttons with distinct styles.
	const btnProps = [
		'backgroundColor',
		'color',
		'borderRadius',
		'paddingTop',
		'paddingRight',
		'paddingBottom',
		'paddingLeft',
		'fontFamily',
		'fontSize',
		'fontWeight',
		'textTransform',
		'letterSpacing',
		'borderTopWidth',
		'borderTopStyle',
		'borderTopColor',
		'boxShadow',
		'lineHeight',
	];
	const btnEls = [...document.querySelectorAll('.elementor-button, a.elementor-button-link, [role="button"]')].filter(
		(el) => el.offsetParent !== null,
	);
	const buttons = [];
	const seen = new Set();
	for (const el of btnEls) {
		const cs = getComputedStyle(el);
		const key = `${cs.backgroundColor}|${cs.color}|${cs.borderRadius}|${cs.fontSize}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const p = pick(el, btnProps);
		p.href = el.getAttribute('href');
		p.selector = el.className.split(' ').slice(0, 4).join(' ');
		buttons.push(p);
		if (buttons.length >= 4) break;
	}
	// Stash first button for a scripted hover probe outside evaluate.
	const firstBtn = btnEls[0] || null;
	if (firstBtn) {
		firstBtn.setAttribute('data-probe-btn', '1');
		firstBtn.scrollIntoView({ block: 'center' });
	}

	// Header.
	const header =
		document.querySelector('header') ||
		document.querySelector('.elementor-location-header') ||
		document.querySelector('[data-elementor-type="header"]');
	let headerInfo = null;
	if (header) {
		const cs = getComputedStyle(header);
		const r = header.getBoundingClientRect();
		headerInfo = {
			selector: header.tagName.toLowerCase() + (header.className ? '.' + String(header.className).trim().split(' ')[0] : ''),
			height: `${Math.round(r.height)}px`,
			backgroundColor: cs.backgroundColor,
			position: cs.position,
			boxShadow: cs.boxShadow,
			borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`,
		};
		// Sticky: Elementor marks sticky sections via data-settings; also check fixed ancestors.
		let sticky = cs.position === 'fixed' || cs.position === 'sticky';
		header.querySelectorAll('[data-settings]').forEach((el) => {
			if ((el.getAttribute('data-settings') || '').includes('sticky')) sticky = true;
		});
		let anc = header.parentElement;
		while (anc && !sticky) {
			const ap = getComputedStyle(anc).position;
			if (ap === 'fixed' || ap === 'sticky') sticky = true;
			anc = anc.parentElement;
		}
		headerInfo.sticky = sticky;
		const logo = header.querySelector('img');
		if (logo) {
			const lr = logo.getBoundingClientRect();
			headerInfo.logo = {
				width: `${Math.round(lr.width)}px`,
				x: Math.round(lr.left),
				align: lr.left < window.innerWidth / 3 ? 'left' : lr.left > (window.innerWidth / 3) * 2 ? 'right' : 'center',
			};
		}
		const nav = header.querySelector('nav') || header.querySelector('.elementor-nav-menu');
		if (nav) {
			const nr = nav.getBoundingClientRect();
			headerInfo.nav = {
				x: Math.round(nr.left),
				align: nr.left < window.innerWidth / 3 ? 'left' : nr.left > (window.innerWidth / 3) * 2 ? 'right' : 'center',
			};
			const link = nav.querySelector('a');
			if (link) headerInfo.navLink = pick(link, ['fontFamily', 'fontSize', 'fontWeight', 'textTransform', 'letterSpacing', 'color', 'paddingLeft', 'paddingRight']);
		}
	}
	// Top bar: any thin bar above the header containing a phone link.
	let topBar = null;
	const tel = document.querySelector('a[href^="tel:"]');
	if (tel) {
		const bar = tel.closest('section, div, header');
		const r = bar ? bar.getBoundingClientRect() : tel.getBoundingClientRect();
		const inHeader = header && header.contains(tel);
		const cs = getComputedStyle(tel);
		topBar = {
			inHeader: !!inHeader,
			aboveHeaderY: Math.round(r.top + window.scrollY),
			phoneText: (tel.textContent || '').trim().slice(0, 40),
			href: tel.getAttribute('href'),
			font: { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, color: cs.color, textTransform: cs.textTransform },
		};
		if (bar && !inHeader) {
			const bcs = getComputedStyle(bar);
			topBar.barBackground = bcs.backgroundColor;
			topBar.barHeight = `${Math.round(r.height)}px`;
		}
	}

	// Footer.
	const footer =
		document.querySelector('footer') ||
		document.querySelector('.elementor-location-footer') ||
		document.querySelector('[data-elementor-type="footer"]');
	let footerInfo = null;
	if (footer) {
		const cs = getComputedStyle(footer);
		// Footer bg usually lives on an inner section/container, not the wrapper.
		let bg = cs.backgroundColor;
		if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
			const inner = [...footer.querySelectorAll('section, div')].find((el) => {
				const c = getComputedStyle(el).backgroundColor;
				return c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent';
			});
			if (inner) bg = getComputedStyle(inner).backgroundColor;
		}
		const cols = footer.querySelectorAll('.elementor-top-column, .elementor-column, .e-child');
		const heading = footer.querySelector('h1, h2, h3, h4, h5, .elementor-heading-title, strong, b');
		const link = footer.querySelector('a');
		footerInfo = {
			backgroundColor: bg,
			color: cs.color,
			fontFamily: cs.fontFamily,
			fontSize: cs.fontSize,
			columnCount: cols.length || null,
			heading: pick(heading, ['fontFamily', 'fontSize', 'fontWeight', 'textTransform', 'letterSpacing', 'color', 'marginBottom']),
			link: pick(link, ['fontSize', 'fontWeight', 'color', 'textDecoration']),
		};
	}

	// Content container max-width + section padding.
	// Modern Elementor uses flexbox containers (.e-con / .e-con-inner) with a
	// --content-width custom property (e.g. "min(100%,1714px)"); older uses .elementor-container.
	const containers = [
		...document.querySelectorAll('.elementor-container, .elementor-section-boxed > .elementor-container, .e-con-inner, .e-con-boxed'),
	]
		.map((el) => ({ el, cs: getComputedStyle(el) }))
		.filter(({ el }) => el.offsetParent !== null);
	let maxWidth = null;
	const consider = (raw) => {
		if (!raw || raw === 'none' || raw === 'auto') return;
		const nums = [...String(raw).matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => parseFloat(m[1]));
		const n = Math.max(...nums, 0);
		if (n && (!maxWidth || n > parseFloat(maxWidth))) maxWidth = `${n}px`;
	};
	for (const { el, cs } of containers) {
		consider(cs.maxWidth);
		consider(cs.getPropertyValue('--content-width'));
	}
	document.querySelectorAll('.e-con').forEach((el) => consider(getComputedStyle(el).getPropertyValue('--content-width')));
	const sectionSel = '.elementor-top-section, [data-elementor-type] > .e-con, [data-elementor-type] > section';
	const sections = [...document.querySelectorAll(sectionSel)]
		.filter((s) => s.offsetParent !== null)
		.slice(0, 4)
		.map((s) => {
			const cs = getComputedStyle(s);
			return {
				backgroundColor: cs.backgroundColor,
				paddingTop: cs.paddingTop,
				paddingBottom: cs.paddingBottom,
				marginTop: cs.marginTop,
			};
		});

	// Cards: probe a list of common card selectors, keep the ones that exist.
	const cardSelectors = [
		'.elementor-testimonial',
		'.elementor-post',
		'.team-member',
		'.elementor-image-box',
		'.elementor-icon-box',
		'article',
		'.elementor-widget-image-box .elementor-widget-container',
	];
	const cards = [];
	for (const sel of cardSelectors) {
		const el = document.querySelector(sel);
		if (!el || el.offsetParent === null) continue;
		const cs = getComputedStyle(el);
		cards.push({
			selector: sel,
			backgroundColor: cs.backgroundColor,
			border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
			borderRadius: cs.borderRadius,
			boxShadow: cs.boxShadow,
			padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
			text: (el.textContent || '').trim().slice(0, 40),
		});
	}

	// Eyebrow / small labels: uppercase-ish small text with letter-spacing.
	const eyebrows = [];
	const eyebrowSeen = new Set();
	for (const el of document.querySelectorAll('span, p, div, h6, h5, h4')) {
		const cs = getComputedStyle(el);
		const fs = parseFloat(cs.fontSize);
		const ls = parseFloat(cs.letterSpacing);
		if (!fs || fs > 15 || !(ls >= 0.5) || el.children.length > 2) continue;
		const text = (el.textContent || '').trim();
		if (!text || text.length > 60 || text.length < 3) continue;
		const key = `${cs.fontSize}|${cs.color}|${text.slice(0, 20)}`;
		if (eyebrowSeen.has(key)) continue;
		eyebrowSeen.add(key);
		eyebrows.push({
			text: text.slice(0, 50),
			fontFamily: cs.fontFamily,
			fontSize: cs.fontSize,
			fontWeight: cs.fontWeight,
			textTransform: cs.textTransform,
			letterSpacing: cs.letterSpacing,
			color: cs.color,
		});
		if (eyebrows.length >= 5) break;
	}

	// Palette: recurring colors from buttons, section backgrounds, links.
	const count = new Map();
	const bump = (map, color, use) => {
		if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') return;
		if (!map.has(color)) map.set(color, { count: 0, uses: new Set() });
		const e = map.get(color);
		e.count++;
		e.uses.add(use);
	};
	btnEls.forEach((b) => bump(count, getComputedStyle(b).backgroundColor, 'button-bg'));
	document.querySelectorAll('.elementor-top-section, .elementor-section, footer, header').forEach((s) => {
		bump(count, getComputedStyle(s).backgroundColor, s.tagName.toLowerCase() + '-bg');
	});
	document.querySelectorAll('a').forEach((a) => {
		const c = getComputedStyle(a).color;
		if (c && c !== 'rgba(0, 0, 0, 0)') {
			if (!count.has('link:' + c)) count.set('link:' + c, { count: 0, uses: new Set(['link-color']) });
			count.get('link:' + c).count++;
		}
	});
	const palette = [...count.entries()]
		.sort((a, b) => b[1].count - a[1].count)
		.slice(0, 14)
		.map(([color, e]) => ({ color, count: e.count, uses: [...e.uses] }));

	return { body, fontsLoaded: [...new Set(fontsLoaded)], fontLinks, headings, buttons, header: headerInfo, topBar, footer: footerInfo, content: { containerMaxWidth: maxWidth, sections }, cards, eyebrows, palette };
}

function mobileProbe() {
	const pick = (el, props) => {
		if (!el) return null;
		const cs = getComputedStyle(el);
		const out = {};
		for (const p of props) out[p] = cs[p];
		return out;
	};
	const h1 = pick(document.querySelector('h1'), ['fontSize', 'lineHeight']);
	const h2 = pick(document.querySelector('h2'), ['fontSize', 'lineHeight']);
	const btn = document.querySelector('.elementor-button');
	const button = btn
		? pick(btn, ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontSize', 'borderRadius'])
		: null;
	const header = document.querySelector('header') || document.querySelector('.elementor-location-header');
	let headerHeight = null;
	if (header) headerHeight = `${Math.round(header.getBoundingClientRect().height)}px`;
	// Sticky bottom bar / click-to-call.
	let stickyBottom = null;
	for (const el of document.querySelectorAll('body *')) {
		const cs = getComputedStyle(el);
		if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
		const r = el.getBoundingClientRect();
		if (r.height === 0 || r.height > 140) continue;
		if (window.innerHeight - r.bottom < 5) {
			stickyBottom = {
				height: `${Math.round(r.height)}px`,
				backgroundColor: cs.backgroundColor,
				text: (el.textContent || '').trim().slice(0, 60),
				hasTel: !!el.querySelector('a[href^="tel:"]'),
			};
			break;
		}
	}
	const telInHeader = header ? !!header.querySelector('a[href^="tel:"]') : false;
	return { h1, h2, button, headerHeight, stickyBottom, telInHeader };
}

async function main() {
	const { base, out } = parseArgs(process.argv);
	await mkdir(path.dirname(out), { recursive: true });
	const browser = await chromium.launch();
	const results = {
		base,
		probedAt: new Date().toISOString(),
		httpNotFound: [],
		templates: {},
	};

	for (const tpl of TEMPLATES) {
		const url = new URL(tpl.path, base).toString();
		const entry = { url };
		for (const vp of [
			{ key: 'desktop', width: 1440, height: 900 },
			{ key: 'mobile', width: 402, height: 900 },
		]) {
			const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
			const page = await context.newPage();
			await page.route('**/*', (route) => {
				const u = route.request().url();
				if (BLOCKED_HOSTS.some((h) => u.includes(h))) return route.abort();
				return route.continue();
			});
			const notFound = [];
			page.on('response', (res) => {
				if (res.status() >= 400) notFound.push({ url: res.url(), status: res.status() });
			});
			try {
				const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
				entry.status = response?.status() ?? null;
				await page.evaluate(() => document.fonts.ready).catch(() => {});
				await page.waitForTimeout(600);
				if (vp.key === 'desktop') {
					entry.desktop = await page.evaluate(desktopProbe);
					// Cheap hover-state capture on the first button.
					try {
						const btnSel = '[data-probe-btn="1"]';
						if (await page.locator(btnSel).count()) {
							await page.hover(btnSel, { timeout: 3000 });
							await page.waitForTimeout(300);
							entry.desktop.buttonHover = await page.evaluate((sel) => {
								const el = document.querySelector(sel);
								if (!el) return null;
								const cs = getComputedStyle(el);
								return {
									backgroundColor: cs.backgroundColor,
									color: cs.color,
									borderColor: cs.borderTopColor,
									boxShadow: cs.boxShadow,
									transform: cs.transform,
								};
							}, btnSel);
						}
					} catch {
						entry.desktop.buttonHover = null;
					}
				} else {
					entry.mobile = await page.evaluate(mobileProbe);
				}
			} catch (err) {
				entry.error = err.message;
			}
			if (notFound.length) {
				for (const nf of notFound) {
					results.httpNotFound.push({ template: tpl.name, viewport: vp.key, ...nf });
				}
			}
			await context.close();
		}
		results.templates[tpl.name] = entry;
		console.log(`probed ${tpl.name}: status=${entry.status}${entry.error ? ' ERROR ' + entry.error : ''}`);
	}

	await browser.close();
	// Deduplicate global 404 list.
	const seen = new Set();
	results.httpNotFound = results.httpNotFound.filter((e) => {
		const k = `${e.url}|${e.template}`;
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});
	await writeFile(out, JSON.stringify(results, null, 2));
	console.log(`Wrote ${out} (${Object.keys(results.templates).length} templates, ${results.httpNotFound.length} failed requests).`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
