# 2026 build history

Moved out of `CLAUDE.md` on 2026-10-13, after the festival. This is the record of how the 2026 map was
built and why things sit where they do. It is history, not instructions: where it and `CLAUDE.md` disagree,
`CLAUDE.md` wins. Pin coordinates and nudges are also in `pins.js` and `docs/pr-notes.md`.

## Booth numbering, as the 2026 sheet settled

Artist numbering, **as of the 9/21 sheet read: 1–54 park, 55–81 McLendon, 82–139 Candler Park Dr,
K0–K10 Kidlandia.** The top number moves every time Courtney edits — it was 142 on 9/17 and 139
on 9/18, because she inserted 112–114 and renumbered everything after them down by three. Never
quote a top number from memory: `poster_endpoints` in `booth-numbering-2026.json` is the current
one, with `read_date` beside it. Not 164 in any case — every booth was resized to 15 ft on 9/16.

Courtney's answers, 9/17 evening (supersede anything earlier, including PR #7's description):
- **112–114 are real booths.** Their absence was her mistake; numbering runs continuously. They are
  *not* a speed-bump gap. (Done in the sheet by 9/18: 112 Jae Montano, 113 Salameh Ghaderi, 114
  Janet Gonzales.)
- 67–68 (Tarik Berbey) and 130–131 (Michael Taylor, was 132–133 before the renumber) are the two
  double booths.
- Anything marked Sponsor/open on the sheet prints as "Sponsor", on the phone and as its own row
  in the print index. As of the **9/24 read there is one: 57** (McLendon; was Ashley Flack /
  Flack Injury Law — Courtney wrote "Sponsor" in both columns, which `pull-sheet.py` now reads as
  a sponsor booth). 138 (Kenyaita Hodge) and 139 (Renzo Iglesias) are artists, added 9/18.
- **Featured artist: Madison O'Brien, booth 11** (Courtney, 9/20). Listed in `FESTIVAL.featured`
  in `src/data/festival.js` by booth number — a committee fact, not a sheet fact — and drawn as a
  star in the booth's own square (see Decided). Re-check the number after any re-pull.
- 132–139 (was 135–142) is a real last run at the far end of Candler Park Dr, numbered last on
  purpose so booths can be added or dropped there. The build reads that run's endpoints from the
  sheet, so a booth added there needs no code change.
- AWARE Wildlife (on the grass) and Achieve with Steve (beside the Acoustic Stage) have spots but
  no booth numbers — pinned unnumbered, placed by description (see `UNNUMBERED_AT`).
- Public copy says **"over 130 artists"**. Never 164, never a booth count.
- Kidlandia is **K0–K10, eleven booths** (K8 Clifton Sanctuary is new; Primavera and Faces
  Unlimited moved to K9 and K10). Confirmed by Courtney 9/19: "we added a spot in Kidlandia this
  year."


**Candler Park Dr layout, verified 9/20 against the 2025 map and the sheet's own old-number
column:** street side 82–94 | speed bump | 95–100 | barricade | 132–139 (the "final stretch",
top of the column); park side 101–111 | the same speed bump | 112–131. The sheet skips three
2025 numbers at each break (105–107, 126–128), which is how you can tell where the breaks are
without the map. **The live site still shows the 9/17 numbering** (135–142 on the final stretch)
until PR #8 merges — that is what Courtney saw on 9/19.

## Calendar

| Date | What |
|---|---|
| Fri 9/18 | Fall Ball — no map work tonight |
| Sun 9/20 | committee beta feedback closes; 7 PM call |
| **Tue 9/22** | print files to the printer — hard |
| Wed 9/23 | fix round 2 |
| Sat 9/26 | reveal the hidden Saturday Main Stage artist (one-line JSON change) |
| **Sun 9/27** | content lock |
| **Mon 9/28** | code freeze — show-stoppers only |
| Fri 10/2 | setup: check pins against the grounds, hang posters |
| Sat–Sun 10/3–4 | festival. Hot fixes straight to `main` |

## Build log, 9/18 – 10/6

Shipped 9/18: PR #7 (2026 artist assignments + `/?print=1` 11×17 print sheet), PR #2 (Sync from
Figma workflow), and PR #8 (booth + beta fixes):
- Sheet re-pulled 9/18 via the new `scripts/pull-sheet.py`; 112–114 are booths, no park-side gap;
  Sponsor/open rows read "Sponsor". **The renumber moved the top number to 139 and Kidlandia to
  K0–K10 — the poster's endpoints must be re-read from the JSON before 9/22, not copied from
  this file's history.**
