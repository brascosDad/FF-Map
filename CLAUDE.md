# FF-Map — read this first

The interactive map for **Candler Park Fall Fest**. React + Vite, deployed by Vercel on push to
`main`. Live at https://fall-fest-map.vercel.app (URL is locked — every printed QR points at it).

**Status (2026-10-13): the 2026 festival is over.** It ran Sat–Sun Oct 3–4; about 1,100 people
used the map, 94% on phones. Work now is the case study, the design system, and getting the repo
ready for next year. How 2026 was built, round by round, is in `docs/history-2026.md` — history,
not instructions.

Tier 2 scope: tap pins, filter, stage lineups, offline after first load. **No GPS / "you are
here"** — cut deliberately, don't reopen it.

This file is the handoff surface between the two agents working on this project. Keep it short
and current: standing rules and decisions live here; dated logs go in `docs/`. **When a PR
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


**Don't restructure, rename, or refactor beyond the task asked.** Propose structural changes first.

## Standing requirements — every PR, not just the one that asks

**1. Build with components and reference the design system on every move.** Tokens live in
`src/styles/tokens.css`, documented in `design-system.html`. No ad-hoc colors, spacing, or type
sizes. If the value you need doesn't exist as a token, **add the token and document it** rather
than hardcoding past it — the design system is meant to grow alongside the build, in real time,
not be reverse-documented afterward. Ask the system instead of rereading the prose:
`design-system/manifest.json` (generated, `npm run manifest`) answers to `npm run ds -- …` or the
`ff-design-system` MCP server in `.mcp.json`, and `check` flags raw hex/px, missing tokens and unknown
class names in a snippet. How it changes (propose → review → adopt, versions, deprecation):
`design-system.html` §7.

**2. The data layer has to be clean and scalable, even though the dataset is small.** The test:
a volunteer picking this up next year opens the repo and can see immediately what to change. One
clearly named source of truth per kind of thing, a documented shape for each record, no duplicate
copies of the same fact in two files. Propose structural changes before making them.

**3. Every PR carries before/after screenshots.** Phone (390px) at open, desktop, and `?print=1`,
from `main` and from the branch. The `PR screenshots` Action does it on every pull request: it
runs `npm run pr-shots`, commits the PNGs to the branch under `docs/pr-shots/`, and writes a
"Screenshots" table into the PR description. Run `npm run pr-shots` yourself to look before you
push. Don't hand-edit that table; the Action rewrites it on each push.

**4. Visual changes are gated by baselines.** CI diffs three renders — the phone at open, the
phone with a bottom sheet open, and the print sheet — against `tests/visual/*.png`. A change to
any of them fails CI until the baseline is updated on purpose: put the `update-visual-baselines`
label on the PR, the Action re-renders on the runner and commits the PNGs to the branch, and
the PR description says which baselines changed and why. The baselines are the **CI runner's**
renders — other machines rasterise text differently, so `npm run test:visual` locally shows the
diffs but CI has the verdict. `tests/visual/README.md` has the steps. Never update a baseline
without looking at the diff image first.

**5. Reporting, every PR (Ernest, 9/22):** every question, open decision, skipped item and pin
nudge goes into `docs/pr-notes.md` on the branch, overwritten each PR — the PR description can
summarise it, the file is the record. If an answer is needed before work can continue, the chat
reply ends with a line starting `BLOCKED:`.

**6. One name per component, used the same way everywhere** (Ernest, 10/6, round 2): in the code,
the CSS (`.ffc-<name>`), the tests, the docs and the design-system page. The **Names** table at the top
of `design-system.html` §3 is the list (ItemPager, Handle, Header, BoothRow, ArtistLine, ScheduleRow …);
check it before adding a class or a word for something, and fix a stray old name when you see one.
The component is **ItemPager** — never "pager", "stepper" or "booth nav".

## Data — where the truth actually lives

Upstream sources are other people's documents. They move. Re-read them rather than trusting a
snapshot, and record the read date when you do.

| Data | Source of truth | Owner |
|---|---|---|
| Artist booths + numbering | the `sheet_url` in `src/data/booth-numbering-2026.json` | Courtney Weil |
| Food vendors | `vendors.json`; 2026 names and descriptions are final, **stall assignments are not** | Todd Tharp |
| Stage schedule | `stages.json` — final, both stages both days | Thomas Helland / Hallie Meushaw |
| Site layout / amenity placement | 2026 site plan PDF (Operations) | Jess Richards / Van Jensen |

**Sheets carry no provenance line** (Ernest, 10/6 — it was noise to a visitor): the "Artists from the
2026 list · positions from the official map" footer on a booth sheet, the "Source: …" line under a
stage lineup, and the food list's note are gone from every sheet on phone and desktop. Where a fact
came from lives here and in the data files: `stages.json` has `source` (the committee thread and the
confirm date), `vendors.json` has `note`, `booth-numbering-2026.json` has `sheet_url` and
`read_date`, and a booth's position is the Figma basemap plus the official site plan (see the table
above). Don't put a source line back on a sheet; add it to the data file instead.

