# Brief — Plan 5 design-fidelity pass (G0)

Audit date: 2026-07-25. Fidelity target is the live site **as of this date**
(it is actively edited; reference captures are timestamped in `.launch/qa/live/`).

## Business / offer

The Lippincott Team — eXp Realty team serving NW Houston (Cypress, Katy,
Tomball, Waller, Bridgeland, etc.). Offer: buy/sell representation backed by
volume proof (1,463+ homes sold, $400M+, 750+ 5-star reviews, 9× HBJ award).

## Primary conversion action

**One primary action per page** (skill hard rule 5); every CTA on the page
drives it:

| Template | Primary action | Secondary (never styled as primary) |
|---|---|---|
| home | Home search (Sierra) | Contact / click-to-call |
| about | Contact the team | Click-to-call |
| team bio | Contact that agent | Click-to-call |
| contact-us | Submit the 4-field form | Click-to-call 713-494-1818 |
| hubs (communities/schools) | Drill into a community/ISD | Home search |
| community page | View listings (Sierra search) | Contact |
| ISD page | View listings (Sierra search) | Contact |
| blog index | Drill into a post | — |
| blog post | Contact / search CTA | Related posts |

Click-to-call **713-494-1818** stays in the header bar on all templates and
becomes sticky in the mobile header.

## Audience / pain

Move-up buyers and sellers in NW Houston suburbs; relocating families who
choose neighborhood by school district. Top pains: picking the right
community/ISD, trusting an agent team, fast response.

## Proof assets (already migrated)

- 1,463+ homes sold, $400M+ volume, 750+ 5-star reviews
- 9× Houston Business Journal Residential Real Estate Awards; GHBA Prism;
  eXp Icon; #6 in Texas by sales volume
- Testimonials (migrated), team roster with bios

## Brand constraints

- Light mode only (dark mode being removed this pass)
- Palette: brand red `#c22737`, dark gray `#101828`, light grays (from
  Elementor global CSS; exact values re-verified in G1)
- Fonts: Montserrat (headings), Arimo (body), Libre Baskerville (serif
  accents) — already in `src/styles/global.css`
- Reference: the live Elementor site **is** the art direction (G1 extracts
  the concrete spec from it)

## Scope

Template inventory for audit + fidelity work:

1. home `/`
2. about `/about/`
3. team bio `/about/amy-lippincott-2/`
4. contact `/contact-us/`
5. hub `/northwest-houston-real-estate/`
6. hub `/northwest-houston-schools-real-estate/`
7. community `/northwest-houston-real-estate/cypress-tx-real-estate/`
8. ISD `/northwest-houston-schools-real-estate/katy-isd-real-estate/`
9. blog index `/blog/`
10. blog post `/blog/bridgeland-breakdown-where-every-village-has-its-own-personality-and-splash-pad/`

Viewports: desktop 1440, tablet 768, mobile 375.

## Hard constraints

- **Copy verbatim** — no copy rewrites; CRO is layout/placement only.
- **80–90% section-by-section visual match** on the key templates (home,
  about, community, blog post), scored in G4 against the G1 checklist.
- Tina schema changes avoided; any unavoidable change is flagged for review
  with client regeneration.
- No new client-side JS beyond what exists (keep the static-Astro speed win).
- `.launch/` artifacts are not committed to git.

## Out of scope

Sierra API lead forwarding, /thank-you/ page, per-hub hero imagery, DNS
cutover (post-launch backlog / later plans).
