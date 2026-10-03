import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const home = read('src/pages/index.astro');
const motionSource = home.includes('<V2Motion') ? read('src/components/v2/V2Motion.astro') : home;
const script = [...motionSource.matchAll(/<script is:inline data-astro-rerun>([\s\S]*?)<\/script>/g)]
	.map((match) => match[1]).find((source) => source.includes('MotionBound'));
assert.ok(script, 'the homepage must initialize scroll motion');
const awardMarkup = read('src/components/standalone/HomeBody.astro').match(/<span[^>]*id="awardCount"[^>]*>/)?.[0];
assert.ok(awardMarkup);

function setup({ reduced = false, hasObserver = true } = {}) {
	const callbacks = new Map();
	const observers = [];
	const frames = new Map();
	const timers = new Map();
	let id = 0;
	const award = {
		dataset: { count: '9', suffix: awardMarkup.match(/data-suffix="([^"]*)"/)?.[1] ?? '' },
		firstChild: { textContent: '9' },
		get textContent() { return this.firstChild.textContent; },
		set textContent(value) { this.firstChild.textContent = String(value); },
	};
	const section = {
		classList: { add() {} }, contains: (node) => node === award,
		querySelectorAll: () => awardMarkup.includes('numeral num') ? [award] : [],
		getBoundingClientRect: () => ({ top: 0 }),
	};
	const document = {
		addEventListener: (event, callback) => callbacks.set(event, callback),
		getElementById: () => award,
		querySelectorAll: (selector) => selector.includes('.num[') ? [award] : [section],
	};
	class Observer {
		constructor(callback) { this.callback = callback; this.active = true; observers.push(this); }
		observe() {}
		unobserve() {}
		disconnect() { this.active = false; }
	}
	const window = { matchMedia: () => ({ matches: reduced }), ...(hasObserver ? { IntersectionObserver: Observer } : {}) };
	runInNewContext(script, {
		document, window, performance: { now: () => 0 }, innerHeight: 1000,
		...(hasObserver ? { IntersectionObserver: Observer } : {}),
		requestAnimationFrame: (fn) => { frames.set(++id, fn); return id; },
		cancelAnimationFrame: (key) => frames.delete(key),
		setTimeout: (fn) => { timers.set(++id, fn); return id; }, clearTimeout: (key) => timers.delete(key),
	});
	return {
		award, frames, timers, observers,
		emit: (event) => callbacks.get(event)?.(),
		reveal: () => observers.filter((observer) => observer.active).forEach((observer) =>
			observer.callback([{ isIntersecting: true, target: section }])),
	};
}

test('the award counter leaves the suffix to the CMS-rendered sibling', () => {
	const harness = setup({ reduced: true });
	harness.emit('astro:page-load');
	harness.reveal();
	assert.equal(harness.award.textContent + '×', '9×');
});

test('repeated page-load replaces the prior observer and fail-safe timer', () => {
	const harness = setup();
	harness.emit('astro:page-load');
	harness.emit('astro:page-load');
	assert.equal(harness.observers.filter((observer) => observer.active).length, 1);
	assert.equal(harness.timers.size, 1);
});

test('navigation tears down observers, timers, and pending count-up frames', () => {
	const harness = setup();
	harness.emit('astro:page-load');
	harness.reveal();
	assert.ok(harness.frames.size > 0);
	harness.emit('astro:before-swap');
	assert.equal(harness.observers.filter((observer) => observer.active).length, 0);
	assert.equal(harness.timers.size, 0);
	assert.equal(harness.frames.size, 0);
});

test('without IntersectionObserver the counter renders its final value', () => {
	const harness = setup({ hasObserver: false });
	harness.emit('astro:page-load');
	assert.equal(harness.award.textContent, '9');
	assert.equal(harness.frames.size, 0);
});
