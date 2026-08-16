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

### Bunny CDN

Traffic is served through Bunny CDN: a **pull zone** in front of the Coolify
origin (HTML/JS/CSS) plus a **storage zone** that serves `/uploads/*` media
(images and videos). The media files stay in this repo as the source of
truth — the pull zone routes `/uploads/*` requests to the storage zone via an
edge rule, so content URLs never change.

Setup (Bunny dashboard):

1. **Storage zone** → *Add Storage Zone* (e.g. `lippincott-media`). Note the
   linked pull-zone hostname (e.g. `lippincott-media.b-cdn.net`), then upload
   the contents of `public/uploads/` (drag-and-drop the folder). Re-upload
   when media changes.
2. **Pull zone** → *Add Pull Zone*:
   - **Origin URL**: your Coolify domain — the production domain in prod;
     for dev, `http://www.lrmrpayrrcyadik6utzhit1l.169.58.185.96.sslip.io/`
     until the real domain is live.
   - **Origin Host Header**: set to the same domain — Coolify's Traefik
     routes by `Host` header, so this must match the app's configured domain.
3. **Edge Rules** on the pull zone, in order:
   1. `*/api/*` and `*/tina-island/*` → **Bypass cache** (contact endpoint
      and the visual-editing route are never cached).
   2. `*/uploads/*` → action **Origin URL** = `https://<storage-zone>.b-cdn.net`,
      with extra action cache time **30 days**.
   3. `*/_astro/*` → cache time **1 year** (content-hashed build assets).
   4. Request URL `*/` → cache time **10 minutes** (HTML pages — the site
      uses trailing slashes everywhere).
4. **Hostnames**: dev can use the pull zone's `*.b-cdn.net` system hostname.
   For production add the real domain(s) (e.g. `lippincottteam.com` and
   `www.lippincottteam.com`), enable **Force SSL** (automatic Let's Encrypt
   certificates), and create the DNS records Bunny shows. `SITE_URL` should
   already be the same domain.

Cache purging on deploy:

- **Coolify: automatic** — the image entrypoint purges the pull zone whenever
  a new container starts (every deployment). Set `BUNNY_API_KEY` (runtime
  only) and `BUNNY_PULL_ZONE_ID` on the app.
- **Manual**: `BUNNY_API_KEY=… BUNNY_PULL_ZONE_ID=<id> node
  scripts/deploy/purge-bunny-cache.mjs` — the key is created under
  *Account → API*; the zone ID is the number in the pull zone's URL.
- Without the env vars the script is a no-op, so local builds are unaffected.

Note: the pull zone forwards the visitor's `Host` header to the origin
(*Add Host Header* on, no *Origin Host Header* override), so **every hostname
served by the pull zone must be added to the Coolify app's Domains** (staging:
`coolify-lippincott-staging.b-cdn.net`; production: the real domain) —
otherwise Coolify's Traefik answers `404 page not found`. Keep *Block Root
Path Access*, *Block None Referrer*, and *Block POST Requests* **off** on the
zone (they 403 first-time visitors and form submissions, and the zone's
cache-error setting then amplifies that by caching the 403s).

## License

The code in this repository is licensed under the
[PolyForm Shield 1.0.0 license](LICENSE.md). Website content and other
non-software resources — including the copy, images, and media in
`src/content/` and `public/` — are not covered by that license and remain
subject to the site's terms of use.

Direct copies of this website and use of its trademark, logo, IP, or any other business assets is strictly prohibited.