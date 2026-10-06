import type { APIRoute } from 'astro';

// Exact historical contact URL. Keep queries on every adapter; mirrored in public/_redirects.
export const prerender = false;

export const ALL: APIRoute = ({ url, redirect }) =>
	redirect(`/contact-us/${url.search}`, 301);
