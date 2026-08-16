import type { APIRoute } from 'astro';

// Legacy WordPress URL family: /author/* → /about/ (all posts are by the
// team). Mirrors the public/_redirects rule for non-Netlify hosts.
export const prerender = false;

export const ALL: APIRoute = ({ redirect }) => redirect('/about/', 301);
