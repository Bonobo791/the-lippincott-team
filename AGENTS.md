# Agent Guidance

- NEVER develop on the default branch. ONLY work on the dev branch unless explicitly authorized to work on another branch.
- When I say "clean up", that means to clean your worktrees and branches.
- When I say "triage", review every PR comment for validity. Fix each valid issue. Post a triage comment. Reply to every bot comment, whether or not you make a code change.
- NEVER push to the branch. Only commit and add a commit message.

## Project overview

This is a **TinaCMS + Astro starter site** (`lippincott-team-astro-tina`) hosted on Netlify (and deployable
on Coolify/Docker): content is edited visually in the TinaCMS admin and shipped
as static HTML. The site itself ships **zero React** to browsers — React stays
a pinned devDependency for building the Tina admin UI (see `README.md` "A note
on React" for why the pin exists; do not remove it casually), while `tinacms`
is a runtime dependency because the `/tina-island` endpoint's generated client
imports `tinacms/dist/client` in the standalone server bundle.

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
(which would silently drop the production-only GA4 snippet at the end of
`<body>` in `src/layouts/Base.astro`).

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
  GuideCta, ChecklistSplit, StepsSplit — registered in **both** the page and community collections).
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
  split, features, stats, content, faq, cta) plus the 15 community guide
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
  `buy.astro` and `sell.astro` (**static one-off buyer/seller pages** in the
  same "Verified Record" design world as the homepage, per `DESIGN.md` — not
  Tina-editable; both share the homepage's stylesheet `src/styles/v2.css`
  (extracted verbatim from index.astro and imported by all four pages) and
  the reveal/count-up script `src/components/v2/V2Motion.astro`, each carries
  its own FAQPage JSON-LD),
  `reviews.astro` (**static one-off reviews page**, same v2 world — not
  Tina-editable; `reviews.mdx` stays in Tina unrendered). The live feed is
  the HAR.com native script widget (`https://members.har.com/realtor-agent-rating/api/default.cfm`).
  The endpoint returns the rendered ratings and comments directly for a
  `<script src>` embed. The widget uses legacy `document.writeln`, so
  links to `/reviews/` carry `data-astro-reload` and open the page with
  a full document load instead of ClientRouter navigation; card chrome
  lives on `.har-widget` in `v2.css`, and `.feed-note` links to the full
  survey history on HAR.com. `shoot.mjs` and `probe-styles.mjs` hit the
  native endpoint directly,
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
- `scripts/deploy/` — deploy tooling: `purge-bunny-cache.mjs` (Bunny pull-zone
  cache purge; run automatically by the Docker entrypoint on Coolify container
  start when `BUNNY_API_KEY` + `BUNNY_PULL_ZONE_ID` are set; with URL/path
  arguments it purges only those pages via the URL-purge API) and
  `docker-entrypoint.sh` (purge-then-serve container entrypoint).

## Key conventions

- Tina field names: **letters, numbers, and underscores only (no hyphens)**.
- The `/about/` roster (`teamGrid` block) shows only team docs with
  `featured: true`, ordered by the `order` field (lowest first; the first
  member renders as the large lead cell). Bio pages under `/about/<slug>/`
  render all team docs regardless of `featured`.
- Agent bio pages (`TeamBody.astro`) follow the agent-template design:
  breadcrumb + H1, portrait/bio split, contact ledger, ink proof band,
  team chips, personalized CTA, `ProfilePage` JSON-LD. The optional team
  `headline` field overrides the H1 (with `**…**` around the italic accent);
  it falls back to the two-tone name split. The optional `location` field
  sets the agent's home market ("Based in" ledger cell + JSON-LD
  `workLocation`; defaults to Northwest Houston, TX), and the optional
  `marketLogo` image renders a market-specific team mark (e.g. Lippincott
  Team Dallas/Abilene) under the bio. The proof band reuses the
  `ProofStage` block component with hardcoded team-wide metrics, and the
  chips row self-fetches teammates via `listTeam()` (featured first,
  current agent excluded).
