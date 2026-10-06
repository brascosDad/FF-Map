# PR notes: 10/6, interaction fixes + the interaction state spec (rounds 1 and 2)

Ernest's iPhone walkthrough of the live map (10/6), turned into rules in the design system. Same branch,
same PR. One commit per numbered item, so any one can be reverted. Read `docs/interaction-states.md`
(and `design-system.html` §3 and §6) for the spec; this file is the record of questions, decisions,
skipped items, measurements and what to try on the phone.

## Round 2 (Ernest's reply, 10/6)

### Status by item

| Item | What | Commit subject |
|---|---|---|
| Naming rule | ItemPager everywhere; one name per component; stray names fixed | `Naming: one name per component …` |
| 1 | One fixed header layout; **Close always top-right on the first row under the handle** | `Round 2, item 1` |
| 2 | List → booth is a **push and pop**; the sheet's height is held | `Round 2, item 2` |
| 3 + 10 | Every change is a documented component or rule; the Panel demo is the live anatomy | `Round 2, items 3 and 10` |
| 4.1 | Back: sheet, then chip, then leave | `Round 2, item 4.1` |
| 4.2 | Re-pan after pinch / resize; landscape caps at peek | `Round 2, item 4.2` |
| 4.3 | Every booth square dimmed with a chip on | `Round 2, item 4.3` |
| 4.4 | A booth square tap pans through the safe-area pan | `Round 2, item 4.4` |
| 4.5 | A square in the same area keeps the list under it | `Round 2, item 4.5` |
| 4.6 | Swipe down from a full chip sheet stops at peek | `Round 2, item 4.6` |
| 7 | Visual baselines: label (see below) | — |
| 8 | Booth detail leads with the artist (ArtistLine) | `Round 2, item 8` |
| 9 | Copy pass | `Round 2, item 9` |

### Things to know

- **I broke the × in the naming sweep and caught it with the back-button test.** The sweep renamed
  `.close` to `.ffc-panel__close`, but the header's drag handler still excluded `.close`, so a real tap
  on the × was swallowed by the drag (the earlier tests closed sheets in ways that hid it). Fixed in the
  item 4.1 commit, with a new e2e check that taps the × for real. This was never on the pushed branch.
- **Item 4.3 reading.** "Tapping one behaves like tapping a dimmed pin. It never clears the chip." A
  dimmed pin has `pointer-events: none`, so the tap falls through to the map, and a tap on empty map
  clears one layer: the sheet if one is open, otherwise the chip. I built it that way: no booth handler
  touches the chip any more, and a tap on a square with no sheet open is a tap on empty map (the chip
  turns off), exactly like a dimmed pin. If you meant the squares should swallow the tap and do nothing
  at all, say so; it is one wrapper.
- **Item 4.2: the pan after a pinch can step the zoom in one stop.** At the Booths stop on a tall phone
  the whole festival fits vertically, so there is nothing to pan; the same routine as a tap steps in one
  stop to bring the booth above the sheet. It stays at the visitor's stop whenever the pan alone works.
- **Item 4.2: landscape.** A phone on its side (`orientation: landscape` and `max-height: 500px`) opens
  the sheet at peek and caps it there; the handle says "drag down to close" and does not expand it.
  **Still OPEN:** the ItemPager is hidden at peek, so on a phone on its side booths cannot be paged.
  Show it at peek in landscape only, or leave paging to portrait?
- **The header animates its own height.** A pushed detail has a back row above the title; the header
  eases between its two lengths (JS, `--motion-panel`) so the body does not jump a row. Reduced motion
  skips it.
- **Desktop gets the same push / pop.** The docked panel's list → booth uses the same layers.
- **`vendors.json`'s `note` still says "arrives later this week".** It is Cowork's file and no sheet shows
  it (C3 took it off), so I left it. The food-stall *sheet* line is gone (item 9).

### Visual baselines (item 7)

Ernest approved refreshing all three baselines (print is byte-identical to `main`; the stored print
baseline has been stale since 9/23). I add the `update-visual-baselines` label to PR 15 **after the
last push** so the Action re-renders them against the final code (a later push would make them stale
again). If the label is not on the PR when you read this, add it.

### Components in this PR (each is in `design-system.html` with its tokens)

| Component / rule | Where it is documented | Tokens |
|---|---|---|
| **Names** (one name per component) | §3 Names | — |
| **Panel** (bottom sheet, docked panel) and its parts: Handle, Header, Body, Footer | §3 Panel | `--sheet-max-height` `--sheet-peek-height` `--sheet-detail-min-height` `--shadow-push` `--panel-bg/fg/title/muted/rule/radius/shadow/pad/motion/accent/push-shift` |
| **Header: Close is always top-right, on the first row under the handle** | §3 Panel (rule) | `--tap-min` |
| **Navigation: push from the right, pop to the right, height held** | §3 Panel (navigation) | `--panel-motion` `--panel-push-shift` `--shadow-push` |
| **Peek** (the short detent) | §3 Panel (detents) | `--sheet-peek-height` |
| **Map safe area** | §3 Panel (safe area) | `--map-inset-top` `--map-inset-bottom` |
| **ItemPager** (pinned footer) | §3 ItemPager | `--tap-min` `--sheet-detail-min-height` |
| **BoothRow** and **ArtistLine** (artist leads) | §3 BoothRow and ArtistLine | `--artist-name-size/-weight/-color` `--artist-sub-size/-weight/-color` |
| **ScheduleRow, DayHeading, ListRow** (times never wrap) | §3 ScheduleRow… | `--time-col` |
| **Tap sizes** | §1 and §5 | `--tap-min` `--pin-hit` |
| **Interaction states** | §6 | — |

