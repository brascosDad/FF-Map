# FF-Map — read this first

The interactive map for **Candler Park Fall Fest, Sat–Sun Oct 3–4, 2026, 11 AM–7 PM**.
React + Vite, deployed by Vercel on push to `main`. Live at https://fall-fest-map.vercel.app
(URL is locked — every printed QR points at it).

Tier 2 scope: tap pins, filter, stage lineups, offline after first load. **No GPS / "you are
here"** — cut deliberately, don't reopen it.

This file is the handoff surface between the two agents working on this project. Keep it current;
if you learn something a future session would have to rediscover, write it here. **When a PR
resolves an item under "Open", update this file in the same PR.**

## Who does what

Two Claude sessions work on this repo, plus Ernest.

| | Owns |
|---|---|
| **Claude Code** (this session) | everything under `src/`, `scripts/`, `public/`, build config, tests, PRs |
| **Claude (Cowork)** | `CLAUDE.md`, `src/data/*` inputs, `design/` sources, the printed poster, committee email, research |
| **Ernest** | merges, Figma, account settings (Vercel, Squarespace), all committee decisions |

Cowork can read this repo but **cannot push**. It reaches the repo through Ernest, or by writing
into his local clone at `~/Projects/FF-Map` when that folder is connected to its session. So if a
data file changed underneath you, that's why.

**Don't restructure, rename, or refactor beyond the task asked.** We are weeks from a festival.

## Two standing requirements — every PR, not just the one that asks

**1. Build with components and reference the design system on every move.** Tokens live in
`src/styles/tokens.css`, documented in `design-system.html`. No ad-hoc colors, spacing, or type
sizes. If the value you need doesn't exist as a token, **add the token and document it** rather
than hardcoding past it — the design system is meant to grow alongside the build, in real time,
not be reverse-documented afterward.

**2. The data layer has to be clean and scalable, even though the dataset is small.** The test:
a volunteer picking this up next year opens the repo and can see immediately what to change. One
clearly named source of truth per kind of thing, a documented shape for each record, no duplicate
copies of the same fact in two files. Propose structural changes before making them.

**3. Every PR carries before/after screenshots.** Phone (390px) at open, desktop, and `?print=1`,
from `main` and from the branch. The `PR screenshots` Action does it on every pull request: it
runs `npm run pr-shots`, commits the PNGs to the branch under `docs/pr-shots/`, and writes a
"Screenshots" table into the PR description. Run `npm run pr-shots` yourself to look before you
push. Don't hand-edit that table; the Action rewrites it on each push.

**5. Reporting, every PR (Ernest, 9/22):** every question, open decision, skipped item and pin
nudge goes into `docs/pr-notes.md` on the branch, overwritten each PR — the PR description can
summarise it, the file is the record. If an answer is needed before work can continue, the chat
reply ends with a line starting `BLOCKED:`.

**4. Visual changes are gated by baselines.** CI diffs three renders — the phone at open, the
phone with a bottom sheet open, and the print sheet — against `tests/visual/*.png`. A change to
any of them fails CI until the baseline is updated on purpose: put the `update-visual-baselines`
label on the PR, the Action re-renders on the runner and commits the PNGs to the branch, and
the PR description says which baselines changed and why. The baselines are the **CI runner's**
renders — other machines rasterise text differently, so `npm run test:visual` locally shows the
diffs but CI has the verdict. `tests/visual/README.md` has the steps. Never update a baseline
without looking at the diff image first.

## Data — where the truth actually lives

Upstream sources are other people's documents. They move. Re-read them rather than trusting a
snapshot, and record the read date when you do.

| Data | Source of truth | Owner |
|---|---|---|
| Artist booths + numbering | the `sheet_url` in `src/data/booth-numbering-2026.json` | Courtney Weil |
| Food vendors | `vendors.json`; 2026 names and descriptions are final, **stall assignments are not** | Todd Tharp |
| Stage schedule | `stages.json` — final, both stages both days | Thomas Helland / Hallie Meushaw |
| Site layout / amenity placement | 2026 site plan PDF (Operations) | Jess Richards / Van Jensen |

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
- Anything marked Sponsor/open on the sheet prints as "Sponsor". As of the 9/21 read there are
  **none**: 138 (Kenyaita Hodge, Elaine Monet Candle Co) and 139 (Renzo Iglesias, L'Harmonie
  Creative Jewelry) were added 9/18 after that morning's pull — Courtney flagged them 9/20.
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

