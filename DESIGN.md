---
name: The Lippincott Team
description: Real-estate team site — an editorial evidence system where sourced numbers, not decoration, carry the persuasion.
colors:
  primary: "#d6323c"
  primary-deep: "#b4232c"
  primary-dark: "#b02831"
  ink: "#17151a"
  ink-raised: "#211e26"
  ivory: "#f6f2ea"
  ivory-dim: "rgba(246,242,234,.62)"
  ivory-faint: "rgba(246,242,234,.42)"
  gold: "#c9a15a"
  gold-bright: "#e3bd77"
  paper: "#ffffff"
  body-text: "#3c3a41"
  muted: "#7a7780"
  line: "rgba(23,21,26,.10)"
  line-dark: "rgba(246,242,234,.12)"
typography:
  display:
    fontFamily: "'Fraunces Variable', 'Fraunces', Georgia, serif"
    fontSize: "clamp(34px, 4.6vw, 60px)"
    fontWeight: 300
    lineHeight: 1.12
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Fraunces Variable', 'Fraunces', Georgia, serif"
    fontSize: "clamp(44px, 6.6vw, 88px)"
    fontWeight: 300
    lineHeight: 1.04
    letterSpacing: "-0.015em"
  title:
    fontFamily: "'Fraunces Variable', 'Fraunces', Georgia, serif"
    fontSize: "clamp(21px, 2.1vw, 28px)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  label:
    fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.22em"
rounded:
  card: "18px"
  pill: "999px"
spacing:
  container: "1200px"
  container-px: "24px"
  section-y: "clamp(80px, 10vw, 140px)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  eyebrow:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
  quote-card:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.card}"
    padding: "28px 32px"
  year-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ivory-faint}"
    rounded: "{rounded.pill}"
    padding: "5px 11px"
---

# Design System: The Lippincott Team

## Overview

**Creative North Star: "The Verified Record"**

This real-estate site persuades the way a well-sourced investigation does: every claim arrives with its receipt. The design's spine is documented evidence — 1,463+ homes sold counting up on an ink stage, a trophy wall where each award card lists its published criteria, market tiles citing HAR and NAR by name, an awards monument whose giant gold-gradient numeral counts to nine. Decoration is deliberately scarce so the numbers read as fact, not marketing.

The surface is editorial, not corporate: Fraunces at its lightest weight sets headlines, quotations, and every meaningful numeral, with a single italic accent phrase per heading carrying the one red (on light) or gold (on dark). Inter does all the functional work — body copy, uppercase micro-labels, UI. Pages move through calm bands of paper and ivory, punctuated by near-black ink stages where the proof lives: stats, team video, the awards wall, the final call to action. Hairline grids — 1px gaps between tiles — organize services, market data, and trophies like entries in a ledger.

This world currently ships on the static homepage (`src/pages/index.astro`, scoped under `.home-v2`) and is the system's primary voice. The Tina block-driven inner pages still run the earlier Montserrat/Apple system recorded in the Legacy section below; new work should follow this document, and the legacy record exists only until those surfaces migrate.

**Key Characteristics:**
- Evidence as ornament: sourced stats, quoted reviews with attributions, and award criteria are the visual content
- Fraunces light for everything that carries meaning; Inter for everything that carries function
- One red accent phrase per serif heading; gold reserved for earned honors (stars, awards, the monument)
- Flat paper/ivory bands with hairline grids; ink stages reserved for proof moments
- Quiet motion: reveals rise 28px and fade, top-rules draw left-to-right, numerals count up — all on one easing curve

## Colors

The palette is a newsprint stage — paper white, warm ivory, deep ink — lit by one signal red, with a muted trophy gold that appears only where an honor was actually earned.

