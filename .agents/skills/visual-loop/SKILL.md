---
name: visual-loop
description: Iterative visual QA loop for frontend changes in this repo — edit code, screenshot with Playwright, view the PNGs, compare against the spec/baseline, fix, re-shoot until clean. Use when the user asks to make design/frontend/CSS changes and verify them visually, match a design spec, or iterate on page appearance.
---

# Visual iteration loop

Close the loop between code changes and rendered output. Never declare a
frontend change done from reading code — only from viewed screenshots.

## Setup (once per session)

1. Start the dev server in the background: `npx astro dev --port 4321`
   (skip `pnpm dev` — TinaCMS is not needed for screenshots).
2. Poll `curl -sf http://localhost:4321/` until it responds.
3. Playwright + Chromium are already installed (`playwright` devDependency,
   browser verified working). No setup needed.

## The loop

1. **Baseline first.** Before editing, capture the current state so every later
   shot can be compared against it:
   `node scripts/audit/shoot.mjs --base http://localhost:4321 --out .launch/qa/base`
   If the spec is the live site, also shoot it once:
   `node scripts/audit/shoot.mjs --base https://lippincottteam.com --out .launch/qa/live`
2. **Edit** the frontend code.
3. **Re-shoot** into a fresh round dir:
   `node scripts/audit/shoot.mjs --base http://localhost:4321 --out .launch/qa/round-N`
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
- Final screenshots left on disk under `.launch/qa/` as evidence.

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
