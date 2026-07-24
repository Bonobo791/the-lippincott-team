# Hosting this site on Netlify — research notes

Scope: Astro 7 + TinaCMS (`lippincott-team-astro-tina`), moving from Cloudflare Workers
(`wrangler.jsonc`) to Netlify. Sources: official Astro docs, official TinaCMS docs,
official Netlify docs, and this repo's own files. Every claim is cited inline.

## Summary recommendation

Netlify already works with this repo **as-is — no code changes required**:

- `@astrojs/netlify` is already a dependency (`package.json:19`) and
  `astro.config.mjs` auto-detects Netlify via the `NETLIFY=true` build env var
  (`astro.config.mjs:35`), which Netlify always sets
  ([Netlify env vars](https://docs.netlify.com/build/configure-builds/environment-variables/)).
- The only thing you must get right is the **build command**: Netlify's Astro
  auto-detection suggests `astro build`
  ([Astro deploy guide](https://docs.astro.build/en/guides/deploy/netlify/)),
  which would **skip `tinacms build`** (no admin UI, no generated client). Set the
  build command to `pnpm build` and publish directory to `dist` — ideally via a
  committed `netlify.toml`, which takes precedence over UI settings
  ([TinaCMS Netlify doc](https://tina.io/docs/tinacloud/deployment-options/netlify)).
- Set `PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN` in the Netlify UI (scope: Builds).
  `SITE_URL` is optional — `astro.config.mjs:49` already falls back to Netlify's
  injected `URL`.
- No runtime flag needed for `node:async_hooks` (unlike Cloudflare's
  `nodejs_compat`): Netlify Functions run full Node.js on AWS Lambda.
- On the TinaCloud side, add the production Netlify URL (and optionally a glob for
  preview URLs) to the project's **Site URL(s)**, or editing at `/admin` won't work
  there ([TinaCloud projects doc](https://tina.io/docs/tinacloud/dashboard/projects)).

Suggested `netlify.toml` (not required, but removes reliance on UI settings):

```toml
[build]
  command = "pnpm build"
  publish = "dist"
```

## 1. Adapter

**Is `@astrojs/netlify` required?** Yes, for this project. The Astro adapter doc
says pure static sites need no adapter, "unless you use additional Netlify services
that require a server" — but this repo has one on-demand route,
`src/pages/tina-island/[name].ts` (`export const prerender = false`, line 12), so
an adapter is mandatory. TinaCMS's own visual-editing doc states this explicitly:
"You need an SSR adapter… Set `adapter` in `astro.config.mjs` to `@astrojs/node`,
`@astrojs/vercel`, **`@astrojs/netlify`**, or `@astrojs/cloudflare`"
([Visual Editing Setup for Astro](https://tina.io/docs/contextual-editing/astro)).

**Does the auto-detection handle Netlify correctly?** Yes.
`astro.config.mjs:19` lazy-imports `@astrojs/netlify` (pinned `^8.1.2` in
`package.json:19`) and `astro.config.mjs:35` selects it when `process.env.NETLIFY`
is set; Netlify defines `NETLIFY=true` as a read-only build variable
([Netlify env vars — read-only](https://docs.netlify.com/build/configure-builds/environment-variables/)).
`DEPLOY_ADAPTER=netlify` also works as an override (`astro.config.mjs:26`,
`.env.example`).

**Config for `output: 'static'` + on-demand endpoint?** None needed.
With the default adapter options, on-demand routes are deployed as **Netlify
Functions** (serverless, Node.js) — "On Netlify, on-demand rendering is powered by
Netlify Functions"
([Netlify Astro guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/astro/)).
The `middlewareMode: 'edge'` option exists but is only relevant if you want
middleware to run on prerendered pages at the edge; the Tina middleware only needs
to run on the on-demand island route, so the default is fine
([Astro Netlify adapter doc](https://docs.astro.build/en/guides/integrations-guide/netlify/)).

Two free bonuses from the adapter, both relevant here:

- Astro `redirects` config (`astro.config.mjs:59`, `/home` → `/`) is translated to
  a `dist/_redirects` file only when the adapter is present (adapter doc,
  "Static sites with the Netlify Adapter").
- The adapter uses Netlify Image CDN for `<Image>` by default; remote images need
  authorization via `image.remotePatterns`/`image.domains` — already configured
  for `assets.tina.io` at `astro.config.mjs:77`, matching exactly what the adapter
  doc requires.

## 2. Runtime (`node:async_hooks` on Netlify Functions)

**Supported, no flag needed.** Netlify Functions run on AWS Lambda's Node.js
runtime: "the default functions runtime is based on the Node.js version used for
the build… must be a valid AWS Lambda runtime for Node.js" — otherwise it falls
back to Node.js 24
([Netlify functions configuration](https://docs.netlify.com/build/functions/configuration/)).
This repo's `.nvmrc` pins `22.22.0`, and Netlify honors `.nvmrc`/`NODE_VERSION`
for the build ([manage dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies/)),
which then propagates to the functions runtime. Unlike Cloudflare Workers — where
`wrangler.jsonc` needed `nodejs_compat` to expose `node:async_hooks` (see the
comment in `wrangler.jsonc:3-4`) — AWS Lambda runs full Node.js, so
`AsyncLocalStorage` works out of the box. Corroborated by Netlify's own changelog
on the `async_hooks` DoS CVE, which discusses Netlify Functions/apps using
`async_hooks` as a normal capability
([Netlify changelog, 2026-01-16](https://www.netlify.com/changelog/2026-01-16-nodejs-async-hooks-dos-vulnerability/)).

If you ever need to pin the functions runtime explicitly, set
`AWS_LAMBDA_JS_RUNTIME` (e.g. `nodejs24.x`) — but **only via the Netlify UI/CLI/API,
never `netlify.toml`** ([functions configuration](https://docs.netlify.com/build/functions/configuration/)).

## 3. Build command on Netlify

- **Build command:** `pnpm build` (= `tinacms build --content=local -c "astro build"`,
  `package.json:10`). **Publish directory:** `dist`. Netlify auto-detects Astro and
  pre-fills `astro build` + `dist`
  ([Astro deploy guide](https://docs.astro.build/en/guides/deploy/netlify/)) —
  the publish dir is right, but the command must be overridden, or the Tina admin
  (`public/admin`, per `tina/config.ts:23-26`) and the generated client are never
  built. TinaCMS's Netlify doc says the same: if your `package.json` build script
  already wraps `tinacms build`, point Netlify at it; and "if your project has a
  `netlify.toml` with a build command set, that will take precedence over the
  build command UI"
  ([TinaCMS → Deploying to Netlify](https://tina.io/docs/tinacloud/deployment-options/netlify)).
- **pnpm:** auto-detected — "If your site's base directory includes a
  `pnpm-lock.yaml` file, we will run `pnpm install`"
  ([manage dependencies](https://docs.netlify.com/build/configure-builds/manage-dependencies/)).
  `pnpm-lock.yaml` is present. Note `package.json` has **no `packageManager`
  field**, so Netlify uses its default pnpm version; add
  `"packageManager": "pnpm@<version>"` if you need an exact pin (Corepack
  limitation: exact versions only, no semver ranges).
- **`--content=local` in CI:** per the CLI reference, it indexes content into an
  in-memory data layer for the build, makes **zero TinaCloud Content API calls**
  during page generation, but still generates the **production** TinaCloud client —
  "Because the generated client is the production client, `branch`, `clientId`,
  and `token` must be configured in your Tina config, the same values you would
  use for a normal `tinacms build`"
  ([TinaCMS CLI overview](https://tina.io/docs/cli-overview)). So
  **`PUBLIC_TINA_CLIENT_ID` + `TINA_TOKEN` are required at build time on Netlify
  even with `--content=local`** — matching the `ERR_MISSING_CLOUD_CREDS` behavior
  in AGENTS.md. TinaCloud validation checks (branch status, schema match) still
  run against TinaCloud unless `--skip-cloud-checks` is passed.
- **`netlify.toml` vs auto-detection:** auto-detection is *not* enough (wrong
  build command, see above). Either set the command in the UI or commit a
  `netlify.toml`; the latter is recommended for reproducibility.

## 4. Environment variables

Set in the Netlify UI (scope must include **Builds**):

| Variable | Required? | Why |
|---|---|---|
| `PUBLIC_TINA_CLIENT_ID` | Yes | `tina/config.ts:19`; needed by `tinacms build` and the runtime client |
| `TINA_TOKEN` | Yes | `tina/config.ts:21`; read-only Content token from TinaCloud |
| `SITE_URL` | Optional | `astro.config.mjs:49` already falls back to Netlify's injected `URL` when `NETLIFY` is set. Set it if you want canonicals/sitemap pinned to a custom domain regardless of platform vars. |

Netlify injects ([env vars doc](https://docs.netlify.com/build/configure-builds/environment-variables/)):
`NETLIFY=true`, `URL` (main site address — custom domain if configured),
`DEPLOY_PRIME_URL` (per-deploy/branch/preview URL), `DEPLOY_URL`, `CONTEXT`
(`production` | `deploy-preview` | `branch-deploy` | `dev`), `BRANCH`, `HEAD`
(head branch name from the Git provider), `COMMIT_REF`, `DEPLOY_ID`, etc.

**Branch detection works:** `tina/config.ts:12` reads `HEAD` — explicitly
commented `// Netlify` — and Netlify sets `HEAD` on every build including deploy
previews and branch deploys, falling back to `"main"` only when unset. Note the
current site-URL logic uses `URL` (always the production address), so deploy
previews will emit production canonical/OG URLs — fine for SEO, but switch to
`DEPLOY_PRIME_URL` if you ever want preview-accurate absolute URLs.

Caveat for previews: with `HEAD` set to a feature branch, `tinacms build`'s
TinaCloud validation checks (branch status, schema match) run against **that
branch** in TinaCloud — the branch must exist in the GitHub repo TinaCloud is
connected to. Token branch access can be scoped/wildcarded in the TinaCloud
Tokens tab ([projects doc](https://tina.io/docs/tinacloud/dashboard/projects)).

## 5. TinaCloud-side configuration

From the [TinaCloud projects doc](https://tina.io/docs/tinacloud/dashboard/projects):

- **Site URL(s):** "enter both the local URL and the production site URL… For
  security reasons, Tina will only work at these locations." Only the origin is
  needed. Add `https://<your-site>.netlify.app` (and your custom domain if any).
  **Glob patterns are supported** for preview deployments (the doc's example is
  Vercel-style; the Netlify equivalent would be `https://*--<site>.netlify.app`
  to cover `deploy-preview-N--` and `branch--` subdomains) — verify the exact
  glob against Netlify's URL shape before relying on it.
- **Client ID** comes from the project's Overview tab; the **read-only Content
  token** (= `TINA_TOKEN`) from the Tokens tab. A separate **Search token**
  (write access to the search API) is what `tinacms search-index` uses.
- Repo-based media: "TinaCloud will automatically trigger an initial media sync
  when the project is created," re-syncable from the Media tab. This project uses
  repo-based media (`tina/config.ts:27-32`, `public/`).
- Visual editing in production on a static host works the same as anywhere: the
  admin SPA is just static files (`public/admin` → `dist/admin/index.html`), and
  editing calls the on-demand `/tina-island/[name]` endpoint, which is why the
  adapter + Functions runtime matter
  ([Visual Editing Setup for Astro](https://tina.io/docs/contextual-editing/astro)).

## 6. Gotchas

- **Build ordering** is already correct: `pnpm build` runs `tinacms build … -c
  "astro build"` (`package.json:10`), so `tina/__generated__/` and
  `public/admin` exist before Astro builds. Never let Netlify run bare
  `astro build` (see §3).
- **Search indexing is skipped under `--content=local`** — "Search indexing is
  skipped during the build (a warning is emitted). Reindex separately if you rely
  on search" ([CLI overview](https://tina.io/docs/cli-overview)). If the site
  uses Tina search, run `pnpm build:search` (`tinacms search-index`,
  `package.json:12`) as a separate step, e.g. a post-deploy hook or scheduled
  run, with the Search token available.
- **Static-editing requirements** per the
  [Astro visual-editing doc](https://tina.io/docs/contextual-editing/astro):
  every editable region wrapped in `<TinaIsland>`, `primary` on the main island,
  and `export const prerender = false` on the island endpoint — all satisfied
  (`src/pages/tina-island/[name].ts:12`, registry in `src/lib/islands.ts`).
  Trade-off to be aware of: pages using `<TinaIsland>` ship a one-line inline
  bootstrap script in production HTML (doc, "Static-site editing").
- **Do not enable** the adapter's `cacheOnDemandPages` — the island endpoint is a
  dynamic per-keystroke POST and must never be CDN-cached (option described in the
  [adapter doc](https://docs.astro.build/en/guides/integrations-guide/netlify/);
  default is off).
- **`/admin` on a static host:** the admin is plain static files at
  `dist/admin/index.html`. The `tinaAdminDevRedirect()` Vite plugin
  (`astro.config.mjs:80`) is dev-only, so in production use
  `/admin/index.html` (or add a `/admin` → `/admin/index.html` redirect) — worth
  verifying how the production URL behaves.
- **Sharp/native builds:** `pnpm-workspace.yaml` whitelists build scripts for
  `sharp`, `esbuild`, `better-sqlite3`, etc. (`onlyBuiltDependencies`) — pnpm on
  Netlify respects this file, so image optimization deps should build normally.

## Open questions / things to verify

1. **`@astrojs/netlify` v8 ↔ Astro 7 compatibility** — neither the Astro adapter
   doc nor the Netlify docs state an Astro-version support matrix. The repo
   already pins `^8.1.2` and the doc references features "Added in
   `@astrojs/netlify@8.1.0`", which strongly implies currency, but confirm via a
   real `DEPLOY_ADAPTER=netlify pnpm build:local` + deploy before relying on it.
2. **Deploy-preview editing** — whether TinaCloud's branch indexing + token
   branch wildcards make visual editing work on `deploy-preview-N--` URLs, and
   whether the Site URL glob (`https://*--<site>.netlify.app`) is accepted by
   TinaCloud. Docs confirm globs exist but only show a Vercel example.
3. **`URL` vs `DEPLOY_PRIME_URL`** for canonicals in preview deploys — current
   config always uses the production `URL`. Deliberate? (See §4.)
4. **`/admin` bare-path behavior on Netlify** — whether Netlify's pretty-URL
   handling serves `/admin` as `/admin/index.html` automatically, or a redirect
   rule is needed. Not settled by any primary source consulted.
5. **Function bundling of `@tinacms/astro`** — `astro.config.mjs:86-88` sets
   `vite.ssr.noExternal` for the SSR bundle; whether Netlify's function bundler
   (nft tracing) needs `includeFiles`/`external_node_modules` tweaks for the
   island route can only be confirmed by an actual deploy + an editing session.
