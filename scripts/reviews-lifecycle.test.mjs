// Run with: node --test scripts/reviews-lifecycle.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { componentScripts } from './astro-script-test-helper.mjs';

const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const scriptContaining = (path, marker) => {
	const script = componentScripts(source(path)).find((script) => script.includes(marker));
	assert.ok(script, `${path} must contain ${marker}`);
	return stripTypeScriptTypes(script);
};
const carouselScript = scriptContaining('pages/reviews.astro', '__reviewsCarouselBound');
const islandScript = scriptContaining('layouts/Base.astro', '__tinaIslandReinitBound');

class Element extends EventTarget {
	constructor() {
		super();
		this.style = {};
		this.attrs = new Map();
		this.children = [];
		this.classList = { toggle() {} };
	}
	setAttribute(name, value) { this.attrs.set(name, value); }
	removeAttribute(name) { this.attrs.delete(name); }
	replaceChildren() { this.children = []; }
	appendChild(node) { this.children.push(node); }
	querySelector(selector) { return this.queries?.[selector] ?? null; }
	querySelectorAll(selector) { return this.queries?.[selector] ?? []; }
}
function carousel() {
	const root = new Element();
	root.queries = Object.fromEntries(['track', 'dots', 'prev', 'next'].map((name) => [`[data-car-${name}]`, new Element()]));
	root.queries['[data-car-slide]'] = Array.from({ length: 3 }, () => new Element());
	return root;
}
function setupCarousel(reduced = false) {
	const document = new Element();
	let root = carousel();
	document.querySelector = () => root;
	document.createElement = () => new Element();
	const timers = new Map();
	let id = 0;
	const media = new EventTarget();
	media.matches = reduced;
	const window = {
		matchMedia: () => media,
		setInterval: (fn) => { timers.set(++id, fn); return id; },
		clearInterval: (id) => timers.delete(id),
	};
	runInNewContext(carouselScript, { window, document, AbortController });
	return {
		timers,
		get root() { return root; },
		emit: (name) => document.dispatchEvent(new Event(name)),
		replace: () => { root = carousel(); },
		motion: (matches) => { media.matches = matches; media.dispatchEvent(Object.assign(new Event('change'), { matches })); },
	};
}
const click = (root, control = 'next') => root.querySelector(`[data-car-${control}]`).dispatchEvent(new Event('click'));

test('initial reviews carousel starts one timer and advances once per control', () => {
	const h = setupCarousel();
	h.emit('astro:page-load');
	assert.equal(h.timers.size, 1);
	click(h.root);
	assert.equal(h.root.querySelector('[data-car-track]').style.transform, 'translateX(-100%)');
	assert.equal(h.timers.size, 1);
});

test('repeated page-load on the same carousel removes every previous handler', () => {
	const h = setupCarousel();
	h.emit('astro:page-load');
	h.emit('astro:page-load');
	click(h.root);
	assert.equal(h.timers.size, 1, 'one next click must not start multiple intervals');
	h.emit('astro:before-swap');
	assert.equal(h.timers.size, 0);
	for (const event of ['mouseleave', 'focusout', 'keydown']) {
		h.root.dispatchEvent(Object.assign(new Event(event), { key: 'ArrowRight' }));
	}
	click(h.root);
	assert.equal(h.timers.size, 0, 'detached controls must not restart autoplay');
});

test('rapid carousel replacements release previous controls and timers', () => {
	const h = setupCarousel();
	for (let i = 0; i < 4; i++) {
		h.emit('astro:page-load');
		const oldRoot = h.root;
		h.replace();
		h.emit('astro:page-load');
		click(oldRoot);
		oldRoot.dispatchEvent(new Event('mouseleave'));
		assert.equal(h.timers.size, 1);
	}
	h.emit('astro:before-swap');
	assert.equal(h.timers.size, 0);
});

test('reduced motion disables autoplay initially and after preference changes', () => {
	const h = setupCarousel(true);
	h.emit('astro:page-load');
	click(h.root);
	assert.equal(h.timers.size, 0);
	assert.equal(h.root.querySelector('[data-car-track]').style.transform, 'translateX(-100%)');
	h.motion(false);
	assert.equal(h.timers.size, 1);
	h.motion(true);
	assert.equal(h.timers.size, 0);
	h.emit('astro:before-swap');
	h.motion(false);
	assert.equal(h.timers.size, 0, 'removed media listeners must not restart autoplay');
});

function setupIsland() {
	const document = new Element();
	const island = new Element();
	island.queries = { '#har-feed': new Element() };
	document.querySelectorAll = () => [island];
	const timers = new Map();
	let id = 0, reloads = 0, pageLoads = 0, observer;
	class MutationObserver {
		constructor(callback) { this.callback = callback; observer = this; }
		observe() { this.active = true; }
		disconnect() { this.active = false; }
	}
	document.addEventListener('astro:page-load', () => pageLoads++);
	runInNewContext(islandScript, {
		window: {}, document, Event, Element, MutationObserver,
		location: { reload: () => reloads++ },
		setTimeout: (fn) => { timers.set(++id, fn); return id; },
		clearTimeout: (id) => timers.delete(id),
	});
	return {
		timers,
		get reloads() { return reloads; },
		get pageLoads() { return pageLoads; },
		get observing() { return observer.active; },
		emit: (name) => document.dispatchEvent(new Event(name)),
		swap: () => observer.callback([{ target: island, addedNodes: [{}], removedNodes: [{}] }]),
		flush: () => { for (const [id, fn] of timers) { timers.delete(id); fn(); } },
	};
}

test('Tina initial refresh and rapid reviews edits reinitialize without parent reload', () => {
	const h = setupIsland();
	h.emit('astro:page-load');
	h.swap();
	h.swap();
	assert.equal(h.reloads, 0, 'unsaved Tina state must never be replaced with saved content');
	assert.equal(h.timers.size, 1);
	h.flush();
	assert.equal(h.pageLoads, 2);
	assert.equal(h.observing, true);
});

test('navigation cancels a pending Tina reinitialization', () => {
	const h = setupIsland();
	h.emit('astro:page-load');
	h.swap();
	h.emit('astro:before-swap');
	assert.equal(h.timers.size, 0);
	assert.equal(h.observing, false);
	h.flush();
	assert.equal(h.pageLoads, 1);
});
