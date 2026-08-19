[![Codacy Badge](https://app.codacy.com/project/badge/Grade/94a34416036d490b9011e3b2866f86a1)](https://app.codacy.com/gh/Bonobo791/the-lippincott-team/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

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

## A note on the Astro pin

`astro` is pinned to the exact version `7.2.0` (no `^`). Astro 7.2.3 removed
the `App#pipeline` property that `@astrojs/node` 11's standalone entry
(`node ./dist/server/entry.mjs`, the Coolify/Docker runtime) still requires —
running 7.2.3 makes the container crash on startup with
`Cannot read properties of undefined (reading 'getLogger')`. Keep the pin
exact when bumping Astro, and re-test with `node ./dist/server/entry.mjs`
(not just `astro build`) before upgrading past 7.2.2.

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
     fails fast with `ERR_MISSING_CLOUD_CREDS` without them. `TINA_TOKEN` is
     consumed during the image build only: it is passed as a build arg and
     is never baked into the image (keep its Build Variable flag on so the
     build receives it).
   - `SITE_URL` — canonical origin, e.g. `https://thelippincottteam.com`
     (drives sitemap/RSS/OpenGraph canonicals). Must be set at **runtime**
     too — the Dockerfile bakes in no runtime default, so without it
     `/api/contact` rejects browser form posts whose `Origin` isn't in its
     allowlist (see below) and `/api/bunny-purge` answers 503; both fail
     closed rather than assume the production origin. Set it **runtime-only**
     (uncheck "Build Variable"): as a build arg it only feeds the build
     stage and never reaches the running container.
   - `CONTACT_ALLOWED_ORIGINS` (optional) — comma-separated extra origins
     allowed to submit the contact form when the app is also served from a
     host no platform var expresses, e.g. a staging Bunny edge hostname
     (`https://<zone>.b-cdn.net`).
   - `COOLIFY_BRANCH` — Coolify sets this automatically (Build Variable); the
     Dockerfile promotes it into the build so the Tina admin/client targets
     the right branch. Staging apps must keep its Build Variable flag on.
   - `SIERRA_API_KEY` — Sierra lead-forwarding key for the contact form;
     set it **runtime-only** (uncheck "Build Variable").
   - `PUBLIC_GA_ID` (optional) — GA4 measurement ID override. Production
     builds on Coolify include analytics (`CONTEXT` is unset there).
   - `BUILD_SCRIPT` (optional) — defaults to `build`; set `build:preview` for
     staging apps when the branch's Tina schema isn't indexed by TinaCloud
     yet (skips the cloud schema check, mirrors `netlify.toml` contexts).
     Only `build`, `build:preview`, and `build:local` are accepted.
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
   For production add the real domain(s) (e.g. `thelippincottteam.com` and
   `www.thelippincottteam.com`), enable **Force SSL** (automatic Let's Encrypt
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

Purging a single page (CMS edits between deploys):

- **Webhook endpoint**: the protected `/api/bunny-purge` route purges one or
  more URLs immediately. Set `BUNNY_PURGE_SECRET` on the host (any strong
  random string, e.g. `openssl rand -hex 32`; on Coolify keep its Build
  Variable off — it must never be public or committed), then call:

  ```sh
  curl -X POST "https://thelippincottteam.com/api/bunny-purge" \
    -H "Authorization: Bearer $BUNNY_PURGE_SECRET" \
    -d "url=/pricing/" -d "url=/about/team/"
  ```

  The secret also works as an `x-bunny-purge-token` header or a `?token=`
  query parameter (prefer a header — query strings can show up in CDN access
  logs). GET reads `url`/`path`/`urls` from the query string; POST accepts
  the same fields in a form-encoded or JSON body. Only paths and absolute URLs
  that match the `SITE_URL` origin exactly (protocol, hostname, and port) are
  accepted, up to 10 per request. The endpoint answers
  204 on success, 401 on a bad secret, 429 when Bunny's purge rate limit is
  hit, and 502 on upstream failures.
- **Callers**: anything server-side that knows the secret — a TinaCloud
  custom webhook (configure one in app.tina.io if the project offers it),
  a GitHub Action on content pushes, or manual curl. Note that Coolify
  redeploys already full-purge via the entrypoint, so this is only for
  edits that must go live faster than the 10-minute HTML cache TTL.
- **Manual page purge**: `BUNNY_API_KEY=… SITE_URL=…
  node scripts/deploy/purge-bunny-cache.mjs /pricing/` — pass site paths or
  URLs as arguments; with no arguments it does the full-zone purge.
- **Bunny rate limits URL purges per account**: a URL ending in `/` counts
  as a *prefix* (wildcard) purge — 20-token burst, ~30/min — while exact
  URLs (no trailing slash) get 120-token burst, ~300/min. The site uses
  trailing slashes everywhere, so keep page-level purges modest and let the
  deploy-time full purge carry bulk changes.

Note: the pull zone sends the app's own domain to the origin (*Origin Host
Header* = the Coolify app domain, *Add Host Header* off) so Traefik routes
without registering CDN hostnames in Coolify. Because Bunny does not forward
the visitor host, Astro's same-origin guard for POSTs is disabled
(`security.checkOrigin: false` in `astro.config.mjs`) — the `/api/contact`
and `/tina-island` endpoints are stateless (no cookies/sessions), and the
contact form keeps its honeypot, size cap, and per-IP rate limit as abuse
controls — and an endpoint-level `Origin` allowlist (`SITE_URL` + platform
URL envs, the hardcoded brand origins `https://thelippincottteam.com` /
`https://www.thelippincottteam.com` and the localhost ports, plus the
optional comma-separated `CONTACT_ALLOWED_ORIGINS` for extra hosts like this
staging edge hostname). Keep *Block Root Path Access*,
*Block None Referrer*, and
*Block POST Requests* **off** on the zone (they 403 first-time visitors and
form submissions, and the zone's cache-error setting then amplifies that by
caching the 403s).

## License

The code in this repository is licensed under the
[PolyForm Shield 1.0.0 license](LICENSE.md). Website content and other
non-software resources — including the copy, images, and media in
`src/content/` and `public/` — are not covered by that license and remain
subject to the site's terms of use.

Direct copies of this website and use of its trademark, logo, IP, or any other business assets is strictly prohibited.
