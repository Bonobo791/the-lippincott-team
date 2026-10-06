import type { APIRoute } from 'astro';

// Exact historical bio URL. Keep queries on every adapter; mirrored in public/_redirects.
export const prerender = false;

export const ALL: APIRoute = ({ url, redirect }) =>
	redirect(`/about/amy-lippincott-2/${url.search}`, 301);
