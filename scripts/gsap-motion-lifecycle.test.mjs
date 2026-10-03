import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { createContext, runInContext } from 'node:vm';
import { componentScripts } from './astro-script-test-helper.mjs';

const require = createRequire(import.meta.url);
const gsapSource = readFileSync(require.resolve('gsap/dist/gsap.js'), 'utf8');
const scriptFor = (name) => {
	const source = readFileSync(new URL(`../src/components/blocks/${name}.astro`, import.meta.url), 'utf8');
	const script = componentScripts(source).find((candidate) => candidate.includes("import gsap from 'gsap'"));
	assert.ok(script, `${name} must initialize GSAP motion`);
	return stripTypeScriptTypes(script.replace(/^\s*import .+;$/gm, ''));
};

function events() {
	const listeners = new Map();
	return {
		addEventListener(type, callback) {
			if (!listeners.has(type)) listeners.set(type, new Set());
			listeners.get(type).add(callback);
		},
		removeEventListener: (type, callback) => listeners.get(type)?.delete(callback),
		emit: (type) => [...(listeners.get(type) ?? [])].forEach((callback) => callback()),
		listenerCount: (type) => listeners.get(type)?.size ?? 0,
	};
}

function setup(name, { reduced = false, desktop = true } = {}) {
	let now = 1000;
	const mediaQueries = [];
	const triggers = new Set();
	const document = { ...events(), createElement: () => ({ style: {} }), documentElement: {} };
	const window = {
		document, innerWidth: 1440,
		matchMedia(query) {
			const media = { ...events(), query, get matches() { return query.includes('reduced-motion') ? reduced : desktop; } };
			media.addListener = (callback) => media.addEventListener('change', callback);
			media.removeListener = (callback) => media.removeEventListener('change', callback);
			mediaQueries.push(media);
			return media;
		},
	};
	const context = createContext({
		window, document, console, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
		Date: class extends Date { static now() { return now; } },
	});
	runInContext(gsapSource, context);
	const gsap = window.gsap;
	// Real GSAP owns contexts, matchMedia, tweens, and property restoration. A
	// layout-free ScrollTrigger adapter supplies only its documented lifecycle:
	// killing a trigger detaches/kills its tween, reverting also restores it.
	const ScrollTrigger = {
		name: 'ScrollTrigger',
		create(vars, animation) {
			const trigger = {
				vars, animation,
				kill(revert, allowAnimation) {
					triggers.delete(trigger);
					animation.scrollTrigger = null;
					if (revert) animation.revert({ kill: false });
					if (!allowAnimation) animation.kill();
				},
			};
			animation.scrollTrigger = trigger;
			triggers.add(trigger);
			return trigger;
		},
	};
	Object.assign(context, { gsap, ScrollTrigger });
	let current;
	const replace = () => {
		const target = { dataset: {}, clipPath: 'none', x: 0, clearProps: '', scrollWidth: 2000 };
		const root = name === 'CommunityGrid'
			? { dataset: {}, querySelector: () => target }
			: target;
		current = { root, target };
		return current;
	};
	replace();
	document.querySelectorAll = () => current ? [current.root] : [];
	runInContext(scriptFor(name), context);
	return {
		gsap, triggers, document, replace,
		get current() { return current; },
		emit: (type) => document.emit(type),
		setReduced: (value) => { reduced = value; },
		setDesktop(value) {
			now += 20; // GSAP debounces media changes within two milliseconds.
			desktop = value;
			mediaQueries.filter((media) => !media.query.includes('reduced-motion')).forEach((media) => media.emit('change'));
		},
		mediaListenerCount: () => mediaQueries.reduce((total, media) => total + media.listenerCount('change'), 0),
		remove: () => { current = null; },
	};
}

for (const name of ['CommunityGrid', 'TestimonialShowcase']) {
	for (const replace of [false, true]) {
		test(`${name} releases prior animations on ${replace ? 'replaced' : 'unchanged'} DOM refresh`, () => {
			const h = setup(name);
			h.emit('astro:page-load');
			const previous = h.current;
			const priorTween = [...h.triggers][0].animation;
			assert.equal(h.triggers.size, 1);
			if (replace) h.replace();
			for (let i = 0; i < 4; i++) h.emit('astro:page-load');
			assert.equal(h.triggers.size, 1, 'only the current trigger survives');
			assert.ok(!priorTween.parent, 'the previous tween is removed from its timeline');
			assert.notEqual([...h.triggers][0].animation, priorTween);
			if (replace) assert.equal(h.gsap.getTweensOf(previous.target).length, 0);
			assert.equal(h.document.listenerCount('astro:page-load'), 1);
			assert.equal(h.document.listenerCount('astro:before-swap'), 1);
			assert.ok(h.mediaListenerCount() <= 1, 'refresh never stacks media listeners');
		});
	}
	test(`${name} navigation reverts animation state and can reinitialize the same DOM`, () => {
		const h = setup(name);
		h.emit('astro:page-load');
		const { root, target } = h.current;
		const tween = [...h.triggers][0].animation;
		tween.progress(0.5);
		h.emit('astro:before-swap');
		assert.equal(h.triggers.size, 0);
		assert.equal(h.gsap.getTweensOf(target).length, 0);
		assert.equal(target.x, 0);
		assert.equal(target.clipPath, 'none');
		assert.deepEqual(root.dataset, {});
		h.emit('astro:page-load');
		assert.equal(h.triggers.size, 1);
		h.remove();
		h.emit('astro:page-load');
		assert.equal(h.triggers.size, 0, 'removing the final block releases its animation');
	});
	test(`${name} reduced-motion refresh removes old animation and leaves content unbound`, () => {
		const h = setup(name, { reduced: true });
		h.emit('astro:page-load');
		assert.equal(h.triggers.size, 0);
		h.setReduced(false);
		h.emit('astro:page-load');
		assert.equal(h.triggers.size, 1);
		h.setReduced(true);
		h.emit('astro:page-load');
		assert.equal(h.triggers.size, 0);
		assert.deepEqual(h.current.root.dataset, {});
	});
}

test('CommunityGrid refresh does not accumulate desktop media-query listeners', () => {
	const h = setup('CommunityGrid');
	for (let i = 0; i < 5; i++) h.emit('astro:page-load');
	assert.equal(h.mediaListenerCount(), 1);
});

test('CommunityGrid navigation removes its media handler until the next page-load', () => {
	const h = setup('CommunityGrid');
	h.emit('astro:page-load');
	h.emit('astro:before-swap');
	assert.equal(h.mediaListenerCount(), 0);
	h.setDesktop(false);
	h.setDesktop(true);
	assert.equal(h.triggers.size, 0, 'a media change must not reactivate the outgoing page');
	h.emit('astro:page-load');
	assert.equal(h.triggers.size, 1);
	assert.equal(h.mediaListenerCount(), 1);
});

test('CommunityGrid desktop breakpoint preserves the CSS fallback and recreates one rail animation', () => {
	const h = setup('CommunityGrid', { desktop: false });
	h.emit('astro:page-load');
	assert.equal(h.triggers.size, 0);
	h.setDesktop(true);
	assert.equal(h.triggers.size, 1);
	const { vars } = [...h.triggers][0];
	assert.equal(vars.pin, true);
	assert.equal(vars.scrub, 1);
	assert.equal(vars.end(), '+=620');
	h.setDesktop(false);
	assert.equal(h.triggers.size, 0);
	assert.deepEqual(h.current.root.dataset, {});
	h.setDesktop(true);
	assert.equal(h.triggers.size, 1);
});
