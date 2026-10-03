import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { componentScripts } from './astro-script-test-helper.mjs';

const scriptFor = (path, marker) => {
	const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
	const script = componentScripts(source).find((candidate) => candidate.includes(marker));
	assert.ok(script, `${path} must include ${marker}`);
	return script;
};
const appleScript = scriptFor('src/layouts/Base.astro', '__appleMotionBound');
const statsScript = scriptFor('src/components/blocks/Stats.astro', '__statsCountBound');
const proofScript = scriptFor('src/components/blocks/ProofStage.astro', '__proofCountBound');
const ladderScript = scriptFor('src/components/blocks/PriceLadder.astro', '__ladderBound');

function element({ dataset = {}, text = '', children = [] } = {}) {
	const listeners = new Map();
	const classes = new Set();
	return {
		dataset, textContent: text, children, style: {},
		classList: { add: (name) => classes.add(name), contains: (name) => classes.has(name) },
		querySelectorAll: () => children,
		getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 40 }),
		addEventListener(type, callback) {
			if (!listeners.has(type)) listeners.set(type, new Set());
			listeners.get(type).add(callback);
		},
		removeEventListener: (type, callback) => listeners.get(type)?.delete(callback),
		emit: (type, event = {}) => listeners.get(type)?.forEach((callback) => callback(event)),
		listenerCount: (type) => listeners.get(type)?.size ?? 0,
	};
}

function setup(script, { reduced = false, hasObserver = true } = {}) {
	const callbacks = new Map();
	const observers = [];
	const frames = new Map();
	const timers = new Map();
	let nextId = 0;
	let nodes = new Map();
	class Observer {
		constructor(callback) { this.callback = callback; this.targets = new Set(); this.active = true; observers.push(this); }
		observe(target) { this.targets.add(target); }
		unobserve(target) { this.targets.delete(target); }
		disconnect() { this.active = false; this.targets.clear(); }
		intersect(target) { this.callback([{ isIntersecting: true, target }], this); }
	}
	const window = {
		matchMedia: (query) => ({ matches: query.includes('reduced-motion') ? reduced : true }),
		...(hasObserver ? { IntersectionObserver: Observer } : {}),
	};
	const document = {
		addEventListener(type, callback) {
			if (!callbacks.has(type)) callbacks.set(type, new Set());
			callbacks.get(type).add(callback);
		},
		querySelectorAll: (selector) => nodes.get(selector) ?? [],
	};
	runInNewContext(script, {
		window, document, ...(hasObserver ? { IntersectionObserver: Observer } : {}),
		requestAnimationFrame: (callback) => { frames.set(++nextId, callback); return nextId; },
		cancelAnimationFrame: (id) => frames.delete(id),
		setTimeout: (callback) => { timers.set(++nextId, callback); return nextId; },
		clearTimeout: (id) => timers.delete(id),
	});
	return {
		observers, frames, timers,
		setReduced: (value) => { reduced = value; },
		setNodes: (entries) => { nodes = new Map(entries); },
		emit: (type) => callbacks.get(type)?.forEach((callback) => callback()),
		activeObservers: () => observers.filter((observer) => observer.active),
		frame(time) {
			const pending = [...frames.values()]; frames.clear();
			pending.forEach((callback) => callback(time));
		},
	};
}

function appleNodes(harness) {
	const heading = element();
	const button = element();
	harness.setNodes([['.h2-mask', [heading]], ['.btn-magnetic', [button]]]);
	return { heading, button };
}

for (const replace of [false, true]) {
	test(`shared Apple motion cleans up on ${replace ? 'replaced' : 'unchanged'} DOM refresh`, () => {
		const h = setup(appleScript);
		const original = appleNodes(h);
		h.emit('astro:page-load');
		const prior = h.observers[0];
		original.button.emit('pointermove', { clientX: 80, clientY: 30 });
		assert.equal(h.frames.size, 1);
		const current = replace ? appleNodes(h) : original;
		for (let i = 0; i < 3; i++) h.emit('astro:page-load');
		assert.equal(h.activeObservers().length, 1, 'only the current reveal observer survives');
		assert.equal(prior.targets.size, 0, 'old observer releases its DOM');
		assert.equal(h.frames.size, 0, 'refresh cancels the prior magnetic loop');
		assert.equal(original.button.listenerCount('pointermove'), replace ? 0 : 1);
		assert.equal(current.button.listenerCount('pointermove'), 1, 'current button has one handler');
		current.button.emit('pointermove', { clientX: 80, clientY: 30 });
		assert.equal(h.frames.size, 1, 'current magnetic motion still works');
		h.emit('astro:before-swap');
		assert.equal(h.activeObservers().length, 0);
		assert.equal(h.frames.size, 0);
		assert.equal(current.button.listenerCount('pointermove'), 0);
		current.button.emit('pointermove', { clientX: 80, clientY: 30 });
		assert.equal(h.frames.size, 0, 'detached handlers cannot restart motion');
	});
}

test('shared Apple motion ignores callbacks from a disconnected observer', () => {
	const h = setup(appleScript);
	const { heading } = appleNodes(h);
	h.emit('astro:page-load');
	const prior = h.observers[0];
	h.emit('astro:page-load');
	prior.intersect(heading);
	assert.equal(heading.classList.contains('in'), false);
	assert.equal(h.activeObservers()[0].targets.has(heading), true);
	h.activeObservers()[0].intersect(heading);
	assert.equal(heading.classList.contains('in'), true);
});

