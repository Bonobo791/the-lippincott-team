# Gate checklists

Sign-off and QA checklists for every gate in the concept-to-launch pipeline.
Read this file at G0 (to know what each gate demands) and again at G4 (for the
QA audit). A gate is passed only when every box in its checklist is true.

## G0 — Brief lock

The brief is one page, written to `.launch/brief.md`, and the user has
explicitly approved it. It must answer:

- [ ] Business/offer in one sentence
- [ ] The single primary conversion action (book call, buy, sign up, WhatsApp, ...) — exactly one
- [ ] Target audience and their top pain
- [ ] Differentiator vs. alternatives
- [ ] Proof assets available (numbers, testimonials, logos, case results) — or an explicit note that none exist
- [ ] Brand constraints: colors, fonts, logo, tone
- [ ] Reference sites the user loves or hates (with what specifically)
- [ ] Scope: pages/sections, language(s), deadline-critical constraints

Do not start G1 until the user has signed off on the brief.

## G1 — Art direction

Written to `.launch/art-direction.md`, derived from real references, approved
by the user.

- [ ] Palette with concrete hex values, each traceable to a reference
- [ ] Type pairing + scale (font names, weights, sizes for display/body)
- [ ] Layout concept per section (not "hero + features + footer" — actual structure)
- [ ] Motion budget: exactly what moves, why, and what stays still
- [ ] Imagery plan per section: code-drawn / external-verified / typographic
- [ ] The single named wow moment
- [ ] Fonts chosen actually render the site's language(s)
- [ ] No default AI aesthetics: no muddy blue-purple gradients, no emoji/Font-Awesome
      icon boxes, no card-in-card nesting, no centered-hero + two CTAs + three
      feature cards, no decorative marquees or blanket fade-in-up

## G2 — Conversion copy

Complete copy written to `.launch/copy.md`, section by section, in conversion
flow order. Approved by the user.

- [ ] Hero: outcome-led headline (what the visitor gets, not what the business is)
- [ ] Hero: subhead that names the audience/pain and supports the headline
- [ ] Hero: primary CTA with specific text (not "Learn more")
- [ ] Proof section adjacent to the claims it supports
- [ ] Mechanism/benefits: how it works, framed as visitor outcomes
- [ ] Offer or pricing section (or a deliberate, documented omission)
- [ ] Objection handling: FAQ / guarantee / risk reversal
- [ ] Final CTA section
- [ ] Every CTA on the page drives the one primary conversion action from the brief
- [ ] No placeholder text, no lorem ipsum, no "Coming soon" sections
- [ ] Copy is final wording, ready to paste verbatim into the build

## G3 — Build

No user gate, but before moving to G4 confirm:

- [ ] Stack matches the brief (single-file HTML / webapp / backend — persistence is real or explicitly disclaimed)
- [ ] Art direction realized as approved — no downgraded techniques
- [ ] Copy used verbatim from `.launch/copy.md` (line-break adjustments only)
- [ ] Every section from the brief is present
- [ ] Site serves locally without build errors

## G4 — Screenshot QA

Audit the viewed PNGs (desktop AND mobile) against this list. Viewing the
images is mandatory; manifest.json alone is not evidence.

Render integrity:

- [ ] Fonts actually render (no fallback-serif body text, no tofu boxes)
- [ ] All images load (no broken-image icons, no blank media areas)
- [ ] No horizontal overflow / unintended sideways scroll at either width
- [ ] No overlapping or clipped text at either width
- [ ] Text contrast is legible on every background
- [ ] Zero console errors, zero page errors, zero failed requests in manifest.json

CRO hierarchy:

- [ ] Primary CTA visible above the fold at desktop width
- [ ] Primary CTA visible above the fold at mobile width
- [ ] Proof appears adjacent to the claims it supports
- [ ] Conversion flow order matches `.launch/copy.md`
- [ ] Every CTA drives the single primary action

Any failure -> fix -> re-shoot BOTH viewports -> re-view. Loop until clean.
Typical is 2-4 rounds; the cap is "clean", not a number of rounds.

## G5 — Ship

- [ ] Preview URL (or build output path) reported to the user
- [ ] Files' location summarized
- [ ] QA evidence paths given (final screenshot PNGs)
- [ ] Language is accurate: "saved, ready to preview" — never "deployed" or
      "live" unless a real publish happened