- Merch booth: own pin, category, glyph (Phosphor t-shirt) and token `--pin-merch`, at the McLendon
  entrance; in the directory, legend and design system.
- Pinch zoom is continuous and snaps to a stop on release.
- Phone opening state shows bike valet (Phosphor bicycle on `--cat-utility`), the beer stand and
  merch alongside the four destinations. The McLendon art-market marker moved east and the beer
  stand pin 25 units WNW to keep every 44px target clear; nothing shrank.
- `<title>` is "Fall Fest – October 3rd and 4th 2026".
- Pumpkin smashing + Trees for Tuition is one line. AWARE Wildlife and Achieve with Steve are
  unnumbered squares with their own sheets; Achieve with Steve is named under the Acoustic Stage.
- Print/poster copy says "over 130 artists"; every run endpoint on the print sheet is read from
  the data.
- 9/19 review round (each its own commit): pins hold one on-screen size through a pinch and its
  settle; Kidlandia booths are one column inside the area, south to north, in the Kidlandia
  colour; merch and the info booth sit on the east side of the entrance path per Jess's 2026 site
  plan, info stacked directly north of merch; AWARE Wildlife and Achieve with Steve draw as
  hollow squares. The info booth has always drawn as a pin in `--pin-info`; e2e now asserts it on
  phone, desktop and paper.
- 9/19 final round (each its own commit): `src/data/festival.js` is the one source for the
  festival's name, dates, site and locked map URL; the print sheet carries a **vector QR code**
  (1.5" box on the east lawn under the north arrow, verified by decoding a 300 dpi raster of the
  PDF down to 60 dpi) with the "Scan for the music schedule…" callout; the kicker, the hollow
  legend row and the footer are gone; margins are 0.4" on all four sides with the map flush
  left; side-column spacing is `--space-*` tokens only (`--space-8` between sections,
  `--space-2` heading to content); map labels sit at the 8pt floor; the phone header shows the
  dates beside the wordmark.
- 9/19 round three (each its own commit): the phone header's dates sit on the wordmark's
  baseline; the print sheet's QR sits at the map's vertical centre with 12 units of edge
  clearance; the range key is gone and the index is "Art Market · Over 130 artists"; the whole
  side column is one four-column grid (`--print-cols`, `--print-gutter`) that every section
  snaps to.
