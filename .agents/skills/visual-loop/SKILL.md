---
name: visual-loop
description: Iterative visual QA loop for frontend changes in this repo — edit code, screenshot with Playwright, view the PNGs, compare against the spec/baseline, fix, re-shoot until clean. Use when the user asks to make design/frontend/CSS changes and verify them visually, match a design spec, or iterate on page appearance.
---

# Visual iteration loop

Close the loop between code changes and rendered output. Never declare a
frontend change done from reading code — only from viewed screenshots.

## Setup (once per session)

1. Start the dev server in the background: `npx astro dev --port 4322`
   (skip `pnpm dev` — TinaCMS is not needed for screenshots). Use a **separate
   port** (4322), leaving 4321 free for the `pnpm preview` gate server. This
   is the iteration target; see "Fast path vs slow path" below for when a
   production build + preview server is required instead.
2. Poll `curl -sf http://localhost:4322/` until it responds.
3. Playwright + Chromium are already installed (`playwright` devDependency,
   browser verified working). No setup needed.

## Fast path vs slow path

**Fast path — iterate against `npx astro dev` (the default).** Component and
CSS edits hot-reload in under a second; no build between screenshot rounds.
This is the right target for styling/design iterations (edit → screenshot →
view → fix). Use explicitly `npx astro dev --port 4322` — never `pnpm dev`,
which wraps the heavy Tina dev stack. Run it on a **separate port** (4322)
so a `pnpm preview` gate server can live on 4321 at the same time; point
`shoot.mjs --base` at whichever server the round targets.

**Prerequisite:** the fast path only works when the generated Tina client
points at TinaCloud. Both `pnpm dev` and `pnpm build:local` leave
`tina/__generated__/client.ts` pinned to `http://localhost:4001/graphql`
(the local content server only `tinacms dev` hosts) — bare `astro dev` then
fails every query with `ECONNREFUSED` and pages 404. Check with
`grep "url:" tina/__generated__/client.ts`. If it says `localhost:4001`,
either run a credentialed `pnpm build` (regenerates the client against
TinaCloud) or fall back to `pnpm dev` for that session.

**Slow path — `pnpm build:local` + `pnpm preview` (gates only).** Still
required, but only at specific moments:

- **Per-task commit gates** — the build must be green before committing; it
  also type-checks via Tina codegen and catches content/schema errors that
  dev mode tolerates.
- **Tina schema changes** — regenerating `tina/__generated__/` and the lock
  only happens through the Tina build.
- **Production-only behavior** — `compressHTML` whitespace handling, GA4
  snippet gating, island endpoint rendering. Dev mode is not a faithful
  production render for these.
- **Final evidence shots** — take them against the production build so the QA
  evidence matches what ships.

Rule of thumb: iterate on the dev server; build + preview once per task as
the gate and for final shots.

## The loop

1. **Baseline first.** Before editing, capture the current state so every later
   shot can be compared against it:
   `node scripts/audit/shoot.mjs --base http://localhost:4322 --out .launch/qa/base`
   If the spec is the live site, also shoot it once:
   `node scripts/audit/shoot.mjs --base https://lippincottteam.com --out .launch/qa/live`
2. **Edit** the frontend code.
3. **Re-shoot** into a fresh round dir:
   `node scripts/audit/shoot.mjs --base http://localhost:4322 --out .launch/qa/round-N`
4. **View the PNGs with ReadMediaFile** — every changed template at desktop AND
   mobile. Reading manifest.json is not a substitute for looking at the images.
   Full-page shots are downsampled; re-read with the `region` parameter to
   inspect fine detail at full fidelity.
5. **Compare against the spec:**
   - Layout/composition: judge from the viewed screenshots.
   - Exact values (colors, font sizes, spacing, container widths): run
     `node scripts/audit/probe-styles.mjs --base <url> --out .launch/qa/<name>.json`
     and diff numbers, not pixels.
6. **Check `manifest.json`**: console errors, page errors, and bad HTTP statuses
   must be zero.
7. Fix and repeat from step 2. Do not cap rounds; the cap is "clean".

## Done means

- Every affected template viewed as an image at desktop and mobile.
- Spec values confirmed via probe-styles output where the spec is numeric.
- Zero errors in the round's `manifest.json`.
- Final evidence screenshots taken against the production build
  (`pnpm build:local` + `pnpm preview`) and left on disk under `.launch/qa/`
  as evidence.

## Notes

- `scripts/audit/shoot.mjs` covers 10 templates; if the change touches only one
  page, it is fine to also grab a quick single-page shot with
  `npx playwright screenshot --full-page --viewport-size=1440,900 <url> out.png`
  for fast iteration, and run the full `shoot.mjs` as the final gate.
- Keep rounds numbered (`round-1`, `round-2`, ...) so before/after comparisons
  stay on disk.
- Long loops: delegate fix-and-reshoot rounds to a sub-agent to keep the main
  context lean.
- Interactive exploration (click through states, inspect one element, debug a
  specific interaction): use the `playwright-cli` skill — `npx playwright cli`
  with `--browser=chromium` (system Chrome is not installed). Its YAML
  accessibility snapshots complement the PNG screenshots.