test('shared Apple motion honors a changed reduced-motion preference on refresh', () => {
	const h = setup(appleScript);
	const { button, heading } = appleNodes(h);
	h.emit('astro:page-load');
	button.emit('pointermove', { clientX: 80, clientY: 30 });
	h.setReduced(true);
	h.emit('astro:page-load');
	assert.equal(h.activeObservers().length, 0);
	assert.equal(h.frames.size, 0);
	assert.equal(button.listenerCount('pointermove'), 0);
	assert.equal(heading.classList.contains('in'), true);
});

const counts = [
	{ name: 'Stats', script: statsScript, sectionSelector: '[data-stats-section]', countSelector: '.stat-count', dataset: { target: '1200', prefix: '$', suffix: 'M', format: 'comma' }, final: '$1,200M' },
	{ name: 'ProofStage', script: proofScript, sectionSelector: '[data-proof-section]', countSelector: '.proof-count', dataset: { target: '1200' }, final: '1,200' },
];
function countNodes(h, spec) {
	const count = element({ dataset: { ...spec.dataset }, text: spec.final });
	const section = element({ children: [count] });
	h.setNodes([[spec.sectionSelector, [section]], [spec.countSelector, [count]]]);
	return { count, section };
}

for (const spec of counts) {
	for (const replace of [false, true]) {
		test(`${spec.name} reobserves pending ${replace ? 'replacement' : 'unchanged'} sections without retaining old DOM`, () => {
			const h = setup(spec.script);
			const original = countNodes(h, spec);
			h.emit('astro:page-load');
			const prior = h.observers[0];
			const current = replace ? countNodes(h, spec) : original;
			for (let i = 0; i < 3; i++) h.emit('astro:page-load');
			assert.equal(h.activeObservers().length, 1);
			assert.equal(prior.targets.size, 0, 'the prior observer releases all nodes');
			assert.deepEqual([...h.activeObservers()[0].targets], [current.section]);
			prior.intersect(original.section);
			assert.equal(h.frames.size, 0, 'a queued stale observer callback cannot start a count');
			h.activeObservers()[0].intersect(current.section);
			assert.equal(h.frames.size, 1, 'the current section can still animate');
		});
	}

	test(`${spec.name} cancels and settles active counts on refresh without replaying the same DOM`, () => {
		const h = setup(spec.script);
		const { count, section } = countNodes(h, spec);
		h.emit('astro:page-load');
		h.activeObservers()[0].intersect(section);
		h.frame(100); h.frame(300);
		assert.notEqual(count.textContent, spec.final);
		assert.equal(h.frames.size, 1);
		h.emit('astro:page-load');
		assert.equal(h.frames.size, 0, 'refresh cancels the previous animation frame');
		assert.equal(count.textContent, spec.final, 'interrupted counts settle at the final value');
		h.activeObservers().forEach((observer) => observer.intersect(section));
		assert.equal(h.frames.size, 0, 'completed same-DOM counts do not replay');
	});

	test(`${spec.name} navigation releases every pending frame and observer`, () => {
		const h = setup(spec.script);
		const original = countNodes(h, spec);
		h.emit('astro:page-load');
		h.activeObservers()[0].intersect(original.section);
		countNodes(h, spec);
		h.emit('astro:page-load');
		h.emit('astro:before-swap');
		assert.equal(h.activeObservers().length, 0);
		assert.equal(h.frames.size, 0);
		assert.equal(h.timers.size, 0);
		assert.equal(original.count.textContent, spec.final);
	});

	for (const options of [{ reduced: true }, { hasObserver: false }]) {
		test(`${spec.name} renders final counts without motion for ${JSON.stringify(options)}`, () => {
			const h = setup(spec.script, options);
			const { count } = countNodes(h, spec);
			h.emit('astro:page-load');
			assert.equal(count.textContent, spec.final);
			assert.equal(h.frames.size, 0);
			assert.equal(h.activeObservers().length, 0);
		});
	}

	test(`${spec.name} a reduced-motion refresh cancels running counts`, () => {
		const h = setup(spec.script);
		const { count, section } = countNodes(h, spec);
		h.emit('astro:page-load');
		h.activeObservers()[0].intersect(section);
		h.setReduced(true);
		h.emit('astro:page-load');
		assert.equal(h.frames.size, 0);
		assert.equal(h.activeObservers().length, 0);
		assert.equal(count.textContent, spec.final);
	});
}

for (const replace of [false, true]) {
	test(`PriceLadder refresh releases old nodes and observes ${replace ? 'replacement' : 'unchanged'} ladders`, () => {
		const h = setup(ladderScript);
		const original = element();
		h.setNodes([['[data-ladder]', [original]]]);
		h.emit('astro:page-load');
		const prior = h.observers[0];
		const current = replace ? element() : original;
		h.setNodes([['[data-ladder]', [current]]]);
		for (let i = 0; i < 3; i++) h.emit('astro:page-load');
		assert.equal(h.activeObservers().length, 1);
		assert.equal(prior.targets.size, 0);
		assert.deepEqual([...h.activeObservers()[0].targets], [current]);
		prior.intersect(original);
		assert.equal(original.classList.contains('in'), false, 'stale callbacks do not reveal old nodes');
		h.activeObservers()[0].intersect(current);
		assert.equal(current.classList.contains('in'), true);
		h.emit('astro:before-swap');
		assert.equal(h.activeObservers().length, 0);
	});
}

test('PriceLadder refresh respects changed reduced-motion and releases pending observers', () => {
	const h = setup(ladderScript);
	const ladder = element();
	h.setNodes([['[data-ladder]', [ladder]]]);
	h.emit('astro:page-load');
	h.setReduced(true);
	h.emit('astro:page-load');
	assert.equal(h.activeObservers().length, 0);
	assert.equal(ladder.classList.contains('in'), true);
});