- 9/19 round four (each its own commit): the **info booth is 48 units above merch and off the
  phone's opening view** (it arrives at the first zoom step) but on the desktop's, via
  `overview: 'docked'` in `pins.js`, where the 48 units are a 13px gap; the phone-overview
  version overlapped; food stalls 1, 2, 3 and 5 are one straight
  line (2 and 3 poke a unit or two past the food blob's top edge, like 1 and 5 already did — a
  Figma call whether the blob grows); the print sheet's **Food Court list is gone** and the
  **artist list is 8pt** (line-height 1.35, 0.3" spare), every row on a shared `--print-lead`
  box that also centres the legend swatches, so every label and every name starts on one x;
  **PR screenshots** and **visual baselines** are standing rules 3 and 4 above, with the three
  Actions (`PR screenshots`, `CI`, `Update visual baselines`) that enforce them. The first
  baselines were rendered by that Action on 9/19; this container's renders differed from the
  runner's by 0.4–3.8% of pixels, which is why the runner owns them. Booth numbers on the map stay ~5.5pt on
  purpose: the rows are pitched too tightly for 8pt.
- 9/20 round (each its own commit): **Candler Park Dr re-verified from 82 up** — the branch already
  had 132–139 on the final stretch (Courtney's 9/19 note was about the live site), and the
  re-check found the 9/18 re-pull had dropped the park side's speed-bump break, so 101–111 moved
  18 units south, level with 82–94; Kidlandia K0–K10 confirmed and closed; `pull-sheet.py` stops
  with a plain message on a restricted sheet or no network (**the JSON is still the 9/18 read**
  — re-pull from a laptop before 9/22); the area markers fade out at Detail; merch 10 north and
  info 8 south, 46 apart; AWARE Wildlife's square is on the entrance path at the west lawn's
  corner (598.5, 677); the print sheet lost its run ranges and the "Over 130 artists" subhead,
  and its legend swatches sit on the index numbers' right edge with `--print-lead-gap` one step
  wider. All three visual baselines change (print for the CPD move, the labels and the legend;
  phone-open and sheet-open for merch) — re-rendered by the Action.
- 9/21 round, PR #9 (each its own commit): sheet re-read through the Drive connector — only 138
  and 139 changed since 9/18 (both now artists; no sponsor booths left); the **featured artist**
  (booth 11) draws as a star in her square everywhere and is named in her sheet and the index;
  Candler Park Dr numbers on paper sit beside their squares, outward. The print index is at
  **0.08" spare** — the next two rows Courtney adds will not fit at line-height 1.35; the honest
  next step is line-height 1.3 (0.21" spare, measured), not a smaller size. Baselines: print
  (numbers, star, 138–139), phone-open and sheet-open (the star on booth 11 is off the phone's
  opening view, so those two may not change — the Action decides).

- 9/22 round, the committee feedback PR (one commit per item): the **print-only layer** above;
  Kidlandia column flipped (K0 north); **King of Pops** back on the food list, unpinned; the Main
  Stage water is on the field by the beer stand (nudged to 46 units from it, the touch floor at
  the first zoom step); the entrance-path water is at the McLendon entrance next to merch
  **exactly where Jess put it, and on the phone it overlaps the merch target at the first zoom
  step — Ernest decides the phone treatment**; four barricades, seven generators / dumpsters,
  two speed bumps and two restroom banks on paper; the field side of the art-market path has
  two **beverage stations**, EMS (the first-aid pin, moved from the Main Stage) and a restroom
  bank; Kidlandia has a water station and the **PTA booth** (Phosphor rocket, now in `--pin-kids`);
  **Mell Ave is at x 938.5** in the trace and the McLendon east end is repacked west of it
  (barricade 912, stage 885, Achieve with Steve 858, booth 55 at 840, 56–68 at a 15.8 pitch);
  beer and a new water station sit 46 apart over the Acoustic Stage. The print index is at
  **leading 1.25 (provisional)** to make room for the Site / safety key — 0.19" spare, one line;
  the options are in `docs/pr-shots/print-side-option-*.png`. Phosphor has no `Cup` glyph
  (checked core 2.1.1): the beverage cup is `PintGlass`, one line in `icons.js` to swap.
  The `drinks` card and directory row now say "Beer" / "Beer stands" (round 2).
- 9/22 round 2, Ernest's review of that PR (one commit per item, same branch): the **no-overlap
  standing rule** above, with `from: 'detail'` and the chip behaviour, and e2e measuring every
  stop plus the paper; **every restroom on both maps** (the two 9/21 banks lost `print: true`);
  a **water station at the Candler Park Dr speed bump** (438, 585); ops colours — **generator
  yellow with a navy bolt, dumpster white with a charcoal ring, PTA in `--pin-kids`**
  (`PIN_INK` in `pins.js` carries the two glyph/ring exceptions; `--ops-equipment` retired);
  **Kidlandia numbers beside their squares, outward**, no "K0–K10" on paper; the print legend's
  "Site / safety" heading is gone (the row groups by a `--space-3` gap) and the gap under the
  header rule is `--space-4`, half what it was — the room went back into the index at
  **leading 1.3, 0.24" spare on this render**; **King of Pops has two food pins** (Main Stage
  cart 690, 320; entrance cart 583, 735) whose card is the vendor record; beverage and PTA
  cards are one neutral line each with `TODO(Jess)` beside them; the **bottom sheet's handle/close
  row is fixed** and only the body scrolls (on `.ffc-panel--bottom`, every sheet). Pin moves
  to Ernest's endpoints, nudged only where rule 1 demanded: EMS (715, 373); beverage stations
  (669, 370) and (761, 379) edge to edge with it; beer stand (728, 472) and the in-park marker
  up the path to (801, 433) to keep 81 units from it at the overview; field water exactly at
  Jess's (731, 413), Detail only; field restroom (680, 526); PTA (519, 520); the south restroom
  on the path at (611, 661), the midpoint between booth 54 and AWARE's square, 20 from each,
  so **AWARE stays at (598.5, 677)**; **info stays 46 above merch at (630, 694)** — Ernest's
  (638, 723) would overlap at every stop — and on the phone arrives at Detail, since the south
  restroom now outranks it at the first step; entrance water (644, 761) and Acoustic water
  (887.5, 750), each edge to edge at Detail and Detail only.

- 9/22 round 3, Ernest's print-sheet review of round 2 (same PR; it reached the session after
  round 4 and sits on top of it): the **lawn beside Kidlandia** is a front row of beverage
  station (670, 391.5), King of Pops cart (692.5, 377.5), first aid (712, 395), beverage station
  (738, 390.5), with water (707.5, 455.5) and the beer stand (728, 472) below — Ernest's spots,
  nudged 0.5–7.8 units so the Detail targets are edge to edge; first aid shows from the first
  step, the rest of the row and the water wait for Detail. **King of Pops carts are squares**
  (`shape: 'square'` in `pins.js`): an 8-unit tick in `--pin-food` at full strength, no glyph,
  44px target, keyed "King of Pops" in the print legend beside "Food stall". **Info is on top of
  merch, edge to edge** at (637, 714.5) — see Decided. The in-park marker stays at (801, 433):
  the beer stand did not move, so it cannot come back. Every nudge and every pin hidden at a
  stop is in `docs/pr-notes.md`.
- 9/22 round 4, Ernest's iPhone check (same PR): the **interaction model** above (the tap on a
  pin no longer clears the chip — that is what made the Kidlandia water pin vanish; `revealAt`
  pans the pin into the band above the sheet; one tapped pin wears the ring; empty-map taps clear
  one layer at a time; e2e drives the Water and Restrooms flows at 375); **every pin card has a
  location line** (`where` on each visitor pin in `pins.js`, shown first on the card). Round 3
  reached the session after round 4 and was applied on top of it.