- Blog: posts carry a `category` select (Communities, Buying, Selling,
  Pricing, Financing, Market, Relocating, Living) shown as the kicker label
  on the index and article pages. The article template (`BlogBody.astro`)
  renders breadcrumb, byline meta row (author comes from the
  `amy-lippincott-2` team doc — the schema has no author field), a "The
  short answer" capsule from `description`, a sticky "On this page" TOC and
  reading time derived from the body (`src/lib/article.ts` — `extractToc`,
  `readingTimeMinutes`; h2 anchors come from the `ArticleH2` TinaMarkdown
  override, whose slug algorithm must stay in sync with `extractToc`), an
  inline CTA panel, author box, and category-first related reads. The
  `contactForm` block renders the entire contact page (SplitHeading H1 from
  `heading`, the `/api/contact` form — a host-neutral endpoint that forwards
  leads to Sierra directly on every platform, replacing the old Netlify Forms
  + `netlify/functions/contact-sierra.ts` flow — config-driven contact rail,
  reassurance strip) — `contact-us.mdx` is that single block. See
  `src/pages/api/contact.ts` + `src/lib/sierra-contact.ts`.
- After changing the Tina schema, regenerate the client (`tina/__generated__/`)
  via `pnpm dev` / `pnpm build`.
- The generated client reads content from a **seeded cache**
  (`tina/__generated__/.cache/<timestamp>`) written by the last Tina build —
  plain `npx astro dev` keeps serving that snapshot. After editing content
  files outside the Tina admin, rerun `pnpm build:local` and restart the dev
  server, or changes (new frontmatter fields, removed URLs) won't show up.
- Rich-text bodies render through `<TinaMarkdown>` from `@tinacms/astro`.
  In template conditionals, never test a rich-text field with plain truthiness
  (`data.note && ...`) — Tina returns an empty root-node **object** for unset
  fields, which is truthy and renders phantom containers with margins. Use
  `hasRichText(field)` from `src/lib/rich-text.ts` instead.
- Section vertical rhythm: transparent-surface blocks use `py-12 md:py-16`;
  background/dark bands use `py-16 md:py-24` (matches the design spec's dense
  `clamp(40px,5vw,64px)` bands; stacked sections sum both paddings).
- The `faq` block has an optional `jsonld` boolean: when enabled, `Faq.astro`
  emits a `FAQPage` schema.org script built from the block's Q&A items
  (answers flattened via `richTextToPlainText` in `src/lib/rich-text.ts`).
  Enable it on at most one FAQ block per page.
- The `dataTable` block has an optional `anchorId` field that sets the
  section's HTML `id`, so jump links (e.g. `#communities`) can target it.
- Page docs (`page` collection) carry `seoTitle` plus an optional
  `description` (meta description) — `[...slug].astro` falls back to the
  site-wide `config.seo.description` when the per-page field is empty.
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
  it renders `backgroundImage` as a full-bleed still. Video hosting:
  the homepage's three videos are self-hosted from `public/uploads/` and
  served by the Netlify CDN — re-encode to web-friendly H.264
  (`libx264` CRF 24–28, AAC 96k, `+faststart`) before committing, and keep
  every file well under GitHub's 100 MB limit (current set: 8–30 MB from
  35–468 MB originals). Posters are webp. Larger future videos (e.g. hero
  `backgroundVideo` loops) should still go to Cloudflare R2 behind the CDN
  rather than into the repo.
