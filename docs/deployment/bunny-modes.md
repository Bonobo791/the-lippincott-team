# Bunny delivery modes

You can serve images, videos and downloads through Bunny while Coolify serves the website. The existing whole-site CDN setup remains the default.

| Build setting | `full-site` (default) | `media-only` |
| --- | --- | --- |
| `PUBLIC_CDN_MODE` | `full-site`, absent or blank | `media-only` |
| `PUBLIC_MEDIA_URL` | Unused | HTTPS media origin, e.g. `https://media.thelippincottteam.com` |
| Website DNS | Main Bunny Pull Zone | Coolify server |
| Owned uploads | `/uploads/...` through the main zone's Storage origin rule | `https://media.thelippincottteam.com/uploads/...` |
| Deployment purge | Media zone, then main site zone | Media zone only |

The media hostname above is a proposed example. Use the actual hostname configured on the Storage zone's linked Pull Zone. It must have HTTPS and contain no directory, query, fragment or credentials. The build rejects an invalid media-only configuration.

## Coolify

Keep the Dockerfile build pack, exposed port `4321`, existing health check and Tina credentials. Set `SITE_URL=https://thelippincottteam.com` at **build and runtime** in both modes. It remains the canonical website URL, including for sitemap/RSS/social metadata and the contact origin allowlist. Keep a stable direct HTTPS Coolify hostname for origin traffic and deployment-marker checks.

Set `PUBLIC_CDN_MODE` and, for media-only, `PUBLIC_MEDIA_URL` as build variables. The Dockerfile forwards them into Astro. Rebuild and redeploy after changing either value. Runtime overrides do not change the compiled renderer or the build record.

Enable **Include Source Commit in Build** so `SOURCE_COMMIT` identifies the release. Keep `BUNNY_PURGE_ON_START` off when GitHub Actions handles purges; media-only builds skip website startup purges even if that flag is set. Leave Sierra/contact secrets runtime-only. No storage volume or Storage upload credential is needed by the app to display public media.

## Bunny zones and DNS

### Media-only

1. Create or use the Storage zone and its linked media Pull Zone. Upload files with the `uploads/` prefix described below.
2. Use the linked zone's `*.b-cdn.net` hostname or add a custom hostname such as `media.thelippincottteam.com`. Create the DNS record Bunny supplies and enable HTTPS before deploying media-only pages.
3. Point the public website hostname to Coolify and confirm its HTTPS certificate. The main website Pull Zone is unused for website traffic in this mode.
4. Test a real image and an MP4 at `/uploads/...` on the media hostname. Confirm video seeking with a byte-range request returning `206 Partial Content` and a correct `Content-Range`.

Ordinary image/video display does not require broad CORS permissions. Configure CORS for specific uses that need it, such as canvas access or JavaScript fetching media.

### Full-site

Keep the main Pull Zone origin on the direct Coolify HTTPS hostname. Set its origin Host header to the hostname Coolify routes. Preserve the full path when forwarding uploads to the linked Storage media hostname, with the correct Host header for that origin.

Order rules so these take precedence over HTML caching:

1. Bypass caching for `/api/*`, `/tina-island/*`, `/admin/*`, `/__moderaty_commit.txt` and `/__bunny_config.json`, including query strings.
2. Route `/uploads/*` to the linked media Pull Zone and cache for 30 days.
3. Cache content-hashed `/_astro/*` assets for one year.
4. Cache HTML pages for ten minutes.

Keep Block Root Path Access, Block None Referrer and Block POST Requests off on the website zone. Preserve the contact endpoint's own origin and abuse protections. Check both media and main uploads caches after overwriting files.

## Publishing media

CMS content keeps its original `/uploads/...` paths. New Tina repository uploads go under `public/uploads`; root logos and icons keep their existing paths. Tina's external preview URLs remain supported while editors work.

Upload the directory so a repository file such as `public/uploads/2026/08/tomball-isd.mp4` becomes **`uploads/2026/08/tomball-isd.mp4`** in Storage. If your existing zone has `2026/...` at its root, copy/upload the prefixed paths first and retain the old objects during migration.