- 9/23 round 5, Jess's markup PDF fit to the map (same PR): **`hidden: true`** on a pin takes it
  off both maps, the directory, the legends and the chips (kept for next year; delete the flag
  to bring it back) — both beverage stations, the PTA booth, both speed bumps and the speed-bump
  water are hidden. Added: **Mr Softee** as a food-cart square at (678, 476) (both maps, his
  vendor card), the **ice truck** (710, 497) and **musicians' tent** (805, 267) as paper-only
  ops items (`--ops-ice-truck`, `--ops-musician-tent`, Phosphor Truck and Tent), one more
  generator (708, 524); the generator/dumpster pairs stack above the tent. Moved: water at the
  top of the CPD run (421, 360, both maps — Jess asked for water there, not a speed bump),
  Kidlandia water to (552, 461), the field restroom back to her (679, 555), the McLendon-east
  barricade to (979, 789.9) east of Mell. Print legend: "Food cart" covers both carts. Every
  nudge and hidden pin is in `docs/pr-notes.md`.

- 9/23 round 6, print legibility (same PR): **a number on paper has to point at a list row.** The
  three food carts are **C1–C3** (`n` on the cart's pin, the one place; the print map, the print
  index and the phone card read it); the **food-stall numbers are off the paper** (squares stay;
  the phone still numbers and opens them); the slanted **"Art Market" label is off the car path**;
  the print header is a 40pt wordmark (`--print-brand-size`) with the date line tight under it
  (16px / 15px optical); the field restroom is 8 units out on the lawn at (672.5, 550). Round 7
  (same day): the **"Art Market" heading over the index is gone** — the list starts under the key
  at the section gap — and the index is back at **leading 1.3 with 0.14" spare** (155 rows).

- 10/6 round, Ernest's iPhone walkthrough of the live map (one PR, one commit per item): `--tap-min`
  for every control and `--pin-hit` for every pin (nothing waits longer than before: pin hit areas
  were already 44); the **map safe area** and pan limits (the north-most restroom can reach it —
  reproduced on short phones, 390×550 and 375×560, where it sat under the header); **one sheet,
  list → booth inside it with a back row**; the **ItemPager** in a pinned footer; **peek** when a
  chip is on; sheet/panel styles moved from `map.css` into `components.css`; the art list leads
  with the artist; set times never wrap; no provenance footer; restroom / water / first-aid copy;
  `docs/interaction-states.md` lists every state, action and transition.
- 10/6 round 2 (same PR): **one name per component** (a Names table in the design system; classes
  renamed to match: `.ffc-itempager`, `.ffc-panel__handle`, `__header`, `__titleline`, `__body`,
  `__footer`, `.ffc-boothrow`, `.ffc-artistline` …); **Close fixed top-right on the first row**;
  **push / pop with the height held**; **ArtistLine** in the booth detail too; the six OPEN cells
  decided and built (back per layer, re-pan after pinch/rotate + landscape peek cap, every booth
  square dimmed with a chip, booth squares pan, same-area list kept, swipe → peek); copy pass (the
  stale "placements arrive later this week" line gone; Beer and Bike valet say each thing once);
  the design-system Panel demo is the live anatomy. **Still OPEN:** the ItemPager is hidden at peek,
  so booths cannot be paged on a phone on its side. `vendors.json`'s own `note` still says "later this
  week" — Cowork's file, no sheet shows it. No swipe-to-page on the ItemPager: a horizontal swipe
  fights the body's scroll and the drag-to-dismiss.

**Placed by description in that PR — confirm before print / at setup, don't leave to chance:**
- The **beer stand** pin is the Figma export's main-lawn beverage marker, chosen because Todd puts
  Mr Softee "to the right of the beer stand" on the field. Confirm that is the main stand (Jess).
