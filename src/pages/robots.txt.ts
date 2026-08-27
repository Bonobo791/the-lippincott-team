import type { APIContext } from 'astro';

export const prerender = true;

// Generated (not a static public/ file) so the Sitemap line advertises the
// sitemap of the origin actually serving the page — Astro.site comes from
// SITE_URL or the platform-injected URL — instead of always pointing
// crawlers at the production domain (e.g. on deploy previews/staging).
export function GET({ site }: APIContext) {
	const origin = (site ?? new URL('https://thelippincottteam.com')).origin;
	const body = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /tina-island/

Sitemap: ${origin}/sitemap-index.xml
`;
	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
