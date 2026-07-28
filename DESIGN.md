---
name: The Lippincott Team
description: Real-estate team site — cinematic Apple-style surfaces over a calm crimson-and-parchment brand system.
colors:
  primary: "#c22737"
  primary-deep: "#9e1e2c"
  navy: "#101828"
  body-text: "#333333"
  canvas: "#ffffff"
  parchment: "#f5f5f6"
  blush-chip: "#fbe9ec"
  muted-gray: "#7a7a7a"
  stat-label: "#99a1af"
  border: "#e4e7ec"
  hairline: "#e0e0e0"
  ink: "#1d1d1f"
  tile: "#272729"
  gold: "#f2b01e"
  accent-on-dark: "#e8596b"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter Variable', 'Inter', 'SF Pro Text', system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 4.6vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.07
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Montserrat Variable', 'Montserrat', system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 5.25rem)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Montserrat Variable', 'Montserrat', system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 4vw, 3.2rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Montserrat Variable', 'Montserrat', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "'Montserrat Variable', 'Montserrat', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  sm: "12px"
  md: "14px"
  lg: "16px"
  xl: "20px"
  panel: "24px"
  pill: "9999px"
spacing:
  section-y: "96px"
  section-y-mobile: "64px"
  container-px: "24px"
  container-px-md: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
  button-classic:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  eyebrow-chip:
    backgroundColor: "{colors.blush-chip}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.navy}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: The Lippincott Team

## Overview

**Creative North Star: "The Cinematic Brokerage"**

This is a real-estate team site with a sales engine's heart and a film's surface. The brand is bold, energetic, and unapologetically sales-driven — every surface funnels toward a consultation — but the energy is delivered with cinematic discipline: a full-viewport video hero with drifting light beams, masked-line headline reveals, count-up stats on a near-black stage, and a crimson final act. Drama is concentrated in a few signature moments; everything between them stays calm, flat, and precise so the spectacle lands.

The system runs two coordinated voices. The **classic voice** (inner pages, blog, forms) is Montserrat everywhere, white and parchment sections, uppercase letter-spaced buttons. The **Apple voice** (homepage blocks and site chrome) switches to the system/Inter stack, near-black ink tones, hairline borders, and pill-shaped weightless CTAs. They share the same crimson, the same parchment, and the same restraint, so moving between them feels like a lighting change, not a rebrand.

**Key Characteristics:**
- One decisive crimson accent on otherwise neutral stages
- Cinematic motion signatures: masked-line reveals, drifting light beams, count-up stats, magnetic buttons
- Dual typography: Montserrat globally, system/Inter stack on Apple-style surfaces
- Flat surfaces organized by tonal bands and hairlines, not shadows
- Pill-shaped CTAs with light font weights on cinematic surfaces; soft-squared uppercase buttons on classic ones

## Colors

The palette is a neutral stage (white, parchment, ink, tile) lit by a single crimson spotlight, with gold reserved for star ratings.

