import type { APIRoute } from 'astro';

// Legacy WordPress URL family: /opt-out-preferences/* → /privacy-policy/.
// On-demand so the 301 is served by every adapter (Netlify functions, the
// standalone Node server on Coolify/Docker, Vercel, Cloudflare). Netlify's
// CDN handles the same paths first via public/_redirects.
export const prerender = false;

export const ALL: APIRoute = ({ redirect }) => redirect('/privacy-policy/', 301);
