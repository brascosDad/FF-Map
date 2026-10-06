# PR notes: 10/6, interaction fixes + the interaction state spec

Ernest's iPhone walkthrough of the live map (10/6), turned into rules in the design system. One commit
per numbered item in the brief (`A1 … D`), so any one can be reverted. Read `docs/interaction-states.md`
for the spec; this file is the record of questions, decisions, skipped items and measurements.

## 1. Does print stay green? Print did not change, and CI's print check was red before this PR

- **The print sheet is byte-for-byte identical** on `main` (454ca59) and on this branch: both
  `/?print=1` renders (1632×1056, full page, same machine, same build settings) compare equal with
  `cmp`. No token this PR touched is read by the print sheet (`--tap-min`, `--pin-hit`, the `.ffc-panel`
  rules, the zoom stack). Nothing leaked into print.
- **But the print check will still be red on CI, for a reason that was there before.** The committed
  baseline `tests/visual/print.png` is stale: `main`'s CI has been red on it since #12 merged
  (9/23: print 6.208%), and on this machine the same unchanged `main` differs from the committed PNG by
  6.124%. So "red" here does not mean a phone change leaked. You said to tell you rather than add a
  label, so: **I have not added `update-visual-baselines`.** Adding it would refresh all three
  baselines, which is also what the phone ones need (below).
- **Phone baselines change, expected:** `phone-open` (the zoom stack is 44px buttons, 4px taller each, so
  the stack is 12px taller), `sheet-open` (the Kidlandia sheet: title line with the close ×, no footer
  line, ItemPager-less pin card, the handle band, a different height). Local diffs against the committed
  PNGs on this machine, advisory only: see `npm run test:visual`. The runner has the verdict.
- Behaviour suite: **all green locally** (`npm run test:e2e`, counts at the bottom).

## 2. Decisions I made that you should exercise (your evaluation list)

You asked to exercise the peek behaviour once I'm done. In the order the sheet is used:

1. **Peek at all.** Restrooms chip on → tap a restroom: the sheet opens short (`--sheet-peek-height`,
   208px + the home-bar inset) with the map above it. Tap the handle: full. Tap again: peek. Drag the
   handle up: full. With no chip on, the sheet opens full and the handle does not resize.
2. **The ItemPager is hidden at peek and appears at full height.** (Your call, 10/6.) In practice peek
   only happens on pin cards (picking an art area or a booth clears the chip), so you will only see this
   if you expand a peeked card. Say so if you want the pager at peek too.
