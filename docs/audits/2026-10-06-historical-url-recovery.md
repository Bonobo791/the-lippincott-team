# Historical URL recovery

The patch recovers two historical URLs with exact HTTP 301 redirects:

| Historical path | Destination |
| --- | --- |
| `/agents/amy-lippincott/` | `/about/amy-lippincott-2/` |
| `/contact/` | `/contact-us/` |

Both destinations exist in the repository. Public browsing on October 6, 2026 returned the [Amy bio](https://thelippincottteam.com/about/amy-lippincott-2/) and [contact page](https://thelippincottteam.com/contact-us/) at these URLs. The supplied audit summary reported 200 responses and self-canonicals for the destinations, and a www-to-non-www 302 followed by a 404 for the historical URLs. Direct HTTP probes from this execution environment failed at the outbound proxy, so those live status chains could not be independently refreshed. One browser retrieval of the www Amy URL used a last-month crawl that resolved to Sierra's bio; that cached result is insufficient to establish today's host behavior.

## Redirect behavior

Exact on-demand Astro endpoints emit 301 responses on the Node adapter and other server adapters. Existing legacy URL families already use this endpoint pattern. The new endpoints retain `url.search` without decoding or rebuilding it, including repeated keys and empty values. The `Location` header contains no fragment, so browsers inherit the original fragment. The destination stays fixed even when query values contain another URL.

The endpoints mirror exact rules in `public/_redirects`. Netlify documents [query passthrough for 301 redirects and matching with either trailing-slash form](https://docs.netlify.com/manage/routing/redirects/redirect-options/). No wildcard rule was added.

The Astro config redirect renderer in the installed Astro 7.2.8 package does not append the request query to its destination. These query-preserving endpoints therefore handle the two paths instead of adding entries to the config redirect map. The existing host/domain normalization remains outside this patch.

## Deferred URLs

`/property-search/search-form/` remains a 404. The current navigation already links to [Sierra's results page](https://www.thelippincottteamlistings.com/property-search/results/), and public browsing returned that page. Requests with filters could not be verified. A permanent redirect needs evidence that the old query names and values still select the intended search, or an explicit decision about unsupported parameters.

Neither of these property-detail URLs has a confirmed equivalent:

- `/property-search/detail/70/50208824/4710-oakbluff-court-fulshear-tx-77441/`
- `/property-search/detail/70/50914160/5623-sycamore-creek-drive-houston-tx-77345/`

Public browsing could not retrieve the same detail paths on Sierra. That does not prove the listings expired, but it does leave their equivalents unresolved. Both retain 404 responses. A generic search page or homepage would not establish property equivalence.

## Reproduce validation

Use Node >=22.22.0 and the pinned pnpm 10.34.5. The environment required IPv4-first DNS for Tina's local database connection and disabled Astro telemetry to avoid a write outside the workspace:

```sh
ASTRO_TELEMETRY_DISABLED=1 NODE_OPTIONS=--dns-result-order=ipv4first \
  SITE_URL=https://thelippincottteam.com DEPLOY_ADAPTER=node pnpm build:local
pnpm test
ASTRO_TELEMETRY_DISABLED=1 pnpm exec astro check
node scripts/check-tina-schema.mjs
HOST=127.0.0.1 PORT=4321 node dist/server/entry.mjs
```

In a second terminal:

```sh
# Use Playwright's installed Chromium, or supply a system Chromium path.
LEGACY_REDIRECTS_CHROMIUM=/usr/bin/chromium \
  node --test scripts/audit/legacy-redirects.test.mjs
```

`LEGACY_REDIRECTS_BASE` overrides the local test origin. The runtime suite verifies GET/HEAD, both slash forms, a single 301 followed by 200, destination canonicals, browser fragment/query inheritance, unrelated 404s, and the existing contact thank-you route. It blocks third-party browser requests.

Before implementation, the ten unit tests failed for missing endpoints/rules. The local production baseline returned 404 for both historical paths: four runtime/browser tests failed as expected, while unrelated-path and existing-destination tests passed. Baseline `pnpm test` passed 141 tests.

Final validation passed `pnpm test` (151 tests) and all six HTTP/browser checks against the rebuilt Node server. `pnpm build:local`, the Tina schema check, and the unchanged Tina lock check passed. The emitted Netlify `_redirects` file matches the source. `astro check` reported zero errors, zero warnings, and three existing hints in `probe-styles.mjs`, `Footer.astro` (InLinks), and `SplitHeading.astro`. Independent code review found no critical, important, or minor findings. Logs are in the ignored `.launch/url-recovery/` directory.

The optional Library audit PDF and workbook could not be materialized through the supported helper, so their bytes were not read or verified. The project references `.agents/skills/`, but that directory is absent in this checkout. Codacy's local runner is not installed; its gate reports a skip. SonarQube tools are not available in this session. No credentials were accessed.
