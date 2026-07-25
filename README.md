Gate Checklists
Sign-off and QA checklists for each pipeline gate. A gate passes only when every box is true.
Contents:

    G0 - Brief checklist
    G1 - Art direction checklist
    G2 - Conversion copy checklist
    G3 - Build checklist
    G4 - Screenshot QA checklist
    G5 - Ship checklist

G0 - Brief checklist
.launch/brief.md is complete when it states, in the client's language:

    [ ] One-sentence offer (who it's for + outcome, not features)
    [ ] The single primary conversion action, named as a verb ("book a call", "buy the plan")
    [ ] Audience: who they are, top pain, what they've already tried
    [ ] Differentiator vs the obvious alternative
    [ ] Proof assets available: numbers, testimonials, logos, before/after, guarantees (mark which are real vs to-be-written)
    [ ] Brand constraints: required colors/fonts/logo, tone (3 adjectives), anything forbidden
    [ ] 1-3 reference sites with what specifically to borrow or avoid
    [ ] Scope: page list or section list, language(s), responsive requirement (default: desktop + mobile)
    [ ] Out of scope, stated explicitly

Sign-off question: "Anything wrong or missing here? Once approved I design from this, not from memory."
G1 - Art direction checklist
.launch/art-direction.md passes when:

    [ ] Palette: background / surface / text / accent as hex values, traceable to references - not invented
    [ ] Semantic colors (muted, success, warning) derived from the reference palette's temperature/saturation ladder
    [ ] Type pairing: display + body, with weights and a size scale; font stack covers every language on the page
    [ ] Layout concept per section (one line each), including at least one non-default structural decision
    [ ] Motion budget: exact elements that animate, trigger, duration, purpose. Anything not listed does not move
    [ ] Imagery plan per slot: code-drawn / external (URL verified) / deliberately none
    [ ] The single wow moment named in one sentence
    [ ] Anti-default sweep: no blue-purple gradient, no emoji/icon-box features, no card-in-card, no decorative marquee or fade-in-up, no "centered hero + two CTAs + three cards" template

G2 - Conversion copy checklist
.launch/copy.md passes when:

    [ ] Hero headline states the outcome in the customer's words; subhead says how + for whom; one primary CTA
    [ ] Everything above the fold answers: what is it, who is it for, what do I do next
    [ ] Proof sits adjacent to the claims it supports (not dumped in a distant section)
    [ ] Benefits written as outcomes with specifics (numbers, timeframes), not adjectives
    [ ] Objection handling: top 3-5 buyer objections addressed (FAQ, guarantee, comparison, risk reversal)
    [ ] Primary CTA repeated at each scroll depth; button copy is action-specific ("Get my quote") not generic ("Submit"/"Learn more")
    [ ] Scannable: no paragraph over 3 lines, headers carry the story alone
    [ ] Zero template phrases ("modern and elegant", "powerful", "seamless", "unlock", "elevate", "world-class")
    [ ] Reading level matches the audience from the brief; tone adjectives honored

G3 - Build checklist

    [ ] Every section from the brief exists, in the approved order
    [ ] Copy from .launch/copy.md used verbatim (layout-driven trims only)
    [ ] Art direction implemented at full fidelity - reference techniques not simplified away
    [ ] Real content only: no lorem ipsum, no blank image slots, no dead links/buttons
    [ ] Primary CTA wired to its target (form, checkout, calendar, tel:/mailto:) or a clearly stated stub
    [ ] Meta basics: title, description, favicon, Open Graph image or note if deferred
    [ ] Builds/renders with no console errors before entering G4

G4 - Screenshot QA checklist
Run on screenshots from scripts/screenshot.py (desktop + mobile, fold + full page). View each image; do not infer from code.
Render integrity:

    [ ] Fonts actually rendered (correct display face, correct language glyphs, no FOUT-stuck fallbacks)
    [ ] No broken images, no gray boxes, no stretched/mismatched imagery
    [ ] No horizontal overflow on mobile (also check overflowX in manifest.json)
    [ ] No overlapping or clipped text at either width; tap targets readable on mobile
    [ ] Contrast readable on photos/gradients; dark-on-dark or light-on-light traps absent
    [ ] Animations captured mid-state look intentional, not broken (re-shoot with longer --wait if unsure)

CRO hierarchy (from the fold screenshots):

    [ ] Primary CTA visible above the fold on BOTH desktop and mobile without scrolling
    [ ] Headline legible and outcome-clear in the fold shot
    [ ] Eye path: headline -> subhead -> CTA, with no competing element stealing the accent color
    [ ] Proof element (logos, number, testimonial) within the first two scroll screens
    [ ] Full-page shot: CTA reappears at each scroll depth; final CTA section present

Manifest (manifest.json):

    [ ] console_errors empty (warnings reviewed, justified or fixed)
    [ ] page_errors empty
    [ ] failed_requests empty or each entry explained (e.g., intentional stub)

Any failure -> fix -> re-shoot the affected viewport(s). G4 ends only with a clean sweep.
G5 - Ship checklist

    [ ] Preview/version saved through the harness's mechanism and the URL (or local server URL) handed to the user
    [ ] Summary includes: what was built, file locations, final QA screenshot paths, known stubs/next steps
    [ ] No claim of "deployed/live/published" unless a real publish action succeeded