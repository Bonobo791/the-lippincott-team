/** Extract executable script bodies from trusted, tracked Astro fixtures; never use for sanitization. */
export const componentScripts = (source) =>
	[...source.matchAll(/<script(?=[\s/>])(?![^>]*\/\s*>)[^>]*>([\s\S]*?)<\/script(?=[\s/>])[^>]*>/gi)]
		.map((match) => match[1]);