**Re-read the sheet before print files go out.** Courtney has edited it four times in four days.
Two commands, no hand edits:
`python3 scripts/pull-sheet.py && python3 scripts/build-booths.py` — the first rewrites the JSON
from the live sheet (or from a CSV path you give it) and stamps the read date; the second lays it
on the map and refuses to write if anything on the sheet is unplaced. The sheet is **view-only**
since 9/19, which is all the pull needs; if Google answers with a sign-in page (restricted to
named accounts) or the network can't reach Google (the remote Claude Code container can't), the
script says so and stops — then File → Download → CSV in a browser and run it on that file.
The 9/21 read came through the **Google Drive connector** in the Claude Code session (Ernest's
own access to the sheet; the container's network cannot reach Google): the connector's CSV export
is the same file the script fetches, saved to disk and passed as the CSV path. Diff the rebuilt
JSON against the previous read every time and name every changed row in the PR.

**Candler Park Dr layout, verified 9/20 against the 2025 map and the sheet's own old-number
column:** street side 82–94 | speed bump | 95–100 | barricade | 132–139 (the "final stretch",
top of the column); park side 101–111 | the same speed bump | 112–131. The sheet skips three
2025 numbers at each break (105–107, 126–128), which is how you can tell where the breaks are
without the map. **The live site still shows the 9/17 numbering** (135–142 on the final stretch)
until PR #8 merges — that is what Courtney saw on 9/19.

## Generated files — never hand-edit

- `src/assets/basemapBlobs.js`, `design/basemap.svg` — shape changes happen in **Figma**, then the
  "Sync from Figma" Action regenerates them. The frame is found by node id `5906:4939`; don't
  duplicate or replace it.
- `src/data/booth-numbering-2026.json` — generated by `scripts/pull-sheet.py` from Courtney's sheet.
  If the sheet is wrong, tell Courtney; the one deliberate correction (booth 39's columns are
  swapped on her sheet) lives in the script as `NAME_BUSINESS_SWAPPED`.
- `src/data/booths.js` — generated by `scripts/build-booths.py` from `basemapCoords.js` (where) and
  `booth-numbering-2026.json` (what). Edit the inputs and re-run. The two unnumbered artists'
  positions are the script's `UNNUMBERED_AT` table.

## Commands

```
npm run dev        # local
npm run lint       # oxlint
npm run test:e2e   # required green before any PR: builds, runs the behaviour suite, then the visual diffs
npm run test:visual   # just the visual diffs, advisory off CI; to accept a change, label the PR update-visual-baselines
npm run pr-shots   # before/after screenshots (main vs branch) into docs/pr-shots/, prints the PR table
npm run print      # writes the 11x17 print PDF + 300dpi PNG
npm run sync       # git pull --ff-only && npm install
python3 scripts/pull-sheet.py && python3 scripts/build-booths.py   # re-read Courtney's sheet
```

Every PR: lint and e2e (with the visual diffs) pass — CI runs both on every pull request — and reply
with the PR link **and** the Vercel preview URL. The screenshots Action adds the before/after table.

## Decided — don't reopen

- No GPS, no "you are here."
- Three zoom stops, not four.
- Tap a pin to open it; double-tap elsewhere to zoom. Booth sheets stay open on zoom-out.
  Desktop directory rows fly the map in one level.
- Reset control is arrows-to-corners, not a locate button.
- No search bar.
- **Pins are touch targets. 44×44 CSS px is the floor.** The visible icon glyph may shrink inside
  that target; the tappable area may not.
- **No element covers another, at any zoom stop, on either map** (Ernest, 9/22). No tap target
  may overlap another tap target at any of the three stops — an overlap invites a wrong tap.
  Circles may touch edge to edge; they may not cross. When two collide, one of two things happens:
  the lower-priority pin **doesn't show until a closer stop** has room for it (`from: 'detail'`
  in `pins.js`), or the two are **moved edge to edge**. Priority when something must wait:
  labelled destinations (stages, Food Court, Kidlandia) → first aid / EMS → restrooms → info,
  merch, bike valet, beer → water, beverage stations, PTA, food carts. Booth hit areas count as
  targets at the Detail stop. The e2e suite measures every stop on a 375px phone, with each
  filter chip on as well. **The print sheet follows the same rule**: nothing on paper covers
  anything else — nudge edge to edge; paper has no zoom to hide behind. e2e checks the paper too.
- **Chips, pin taps and the sheet — the standing interaction model** (Ernest, iPhone, 9/22; phone
  and desktop, every chip):
  1. **Chip on:** every pin in that category shows, whatever the zoom, highlighted and drawn on
     top; everything else dims and cannot be tapped (this replaced "dimmed pins stay tappable").
     Turning a chip on goes to the overview so the whole category is in frame.
  2. **Tap a highlighted pin:** the map pans so the pin sits centred in the visible map area
     above the open bottom sheet (left of the docked panel on desktop), never behind it. It
     zooms in only if needed — the current stop is kept when the pin is shown there, else the
     nearest closer stop that can bring it into view (`revealAt` in `useMapView`). The pin keeps
     the navy selected ring and the sheet opens with its card. The tapped pin never disappears:
     a pin tap never touches the chip.
  3. **Close the sheet** (close button, swipe down, tap on empty map): the ring clears, the chip
     stays on, all its pins stay shown, the map stays where it is.
  4. **Tapping empty map clears one layer at a time:** a sheet open → only the sheet closes; no
     sheet → the chip turns off.
  5. **Tapping the active chip again turns it off**, back to normal per-stop visibility; the map
     stays where it is.
  6. **A pan or pinch that starts on empty map is never a tap.** Only a genuine tap (no movement
     past the usual slop) counts for step 4.
  The same pan-into-view applies to a pin tapped with no chip on: centred above the sheet and
  selected while the sheet is open. One tapped pin wears the ring; a category row in the
  directory (no one pin) rings every pin of that category. e2e drives the Water and Restrooms
  flows at 375px.
