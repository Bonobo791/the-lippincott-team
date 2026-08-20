# TODO — deferred tasks & open questions

Status key: [ ] open · [x] done · (owner) who it belongs to

## Pending client/user decisions

- [x] **Home hero headline** — "The team that lives it and sells it." (1118f3e)
- [x] **Sell page heading** — "The accomplishments behind your sale" (this commit)
- [ ] **Janet Nicholson + Ryan Zimmerman bios** — still first person; align to
      third person like the other bios (Stacy was converted in f707ab8)?
- [x] **About proof-stage tiles** — all three tiles linked (reviews -> Google
      reviews; homes sold -> live listings; HBJ awards -> Google search; URLs are
      Tina-editable if better sources are provided).
- [x] **`.stylelintrc.json`** — exceptions scoped to src/styles/global.css +
      v2.css via `overrides`; `at-rule-no-unknown` stays active globally.

## Content facts to verify (client-supplied)

- [ ] **Local Six Brewery** — existence/location unverified; currently listed on
      the Waller + Hockley guides as "Local Six Brewery — a craft brewery in Waller".
      Confirm the business exists and the location before keeping it live.
- [ ] **Waller Feed Store "karaoke on Tuesdays"** — unverified (client-supplied).
      Arcade, weekend live music, and food ARE verified (wallerfeedstore.com).

## Links to spot-check

- [ ] **Waller ISD "Browse homes by district" card** — the
      `middleschool_%2Fwaller%2F` search slug matches the Katy/Tomball card
      pattern but was never confirmed against the live listings site.
- [ ] **US News links (7 district/high-school URLs)** — bot-protected
      network-wide (could not be verified from here); spot-check in a browser.

## Listings-site / domain coordination

- [x] **Buyer/seller/community pages** — they ARE on this website (/buy/, /sell/,
      /northwest-houston-real-estate/ + community pages). The only broken links
      were the LISTINGS-site URLs (/buyers/, /sellers/, /communities/ on
      thelippincottteamlistings.com), which now point to the site's own pages.
      No provider coordination needed.
- [ ] **thelippincottteam.com DNS cutover** — the new canonical domain still 404s
      (old WordPress site live at lippincottteam.com). After cutover, re-check
      the terms/privacy links (now relative, so they work either way).
      (Re-checked 2026-08-20: not cut over yet — thelippincottteam.com still
      redirects to the old site.)
- [ ] **Amira on the Tomball guide** — label fixed to "Cypress" (its actual
      address), but confirm with the client whether Amira belongs on the Tomball
      page at all (it is Cy-Fair ISD territory).
      (Re-checked 2026-08-20: Amira's site is JS-only and the listings site
      bot-blocks, so no fresh citation; awaiting client sign-off on placement.)

## Coordination (other sessions)

- [ ] **AGENTS.md** — a concurrent session has an uncommitted rewrite in the
      working tree (it previously emptied the file); reconcile before the next
      merge so its changes and the committed terminology/copy-voice rules coexist.

## Verification after next deploy

- [ ] **Quality gates on the new head** — confirm Codacy/SonarCloud/CodeAnt/
      CodeRabbit re-analyze clean after the push; Sonar's security rating should
      now be A (the two S4036 findings were fixed in code, not just won't-fix'd).
