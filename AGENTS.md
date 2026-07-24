# Agent Guidance

## Project overview

This is a **TinaCMS + Astro starter site** (`lippincott-team-astro-tina`): content
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
- `pnpm build` — `tinacms build --content=local -c "astro build"`. Compiles
  against TinaCloud; **fails fast with `ERR_MISSING_CLOUD_CREDS` without
  `PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN`** (get them at app.tina.io).
- `pnpm build:local` — fully local/offline build, no TinaCloud auth needed.
- `pnpm build:search` — `tinacms search-index`.
- `pnpm preview` — `astro preview`.

**Build order matters**: `tinacms build` must run before `astro build` so the
generated client/types in `tina/__generated__/` exist. Always use the scripts
above rather than bare `astro build`.

## Code organization

- `tina/config.ts` — TinaCMS config (branch detection from host env vars, admin
  built to `public/admin`, media in `public/`).
- `tina/collections/` — Tina collections: `blog.ts`, `page.ts`,
  `global-config.ts`. The page collection's block list imports per-block
  template schemas.
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
  Stats, Testimonial, Callout, Content, Split, Video). **Convention: each block
  is a pair** — `<Name>.astro` (rendering) + `<name>.template.ts` (Tina
  `Template` schema). Add a new block by creating the pair and registering the
  template in `tina/collections/page.ts`.
- `src/components/islands/` — `PageBody`/`BlogBody` wrappers used by the island
  registry; `src/components/ui/`, `src/components/mdx/`, `src/components/space/`
  — reusable UI, MDX components, and decorative space-theme components.
- `src/pages/` — routes: `[...slug].astro` (pages), `blog/`, `rss.xml.ts`,
  `404.astro`, `tina-island/[name].ts`.
- `src/content/` — Tina-managed content: `blog/*.mdx`, `page/*.mdx`,
  `config/config.json`.
- `src/styles/global.css` — Tailwind v4 entry (`@import 'tailwindcss'`, theme
  tokens, `.dark`-class dark variant).

## Key conventions

- Tina field names: **letters, numbers, and underscores only (no hyphens)**.
- After changing the Tina schema, regenerate the client (`tina/__generated__/`)
  via `pnpm dev` / `pnpm build`.
- Rich-text bodies render through `<TinaMarkdown>` from `@tinacms/astro`.
- Dark mode is driven by a `.dark` class (see `src/styles/global.css`), not
  `prefers-color-scheme`.
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

Environment variables (see `.env.example`):

- `SITE_URL` — production URL for sitemap/RSS/OpenGraph. Most platforms inject
  a fallback URL; **Cloudflare Workers does not — set `SITE_URL` there**.
- `PUBLIC_TINA_CLIENT_ID`, `TINA_TOKEN` — TinaCloud credentials, required for
  `pnpm build`.
- `DEPLOY_ADAPTER` — optional adapter override.
