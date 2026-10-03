// Run with: node --test scripts/har-review-feed.test.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { safeHref } from '../src/lib/url.ts';

const component = new URL('../src/components/standalone/HarReviewFeed.astro', import.meta.url);
const source = existsSync(component) ? readFileSync(component, 'utf8') : '';
const script = stripTypeScriptTypes(source.match(/<script>([\s\S]*?)<\/script>/)?.[1]?.replace(/^\s*import[^\n]+/gm, '') ?? '');

function setup(memberNumber = '586048', profileUrl = 'https://www.har.com/amy-lippincott/ratings_586048') {
	const frames = [];
	const definitions = new Map();
	class HTMLElement {
		constructor() { this.dataset = { memberNumber, profileUrl }; this.isConnected = true; this.children = []; }
		appendChild(child) { this.children.push(child); }
		replaceChildren(...nodes) { this.children.forEach((node) => node.remove?.()); this.children = nodes; }
	}
	const document = {
		createElement: () => {
			const frame = { onload: null, removed: false, remove() { this.removed = true; } };
			frames.push(frame);
			return frame;
		},
	};
	const customElements = { get: (name) => definitions.get(name), define: (name, value) => definitions.set(name, value) };
	runInNewContext(script, { HTMLElement, document, customElements, safeHref });
	const Feed = definitions.get('har-review-feed');
	assert.ok(Feed, 'the native HAR embed must initialize again after Tina inserts a new element');
	const feed = new Feed();
	feed.connectedCallback();
	return { feed, frames };
}
function markup() {
	const node = (attrs = {}) => ({
		attrs, removed: false,
		getAttribute(name) { return this.attrs[name] ?? null; },
		setAttribute(name, value) { this.attrs[name] = value; },
		remove() { this.removed = true; },
	});
	const script = node();
	const image = node({ src: '/Realtor-Agent-Rating/images/5_star.png' });
	const link = node({ href: '/Realtor-Agent-Rating/ratings.cfm?member_number=586048' });
	const header = node({ style: 'background:url(/Realtor-Agent-Rating/images/SubHdrBg.gif)' });
	const nodes = [image, link, header];
	const body = {
		get childNodes() { return script.removed ? nodes : [script, ...nodes]; },
		querySelectorAll(selector) { return selector === 'script' ? [script] : nodes; },
	};
	return { image, link, header, script, body };
}
const finish = (frame, body) => { frame.contentDocument = { body }; frame.onload(); };

test('HAR parses in a child document and adopts normalized styled content without scripts', () => {
	const { feed, frames } = setup();
	assert.equal(frames.length, 1);
	assert.match(frames[0].srcdoc, /member_number=586048/);
	const m = markup();
	finish(frames[0], m.body);
	assert.equal(m.image.attrs.src, 'https://members.har.com/Realtor-Agent-Rating/images/5_star.png');
	assert.equal(m.header.attrs.style, 'background:url(https://members.har.com/Realtor-Agent-Rating/images/SubHdrBg.gif)');
	assert.equal(m.link.attrs.href, 'https://www.har.com/amy-lippincott/ratings_586048');
	assert.equal(m.link.attrs.target, '_blank');
	assert.equal(m.link.attrs.rel, 'noopener');
	assert.equal(m.script.removed, true);
	assert.equal(frames[0].removed, true);
	assert.equal(frames[0].onload, null);
	assert.equal(feed.children.length, 3);
});

test('edited member/profile values are used for the replacement feed', () => {
	const { frames } = setup('123456', 'https://www.har.com/edited-profile');
	assert.match(frames[0].srcdoc, /member_number=123456/);
	const m = markup();
	finish(frames[0], m.body);
	assert.equal(m.link.attrs.href, 'https://www.har.com/edited-profile');
});

test('blank and unsafe profiles preserve the normalized native HAR link', () => {
	for (const profile of ['', 'javascript:alert(1)']) {
		const { frames } = setup('586048', profile);
		const m = markup();
		finish(frames[0], m.body);
		assert.equal(m.link.attrs.href, 'https://members.har.com/Realtor-Agent-Rating/ratings.cfm?member_number=586048');
	}
});

test('blank or malformed member numbers cannot inject srcdoc markup', () => {
	for (const member of ['', ' ', '1&showcomments=n', '1\"><script>alert(1)</script>']) {
		assert.equal(setup(member).frames.length, 0);
	}
});

test('disconnect removes the loader and ignores an obsolete queued load callback', () => {
	const { feed, frames } = setup();
	const staleLoad = frames[0].onload;
	feed.isConnected = false;
	feed.disconnectedCallback();
	assert.equal(frames[0].removed, true);
	assert.equal(frames[0].onload, null);
	feed.isConnected = true;
	feed.connectedCallback();
	const latest = markup();
	finish(frames[1], latest.body);
	frames[0].contentDocument = { body: markup().body };
	staleLoad();
	assert.equal(feed.children[0], latest.image);
});

test('a failed HAR script leaves no loader or script in the page', () => {
	const { feed, frames } = setup();
	const empty = { querySelectorAll: () => [], childNodes: [] };
	finish(frames[0], empty);
	assert.equal(feed.children.length, 0);
	assert.equal(frames[0].removed, true);
	assert.equal(frames[0].onload, null);
});
