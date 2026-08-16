# The Lippincott Team

TheLippincottTeam.com

The Lippincott Team is a Houston-area real estate team founded by Amy
Lippincott. The team helps buyers and sellers navigate northwest Houston with
in-depth community and market knowledge, thoughtful marketing, effective
negotiation, and a trusted professional network.

This site introduces the team and provides practical information about local
communities, schools, and the surrounding real estate market. Andrew Philip
Weilbacher designed and developed the website and supports the team through
its ongoing digital marketing.

## Infrastructure

The site is built with Astro and TinaCMS, managed through a visual content
editor, and deployed on Netlify. Most pages are delivered as fast static HTML.

## Deployment

The site builds with TinaCMS (`pnpm build`, requires `PUBLIC_TINA_CLIENT_ID` +
`TINA_TOKEN`) and serves static HTML plus one on-demand visual-editing
endpoint (`/tina-island/...`). The adapter is auto-detected per platform; any
other host falls back to a portable Node server (`@astrojs/node` standalone,
`node ./dist/server/entry.mjs`).

### Netlify

`netlify.toml` pins the build command and the production `SITE_URL`. No other
setup is needed.

### Coolify (or any Docker host)

The multi-stage `Dockerfile` builds the site and runs the standalone Node
server.

1. Create an application with build pack **Dockerfile** (Dockerfile location
   `/Dockerfile`, the default) pointing at this repo, branch `main`.
2. Set **Ports Exposes** to `4321` (the container also honors Coolify's
   injected `PORT`, but keep it consistent with `EXPOSE 4321`).
3. Add environment variables:
   - `PUBLIC_TINA_CLIENT_ID`, `TINA_TOKEN` — TinaCloud credentials; the build
     fails fast with `ERR_MISSING_CLOUD_CREDS` without them.
   - `SITE_URL` — canonical origin, e.g. `https://lippincottteam.com`
     (drives sitemap/RSS/OpenGraph canonicals).
   - `SIERRA_API_KEY` — Sierra lead-forwarding key for the contact form;
     set it **runtime-only** (uncheck "Build Variable").
   - `PUBLIC_GA_ID` (optional) — GA4 measurement ID override. Production
     builds on Coolify include analytics (`CONTEXT` is unset there).
   - `BUILD_SCRIPT` (optional) — defaults to `build`; set `build:preview` for
     staging apps when the branch's Tina schema isn't indexed by TinaCloud
     yet (skips the cloud schema check, mirrors `netlify.toml` contexts).
4. Add your domain under **Domains** — Coolify provisions and renews
   Let's Encrypt TLS automatically.
5. Health checks: the Dockerfile `HEALTHCHECK` is picked up automatically and
   takes precedence over the UI check; it gates routing and rolling updates.
6. The container needs egress to `content.tina.io` / `app.tina.io` (TinaCloud)
   for content and visual editing. No persistent storage is required.

The contact form posts to `/api/contact`, which forwards leads to Sierra
directly on every platform (Netlify, Coolify, Docker) — there is no Netlify
Forms dependency anymore.

## License

The code in this repository is licensed under the
[PolyForm Shield 1.0.0 license](LICENSE.md). Website content and other
non-software resources — including the copy, images, and media in
`src/content/` and `public/` — are not covered by that license and remain
subject to the site's terms of use.

Direct copies of this website and use of its trademark, logo, IP, or any other business assets is strictly prohibited.