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
- Package manager: **pnpm** (not npm/yarn), pinned via `packageManager` in
  `package.json`. Node **>= 22.22.0** (`.nvmrc`).
- A minimal root `pyproject.toml` (name/version/`requires-python >= 3.13`, no
  dependencies) backs the `.venv/` used by tooling scripts — the site itself
  has no Python code.

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
- `.agents/skills/visual-loop` — iterative visual QA: edit code, screenshot
  with Playwright (`scripts/audit/shoot.mjs` / `probe-styles.mjs`), view the
  PNGs, compare to spec/baseline, re-shoot until clean. Use for any frontend
  change that must be verified visually. Exception: changes that cannot affect
  rendering (build scripts, backend logic, tooling, docs) skip the screenshot
  loop — a green `pnpm build:local` is sufficient verification for those.

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
  CommunityGrid, TrustStrip, TestimonialShowcase, Awards, TeamBanner,
  ContactForm — page collection only; plus the **community guide blocks**:
  GuideHero, StatLedger, PriceLadder, CalloutRail, DataTable, PhotoCardGrid,
  CategoryTiles, RouteLedger, TradeOffs, NotePanel, ProofStage, RelatedChips,
  GuideCta — registered in **both** the page and community collections).
  **Convention: each block is a pair** —
  `<Name>.astro` (rendering) + `<name>.template.ts` (Tina
  `Template` schema). Multi-word blocks use camelCase template filenames
  (`teamGrid.template.ts`, not snake_case) — snake_case generates mismatched
  GraphQL typenames. Add a new block by creating the pair and registering the
  template in `tina/collections/page.ts` (and `community.ts` when it should be
  available on community pages). **Watch field-name collisions across
  the block union**: two templates in the same `blocks` field may not reuse a
  field name with a different value type (e.g. `body` rich-text JSON vs
  string, `image` object vs image string) — **nullability counts too**
  (`String` vs `String!` from `required: true`) — Tina's codegen fails with
  "Fields ... conflict". Pick a distinct name (`summary`, `description`,
  `backgroundImage`) instead. The shared block templates serve
  two collections: `page.ts` registers all of them, while
  `tina/collections/community.ts` registers the 7 legacy templates (hero,
  split, features, stats, content, faq, cta) plus the 13 community guide
  blocks — Tina namespaces block
  typenames per collection+field (`PageBlocksHero` vs `CommunityBlocksHero`),
  and `Blocks.astro` dispatches on the suffix after stripping the
  `Page|CommunityBlocks` prefix.
- **Every community/school doc is now a block-driven guide** (Cypress order:
  guideHero → market statLedger → priceLadder → schools calloutRail/dataTable
  → photoCardGrid → categoryTiles → routeLedger → cost-of-living statLedger →
  tradeOffs → comparison dataTable → proofStage → faq → relatedChips →
  guideCta; sections drop out when no sourced data exists). The legacy
  frontmatter-hero + rich-text-body path in `CommunityBody.astro` remains only
  as a fallback for docs without blocks. Market figures in these guides were
  researched per community (Realtor.com local-market pages, U.S. News, district
  sites — June 2026) and every stat carries a source citation in its `source`
  field; when updating numbers, cite the same way and never copy one
  community's figures into another's.
- `src/components/islands/` — `PageBody`/`BlogBody`/`CommunityBody` wrappers
  used by the island registry; `src/components/ui/` — reusable UI components
  (including `FaqAccordion.astro`); `src/components/mdx/` — MDX components.
- `src/pages/` — routes: `index.astro` (**static one-off homepage**, not
  Tina-block-driven: self-contained editorial design with its own scoped
  palette/typography — Fraunces Variable + Inter Variable — inside the shared
  `Base` chrome; `home.mdx` is kept in Tina but no longer rendered),
  `[...slug].astro` (pages), `about/[...slug].astro`
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
- `scripts/audit/` — Playwright design-fidelity tooling used by the
  `visual-loop` skill: `shoot.mjs` (screenshots of 10 templates at 3 viewports
  + interaction shots + error manifest) and `probe-styles.mjs` (computed-style
  extraction for numeric spec comparison). Run with
  `node scripts/audit/<name>.mjs --base <url> --out <dir>`; output goes to the
  gitignored `.launch/qa/`. For interactive browsing use
  `npx playwright cli --browser=chromium` (no system Chrome installed).