- **Merch and the info booth** are from Jess's 2026 site plan (the CPNO Merch Tent): east side of
  the entrance path, merch 36 units north of the McLendon kerb, info 46 units directly above it
  (Ernest, 9/20; Jess: they are the same place). Info is not on the phone's opening view: at
  that scale the two targets would need 81 units apart, which is a 60px gap on desktop. The
  **bike valet** pin sits 10 units east
  of the export's spot, the McLendon art-market marker moved east with it, and the **southern
  restroom** pin is 20 W / 7 N of the export's spot (its export spot also grazed booth 54's hit
  area).
- The **southern water station** pin is 5 units off the export's spot (4 west, 1 south) so its
  target clears the info booth's. Falls under the water-station question below.
- The **Kidlandia column** sits along the east side of the Kidlandia shape, K0 at the north end.
  Verify at setup.
- **Ernest's 9/22 endpoints** (round 2) supersede the 9/21 box readings for every pin they name;
  the table is in PR #12's round-2 description. Still verify at setup.
- Everything from **Jess's 9/21 markup** was read off red boxes on the printed sheet and lands
  within a few units; where a spot was nudged the reason is in `pins.js` beside it. Her 9/23
  comment text confirms the barricade at the CPD/McLendon corner is across McLendon.
- **AWARE Wildlife** square: on the white ground of the entrance path, nestled into the west
  lawn's corner where the path widens out to the booth rows (Ernest, 9/20; Courtney's words
  were "on the grass"). **Achieve with Steve** square: one McLendon pitch east of booth 55. Both
  approximate.

**Not in this repo:** the **Food & Friendship tent** (Jess 9/17: remove it) does not exist in the
app's data or basemap — nothing to delete here. It is on the printed poster / Figma artwork, which
is Cowork's and Ernest's to fix.

**Waiting on people (don't guess):**
- Park west row split (29–37 north / 38–54 south of the path bend) — unverified, asking Courtney.
- Hours for Kidlandia bounce houses, bike valet, artist market (Amy asked for them on the map).
- Restrooms on Candler Park Dr (end of booths) and on the field; more water stations; Callaway
  Blue water and some sponsor locations moved in the 2026 site plan — confirming with Jess / Andy.
- ~~King of Pops~~ — coming (Todd 9/21), listed unpinned.

**Before the 9/28 freeze:**
- ~~Analytics~~ — done 9/24 on Umami Cloud; see **Analytics** below. After it merges, the handout
  PDF has to be rebuilt (`npm run print`) and **re-sent to Jess** — its QR now carries `?s=qr`.

**Outside this repo:** iPhone header bug on the Squarespace site (nav unreachable on a phone),
reported to Will 9/13, no reply. Until fixed, the homepage band is the only phone route to the map.

## After the festival: pin placement rules (PR #21, 10/17–10/19)

- 10/17, pin placement rules (one PR, one commit per item): the **Pin placement rules** in Decided,
  computed by `src/pinPlacement.js` for each screen's scale; rank in `pins.js`, the cap in the
  design system (1.4.0, rules `true-location`, `nudge-cap` and `stays-shown`). With today's pins
  nothing ties, nothing nudges and nothing is flagged on paper. What moved on the phone's first
  step: the water
  station at the Acoustic Stage arrives a stop earlier and the Acoustic beer and Mr Softee wait
  for Detail. Ernest chose **once shown, stays shown** (rule 6b): the beer stand and merch stay
  from the opening view on, and the lawn and entrance water stations and the info booth wait for
  Detail, as they did before. Same PR: **Kidlandia gives way to its K booths at Detail** like the
  Food Court, and every area's name label there carries the tap (AreaLabel, rule
  `area-label-tap`). Round 4 (10/18, design system 1.5.0): the **level 3 scale floor** and the
  **2px `--pin-gap`** at levels 2 and 3; five true locations moved apart by under a map unit
  each (lawn water, Acoustic beer, King of Pops C1, entrance water, info: listed in pins.js and
  that PR's notes). Round 5 (10/18, design system 1.6.0): the e2e **device matrix** (`scripts/lib/devices.mjs`,
  one line per phone: 320–430px, two at 125% text, the docked desktop; WebKit and Chromium, WebKit
  on CI only); the **booth tap exception** as rule `booth-tap-equivalent`, with e2e reaching every
  booth's card from level 1 by 44px taps; the **McLendon marker at (492, 787.9)** and the
  **in-park marker at (813.3, 415.9)**, moved along their runs so the beer stand and bike valet
  show at level 1 on narrow phones (there merch and the bike valet now split a tie, up to 9.2 units).
