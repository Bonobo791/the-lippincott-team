import type { APIRoute } from 'astro';

// Legacy WordPress URL family: /sellers/* → /sell/. Mirrors the
// public/_redirects rule for non-Netlify hosts.
export const prerender = false;

export const ALL: APIRoute = ({ redirect }) => redirect('/sell/', 301);