Never quote a booth number or count from memory: `poster_endpoints` and `read_date` in
`booth-numbering-2026.json` are current. Public copy says **"over 130 artists"**, never a booth
count. Unnumbered spots are placed by `UNNUMBERED_AT` in `scripts/build-booths.py`.

**Re-reading the sheet** — two commands, no hand edits:
`python3 scripts/pull-sheet.py && python3 scripts/build-booths.py`. The first rewrites the JSON
from the live sheet (or a CSV path you give it) and stamps the read date; the second lays it on
the map and refuses to write if anything is unplaced. The remote container can't reach Google:
export the CSV (or use the Drive connector) and pass the path. Diff the rebuilt JSON against the
previous read and name every changed row in the PR.

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
npm run ds -- component ItemPager   # ask the design system: components | component <Name> | tokens [filter] | rules | check <css>
npm run manifest   # regenerate design-system/manifest.json (CI fails if it is stale); npm run test:ds tests it
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
  that target; the tappable area may not. Two tap-size tokens (10/6): `--tap-min` (44px) is the floor
  for every **control** — chips, the sheet's close ×, the zoom buttons, the ItemPager's buttons, the
  handle — and `--pin-hit` (44px) is the hit area centred on every **pin**. WCAG 2.2 AA 2.5.8 asks for
  24px with a spacing exception; the no-overlap rule below is how pins satisfy it.
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
  **10/6 additions** (Ernest, iPhone walkthrough, rounds 1 and 2; full spec in
  `docs/interaction-states.md` and `design-system.html` §6): a sheet that opens **while a chip is on
  opens at peek height** (`--sheet-peek-height`) so the map stays visible — drag the handle up or tap
  it for full, tap again for peek; no chip, no peek; **on a phone on its side the sheet is capped at
  peek**. A swipe down from a full chip sheet **stops at peek; the second closes**. **Close is always
  top-right, on the first row under the handle**, in every sheet state (a top-level sheet's first row
  is its title line; a pushed detail's is `‹ back`, the booth's own title the row below). **One sheet,
  a stack one level deep, push from the right / pop to the right, height held**: a booth opened from
  a row in an area's list (or a square in the same area on the map) slides in from the right inside
  the same sheet at the list's height; `‹ back` slides it out to the right and the list returns at
  its scroll position; the ItemPager pages sideways and never adds a step ("the way you step in is the
  way you step out"). **The ItemPager is a footer pinned to the bottom of the sheet.** **Every pan
  that targets a pin or a booth centres it in the map safe area** (`--map-inset-top` /
  `--map-inset-bottom`, measured at runtime), the pan limits run past the festival by the same
  amounts, and the pan runs again after a pinch settles and after a resize. **Every booth square is
  dimmed with a chip on** and a tap on one falls through like a dimmed pin. **Back (the phone's back
  gesture) closes the sheet first, then clears the chip, then leaves the page**: one history entry per
  layer (`useLayerHistory`). Set times never wrap. Sheets carry no provenance line (see Data).
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
- **Category pins sit in one lightness band** (10/12): every `--pin-*` hue between OKLCH lightness
  57 and 67, coral (`--current`) above 70, each pin at least 3:1 under its white glyph; the
  structural neutrals (`--cat-*`) are exempt. Measured as the eye sees it (OKLCH, not HSL) by
  `npm run ds -- check-palette`, and `npm run test:ds` fails outside it (rule `category-lightness-band`).
- **Category pins sit far enough apart to tell by hue** (10/12): no two `--pin-*` colours closer than
  ΔE 9.5 in OKLab (×100, the lightness scale); `--pin-beverage` is exempt as the declared darker step
  of `--pin-drinks`. `npm run ds -- palette-distances` lists every pair; `npm run test:ds` fails under
  the floor (rule `category-hue-spacing`). The candidate sets are in `docs/hue-sets.json`.
- **Print legibility (9/23): a number on paper has to point at a list row.** The three food carts are **C1–C3**
  (`n` on the cart's pin, the one place; the print map, the print index and the phone card read
  it); food-stall numbers stay off the paper (the phone still numbers and opens them).
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

## Open

- **Next year's guide.** Write "how to update this for next year". If it's hard to write, the
  data structure is wrong — design the two together.
- **Tokens as one JSON source.** Tokens live in `src/styles/tokens.css` only; the Figma sync
  moves map shapes, not tokens. Next step: DTCG-format JSON → CSS and Figma variables.
- **`basemapTrace.js` is not refreshed by Sync from Figma** — a street moved in Figma is moved
  there by hand. Wire it in.
- **ItemPager is hidden at peek**, so booths can't be paged on a phone on its side. No
  swipe-to-page: a horizontal swipe fights the body's scroll and drag-to-dismiss.
- `vendors.json`'s `note` still says "later this week" (Cowork's file; no sheet shows it).
- Squarespace header bug (nav unreachable on a phone), reported to Will 9/13 — check whether it
  still matters before next year.

## Analytics

Umami Cloud, no cookies. To turn it off, set `websiteId` in `src/data/analytics.js` to `''`.
Events, `?s=` sources and how the summary is sent: `docs/analytics.md`.
