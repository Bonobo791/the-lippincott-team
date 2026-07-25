# Agent Guidance

- NEVER develop on the default branch. Always make a new one.

## Project overview

This is a **TinaCMS + Astro starter site** (`lippincott-team-astro-tina`) hosted on Netlify: content
is edited visually in the TinaCMS admin and shipped as static HTML. The site
itself ships **zero React** — React appears only as a pinned devDependency for
building the Tina admin UI (see `README.md` "A note on React" for why the pin
exists; do not remove it casually).

- Astro **7** (`output: 'static'`), Tailwind CSS **v4** (via `@tailwindcss/vite`),
  TypeScript strict (`tsconfig.json` extends `astro/tsconfigs/strict`).
- Content (Markdown/MDX + JSON) is managed by **TinaCMS** and queried through
  the generated client in `tina/__generated__/` — not through Astro's content
  layer at runtime (see the comment in `src/content.config.ts`).
- Visual editing uses `@tinacms/astro`: a vanilla-JS bridge plus one on-demand
  endpoint (`/tina-island/[name]`) that re-renders editable regions. Everything
  else prerenders to static HTML.
- Package manager: **pnpm** (not npm/yarn). Node **>= 22.22.0** (`.nvmrc`).

## Agent skills

Project-level agent skills are installed in `.agents/skills/` — consult them
before working in these areas:

- `.agents/skills/astro` — Astro project structure, CLI, config, adapters.
  Always prefer examples from <https://docs.astro.build> for the latest API.
- `.agents/skills/tinacms` — TinaCMS schema (`tina/config.ts`), collections,
  visual editing, and common errors (build ordering, field naming, path
  mismatches). See its `references/` for troubleshooting.
- `.agents/skills/netlify-*` — official Netlify skills (from
  `netlify/context-and-tools`): `netlify-deploy` (deploying sites),
  `netlify-config` (`netlify.toml` / build config), `netlify-functions`,
  `netlify-edge-functions`, `netlify-frameworks`. Consult these when working
  on Netlify deployment or configuration.

## Build and dev commands

From `package.json`:

- `pnpm dev` — `tinacms dev -c "astro dev"`; site at `localhost:4321`, visual
  editor at `localhost:4321/admin/`.
- `pnpm build` — `tinacms build --content=local -c "NODE_ENV=production astro build"`.
  Compiles against TinaCloud; **fails fast with `ERR_MISSING_CLOUD_CREDS` without
  `PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN`** (get them at app.tina.io).
- `pnpm build:local` — fully local/offline build, no TinaCloud auth needed.
- `pnpm build:search` — `tinacms search-index`.
- `pnpm preview` — `astro preview`.

Both build scripts prefix the subcommand with `NODE_ENV=production` on purpose:
the tinacms CLI bundles its config via Vite in-process, and Vite defaults
`process.env.NODE_ENV` to `development` when unset — without the prefix that
value leaks into `astro build` and flips `import.meta.env.PROD` to false
(which would silently drop the production-only GA4 snippet in
`src/components/BaseHead.astro`).

**Build order matters**: `tinacms build` must run before `astro build` so the
generated client/types in `tina/__generated__/` exist. Always use the scripts
above rather than bare `astro build`.

## Code organization

- `tina/config.ts` — TinaCMS config (branch detection from host env vars, admin
  built to `public/admin`, media in `public/`).
- `tina/collections/` — Tina collections: `blog.ts`, `page.ts`,
  `global-config.ts`, `team.ts`, `community.ts`. The page collection's block
  list imports per-block template schemas.
- `tina/__generated__/` — generated Tina client/types; regenerate via the
  dev/build scripts after any schema change. Do not hand-edit.
- `src/lib/data.ts` — per-collection data loaders over the generated client,
  plus **all** content types. Types are pure derivations from the Tina schema
  (inferred from loader return types / `Extract` on `PageBlock`) — never
  hand-write content shapes; the Tina collection is the source of truth.
- `src/lib/islands.ts` — island registry: the single source of truth mapping
  `/tina-island/<name>` slugs to fetcher + component + wrapper. Adding a new
  editable region = adding one entry here; `src/pages/tina-island/[name].ts`
  picks it up automatically.
- `src/components/blocks/` — the page-builder blocks (Hero, CTA, Features,
  Stats, Testimonial, Callout, Content, Split, Video, Faq, TeamGrid,
  CommunityGrid). **Convention: each block
  is a pair** — `<Name>.astro` (rendering) + `<name>.template.ts` (Tina
  `Template` schema). Multi-word blocks use camelCase template filenames
  (`teamGrid.template.ts`, not snake_case) — snake_case generates mismatched
  GraphQL typenames. Add a new block by creating the pair and registering the
  template in `tina/collections/page.ts`.
