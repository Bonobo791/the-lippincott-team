# TODO — deferred tasks & open questions

Status key: [ ] open · [x] done · (owner) who it belongs to

## Pending client/user decisions

- [x] **Home hero headline** — "The team that lives it and sells it." (1118f3e)
- [x] **Sell page heading** — "The accomplishments behind your sale" (this commit)
- [ ] **Janet Nicholson + Ryan Zimmerman bios** — still first person; align to
      third person like the other bios (Stacy was converted in f707ab8)?
- [ ] **About proof-stage tiles** — provide public source URLs if "Homes sold"
      and "HBJ awards" tiles should link anywhere (reviews tile already links to
      Google reviews; component supports per-metric links).
- [ ] **`.stylelintrc.json`** — CodeRabbit (trivial): scope the 5 disabled rules
      to the two stylesheet files instead of global `null`s? (Tailwind v4
      false-positive cluster; global disables are justified but scoping is cleaner)

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

- [ ] **Listings site lacks buyer/seller/community pages** — the original deep
      links (/buyers/, /sellers/, /communities/) 404; ask the listings provider
      for correct deep links or add those pages. Cards now point to the site's
      own /buy/, /sell/, and community hub.
- [ ] **thelippincottteam.com DNS cutover** — the new canonical domain still 404s
      (old WordPress site live at lippincottteam.com). After cutover, re-check
      the terms/privacy links (now relative, so they work either way).
- [ ] **Amira on the Tomball guide** — label fixed to "Cypress" (its actual
      address), but confirm with the client whether Amira belongs on the Tomball
      page at all (it is Cy-Fair ISD territory).

## Coordination (other sessions)

- [ ] **AGENTS.md** — a concurrent session has an uncommitted rewrite in the
      working tree (it previously emptied the file); reconcile before the next
      merge so its changes and the committed terminology/copy-voice rules coexist.

## Verification after next deploy

- [ ] **Quality gates on the new head** — confirm Codacy/SonarCloud/CodeAnt/
      CodeRabbit re-analyze clean after the push; Sonar's security rating should
      now be A (the two S4036 findings were fixed in code, not just won't-fix'd).
