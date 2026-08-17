import type { APIRoute } from 'astro';

// Legacy WordPress URL family: /buyers/* → /buy/. Mirrors the
// public/_redirects rule for non-Netlify hosts.
export const prerender = false;

export const ALL: APIRoute = ({ redirect }) => redirect('/buy/', 301);
