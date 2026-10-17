# PR notes: pin placement rules (rank, true location, ties split, nudge cap)

Until now, overlapping pins were handled by hand: a `from: 'detail'` flag or a hand nudge, with the
reason in a comment in `src/assets/pins.js`. This PR turns that into rules the code computes and
an agent can query. One commit per item:

1. **Rank**: `PIN_RANK` and `rankOf` in `pins.js`. Water moves up to rank with the restrooms.
2. **Engine**: `src/pinPlacement.js`, one pure function per stop, with unit tests for every rule
   (`design-system/placement.test.mjs`, run by `npm run test:ds`).
3. **Phone map**: the eight `from: 'detail'` flags are gone. MapCanvas computes each stop for the
   screen's own scale. A nudged pin glides between its stop positions with the pinch.
4. **Paper**: the print sheet is one more stop.
5. **`npm run pin-layout`**: shows which stop each pin appears at, why it waits, every nudge and
   every paper flag, for a 375px phone, the docked desktop and paper (`--json` for data).
6. **e2e**: the cap, the rank invariant and the entrance cluster, on the phone, the docked desktop
   and paper; the docked desktop also gets the no-overlap check at every stop with each chip on.
7. **CLAUDE.md**: the rules in Decided, and this round under Open.
8. **Design system 1.4.0**: `no-overlap` restated with the new priority; two new rules,
   `true-location` and `nudge-cap` (the cap is the rule's `constant`, checked against the code);
   a Pin placement table in §6; changelog.

No stored x/y changed. Nothing ties, nothing is nudged and nothing is flagged with today's pins, so
the split, the cap and the paper flag are tested on made-up pins.

## Which pins changed (375px phone)

Only the phone's **first zoom step** changes. The overview, Detail, the docked desktop at every
stop, and paper are pixel-identical to `main` (I checked the screenshots below byte for byte).

| Pin | Rank | Before: shown at | After: shown at | Why |
|---|---|---|---|---|
| Water, lawn beside Kidlandia (707.5, 455.5) | 3 | Detail | **first step**, Detail | Was held back by hand; water now outranks the beer stand |
| Water, Acoustic Stage (888, 750) | 3 | Detail | **first step**, Detail | Outranks the Acoustic beer |
| Water, McLendon entrance (645, 762) | 3 | Detail | **first step**, Detail | Outranks merch |
| Info booth (637, 714.5) | 4 | Detail | **first step**, Detail | Clear of the entrance water (48 units, 46 needed); merch, its tie, is waiting |
| **Beer stand** (728, 472) | 4 | overview, first step, Detail | overview, *—*, Detail | Gives way to the lawn water (26 units off) |
| **Merch** (630, 740) | 4 | overview, first step, Detail | overview, *—*, Detail | Gives way to the entrance water (27 units off) |
| Beer, Acoustic Stage (862, 750) | 4 | first step, Detail | Detail | Gives way to the Acoustic water |
| Mr Softee, C3 (678, 476) | 5 | first step, Detail | Detail | Gives way to the lawn water (36 units off) |
| Water, Kidlandia (552, 461) | 3 | Detail | Detail | No change: gives way to Kidlandia (rank 1) |
| King of Pops, C1 (692.5, 377.5) | 5 | Detail | Detail | No change: gives way to first aid |

Every other pin shows at the same stops as before. Docked desktop: every pin from the first step,
before and after.

**Largest nudge at each stop:** 0 at all three stops on the 375px phone, 0 at all three on the
docked desktop, 0 on paper. No two pins of the same rank collide at any stop, so the
split-the-difference rule never fires with today's pins.

## Entrance cluster (water, info, merch), 375px phone

| Stop | Before | After |
|---|---|---|
| Overview | merch | merch |
| First step | merch | **info + water** (merch waits) |
| Detail | merch + info + water | merch + info + water |

Docked desktop, before and after: merch / all three / all three. e2e asserts both.

Screenshots of the entrance (wheel-zoomed on merch's spot, so the entrance stays in frame):

| Stop | Before | After |
|---|---|---|
| Overview | `docs/pr-shots/entrance-phone-before-0.png` | `docs/pr-shots/entrance-phone-after-0.png` (identical) |
| First step | `docs/pr-shots/entrance-phone-before-1.png` | `docs/pr-shots/entrance-phone-after-1.png` |
| Detail | `docs/pr-shots/entrance-phone-before-2.png` | `docs/pr-shots/entrance-phone-after-2.png` (identical) |
| Docked desktop, each stop | identical to after | `docs/pr-shots/entrance-desktop-{0,1,2}.png` |
| Print sheet | identical to after | `docs/pr-shots/placement-print.png` |

The `PR screenshots` Action adds the usual phone / desktop / print before-and-after table to the
PR description.

## Paper flags (rule 7)

**None.** Every disc and cart square sits at its true location on paper. If a future pin can't be
placed within the cap, `npm run pin-layout` lists it under "paper" as FLAGGED, the sheet draws it at
its true location with `data-flagged`, and e2e's "nothing covers anything else" goes red until
someone places it by hand.

## Visual baselines

**No baseline changes.** I expected `sheet-open` to go red, but CI passed all three visual checks
(`phone-open`, `sheet-open`, `print`) against the existing baselines. The Kidlandia sheet opens at a
view where nothing in frame changed. The local diffs (0.3–3.6%) were only this machine's text
rendering. The `update-visual-baselines` label isn't needed.

## Decisions and questions for Ernest

1. **Beer stand and merch disappear one step in.** They are on the opening view (the landmarks
   from the 9/17 beta round), but at the first step a water station 26–27 units away now outranks
   each one, so rule 3 hides them until Detail. This follows the rules exactly, but zooming in and
   losing a landmark may feel odd. Options:
   (a) keep as built;
   (b) add a rule that a pin shown at a coarser stop stays at closer stops (it would then outrank
   the water there, and the water would wait instead);
   (c) move the two water stations far enough off. The lawn water would need 46 units from the
   stand (it is 26.3); the entrance water would need 46 from merch (it is 26.6).
   **I built (a)** because that is what the brief's rules say.
2. **Art-market markers** are not pins and have no rank. I treat them as fixed targets that never
   move or wait: any pin that would overlap one waits. That is how they were handled by hand
   before, and no pin is affected today.
3. **Paper-only ops marks** (generators, dumpsters, the ice truck, the musicians' tent) aren't in
   the priority list. I ranked them 5, the bottom tier. On paper nothing waits, so the rank only
   decides which of two moves. Barricades and speed bumps are street marks, not discs, so they
   aren't placed; e2e still checks them for covering anything.
4. **The layout is computed for each screen's actual scale**, not only for 375px. A wider phone
   has more room per stop, so it can show a pin a stop earlier than a 375px phone does. The e2e
   overlap check runs at 375 and 393 (phones) and on the docked desktop.
5. **Three-way ties**: if a pin collides with two equal-rank pins, or with one that has already been
   nudged, it waits instead of trying a second split. Rule 4 only describes pairs. This doesn't
   come up today.
6. **Chip pins**: with a chip on, the chip's pins are drawn where the rules placed them at that
   stop, and a pin the rules hold back is drawn at its true location. That's the same as before,
   since nothing is nudged.

## Skipped / not done

- Tapping a pin pans to its **true location**, not its drawn spot. The drawn spot is at most 12.75
  units away, and with nothing nudged today they are the same point.
- No e2e drives a pinch through a nudged pin, because no real pin is nudged. The glide is
  `drawAt` in `MapCanvas.jsx`, which interpolates between the two stops' positions by `levelPos`.
- `MOBILE_OVERVIEW_ZOOM` moved from `App.jsx` to `useMapView.js`, and `fitOverview` is now
  exported, so `npm run pin-layout` can size a phone's stops without restating them.

## Pin nudges

None, on either map or on paper.