1. Upload newly referenced media before deploying the pages that use it.
2. Verify the public media URL, MIME type, image/video rendering and video range support.
3. For replacements at the same path, purge the linked media zone after upload. In full-site mode also purge the main zone's uploads cache, after the media purge.
4. Deploy the website release, then let the deployment workflow invalidate the configured caches once its build records match.

Publishing stays manual in this release. There is no automatic Storage uploader, and a matching deployment marker does not prove that you uploaded a file. Keep repository media and Docker copies through rollout and rollback. Media-only URLs do not automatically fall back to those copies when Bunny is unavailable.

## GitHub purge settings

Store credentials under repository **Secrets and variables → Actions**:

| Secret | Purpose |
| --- | --- |
| `BUNNY_ORIGIN_URL` | Direct HTTPS Coolify origin, in either mode |
| `BUNNY_MEDIA_API_KEY`, `BUNNY_MEDIA_PULL_ZONE_ID` | Linked media Pull Zone credentials |
| `BUNNY_API_KEY`, `BUNNY_PULL_ZONE_ID` | Main website Pull Zone credentials for full-site |
| `SITE_URL` | Optional polling fallback; prefer the direct origin above |

Use zone-scoped purge keys where available. A Storage upload password is a separate credential and is not a purge key. Keep Bunny keys out of public variables, build arguments, CMS content and source control.

The workflow calls `node scripts/bunny-purge.mjs --deploy-purge <full-sha> --origin <direct-origin> --timeout 1800`. It waits until both `/__moderaty_commit.txt` and `/__bunny_config.json` identify that commit, then selects the zones from the deployed record. Media invalidation precedes website invalidation. A failed configured purge stops the sequence.

Set repository variable `BUNNY_PURGE_REQUIRED=true` after configuring the selected mode's credentials. Required media-only purges need the media pair; required full-site purges need both pairs. The script validates all applicable pairs before sending a purge. Optional missing pairs warn and skip; partial pairs fail. Existing site-only full-site installations retain their website purge with a warning that the media layer was not invalidated.

The protected `/api/bunny-purge` page endpoint still works in full-site mode. Media-only builds return `503` with an explanation because they have no Bunny website cache. Use the deployment tooling for media invalidation. Legacy manual CLI full-zone, URL and `--wait-for-commit` commands remain available with their existing site credentials.

## Switching and rollback

Prepare and verify the destination media URLs before changing the build. Deploy the selected flags, inspect both build records at the direct origin, and update public website DNS if the delivery route changes. Confirm TLS at the website, direct origin and media hostname, then test representative pages and the contact form. Allow DNS propagation; visitors may reach either route during the switch.

To roll back, rebuild with the previous mode/media origin and restore the previous website DNS routing. Retain the main Pull Zone, prefixed Storage objects and local media until both routes have passed verification.

## Verification

Run the repository suite and Astro check. Build once without the new variables, then once with media-only and a non-routable fixture origin; the fixture build must not fetch that host:

```sh
pnpm test
pnpm exec astro check
SITE_URL=https://thelippincottteam.com pnpm build:local
BUNNY_AUDIT_DIST=dist/client node --test scripts/media-output.test.mjs
SITE_URL=https://thelippincottteam.com PUBLIC_CDN_MODE=media-only PUBLIC_MEDIA_URL=https://media.example.invalid pnpm build:local
BUNNY_AUDIT_DIST=dist/client node --test scripts/media-output.test.mjs
```

For the first build, unset `PUBLIC_CDN_MODE` and `PUBLIC_MEDIA_URL` in the shell and local `.env`. The PR workflow checks both explicit modes. The output auditor inspects semantic media attributes and structured images, excluding Tina admin bundles and examples in scripts/prose.

Astro retains its current dimensions and image service. Bunny-hosted uploads pass through remote `<Image>` sources; do not add the Bunny media hostname to Sharp's remote transformation allowlist, which could move them back to app-hosted `/_astro` output. This change does not enable Bunny Optimizer, adaptive streaming or responsive resizing.

Before production rollout, verify real Bunny image/video delivery, DNS/TLS, both cache layers, the GitHub purge workflow and a TinaCloud editor session. Confirm selecting/uploading media saves `/uploads/...`, unsaved previews render, and island responses retain editing metadata. Local fixtures do not establish those external checks.