- GuideHero block (community guides): the "stage" hero — a `min-h-[72svh]`
  ink band with optional `backgroundImage` (full-bleed, gradient scrim),
  bottom-left content: gold `eyebrow on-dark`, Fraunces-light H1 with gold
  italic accent, ghost chips (`border-white/30 bg-white/10`), and optional
  `actions` (red button / white text link, same shape as GuideCta's).
  Without a `backgroundImage` the hero is a solid dark band.
- Apple-style homepage blocks (all render in the `.font-apple` system/Inter
  stack with italic `**...**` accents via `SplitHeading`): `TrustStrip` (flat
  parchment trust bar — title's plain segments = small label, accented = big
  figure), `Stats` (near-black `--tile` count-up section), `TestimonialShowcase`
  (video + dark quote-panel carousel), `Awards` (sticky intro + numbered
  list), `TeamBanner` (crimson-gradient photo banner). Site chrome: a 72px
  `rgba(23,21,26,.82)` blur `Header.astro` with an ivory hairline bottom
  border and a dark `#100e13` `Footer.astro`. The mobile menu is a dark
  dropdown panel under the header bar (not a full-screen overlay). The
  desktop nav appears at `min-[1320px]` (the 9 config links + phone + CTA
  measurably overflow below that; link gaps stay at 16px everywhere — the
  spec's 26px gaps plus the phone link no longer fit the 1440px container
  with 9 links, so only the phone joins at `min-[1440px]`),
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
  cloud check). Note: in the pinned tinacms version the lock is only written
  by `tinacms dev`, not `tinacms build` — after a schema change, run
  `pnpm dev` once (then stop it) to regenerate `tina/tina-lock.json`.

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
sets `SITE_URL = "https://thelippincottteam.com"` under
`[context.production.environment]` so deploy previews keep their
Netlify-injected URL. The committed `pnpm-lock.yaml` and the `packageManager`
field in `package.json` are what make Netlify install with pnpm instead of
npm — do not re-ignore the lockfile.

**Coolify / Docker**: the multi-stage `Dockerfile` + `.dockerignore` at the
repo root build with `pnpm build` (TinaCloud credentials required) and run the
adapter-node standalone server (`node ./dist/server/entry.mjs`). Coolify apps
use the **Dockerfile** build pack (location `/Dockerfile`, the default). Env
vars set on the app are passed as build args by default (Build Variable flag)
and the proxy injects `PORT`/`HOST` — keep **Ports Exposes** on `4321` to
match `EXPOSE`. Required env: `PUBLIC_TINA_CLIENT_ID`, `TINA_TOKEN`,
`SITE_URL`; the `SIERRA_API_KEY` runtime secret (contact form → Sierra) should
have its Build Variable flag **off**. The Dockerfile `HEALTHCHECK` (node fetch
on `/`) is parsed by Coolify, takes precedence over UI checks, and gates
Traefik routing + rolling updates. The container needs egress to TinaCloud
(`content.tina.io` / `app.tina.io`) for content and visual editing; no volumes
are needed (stateless). `CONTEXT` is unset there, so production builds include
GA4.

