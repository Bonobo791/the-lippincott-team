# WordPress → Astro + TinaCMS Migration — Design

**Date:** 2026-07-24
**Source site:** https://lippincottteam.com (WordPress 7.0.2, `hello-elementor` theme, Elementor Pro page builder, NitroPack CDN)
**Target:** This repo (`lippincott-team-astro-tina` — Astro 7 + TinaCMS + Tailwind v4 starter), deployed to Netlify.

## Goal

Migrate lippincottteam.com from WordPress/Elementor to Astro + TinaCMS, keeping the
same **look and feel** (brand, fonts, colors, general layout — explicitly *not*
pixel-perfect) so the Lippincott Team can edit all content visually via **TinaCloud**
after launch.

## Source site recon (verified 2026-07-24)

- WP REST API is fully exposed and unauthenticated:
  - `https://lippincottteam.com/wp-json/wp/v2/pages?per_page=100` → 35 pages
  - `https://lippincottteam.com/wp-json/wp/v2/posts?per_page=100` → 23 posts
  - `https://lippincottteam.com/wp-json/wp/v2/media` → 188 media items
  - `content.rendered` contains rendered Elementor HTML (needs wrapper cleanup).
- Content structure:
  - 12 team bio pages, children of `/about/`
  - ~15 community/school pages (Cypress, Tomball, Katy, Waller, Hockley, Magnolia;
    nested Bridgeland, Towne Lake, Elyson; Cy-Fair/Katy/Waller/Tomball ISDs)
  - 23 blog posts at `/blog/<slug>/`
  - One-off pages: home, `/about/`, `/contact-us/`, hub pages, privacy/terms
- Design tokens (from Elementor global CSS):
  - Brand red `#c22737`, headings `#101828`, grays `#475467` / `#667085`,
    light bg `#f9fafb`
  - Fonts: Montserrat 600 (headings), Libre Baskerville 700 (display serif),
    Arimo (body/UI, uppercase labels with 2.8px letter-spacing)
- IDX/property search lives on a **separate platform** — Sierra Interactive at
  `www.thelippincottteam.com` (property search, listings, mortgage calc, valuation).
  Out of scope: we only link out to it.
- Contact form is Elementor Pro Forms (admin-ajax) — needs replacement.
- Testimonial videos are self-hosted mp4s — **excluded from migration**; they will be
  uploaded to YouTube by the owner and embedded.

## Architecture decisions

### Approach: content-type collections (approved)

Four Tina collections in `tina/collections/`:

1. **`page`** (existing, block-based) — one-off pages: home, `/about/`,
   `/contact-us/`, communities hub, schools hub, privacy/terms.
2. **`blog`** (existing) — the 23 posts at their existing `/blog/<slug>/` URLs.
3. **`team`** (new) — 12 agent bios. Fields: name, slug, photo, role, phone, email,
   bio (rich text). Rendered at `/about/<slug>/` (preserves current URLs). The About
   page roster grid auto-populates from this collection.
4. **`community`** (new) — community/school pages. Fields: name, slug (with nesting,
   e.g. `katy-tx-real-estate/elyson-real-estate`), hero image, intro, body (rich
   text), FAQ list. Rendered at existing nested slugs via Astro rest routes.

All Tina field names use letters/numbers/underscores only. Regenerate the client in
`tina/__generated__/` after every schema change (via `pnpm dev` / `pnpm build`).

### New blocks (each a pair: `<Name>.astro` + `<name>.template.ts`)

- FAQ accordion
- Video testimonial → implemented as a generic `VideoEmbed` block (responsive 16:9
  iframe, `youtube-nocookie.com`)
- Community card grid
- Team roster grid (reads the `team` collection)

Existing blocks (Hero, CTA, Features, etc.) get restyled to the brand.

### Design system

- Restyle `src/styles/global.css` Tailwind v4 theme tokens with the brand palette
  above.
- Fonts self-hosted woff2 (Fontsource or local files).
- Remove the starter's space theme (`src/components/space/`, demo content).
- Header: phone bar (713-494-1818) + logo + uppercase nav — SEARCH (→ Sierra),
  NORTHWEST HOUSTON COMMUNITIES (dropdown), NORTHWEST HOUSTON SCHOOLS (dropdown),
  BUYERS (→ Sierra), SELLERS (→ Sierra), ABOUT, CONTACT, BLOG.
- Footer: eXp Realty brokerage blurb, link columns, social icons, legal links.

### Migration pipeline (one-off, `scripts/`, not shipped)

1. Pull pages/posts/media from the WP REST API.
2. Convert `content.rendered` HTML → MDX (strip Elementor wrappers; lightweight
   HTML→MD converter + manual cleanup).
3. Download referenced **images** from `/wp-content/uploads/` (origin URLs, not the
   NitroPack CDN) into `public/uploads/`; rewrite URLs in content. **Skip `.mp4`
   files entirely** (YouTube instead).
4. Preserve every existing URL slug — no redirects needed for migrated content.
   WP-only URLs (`/opt-out-preferences/`, author archives, etc.) get Netlify
   redirects to the closest equivalent.
5. SEO metadata: page titles/meta descriptions from Rank Math fields in the REST API
   where present.
6. Manual pass: home, about, contact, and hub pages are hand-built with blocks from
   the pulled copy (high-traffic pages, worth crafting).

### Dynamic features

- **IDX/search**: external links to Sierra only. No rebuild, no iframe.
- **Contact form**: Netlify Forms (`data-netlify="true"`) at launch.
  **Future requirement (not scoped now):** form submissions must eventually forward
  lead data to the Sierra API. Keep the form handling serverless-friendly (e.g. a
  Netlify Function as the submission endpoint later) so this can be added without
  reworking the page.
- **Videos**: YouTube embeds via the `VideoEmbed` block. Owner uploads mp4s to
  YouTube and pastes URLs into Tina.
- **Maps**: the communities-hub Google "commutes" iframe is carried over as an
  embed.
- **Scripts**: keep the GTM container (ID extracted during migration). Drop
  Complianz and Search Atlas. Cookie banner only if requested — otherwise out of
  scope. UserWay is Sierra-side only; nothing to port.

### Infrastructure

- Create a TinaCloud app (app.tina.io); set `PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN`
  in Netlify env vars; switch `netlify.toml` build command from `pnpm build:local`
  to `pnpm build`. Update `AGENTS.md` accordingly.
- `SITE_URL` = production domain.
- Domain cutover (DNS) happens at launch; Sierra subdomain
  `www.thelippincottteam.com` is untouched.

## Out of scope

- Sierra IDX platform (property search, listings, valuations) — links only.
- Sierra API lead forwarding (noted above as a future requirement).
- Pixel-perfect Elementor recreation.
- Cookie-consent tooling (unless requested later).

## Validation

No test suite exists in this repo; per `AGENTS.md` the de-facto checks are:

- `pnpm build` (with TinaCloud creds) / `pnpm build:local` — Tina codegen + Astro
  build must pass.
- `npx astro check` for type-checking `.astro` files.
- Manual spot-check: every migrated URL from the source site resolves on the new
  build (compare against the 35 page + 23 post slugs from the REST API).