- `src/components/islands/` — `PageBody`/`BlogBody` wrappers used by the island
  registry; `src/components/ui/` — reusable UI components (including
  `FaqAccordion.astro`); `src/components/mdx/` — MDX components.
- `src/pages/` — routes: `[...slug].astro` (pages), `about/[...slug].astro`
  (team bios), `northwest-houston-real-estate/[...slug].astro` and
  `northwest-houston-schools-real-estate/[...slug].astro` (community/school
  hierarchies), `blog/`, `rss.xml.ts`, `404.astro`, `tina-island/[name].ts`.
- `src/content/` — Tina-managed content: `blog/*.mdx`, `page/*.mdx`,
  `team/*.mdx`, `community/**/*.mdx` (nested hierarchies), `config/config.json`.
- `src/styles/global.css` — Tailwind v4 entry (`@import 'tailwindcss'`, theme
  tokens).
- `scripts/migrate/` — one-off WordPress→Tina migration pipeline, kept for
  provenance. `data/` (cached WP API responses) is gitignored; run scripts
  with `node scripts/migrate/<name>.mjs`.

## Key conventions

- Tina field names: **letters, numbers, and underscores only (no hyphens)**.
- After changing the Tina schema, regenerate the client (`tina/__generated__/`)
  via `pnpm dev` / `pnpm build`.
- Rich-text bodies render through `<TinaMarkdown>` from `@tinacms/astro`.
- `compressHTML: true` in `astro.config.mjs` is deliberate (pins Astro 6
  whitespace behavior) — see the inline comment before changing it.
- `src/content.config.ts` exists only to silence a warning; content is **not**
  loaded through Astro's content layer.

## Testing and quality checks

There is **no test suite, linter, or formatter configured** in this project
(no test script, no ESLint/Prettier config). To validate changes:

- Run `pnpm build:local` (or `pnpm build` with TinaCloud credentials) and fix
  any type/schema errors — the Tina codegen + Astro build is the de-facto check.
- `npx astro check` is available via `@astrojs/check` for type-checking
  `.astro` files.

## Deployment

Host-neutral: `astro.config.mjs` auto-detects the adapter from platform env
vars — Vercel, Cloudflare (Pages/Workers), Netlify — and falls back to a
standalone Node server (`node ./dist/server/entry.mjs`). Force one with
`DEPLOY_ADAPTER=vercel|cloudflare|netlify|node`. `wrangler.jsonc` targets
Cloudflare Workers with `nodejs_compat` (required by the `/tina-island` route's
`node:async_hooks`).

**Netlify**: `netlify.toml` pins the build command (`pnpm build` — TinaCloud
credentials `PUBLIC_TINA_CLIENT_ID`/`TINA_TOKEN` are configured in the Netlify
UI; the build fails fast with `ERR_MISSING_CLOUD_CREDS` without them). It also
sets `SITE_URL = "https://lippincottteam.com"` under
`[context.production.environment]` so deploy previews keep their
Netlify-injected URL. The committed `pnpm-lock.yaml` and the `packageManager`
field in `package.json` are what make Netlify install with pnpm instead of
npm — do not re-ignore the lockfile.

Legacy WordPress URLs are handled by `public/_redirects` (Astro copies
`public/` verbatim into the publish dir): `/opt-out-preferences/*`,
`/team-member-page-design/`, and `/author/*` 301 to their closest equivalents.
All other migrated WP URLs map 1:1 onto existing routes.

Analytics: GA4 loads via a direct gtag.js snippet in
`src/components/BaseHead.astro`, gated on `import.meta.env.PROD` **and**
Netlify's `CONTEXT` being `production` (or unset) — see the
`NODE_ENV=production` note under "Build and dev commands". Netlify deploy
previews build with `NODE_ENV=production` but get `CONTEXT=deploy-preview`,
so preview traffic is **excluded**; only local dev is also excluded. The
measurement ID comes from `PUBLIC_GA_ID` (defaults to `G-ZREVRSHYJB`), and
the inline config script carries `data-astro-rerun` so `<ClientRouter/>`
navigations keep sending pageviews.

Environment variables (see `.env.example`):

- `SITE_URL` — production URL for sitemap/RSS/OpenGraph. Most platforms inject
  a fallback URL; **Cloudflare Workers does not — set `SITE_URL` there**.
- `PUBLIC_TINA_CLIENT_ID`, `TINA_TOKEN` — TinaCloud credentials, required for
  `pnpm build`.
- `PUBLIC_GA_ID` — optional GA4 measurement ID override (default
  `G-ZREVRSHYJB`).
- `DEPLOY_ADAPTER` — optional adapter override.