**CDN (Bunny)**: traffic is fronted by a Bunny pull zone whose origin is the
Coolify server (set **Origin Host Header** to the app's domain — Traefik
routes by `Host`), plus a storage zone serving `/uploads/*` media via an edge
rule with the **Origin URL per request** action pointing at the storage
zone's `*.b-cdn.net` hostname — media stays in the repo, content paths never
change. Cache rules (in order): bypass `*/api/*` + `*/tina-island/*`; uploads
→ storage origin + 30 d; `*/_astro/*` → 1 y; HTML `*/` → 10 min. Deploys purge
the pull zone automatically: the Docker entrypoint
(`scripts/deploy/docker-entrypoint.sh`) runs
`scripts/deploy/purge-bunny-cache.mjs` on container start — after the local
readiness probe passes — when `BUNNY_API_KEY` + `BUNNY_PULL_ZONE_ID` are set
(runtime-only secret; skipped without them, and when readiness times out the
purge is skipped so a broken container can't clear a healthy cache).
Single-page purges between deploys go through the protected
`/api/bunny-purge` endpoint (`BUNNY_PURGE_SECRET` via Bearer/
`x-bunny-purge-token`/`?token=`; paths normalized against `SITE_URL` in
`src/lib/bunny-purge.ts`; Bunny URL purges are rate-limited per account —
trailing-slash URLs count as prefix purges, ~30/min). The pull zone sends the app's own domain to the origin
(*Origin Host Header* = the Coolify app domain, *Add Host Header* off), so
Traefik routes without CDN hostnames being Coolify domains; Bunny does not
forward the visitor host, so `security.checkOrigin` is `false` in
`astro.config.mjs` (see the inline comment). `/api/contact` compensates with
its own endpoint-level browser CSRF guard — an `Origin` allowlist against
`SITE_URL` / platform URL envs — plus the honeypot, streaming size cap, and
per-IP rate limit (keyed by the proxy-set `X-Real-IP`/`Client-IP` header or
the proxy-appended tail of `X-Forwarded-For` — never the client-controlled
first value).
Keep `Block Root Path Access`, `Block None Referrer`, and `Block POST
Requests` **off** on the zone (Bunny's defaults for some zone types flip
them on, which 403s first-time visitors and form submissions; the pull
zone's cache-error setting will then amplify it by caching those 403s).
See README "Bunny CDN" for the dashboard steps.

Legacy WordPress URLs are handled host-neutrally by the `redirects` map in
`astro.config.mjs` (served by every adapter, including the standalone Node
server on Coolify/Docker) and additionally by `public/_redirects`, which
Netlify's CDN reads directly from the publish dir: `/opt-out-preferences/*`,
`/team-member-page-design/`, and `/author/*` 301 to their closest equivalents.
All other migrated WP URLs map 1:1 onto existing routes.

Analytics: GA4 loads via a single inline script rendered at the end of
`<body>` in `src/layouts/Base.astro`, gated on `import.meta.env.PROD` **and**
Netlify's `CONTEXT` being `production` (or unset) — see the
`NODE_ENV=production` note under "Build and dev commands". Netlify deploy
previews and branch deploys build with `NODE_ENV=production` but get
`CONTEXT=deploy-preview`/`branch-deploy`, so that traffic is **excluded**;
local dev is also excluded. The
measurement ID comes from `PUBLIC_GA_ID` (defaults to `G-ZREVRSHYJB`). The
inline script starts the `dataLayer` queue immediately (so the initial
`page_view` and `<ClientRouter/>` re-fires are captured from page load), but
the **gtag.js library itself is interaction/idle-gated**: it is injected on
the first `pointerdown`/`keydown`/`scroll`/`touchstart` or after a 6 s idle
fallback, because its bootstrap does forced-reflow layout queries (~150 ms in
PSI traces) that no script placement can avoid. The script carries
`data-astro-rerun` so navigations keep sending pageviews; a
`window.__gaLoaderBound` guard (window survives ClientRouter swaps) keeps the
loader from double-binding on reruns.

Environment variables (see `.env.example`):

- `SITE_URL` — production URL for sitemap/RSS/OpenGraph. Most platforms inject
  a fallback URL; **Cloudflare Workers does not — set `SITE_URL` there**; set
  it on Coolify too (`COOLIFY_URL` is only a fallback).
- `PUBLIC_TINA_CLIENT_ID`, `TINA_TOKEN` — TinaCloud credentials, required for
  `pnpm build` (including the Coolify Docker build).
- `PUBLIC_GA_ID` — optional GA4 measurement ID override (default
  `G-ZREVRSHYJB`).
- `SIERRA_API_KEY` — Sierra lead-forwarding key for the `/api/contact`
  endpoint (all platforms). Never commit its value or prefix it with
  `PUBLIC_`; on Coolify keep its Build Variable flag off (runtime-only).
- `CONTACT_ALLOWED_ORIGINS` — optional comma-separated list of extra origins
  allowed to submit the contact form, besides `SITE_URL`, the platform URL
  envs, and the hardcoded brand/localhost origins (`https://thelippincottteam.com`,
  `https://www.thelippincottteam.com`, `localhost:4321/4322`) — e.g. staging
  Bunny edge hostnames. The `/api/contact` endpoint's browser CSRF guard
  rejects POSTs whose `Origin` is not allowlisted ("Cross-origin form
  submissions are not allowed.").
- `BUNNY_API_KEY` + `BUNNY_PULL_ZONE_ID` — Bunny CDN cache purging: the
  Docker entrypoint purges the pull zone on container start (every Coolify
  deploy), after the local readiness probe passes. `BUNNY_API_KEY` is a secret — never commit it or prefix it with
  `PUBLIC_`; keep its Build Variable flag off. Both are optional (no-op
  when unset).
- `BUNNY_PURGE_SECRET` — shared secret authorizing the `/api/bunny-purge`
  webhook (per-page Bunny cache purges between deploys). Generate with
  `openssl rand -hex 32`; never commit it or prefix it with `PUBLIC_`; on
  Coolify keep its Build Variable flag off. Optional (the endpoint answers
  503 without it).
- `DEPLOY_ADAPTER` — optional adapter override.
