import { createComponent, render } from 'astro/runtime/server/index.js';
import { getConfig } from '../../src/lib/data.ts';

let beforeNestedLoad = async () => {};
export function pauseBeforeNestedLoad(callback) {
	beforeNestedLoad = callback;
}

// Stand in for the registry's Astro templates, using the real Astro container.
// Team-like islands fetch config during rendering rather than in the registry;
// a second read models another nested component using that same request.
export default createComponent(async (_result, props) => {
	const first = props.config ?? (await getConfig()).data.config;
	await beforeNestedLoad(props.data?._sys.filename);
	const nested = (await getConfig()).data.config;
	return render`<span>first=${first.agentPages.eyebrow}; nested=${nested.agentPages.eyebrow}; blog=${nested.blogPost.tocLabel}; market=${nested.marketTable.heading}</span>`;
}, 'ConfigCacheTest.astro');