3. **Back row label** is the area's own title (`‹ In the Park · Art Market`, `‹ McLendon Ave · Art
   Market`, `‹ Candler Park Dr · Art Market`), not the bare words "Art Market": three lists share that
   name and the title says which one you will land in. The back row is a different control from the
   ItemPager's ‹ ›: top of the sheet vs the footer.
4. **Swipe down closes from the handle or from the title row** (a drag that starts on either pulls the
   sheet). Swiping on the body scrolls the body; I did not add pull-to-dismiss there.
5. **Swipe down from a full chip sheet closes** (it does not stop at peek first). OPEN in the spec.
6. **When the handle changes the sheet's height the map re-centres the pin** in the new safe area; it
   can take one zoom step in if the pin would otherwise end under the sheet.

**Skipped on purpose: swipe-to-page on the ItemPager.** The brief said only if clean. A horizontal swipe
on the sheet body shares the touch with the body's vertical scroll and with the title row's drag, so
it is not clean; ‹ › in the footer is the one way to page.

## 3. Per item

**A1, tap targets.** `--tap-min` 44px for every control, `--pin-hit` 44px for every pin (new token, read
by `MapCanvas`). Controls that were below the floor and are now 44: the zoom buttons (40), the square
icon button (40), the ItemPager's buttons (40 high). The chips, the close × and the directory rows were
already 44. There is **no "schedule button"** in the app (a stage's lineup opens from the pin, and
nothing on that sheet is a separate button), so nothing to change there.
- **Pins that now wait for a closer stop than before: none.** The pin hit circle was already
  `--tap-min` (44px) and the e2e no-overlap suite already measured those circles at every stop, on
  every chip, on a 375px phone: it is unchanged and green. `--pin-hit` gives the number its own name.
  (By stop: overview none · first step none · Detail none.)
- Design system: tap rules and the WCAG 2.2 AA 2.5.8 note (24px, spacing exception; the no-overlap
  rule is how pins satisfy it) are in `design-system.html` §1 and §5.

**A2, the map safe area.** `--map-inset-top` (header + chip row bottom) and `--map-inset-bottom` (the
sheet's height while open) are measured at runtime, written to `.ff-screen` and used by `useMapView`.
Pin tap, stage tap, list-row tap and ItemPager step all centre the pin between them. The pan limits run
past the festival by the same amounts, so any pin can reach the band; the opening view is unchanged.
- **Reproduced Ernest's repro only on short phones.** At 375×667, 390×844, 393×852 and 430×932 the
  north-most restroom landed 133–260px down, clear of the chips, on `main`. At 390×550 and 375×560 (what
  Safari with its bars gives) it sat at 84 and 80px under a 91px header. The e2e test covers both kinds
  and fails on `main` at the short ones.
- **Stepping the ItemPager now holds the map less often.** "Held 12 of 12" on a 390×844 phone before,
  "10 of 12" now: the safe area counts the open sheet, a booth behind it is no longer "in view". The old
  note said the opposite on purpose (a booth under the sheet is on screen); the brief wants the pin
  inside the safe area, so this follows the brief.
- **A tap on a booth square on the map does not pan** (not in the brief's list). OPEN in the spec.

**B1, one sheet.** The area stays under the booth; the content slides (crossfade with reduced motion);
back returns to the list at the same scroll position. The docked panel's back row follows the same stack
(`‹ All locations` for a list, `‹ <area>` for a booth from one).

**B2, ItemPager.** Renamed everywhere (`.ffc-step` → `.ffc-pager`, `.boothnav` gone, docs, tests, the
design-system section). Footer clears `env(safe-area-inset-bottom)` + `--space-3`. `--sheet-detail-min-height`
is 300px: a booth sheet held one height across five pages on 375 and 393px phones in the test.

**B3, peek.** See §2. `--sheet-peek-height` (208px), token documented.

**B4, the top row.** × on the title line, right-aligned, `--tap-min`; with a back row above the title it
drops to the title line. The handle is a 44px band holding a 4px bar, a real button with an accessible
name that says what it will do ("Expand the sheet" / "Collapse the sheet" / "Sheet handle: drag down to
close"). Title is ~66px under the sheet's top (was ~110). Every sheet's head and body are one component
drawn twice (`part`), so the head can be pinned while only the body scrolls.

**B5, styles.** Every sheet/panel style is now under `.ffc-panel` in `components.css`, with component
tokens (`--panel-bg/fg/title/muted/rule/radius/shadow/pad/motion/accent`) pointing at semantic ones.
`map.css` is map-screen layout only. The markup's hook classes (`.hd .li .evt .boothrow .griparea …`) are
unchanged, because the e2e suite and the docs name them; only where their CSS lives moved.

**C1.** The artist's name leads (`--text-lg`, bold); the business is secondary (`--text-sm`, regular,
muted). No new type step. The booth *detail* still leads with the business, "**The Printables** — Anna
Freeman"; the brief said list rows, so I left the detail alone.

**C2.** `--time-col: 6.5em`, nowrap, tabular numerals. The old 72px column was narrower than
"10:30–11:30" and broke at its dash. Verified on both stages at 375 and 320px; fails on `main`.

**C3.** Removed from every sheet: the booth footer ("Artist from the 2026 list; position from the
official map"), the Kidlandia caveat, the unnumbered-spot sentence, the stage "Source:" line, the area
list note and the food list note. **Kept as body text:** where the two unnumbered spots are ("On the
entrance path, below the west row"; "Beside the Acoustic Stage"), since that is location, not provenance.
The facts live in `README.md` and the Data section of `CLAUDE.md`; `stages.json` `source`,
`vendors.json` `note` and `booth-numbering-2026.json` are untouched.

**C4.** Every copy change:

| Card | Was | Now |
|---|---|---|
| Restrooms | sub "Restroom (+ ADA) — five-toilet banks with ADA units" · "Every bank is five toilets plus ADA-accessible units" · "Selecting restrooms rings every one of them on the map" | sub "Five-toilet banks" · "Every bank includes ADA-accessible units" (+ the pin's location line) |
| Water | sub "Free refill" · "Free water stations — bring a bottle to refill" | sub "Free refill" · "Bring a bottle to refill" |
| First aid | sub "On-site medical support" · "EMS staffed on-site for the duration of the festival" · "Dial 911 for emergencies" | sub "On-site medical support" · "Staffed by EMS for the whole festival" · "Dial 911 for emergencies" |
| Beer Stand | sub "The main beer stand, on the field" · … · "Three more drink stations are pinned around the grounds — zoom in to see them" | sub "The main beer stand" · the line that told you to zoom is gone (it also described pins that are now hidden) |

## 4. Noticed, not changed (skipped items)

- **Food stall booth text:** "Which truck parks here is not assigned yet — placements arrive later this
  week." The festival was 10/3–4; that sentence is stale. It is copy, not a footer, so C3 did not touch
  it. One line in `DetailSheet.jsx` and `vendors.json`'s `note`.
- **Duplicated copy nobody listed:** Bike valet ("Free, attended bike parking" / "Free valet bike
  parking…") and Beer's location line repeat their subtitles the same way water did. Left alone; one
  commit if you want the same pass.
- **`design-system.html` Panel demo** still uses the older anatomy classes (`.ffc-panel__head`,
  `.ffc-schedulerow`), which the app does not use; the live sheet is described in the table above it.
- **Tablet (768–1023)** has the same bottom sheet at 560px wide, centred; every check above ran at phone
  widths and the existing e2e covers 834×1112.
- **The visible map in landscape on a phone** is empty with a sheet open (header 120px + sheet 281px of
  390px). OPEN in the spec.
- **Pins nudged:** none.

## 5. Evidence

- `npm run test:e2e` (behaviour): see the PR for the CI count; locally the suite ran green after every
  commit and in full at the end (`B5` run: 396 checks, the 8 failures were this PR's own and are fixed).
- New e2e: A2 (four phone sizes, fails on `main` at the short two), B1, B2 (five pages, bounding box),
  B3, B4, C1, C2 (fails on `main`), C3, C4.
- Before/after screenshots: `npm run pr-shots` now also captures the phone at 375 and 430 wide, and the
  two sheet states that changed (a booth opened from a list; a chip sheet at peek). The Action
  commits them under `docs/pr-shots/` and writes the table into the PR description.