### Primary
- **Signal Red** (#d6323c): The single accent voice. Primary pill buttons, the italic accent phrase in light-surface serif headings, FAQ plus indicators, the red eyebrow variant, and the red radial glow inside dark stages. Never a background fill for large areas.
- **Deep Signal Red** (#b4232c): The arrow-link color (`link-arrow`, recirculation "go" labels) — red at reading distance, slightly recessed so it doesn't compete with buttons.
- **Signal Red Dark** (#b02831): The pressed/deep step of the ramp, available for hover deepening on light surfaces.

### Tertiary
- **Trophy Gold** (#c9a15a): Earned-honor metal. Five-star ratings, award organization labels, the gold eyebrow variant, the base of the monument numeral's gradient. Never a background, never a button, never body text.
- **Bright Trophy Gold** (#e3bd77): The dark-stage step of gold — italic accents in dark serif headings, the monument numeral's highlight, dark-tile figures, the gold arrow-link on ink.

### Neutral
- **Ink** (#17151a): The near-black stage — stats, team, awards, final CTA backgrounds, quote and review cards, dark market tile, and default heading color on light.
- **Ink Raised** (#211e26): The hover lift for ink tiles (trophy cards brighten on hover).
- **Paper** (#ffffff): The default section background.
- **Ivory** (#f6f2ea): The warm alternate band — trust bar, seller-help, FSBO, recirculation. Warmer and more editorial than a gray.
- **Ivory Dim** (rgba(246,242,234,.62)): Body copy on ink stages.
- **Ivory Faint** (rgba(246,242,234,.42)): Labels, sources, and captions on ink stages.
- **Body Slate** (#3c3a41): Long-form body text on light surfaces.
- **Muted Gray** (#7a7780): Secondary text, ledes, card body copy, source notes on light.
- **Hairline** (rgba(23,21,26,.10)): The 1px grid line and border on light surfaces — the ledger rule.
- **Hairline Dark** (rgba(246,242,234,.12)): The same ledger rule on ink stages.

### Named Rules
**The One Red Rule.** Signal Red is the only saturated functional accent — buttons, one italic phrase per heading, small indicators. It never floods a background; the crimson finale of the old system is gone. If everything is red, nothing is.

**The Earned Gold Rule.** Gold is not a brand color; it is a medal. It appears exclusively on verified honors — star ratings, award labels, the monument numeral — and never decorates ordinary UI.

**The Ledger Rule.** Structure on both light and dark comes from 10–12% alpha hairlines, not borders with their own hue. Grids are 1px gaps showing the hairline color between tiles.

## Typography

**Display Font:** Fraunces Variable (with Fraunces/Georgia fallback) — headlines, quotations, meaningful numerals
**Body Font:** Inter Variable (with Inter/system-ui fallback) — body copy, labels, UI

**Character:** Fraunces at weight 300 is the voice of record — high-contrast, literary, unhurried. Its italic at weight 400 is the accent instrument: exactly one phrase per heading. Inter is the working voice — plain, compact, uppercase-and-tracked for labels. The pairing reads like a broadsheet: serif for the story, sans for the furniture.

### Hierarchy
- **Hero Headline** (light 300, clamp(44px, 6.6vw, 88px), line-height 1.04, -0.015em): The full-viewport video hero only; max 14ch measure, white with a gold-bright italic accent over the scrim.
- **Display** (light 300, clamp(34px, 4.6vw, 60px), line-height 1.12, -0.01em): Section headings everywhere. Ink on light stages, ivory on dark; the italic `<em>` accent is Signal Red on light, Bright Trophy Gold on dark. Most sections pin it to clamp(30px, 3.8vw, 48px).
- **Title** (regular 400, 21–28px, line-height 1.2): Card and row headings — service cards, job entries, trophy names, FAQ questions, community city names, recirculation rows.
- **Numeral** (light 300, clamp(30px–200px by context), line-height ~1): Statistics, market figures, FSBO price comparisons, and the awards monument (up to 200px with a vertical gold gradient). The `+`/suffix drops to Inter 600 in red.
- **Quote** (light 300 italic, 19–25px, line-height 1.55): Client testimonials and closing editorial lines inside ink cards.
- **Body** (regular 400, 14.5–16.5px, line-height 1.7–1.8): Body Slate for long-form (max ~68ch), Muted Gray for ledes and card copy (lede max 52ch).
- **Label / Eyebrow** (semibold 600, 11–12px, uppercase, +0.14em to +0.28em): Eyebrows with a 36px × 1px tick, stat labels, award organizations, source attributions.

### Named Rules
**The Serif Carries Meaning Rule.** Fraunces is used only where the words are the point — headlines, quotes, numerals. UI chrome, labels, and body text are always Inter. Never set a button or label in the serif.

**The One Accent Phrase Rule.** A serif heading gets exactly one italic `<em>` accent phrase — red on light stages, gold-bright on dark. Two accents in one heading is a bug, not emphasis.

## Layout

Full-bleed section bands wrap a 1200px centered container with 24px gutters. Vertical rhythm is generous and editorial: clamp(80px, 10vw, 140px) per section, tightening to clamp(72px, 9vw, 120px) for the services band and clamp(56px, 7vw, 88px) for the recirculation strip. The page alternates Paper and Ivory bands and interrupts the rhythm with full Ink stages (stats, team split, awards, final CTA) — the pattern is calm, calm, proof.

Content grids are ledger grids: tiles separated by 1px hairline gaps inside a 1px hairline border (services 3-up, seller jobs 2×2, market 4-up, trophy wall 2-up with a full-width featured card). Asymmetric splits use 5fr/7fr pairs (seller help, FSBO, team). The communities grid is a photographic mosaic — 4 columns × 280px rows with the lead card spanning 2×2. Breakpoints collapse grids at 900px (most), 860px (steps, awards), 760px (recirculation), 640px (trust bar), and 540px (market, communities to single column).

The hero is a full-viewport (94svh minus the 72px header) video stage with bottom-anchored content and a three-stop ink scrim. Reveal-on-scroll applies page-wide: elements rise 28px and fade in over 0.8s, with a 1.6s fail-safe that force-shows anything still hidden above the fold.

## Elevation & Depth

Flat by default; depth is editorial, not material. Tonal bands (paper → ivory → ink), hairline rules, and photographic scrims do the structural work. Shadows exist in exactly two places: the primary button (a grounded drop that deepens on hover) and embedded video media. Dark stages add atmosphere through radial gradient glows — faint red from above on stats, red and gold corner glows on awards, a red underglow on the final CTA — not through layering.

### Shadow Vocabulary
- **Button Drop** (`box-shadow: 0 10px 26px rgba(23,21,26,.28)`): Resting state of the primary pill; hover deepens to `0 16px 38px rgba(23,21,26,.34)` with a −2px lift.
- **Media Lift** (`box-shadow: 0 24px 60px rgba(23,21,26,.18)`): Embedded testimonial videos on light stages — the only large shadow in the system.

### Named Rules
**The Two-Shadow Rule.** Only buttons and videos cast shadows. Cards, tiles, and grids are always flat — if a container needs separation, give it a hairline or an ink fill instead.

## Shapes

Two corner languages: fully rounded pills for actions and small indicators (buttons, the hero kicker, award year chips, the FAQ plus circle), and a soft 18px radius for content containers (quote cards, review card, FSBO stat panel, community photo cards, embedded video). Structural grids are square-cornered — the hairline ledger tiles have no radius at all. The recurring linear motifs are the 36px × 1px eyebrow tick and the 2px top-rule that draws from 15% to full width on tile hover.

### Named Rules
**The Pill-or-Ledger Rule.** An element is either a pill (action), an 18px soft card (self-contained content), or square (a cell in a hairline grid). No other radii, and never round a grid tile.

## Components

### Buttons
Pill-shaped, single-color, and motion-simple: they lift and deepen on hover, never change hue.
- **Shape:** Full pill (999px).
- **Primary:** Signal Red background, white 14px semibold label, padding 16px 28px, Button Drop shadow. Hover lifts −2px and deepens the shadow; an embedded arrow icon translates 4px right.
- **Ghost on Dark:** Transparent pill with a white/45 border and white label; hover brightens the border to full white. The standing second action on ink stages.
- **Text Link (hero/final):** White/85 14px semibold with a white/35 bottom border; hover brightens both. Used for the "browse live listings" escape hatch.
- **Link Arrow:** Deep Signal Red 14.5px semibold inline link with a trailing `→`; hover widens the gap. The section-closer CTA (`.sec-cta`) and in-copy action; gold-bright variant on dark stages.

### Chips & Eyebrows
- **Line-Tick Eyebrow:** 36px × 1px rule in currentColor + 12px semibold uppercase label at +0.28em. Red on light stages, gold on the awards stage. Introduces a section's subject, never a decoration.
- **Hero Kicker:** Signal Red/85 pill, white 12px uppercase label at +0.24em — the one filled chip, used only in the hero.
- **Year Chips:** Hairline-dark bordered pills (11.5px, ivory-faint) listing award years inside the trophy wall.

### Cards / Containers
- **Ledger Tile:** Square-cornered cell in a 1px-gap hairline grid; paper or ivory fill, clamp(30px, 3.6vw, 48px) padding, optional 2px red top-rule that draws on hover (services). Service tiles shift their background to ivory on hover; trophy tiles lift Ink → Ink Raised with a gold top-rule.
- **Quote / Review Card:** Ink fill, ivory text, 18px radius, 26–32px padding. Quote text is Fraunces italic 19px; the source attribution is an 12px uppercase ivory-faint label. The review card pairs a 44px Fraunces numeral with star-rated proof text.
- **Community Photo Card:** 18px-radius image card in the mosaic grid; a bottom ink scrim (transparent → 78%) carries the Fraunces city name, an Inter character line, and a "View Listings →" action. Hover zooms the photo to 1.06 over 0.8s.
- **FSBO Stat Panel:** Ink 18px-radius panel holding the agent-vs-solo price comparison; figures in Fraunces with the winning figure in gold-bright.

### FAQ Accordion
- **Style:** Native `details/summary` rows separated by hairlines; Fraunces 400 questions at clamp(19px, 2vw, 23px) in ink. A 30px hairline-bordered circle holds a red `+`; on open it rotates 45° and fills Signal Red with a white symbol. Answers in 15px Muted Gray, indented clear of the indicator.

### Stats & Figures (signature)
- **Stats Band:** Ink stage with a faint red radial glow; Fraunces light numerals at clamp(52px, 6vw, 84px) count up over 1.2s (ease-out cubic) when scrolled into view. The `+` suffix is Inter 600 Signal Red; labels are 12px uppercase ivory-faint at +0.22em.
- **Market Tiles:** Four-cell hairline ledger of Fraunces figures; one cell may invert to an ink "dark tile" with a gold-bright figure to spotlight the standout datum.
- **Awards Monument:** A single Fraunces numeral at clamp(110px, 14vw, 200px) filled with a vertical gold gradient (bright → gold → deep bronze), counting to 9× beside an italic "times" — the system's largest type.

### Trophy Wall (signature)
- **Style:** A 2-up hairline ledger on the awards ink stage with a full-width featured card. Each entry leads with the awarding organization (11px gold uppercase label), the award name in Fraunces 400, and its published criteria in 14.5px Ivory Dim — the evidence is the design.

### Navigation
- The homepage renders inside the shared site chrome (sticky dark header, dark footer) documented in the Legacy section; the homepage body itself owns no navigation components.

## Do's and Don'ts

### Do:
- **Do** give every statistic, quote, and award its source attribution — the citation is part of the component, not optional copy.
- **Do** set exactly one italic `<em>` accent phrase per serif heading: Signal Red on light stages, Bright Trophy Gold on ink.
- **Do** alternate Paper and Ivory bands and reserve Ink stages for proof moments — stats, team, awards, the final CTA.
- **Do** build content grids as 1px hairline ledgers with square tiles; reserve 18px radii for self-contained cards and media.
- **Do** honor `prefers-reduced-motion`: reveals render visible, count-ups render final values, hover lifts disable.
- **Do** keep motion on the reveal curve (cubic-bezier(0.22, 1, 0.36, 1), 0.45–0.8s) and count-ups on ease-out cubic (~1.2s).
- **Do** use the line-tick eyebrow (36px × 1px, 12px, +0.28em) to introduce sections — red on light, gold on the awards stage.

### Don't:
- **Don't** let gold escape honors — no gold buttons, backgrounds, links (except the dark-stage arrow variant), or body text.
- **Don't** fill large areas with Signal Red; it is a voice, not a wall. The old crimson-finale pattern is retired.
- **Don't** set buttons, labels, or UI chrome in Fraunces; the serif carries meaning only.
- **Don't** add shadows to cards or tiles — the system has exactly two shadows (button, video). Use a hairline or an ink fill for separation.
- **Don't** use bounce or elastic easing, and don't stack multiple accents into one heading.
- **Don't** commit video files to the repo; loops are external URLs referenced from markup, with committed poster images.
- **Don't** mix this world with the legacy system on one surface — the `.home-v2` scope and the block system are separate eras.

## Legacy System (inner pages)

The Tina block-driven inner pages (everything except the homepage) still ship the earlier "Cinematic Brokerage" system. Until those surfaces migrate, treat this as their record of truth; the living sources are `src/styles/global.css` and `src/components/blocks/`.

- **Palette:** Team Crimson `#c22737` (hover `#9e1e2c`), Crimson on Dark `#e8596b`, Deep Navy `#101828`, Parchment `#f5f5f6`, Tile `#272729`, Rating Gold `#f2b01e` (stars only), Border Cool `#e4e7ec`, Blush Chip `#fbe9ec`.
- **Typography:** Montserrat Variable globally; the system/Inter stack inside `.font-apple` surfaces (homepage blocks, chrome) — never mixed within one surface. Headline accents come from the editor's `**...**` split-heading device via `SplitHeading.astro` — light+bold on classic surfaces, semibold+italic on Apple surfaces.
- **Voice rules:** One crimson accent per screen; dark stages are lit scenes, not a dark-mode token set; flat by default with Card Rest/Overlay shadows only; the Pill-or-Soft Rule (pills on Apple surfaces, 16px soft squares on classic).
- **Signatures:** the video hero with masked-line reveals and drifting beams, the near-black count-up stats stage, the parchment trust strip, the crimson CTA finale.

New homepage-family work follows the main sections of this document, not this section.