### Primary
- **Team Crimson** (#c22737): The brand's one voice. Primary CTAs, the eyebrow tick, prose links, the first column of comparison tables, the crimson CTA finale. Hover state deepens to **Crimson Shadow** (#9e1e2c).
- **Crimson on Dark** (#e8596b): A lifted crimson used only on near-black surfaces (eyebrows, stat `+` suffixes) where the base crimson would sink.

### Secondary
- **Deep Navy** (#101828): Headings, card text, the classic secondary button, and the dark prose voice. Not pure black — it keeps a blue undertone.

### Tertiary
- **Rating Gold** (#f2b01e): Exactly one job — five-star ratings in the trust strip. Never a background, never a button.

### Neutral
- **Canvas** (#ffffff): The default page background and card surface.
- **Parchment** (#f5f5f6): Alternating section band, footer, mobile menu, FAQ rows. The warm half-step that keeps white pages from feeling clinical.
- **Body Slate** (#333333): Long-form body text — softer than heading navy.
- **Muted Gray** (#7a7a7a): Secondary text, captions, taglines on light surfaces.
- **Stat Gray** (#99a1af): Labels on the near-black stats stage.
- **Border Cool** (#e4e7ec): Classic-surface borders, table hairlines, inputs.
- **Hairline** (#e0e0e0): The Apple-surface divider — FAQ rules, footer rules, mobile menu separators.
- **Ink** (#1d1d1f): Headings and strong text on Apple-style surfaces.
- **Tile** (#272729): The near-black stats stage. Also the tonal floor of the dark palette.
- **Blush Chip** (#fbe9ec): The eyebrow chip background — crimson at a whisper.

### Named Rules
**The One Crimson Rule.** Crimson is the only saturated accent and appears on ≤10% of any screen — CTAs, the eyebrow tick, links, one table column. If everything is red, nothing is.

**The Lighting-Change Rule.** Dark stages (tile, video scrims) are lit scenes, not themes: they reuse the same palette, lifting crimson to #e8596b and text to white/85 rather than inventing a dark-mode token set.

## Typography

**Display Font:** System/Inter stack (-apple-system, SF Pro Display, Inter Variable) on Apple-style surfaces (`.font-apple`)
**Body Font:** Montserrat Variable (with system-ui fallback) — the global default
**Serif:** Libre Baskerville (token `--font-serif`, sparing editorial use)

**Character:** Montserrat is the brand's speaking voice — geometric, confident, slightly wide. The Apple stack is the cinematic voice — tight tracking (-0.02em to -0.03em), semibold weights, clamp-scaled. Headlines everywhere use the split-heading device: editors mark a phrase with `**...**` and it renders as the accent — light+bold pairs on classic surfaces, semibold+italic pairs on Apple surfaces.

### Hierarchy
- **Display** (semibold 600, clamp(2.4rem, 4.6vw, 3.5rem), line-height 1.07, -0.02em): Video-hero headline only, revealed line-by-line through masked spans. The classic hero scales larger (up to 5.25rem) in Montserrat light.
- **Headline** (light 300 → bold 700 accent, 2.5rem–5.25rem, line-height 1, -0.01em): Classic section and hero headlines; the bold segment carries the accent word.
- **Title** (semibold 600, clamp(2.1rem, 4vw, 3.2rem), line-height 1.1, -0.02em): Apple-surface section headings (crimson CTA, stats, showcase).
- **Body** (regular 400, 1rem, line-height ~1.6): Long-form prose in Body Slate; max measure ~65ch via prose defaults. Lede/tagline text scales clamp(17px, 1.6vw, 21px).
- **Label / Eyebrow** (semibold 600, 12px, uppercase, +0.08em): The red-tick eyebrow (28px × 2px crimson bar + label) and chip labels. On dark stages the tick and text lift to Crimson on Dark.

### Named Rules
**The Two Voices Rule.** Montserrat is default; the system/Inter stack appears only inside `.font-apple` surfaces (homepage blocks, header, footer). Never mix the two stacks within one surface.

**The Split-Heading Rule.** Display and headline accents come from the editor's `**...**` markup rendered by SplitHeading — never from ad-hoc `<em>` or color spans. Classic surfaces pair light with bold; Apple surfaces pair semibold with italic.

## Layout

Full-bleed section bands wrap centered containers. Classic sections use a max-width of 1152px (`max-w-6xl`) with 24px side padding and 64px/96px (mobile/desktop) vertical rhythm. Apple-style blocks and the crimson finale use a 1200px container with 24px → 48px padding at the md breakpoint; the sticky header runs wider at 1440px. Sections alternate Canvas and Parchment bands to create rhythm without dividers; dark stages (tile stats, video hero, black header) punctuate the sequence.

The video hero is a full-viewport (100svh) stage: content pinned bottom-left, max 25ch headline measure, bottom padding clamp(88px, 13vh, 140px). Everything must no-op under `prefers-reduced-motion`, and the mobile experience adds a pure-CSS sticky click-to-call bar below `lg`.

## Elevation & Depth

Flat by default. Depth is conveyed through tonal layering (white → parchment → ink → tile), hairline borders, backdrop blur, and photographic scrims — not through a shadow scale. The header floats via blur (black at 92% opacity, `backdrop-blur-xl` with boosted saturation), and the glass hero panel floats via `bg-white/15` + blur over photography. Shadows exist but stay small and state-driven: `shadow-sm` on cards, `shadow-lg` on dropdown menus and classic buttons.

### Shadow Vocabulary
- **Card Rest** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): Default card lift — barely there, just enough to separate white card from parchment band.
- **Overlay** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): Dropdown menus, the glass hero panel, classic button defaults. Never stacked on top of each other.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only to separate overlapping layers (dropdowns, floating panels), never to decorate.

## Shapes

Two corner languages coexist by voice. Classic surfaces use soft-squared corners: cards and classic buttons at a gentle 16px radius, small chips and inputs at 12–14px, glass panels at 24px. Apple surfaces use full pills: every CTA, the header consultation button, FAQ indicator circles, and eyebrow chips are fully rounded (9999px). Avatars and the simple-hero portrait are perfect circles. Dividers are 1px hairlines; the eyebrow's 28px × 2px crimson tick and the features variant's ~70px × 3px red top-rule are the only decorative bars.

### Named Rules
**The Pill-or-Soft Rule.** A control is either a full pill (Apple surfaces) or a 16px soft square (classic surfaces). Nothing in between — no 6px or 8px corners on interactive elements.

## Components

### Buttons
Weightless and pill-shaped on cinematic surfaces; solid and uppercase on classic ones. Both press down (`active:scale-95`) rather than lifting.
- **Shape:** Full pill (9999px) on Apple surfaces; gently rounded (16px) on classic surfaces.
- **Primary (Apple):** Team Crimson background, white light-weight (300) label at 18px, padding 14px 28px. Hover deepens to Crimson Shadow; header variant is magnetic (`.btn-magnetic`).
- **Primary (Classic):** Team Crimson background, white bold uppercase label at 14px with +0.1em tracking, padding 12px 24px, small shadow.
- **Ghost on Dark:** Transparent pill with a white/80 border and white light-weight label; hover fills white at 12% opacity. The eternal second action next to a crimson first action.
- **Outline (Classic):** Full pill, 1px border, uppercase semibold; hover fills parchment.
- **Focus:** Visible ring in Team Crimson at 50% opacity (3px) — never removed.

### Chips
- **Eyebrow Chip:** Blush Chip background, Team Crimson bold uppercase label at 14px, pill. On photo heroes it inverts to white/10 fill + white/30 border with backdrop blur.
- **Red-Tick Eyebrow:** Not a chip — a 28px × 2px crimson bar followed by an uppercase 12px label.

### Cards / Containers
- **Corner Style:** Gently rounded (16px).
- **Background:** Canvas white with a 1px Border Cool hairline; alternating section bands use Parchment.
- **Shadow Strategy:** Card Rest only (see Elevation) — flat by default.
- **Internal Padding:** 24px vertical rhythm with 24px gaps between card sections.
- **Glass Panel (hero):** 24px radius, white at 15% + backdrop blur, white/20 border, Overlay shadow.

### Inputs / Fields
- **Style:** 1px Border Cool stroke on Canvas, 12–14px radius, Montserrat body size.
- **Focus:** Team Crimson ring (3px at 50% opacity) — same focus language as buttons.
- **Error / Disabled:** Destructive red for errors; disabled at 50% opacity with pointer events off.

### Navigation
- **Header:** Sticky 64px black bar at 92% opacity with heavy backdrop blur; 12px white/85 links that brighten to white on hover and current page; logo lockup with a 10px uppercase "eXp Realty" subline. The right-hand action is always the crimson pill ("Schedule a Consultation").
- **Dropdowns:** Near-black panels (black/95 + blur), 12px radius, white/10 border, Overlay shadow; open on hover and focus-within.
- **Mobile:** Full-screen parchment sheet with hairline-separated 24px semibold ink links, a crimson pill at the foot, and a hamburger that animates to an X. A pure-CSS crimson click-to-call bar stays fixed at the bottom below `lg`.
- **Footer:** Parchment band with hairline top rule, ink headings, 15px body links that darken on hover, crimson reserved for the contact email.

### FAQ Accordion
- **Style:** Hairline-separated rows on parchment; 18–21px semibold ink questions; a 32px circle indicator that flips from gray plus to crimson minus when open. Answers render as prose in Body Slate.

### Stats Stage (signature)
- Near-black Tile band with a faint diagonal pinstripe, red-tick eyebrow in Crimson on Dark, and clamp(3rem, 6vw, 4.8rem) semibold figures that count up over 1.7s (ease-out cubic) when scrolled into view. The `+` suffix is the only crimson element. Stat labels in Stat Gray.

### Trust Strip (signature)
- Flat parchment bar: small muted labels beside large ink figures (plain vs. accented split-heading segments), gold five-star ratings, wordmarks in 17px semibold ink. Cells brighten to black/3 on hover when linked.

## Do's and Don'ts

### Do:
- **Do** funnel every page toward one crimson primary CTA; second actions are ghost/outline pills, never a second solid color.
- **Do** alternate Canvas and Parchment bands for rhythm, and reserve Tile near-black for one stats or showcase stage per page.
- **Do** use the split-heading `**...**` device for headline accents — light+bold on classic, semibold+italic on Apple surfaces.
- **Do** honor `prefers-reduced-motion`: count-ups render final values, beams and masked reveals render static.
- **Do** keep CTAs pill-shaped and light-weight on cinematic surfaces, with `active:scale-95` press feedback.
- **Do** use the red-tick eyebrow (12px, uppercase, +0.08em) to introduce dark stages.

### Don't:
- **Don't** introduce a second saturated accent — gold is for star ratings only, and no new hues for CTAs, links, or chips.
- **Don't** stack shadows or use them decoratively; flat tonal bands and hairlines carry the depth.
- **Don't** mix the Montserrat and system/Inter stacks within one surface — the `.font-apple` boundary is the seam.
- **Don't** put gray text on colored backgrounds; on crimson or dark stages use white at full or 85% opacity.
- **Don't** use bounce or elastic easing; motion uses the reveal curve (cubic-bezier(0.77, 0, 0.175, 1)) or ease-out cubic, 0.9–1.7s.
- **Don't** round interactive elements at arbitrary radii — pill (9999px) or soft square (16px) per the Pill-or-Soft Rule.
- **Don't** commit video files to the repo; hero loops are external CDN URLs referenced from Tina, poster-only on mobile.
