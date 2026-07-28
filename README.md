This is a [TinaCMS](https://tina.io/) starter project.

Edit your site visually in the browser, ship it as fast static HTML.

## Getting started

Create the project:

```sh
pnpm dlx create-tina-app@latest --template tina-astro-starter
```

Install dependencies:

> [!NOTE]
> **[Which package manager is best for Node.js?](https://www.ssw.com.au/rules/best-package-manager-for-node)** The right one makes a real difference to your workflow. We recommend pnpm for its speed and efficient dependency handling, and this SSW rule explains why.

```sh
pnpm install
```

Start the dev server, then edit visually at `localhost:4321/admin/`:

```sh
pnpm dev
```

## Features

- Visual editing via [`@tinacms/astro`](https://www.npmjs.com/package/@tinacms/astro): a vanilla-JS bridge, with no React in the page tree
- Tailwind CSS v4 block builder: Hero, CTA, Features, Stats, Testimonial, Callout, Content, Split, Video, FAQ, TeamGrid, CommunityGrid, and ContactForm
- Markdown and MDX with `<TinaMarkdown>` rich-text rendering
- Collections for Pages, Blog, and global Config
- Astro view transitions, SEO meta, OpenGraph, sitemap, and RSS
- Icons via [`astro-icon`](https://github.com/natemoo-re/astro-icon) and the Tabler set

## Visual quality assurance

Verify frontend changes with a Playwright screenshot loop (see `.agents/skills/visual-loop`): edit code, capture screenshots, view them, compare against the spec, re-shoot until clean.

- `scripts/audit/shoot.mjs`: full-page screenshots of 10 page templates at desktop/tablet/mobile, plus interaction shots (nav dropdown, FAQ accordion, mobile menu); writes `manifest.json` with per-shot console/page errors:

  ```sh
  npx astro dev --port 4322   # in another terminal — separate port, leaving 4321 free for `pnpm preview` gates
  node scripts/audit/shoot.mjs --base http://localhost:4322 --out .launch/qa/round-1
  ```

  Iterate against the dev server (sub-second HMR, no rebuilds per round). Reserve `pnpm build:local` + `pnpm preview` (port 4321) for per-task gates and final evidence shots — see `.agents/skills/visual-loop` for the full fast-path/slow-path split. Note: bare `astro dev` only serves content when the generated Tina client points at TinaCloud (`grep "url:" tina/__generated__/client.ts`); after `pnpm dev` or `pnpm build:local` it's pinned to `localhost:4001`, so run a credentialed `pnpm build` first or use `pnpm dev`.

- `scripts/audit/probe-styles.mjs`: extracts exact `getComputedStyle()` values (colors, font sizes, spacing, container widths) from any base URL into JSON, for numeric comparison against a design spec or the live site.
- Control the browser interactively (click through states, inspect elements) with `npx playwright cli --browser=chromium` (system Chrome is not installed; use the bundled Chromium).

Playwright and its Chromium browser ship in `devDependencies`; no separate install is needed. Git ignores the quality-assurance artifact dirs `.launch/` and `.playwright-cli/`.

## Deploying

The starter is host-neutral: it isn't tied to any one platform. Every content page is prerendered to static HTML; the only on-demand route is the `/tina-island` endpoint that powers live visual editing.

`astro.config.mjs` picks the right adapter automatically from the platform's build environment: [Vercel](https://docs.astro.build/en/guides/integrations-guide/vercel/), [Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) (Pages or Workers) and [Netlify](https://docs.astro.build/en/guides/integrations-guide/netlify/) are detected and configured with no changes, and anywhere else falls back to a portable [Node](https://docs.astro.build/en/guides/integrations-guide/node/) server you can run with `node ./dist/server/entry.mjs`. The bundled `wrangler.jsonc` targets Cloudflare Workers and enables `nodejs_compat`, which the editing route's `node:async_hooks` needs.

Set `SITE_URL` to your production URL; it populates the sitemap, RSS, and OpenGraph tags (see `.env.example`). Most platforms inject their own deploy URL as a fallback, but Cloudflare Workers exposes none, so set `SITE_URL` there to avoid `localhost` canonicals.

### Before your first deploy: TinaCloud credentials

The default `pnpm build` compiles the CMS against TinaCloud, so it needs your project credentials. Without them it fails fast with `ERR_MISSING_CLOUD_CREDS`. Create a project at [app.tina.io](https://app.tina.io), then set `PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN` (see `.env.example`) in your host's environment variables.

To build without TinaCloud (a purely local/offline build with no auth), run `pnpm build:local` instead, which skips the cloud checks.

## A note on React

`react` and `react-dom` are both pinned to the same version (`^19.2.7`) in `devDependencies` for the TinaCMS admin UI build only; the site itself ships zero React. The pin keeps the two packages locked in lockstep; without it, pnpm's peer auto-install can pair mismatched `react` / `react-dom` versions and the admin crashes on init (`Cannot read properties of undefined (reading 'ReactCurrentDispatcher')`). This is tracked in [tinacms#6985](https://github.com/tinacms/tinacms/issues/6985); remove the pin once Tina declares `react` / `react-dom` as direct dependencies.

## Want to learn more?

Read the [TinaCMS documentation](https://tina.io/docs) and the [Astro documentation](https://docs.astro.build), or come and say hello in the [TinaCMS Discord server](https://discord.gg/cG2UNREu).
