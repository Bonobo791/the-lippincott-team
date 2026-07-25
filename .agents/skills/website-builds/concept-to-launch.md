---
name: concept-to-launch
description: >
  End-to-end pipeline that takes a new CRO-optimized website from concept to a screenshot-verified preview: locked brief, reference-driven art direction (musepool), conversion copy (copywriting), build (webapp-building / backend-building or single-file HTML), mandatory screenshot-based visual QA, delivery. Use when the user asks to build, create, or design a NEW website, landing page, marketing site, or client site from scratch or from a one-line idea. Triggers: "build me a website", "new landing page", "concept to launch", "CRO-optimized site", "client site from scratch", "amazing website for my business", "take this from idea to a live preview". Enforces user sign-off gates before building and viewed-screenshot verification before delivery. Not for edits to an existing site.
---

# Concept to Launch

Take a website from a one-line idea to a screenshot-verified, CRO-optimized preview through six gated stages. Each stage writes its output to the project's `.launch/` directory so progress survives context compaction and session breaks.

## Pipeline

```
G0 Brief lock -> G1 Art direction -> G2 Conversion copy -> G3 Build -> G4 Screenshot QA -> G5 Ship
   sign-off        sign-off           sign-off             autonomous  autonomous
```

- G0-G2 each end in explicit user sign-off (use the harness's structured-question tool when available). Never start G3 without an approved brief, art direction, and copy.
- G3-G5 run autonomously once G2 is approved. Report at gate transitions only; between gates, work without interruption.
- Stages name a sub-skill. Read that skill's SKILL.md before starting the stage. If it is not installed in the current harness, apply the stage's documented fallback instead.

## Hard rules

1. Never skip or compress G4. A site is not done until screenshots at desktop AND mobile widths have been captured, actually viewed as images, and every issue found has been fixed and re-shot.
2. Never declare a site finished from reading code alone. Viewed screenshots are the definition of done.
3. Design decisions come from external references, never from imagination (G1). If musepool is unavailable, gather references by web search. Do not regress to default AI aesthetics (muddy blue-purple gradients, emoji/Font-Awesome icon boxes, card-in-card nesting, centered hero + two CTAs + three feature cards, decorative marquees and fade-in-up).
4. Create `.launch/` in the project root and write: `brief.md`, `art-direction.md`, `copy.md`, `qa/` (screenshots + manifest). Do not commit to the user's git unless asked.
5. One primary conversion action per site. Every CTA on the page drives it.

## G0 - Brief lock

Produce a one-page brief the user explicitly approves. Ask in a single batched structured-question round, skipping anything already answered:

- Business/offer in one sentence, and the primary conversion action (book call, buy, sign up, WhatsApp, etc.)
- Target audience and their top pain
- Differentiator and any proof assets (numbers, testimonials, logos, case results)
- Brand constraints: colors, fonts, logo, tone; reference sites they love or hate
- Scope: pages/sections, language(s), deadline-critical constraints

Write `.launch/brief.md` (checklist: references/gates.md#G0), present it, get sign-off.

## G1 - Art direction

Sub-skill: **musepool** - read its SKILL.md and follow its recall -> fetch -> synthesize flow. Fallback if absent: web-search 5-8 award-winning or category-leading sites in the client's and adjacent industries; extract concrete constraints (palette hex values, type pairings, layout structures, motion patterns) into notes before designing anything.

Write `.launch/art-direction.md`: palette with hex values sourced from references, type pairing + scale, layout concept per section, motion budget (exactly what moves and why), imagery plan (code-drawn vs external-verified vs typographic), and the single named wow moment. Present one recommended direction, optionally one alternative, for sign-off (checklist: references/gates.md#G1).

## G2 - Conversion copy

Sub-skill: **copywriting** - read its SKILL.md first. Fallback: write directly against the CRO checklist in references/gates.md#G2.

Write the complete page copy to `.launch/copy.md`, section by section, in the conversion flow: hero (outcome-led headline + subhead + primary CTA) -> proof -> mechanism/benefits -> offer or pricing -> objection handling (FAQ / guarantee / risk reversal) -> final CTA. No placeholder text, no lorem ipsum. Get sign-off.

## G3 - Build

Choose the stack from the brief:

- Marketing/landing site, no persistence -> single-file HTML, or a React project via the **webapp-building** skill (read its SKILL.md first) when the brief calls for rich interaction.
- Any persistence (accounts, form submissions stored server-side, bookings, orders) -> read **backend-building** after webapp-building. Never present localStorage or mock data as real persistence; if staying frontend-only, say so explicitly.

Implementation rules: realize the approved art direction exactly - do not downgrade reference techniques to save effort; use `.launch/copy.md` verbatim (adjust only for line breaks); every section from the brief is present; fonts must actually render the page's languages.

## G4 - Screenshot QA (mandatory, non-negotiable)

1. Serve the site locally (dev server, or `python3 -m http.server` for static HTML).
2. Ensure screenshot capability exists - see "Screenshot capability" below.
3. Capture: `python3 <skill-dir>/scripts/screenshot.py <url> --out .launch/qa` where `<skill-dir>` is the directory containing this SKILL.md (in Kimi Code CLI, `${KIMI_SKILL_DIR}` expands to it).
4. View every PNG produced. Reading manifest.json is not a substitute for looking at the images.
5. Audit against the G4 checklist in references/gates.md#G4: render integrity (fonts, images, overflow, contrast), CRO hierarchy (primary CTA above the fold on both viewports, proof adjacent to claims), and zero console/page errors in the manifest.
6. Fix and re-shoot until clean at desktop and mobile. Typical loop is 2-4 rounds; do not cap rounds, cap is "clean".

## G5 - Ship

- Kimi agent (web harness): save a version with the website version manager using the correct type (`html` / `static` / `dynamic`) and present the returned preview URL. Say "saved, ready to preview" - never "deployed" or "live" unless a real publish happened.
- Kimi Code CLI: leave the dev server running (report its URL) or point to the build output; summarize what shipped, where files live, and the QA evidence (paths to final screenshots).

## Screenshot capability

Visual QA requires capturing page screenshots to disk and viewing them.

- **Kimi Code CLI (including the `kimi web` browser UI)**: capture via the Bash tool (requires approval - suggest "Allow for Session"), view via ReadMediaFile (auto-allowed). First run needs Playwright: `pip install playwright && python3 -m playwright install chromium`, or point the script at an existing browser with `--browser-path /usr/bin/chromium` (env var `PLAYWRIGHT_CHROMIUM_PATH` also works). Setup details and MCP alternative: references/kimi-cli.md.
- **Kimi agent (web harness)**: run the same script; view the PNGs with the file-reading tool, which renders images inline.

If neither Playwright nor a Chromium binary can be installed (locked-down machine), stop and tell the user. Do not fake visual QA.

## References

- `references/gates.md` - sign-off and QA checklists for every gate. Read at G0 and again at G4.
- `references/kimi-cli.md` - Kimi Code CLI specifics: skill install locations, approvals, screenshot setup, Playwright MCP alternative. Read when running inside Kimi Code CLI / `kimi web`.