- Pinch zoom follows the fingers and settles on the nearest of the three stops when they lift.
  Still three stops; the pinch is just a nicer way between them.
- **The print sheet's type floor is 8pt** for everything in the side column and every label on the
  map. The one exception is booth numbers (~5.5pt), which the row pitch dictates.
- **Pins hold one on-screen size at every zoom, through a pinch and through the settle.** Only the
  map scales. The overview no longer draws pins a step smaller (the 34px `--pin-size-overview`
  token is gone): that step popped every pin to a new size the moment the fingers lifted
  (Ernest, iPhone, 9/19). e2e drives a real two-finger touch and measures a pin every frame.
- **Kidlandia booths are one vertical column inside the Kidlandia shape, K0 at the NORTH end,
  K10 at the south** (Courtney 9/21; it was laid the other way up until 9/22), in `--pin-kids`.
  The count is the sheet's.
- **A spot with no booth number draws hollow**: `--ff-cream` inside a `--cat-booth` frame, on the
  map and on paper, keyed in both legends. Still a booth; plainly not one of the numbered run.
- **The printed handout is single-sided, map-dominant, no stage schedule** (decided 9/17, Erin
  agreed 9/17). The QR code is a prominent feature with its own callout pointing at the schedule,
  food menus, and artist list.
- Exact food-truck placement is not needed — trucks cluster and shift at load-in (Amy, 9/17).
- **The three art-market area markers leave at the Detail stop.** They cross-fade with the zoom
  (driven by the view's position between the stops, so a pinch never blinks them) and a faded
  marker keeps no tap target: at Detail the area names are drawn and every booth is its own
  target, and a marker the size of a pin sat on 96–98, 113–115 and 60–62 (Ernest, iPhone 9/20).
  e2e proves those booths take the tap at Detail on phone and desktop.
- **Merch and info are one spot with two jobs** ("the same place!", Jess 9/20): info sits directly
  on top of merch, edge to edge — 26.4 units out on Ernest's round-3 bearing (a little east of
  north), the two 44px targets touching at the phone's Detail stop, which is where info arrives
  on the phone. On the desktop it arrives at the first step (a 12px gap between the 40px pins),
  no longer on the opening view, where 44px is 40 units. Don't move it back up.
- **Print sheet, 9/20:** no run ranges on the map (one plain "Art Market" on the car-path run, the
  streets are named, the index has every number); the index heading is just "Art Market" with no
  count under it; the Food Court list stays out of the side column; legend swatches and index
  numbers share one right edge in the `--print-lead` box.
- **A featured booth is a star in its own square** (9/21): the square goes solid and carries the
  Phosphor star in `--icon-on-color`, on the phone at every zoom that draws squares and on paper;
  its sheet, the area list, both legends and the print index (star in the number cell, entry
  bold) say "Featured artist". No colour of its own — coral is "now", navy is selected, pin hues
  are categories — so the star is the whole signal and reads at 5.5pt. `FESTIVAL.featured` takes
  any number of booths.
- **Candler Park Dr numbers sit beside their squares on paper**, outward (west column left, east
  column right), level, `NUMBER_GAP` off the edge; the park rows and McLendon keep numbers above
  the square, where they have room (9/21).
- **A pin flagged `print: true` in `pins.js` is paper-only** (9/22): the EMS / fire-inspector
  layer Jess marked up — barricades, speed bumps, generators, dumpsters, two restroom banks. The
  phone skips it; the print sheet draws it and keys it under "Site / safety". Ops colours are
  `--ops-*` tokens, not pin hues.
- **Beer and beverages are two categories** (Jess's plan, 9/21): the mug in `--pin-drinks` is
  beer, the cup in `--pin-beverage` (a step darker, same amber family) is everything else.
- **`basemapTrace.js` is not refreshed by Sync from Figma.** A street moved in Figma is moved
  there by hand too (Mell Ave, 9/22). Wiring it in is a post-festival job.
- The map URL is locked once posters print (~9/22). No hosting or routing changes after that.

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

## Open, as of 2026-09-18 evening

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
  cards are one neutral line each with `TODO(Jess)` beside them; the **bottom sheet's grip/close
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
- **Analytics.** Ernest wants to know how many people use the map and how deep they go: sessions,
  which categories get tapped, which pins get opened, how many reach the stage schedule.
  Lightweight and privacy-respecting — no personal data, no cookie banner — and it has to survive
  the offline service worker. Vercel Web Analytics is already on the deployment and is the obvious
  first candidate. Propose the event list before wiring it; keep event names readable for next
  year's volunteer. Analytics added after the festival measures nothing.

**Outside this repo:** iPhone header bug on the Squarespace site (nav unreachable on a phone),
reported to Will 9/13, no reply. Until fixed, the homepage band is the only phone route to the map.

## After the festival

Write the "how to update this next year" guide. If it's hard to write, the data structure is wrong —
design the two together.