### What to try on your iPhone (the new preview)

1. Art market → tap a booth in the list: slides in from the **right**, no change in sheet height, ‹ back
   top-left, × top-right. Tap ‹: slides out to the right, list back where you were.
2. Open any other sheet (a stage, a pin): the × is in the same top-right spot every time.
3. Restrooms chip on → tap a restroom → swipe down once (it should stop short), again (it closes).
4. Phone back gesture with a sheet open: the sheet closes and you stay on the map. Again with a chip on:
   the chip clears.
5. Turn the phone on its side with a sheet open: the sheet shrinks to peek and the booth stays above it.

## Round 1 (kept as the record)

### Does print stay green? Print did not change, and CI's print check was red before this PR

- **The print sheet is byte-for-byte identical** on `main` (454ca59) and on this branch (checked after
  round 1; round 2 touches no print code): both `/?print=1` renders (1632×1056, full page) compare equal
  with `cmp`. Nothing leaked into print.
- **The print check is red on CI for a reason that was there before:** the committed
  `tests/visual/print.png` is stale (`main`'s CI has been red on it since #12 merged; unchanged `main`
  differs from it by 6.124% on this machine).
- **Phone baselines change, expected:** `phone-open` (zoom stack buttons are 44px) and `sheet-open` (the
  sheet layout). Local diffs are advisory; the runner has the verdict.

### Decisions you were to exercise (round 1)

1. **Peek.** Restrooms chip on → tap a restroom: opens short (`--sheet-peek-height`, 208px + the home-bar
   inset). Tap the handle: full. Tap again: peek. Drag up: full. No chip: opens full, handle does not
   resize.
2. **The ItemPager is hidden at peek** (your call).
3. **Back row label** is the area's own title (`‹ In the Park · Art Market` …), not "Art Market": three
   lists share that name.
4. **Swipe down closes from the handle or from the header** (a drag that starts on either pulls the
   sheet); swiping on the body scrolls it.
5. **When the handle changes the sheet's height the map re-centres the pin** in the new safe area.

**Skipped on purpose: swipe-to-page on the ItemPager.** A horizontal swipe shares the touch with the
body's vertical scroll and with the header's drag, so it is not clean; ‹ › in the footer is the one way.

### Per item (round 1)

- **A1** `--tap-min` 44px for every control, `--pin-hit` 44px for every pin. Controls that were below the
  floor and are now 44: the zoom buttons, the square icon button, the ItemPager's buttons. **No pin waits
  for a closer stop than before** (the pin hit circle was already 44 and the no-overlap suite measured
  it). There is no "schedule button" in the app.
- **A2** Safe area measured at runtime; the north-most restroom repro only reproduced at short viewports
  (390×550, 375×560: pin top at 84 and 80px under a 91px header); the e2e test covers them and fails on
  `main` there. Stepping the ItemPager holds the map less often now ("12 of 12" held before, "10 of 12"):
  the safe area counts the open sheet.
- **B1–B5** see round 2 for the final shapes of B1 (push / pop) and B4 (header). B2: `--sheet-detail-min-height`
  300px holds a booth opened from the map at one height. B5: every sheet/panel style is under `.ffc-panel`
  in `components.css`.
- **C1** artist leads (`--text-lg` bold), business secondary (`--text-sm` muted). **C2** `--time-col`
  6.5em, nowrap, tabular (the old 72px column broke "10:30–11:30" at its dash). **C3** no provenance
  footer anywhere; an unnumbered spot's location stays as body text; the facts live in `README.md` and
  the Data section of `CLAUDE.md`.
- **C4** copy: Restrooms (one ADA line, no interface line), Water ("Bring a bottle to refill"), First aid
  ("Staffed by EMS for the whole festival"), Beer (no zoom line). **Round 2 item 9** added: Beer loses its
  own location line (the pin's says where, and it contradicted the pin; subtitle "The main one"), the
  Bike valet card says "Roll up and a volunteer tags and racks your bike" (the subtitle already says
  free, the pin says where), the stale food-stall line is gone.

### Noticed, not changed

- **Tablet (768–1023)** has the same bottom sheet at 560px wide; the existing e2e covers 834×1112.
- **`DetailSheet.jsx` / `.sheet` / `.sheetwrap`** are the file and hook names for the Panel's bottom
  variant. The design system's Names table says so; I did not rename the file or the e2e's `.sheet`
  hooks (CLAUDE.md: don't refactor beyond the task).
- **Pins nudged:** none.

## Evidence

- Final local run: see the line at the bottom of this section (filled in after the last full run).
- New e2e in round 2: header × (five states, two phones), push / pop sampled every frame (375, 393 and
  reduced motion), booth squares dimmed with a chip (every kind, a real tap with and without a sheet),
  booth square pan (fails on `main` at 375×667), same-area list kept, back button per layer (six cases),
  pinch and rotate with a sheet open, landscape peek cap, swipe → peek → close, ArtistLine in the detail,
  copy (Beer, Bike valet, food stall), a real tap on the ×.
- The e2e blocks for A2 and B1 sit in the B2 commit; if you revert A2 or B1 on its own, drop that block.
- Before/after screenshots: `npm run pr-shots` captures the phone at 375, 390 and 430, the booth sheet
  and a chip sheet; the Action commits them under `docs/pr-shots/` and writes the table into the PR.