## Key conventions

- Tina field names: **letters, numbers, and underscores only (no hyphens)**.
- After changing the Tina schema, regenerate the client (`tina/__generated__/`)
  via `pnpm dev` / `pnpm build`.
- The generated client reads content from a **seeded cache**
  (`tina/__generated__/.cache/<timestamp>`) written by the last Tina build —
  plain `npx astro dev` keeps serving that snapshot. After editing content
  files outside the Tina admin, rerun `pnpm build:local` and restart the dev
  server, or changes (new frontmatter fields, removed URLs) won't show up.
- Rich-text bodies render through `<TinaMarkdown>` from `@tinacms/astro`.
- The `faq` block has an optional `jsonld` boolean: when enabled, `Faq.astro`
  emits a `FAQPage` schema.org script built from the block's Q&A items
  (answers flattened via `richTextToPlainText` in `src/lib/rich-text.ts`).
  Enable it on at most one FAQ block per page.
- Split headings: editors mark the accented phrase in plain Tina string fields
  with `**...**` (the brand's light+bold heading device). Render them with
  `src/components/ui/SplitHeading.astro` (parser in
  `src/lib/split-heading.ts`); the accent styling comes from its `accentClass`
  prop.
- Fonts and tokens: the design language is "The Verified Record" (from the
  system.css spec) — **Fraunces Variable** (300/400) carries display,
  **Inter Variable** carries body/function; `--font-sans` is Inter and
  `--font-heading`/`--font-serif` are Fraunces (italic axis imported).
  Base `h1–h4` weight is 400 — Fraunces 600 reads heavy. Brand theme tokens
  live in the `@theme` block of `src/styles/global.css`, with `:root` values:
  `--primary: #d6323c` (red), `--secondary`/`--foreground`/`--ink`/`--tile`:
  `#17151a` (ink), `--body: #3c3a41`, `--section`/`--muted`/`--accent`:
  `#f6f2ea` (ivory), `--gold: #c9a15a`, `--stat-label: #7a7780`,
  `--hairline: #e7e2d6`, `--border`/`--input: #e8e3d9`, and `--radius: 1rem`.
  Eyebrows on dark surfaces are gold (`.eyebrow.on-dark` → `--gold`), not red.
- Hero block: four `variant`s — `simple`, `photo`, `glass`, `video` — plus
  `backgroundImage`, `backgroundVideo` (MP4 URL, optional) and
  `eyebrow` fields (eyebrow renders on photo/glass/video). The video variant
  is the Apple-style full-viewport hero: bottom-left content, gradient scrim,
  drifting light beams, and a masked-line headline reveal (editors split the
  reveal lines with a line break in the headline). With no `backgroundVideo`
  it renders `backgroundImage` as a full-bleed still. Video hosting plan:
  ~2 MB silent 720p loops on Cloudflare R2 behind the CDN (URLs referenced
  from Tina), poster-only on mobile — until then, stills only; don't commit
  MP4s to the repo.
- GuideHero block (community guides): the "stage" hero — a `min-h-[72svh]`
  ink band with optional `backgroundImage` (full-bleed, gradient scrim),
  bottom-left content: gold `eyebrow on-dark`, Fraunces-light H1 with gold
  italic accent, and ghost chips (`border-white/30 bg-white/10`). The
  `answer` capsule renders in a separate ivory (`bg-section`) band directly
  below the hero. Without a `backgroundImage` the hero is a solid dark band.
- Apple-style homepage blocks (all render in the `.font-apple` system/Inter
  stack with italic `**...**` accents via `SplitHeading`): `TrustStrip` (flat
  parchment trust bar — title's plain segments = small label, accented = big
  figure), `Stats` (near-black `--tile` count-up section), `TestimonialShowcase`
  (video + dark quote-panel carousel), `Awards` (sticky intro + numbered
  list), `TeamBanner` (crimson-gradient photo banner). Site chrome: a 72px
  `rgba(23,21,26,.82)` blur `Header.astro` with an ivory hairline bottom
  border and a dark `#100e13` `Footer.astro`. The mobile menu is a dark
  dropdown panel under the header bar (not a full-screen overlay). The
  desktop nav appears at `min-[1240px]` (the 8 config links + phone + CTA
  measurably overflow below that; the phone link and the spec's 26px link
  gaps join at `min-[1440px]`, where the 1440px container fits them),
  and the header CTA uses the design spec's translateY/shadow hover — not
  `.btn-magnetic`, whose rAF transform would override it.
- Motion: `gsap` (npm dep, bundled via Astro `<script>` imports — never CDN)
  drives the CommunityGrid `rail` variant's pinned horizontal pan and the
  TestimonialShowcase clip-path reveal. Count-up stats, `.h2-mask` headline
  reveals and magnetic `.btn-magnetic` CTAs are vanilla JS (shared inline
  script in `src/layouts/Base.astro`). Everything must no-op under
  `prefers-reduced-motion`.
- Cta block: `variant` — `default` (light) or `crimson` (solid red, beams,
  contact row from `config.contact`). CommunityGrid: `variant` — `grid` or
  `rail`. Features: `services` variant (ink top-rule, crimson icon, arrow
  link). Shared Apple tokens live in `src/styles/global.css`: `--tile`,
  `--gold`, `--accent-on-dark`, `--ink`, `--hairline`.
- Split block: optional `eyebrow` renders as the red uppercase chip (same
  styling as the Hero glass eyebrow) above the title.
- Features block: optional `variant` — `cards` (default) or `editorial`
  (borderless, ~70×3px red top-rule above each title, `md:grid-cols-2`, no
  icon tile, spec pattern #12). Each item has an optional `action`
  (`label`+`link`) rendering a full-width red Button pinned to the card
  bottom; external http(s) links open in a new tab.
- Prose tables (rich-text bodies, e.g. community neighborhood comparisons):
  hairline `var(--border)` borders, padded cells, and a bold red first
  column — styled globally under the `.prose` rules in
  `src/styles/global.css`.
- Sticky mobile click-to-call bar: a pure-CSS fixed bottom bar in
  `src/layouts/Base.astro` (`lg:hidden`, `bg-primary`, phone number from
  `config.contact.phone` as a `tel:` link, no JS). A `h-14 lg:hidden` spacer
  after the footer keeps it from covering footer content; it sits at `z-10`,
  below the sticky header (`z-20`) so the open mobile menu paints over it.
- CommunityGrid cards (and `CommunityBody`) link to the community's Sierra
  property-search URL (external, new tab) when one exists — the `sierraLinks`
  map in `src/lib/sierra-links.ts` holds the URLs recovered from the migrated
  community bodies; communities without one fall back to their internal
  community page.
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
- For visual iteration, run `npx astro dev --port 4322` (not `pnpm dev`) and
  screenshot against it — component/CSS edits hot-reload in under a second,
  no build per round. Use the separate port so a `pnpm preview` server can
  stay on 4321. Reserve `NODE_ENV=production pnpm build:local` + `pnpm preview`
  for per-task gates, Tina schema changes, production-only behavior
  (`compressHTML`, GA4 gating, island endpoints), and final evidence shots. See the `visual-loop`
  skill for the full loop. Caveat: bare `astro dev` only serves content when
  `tina/__generated__/client.ts` points at TinaCloud — `pnpm dev` and
  `pnpm build:local` both pin it to `localhost:4001`, so after either, run a
  credentialed `pnpm build` (or use `pnpm dev`) before dev-server iteration.
- CI: `.github/workflows/tina-lock.yml` runs `pnpm build:local` on PRs to
  `main` and fails if `tina/tina-lock.json` is stale (schema changed without
  regenerating the lock — a stale lock breaks the Netlify build's TinaCloud
  cloud check).

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
