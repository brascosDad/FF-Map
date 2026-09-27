# PR notes — 9/25: the east McLendon barricade moves west of Mell Ave (Jess's sign-off change)

**Expected red: the `print` visual check fails on purpose.** Three cones moved on the print
sheet. After looking at the diff, put the **`update-visual-baselines`** label on this PR. Only
`print.png` should change. `phone-open` and `sheet-open` should stay as they are (see "Phone"
below).

## What changed

Jess signed off on the 9/23 handout on 9/24, with one PDF comment: *"Move barricade right behind
Acoustic stage (the little street behind it is not blocked."* "The little street" is Mell Ave.

| | Before | After |
|---|---|---|
| East McLendon barricade (`src/assets/pins.js`) | (979.0, 789.9), `axis: 'y'`, east of Mell | **(912.0, 789.9)**, `axis: 'y'`, between the Acoustic Stage and Mell |

- The cones are 6 units wide, so the row spans x **909–915**, plus a 0.4 halo each side. Mell's
  centreline is 938.5 and its west kerb is **924.5**, so no cone reaches Mell's mouth. Mell
  reads as open.
- **Stage pin not nudged.** The Acoustic Stage disc is r 10 at (885, 797.9) and its east edge
  with the stroke is 895.6. The west edge of the cones with the halo is 908.6, a gap of
  **13 units**. The "Acoustic Stage" label runs west from its anchor at x 895 and clears the cones too. Achieve with
  Steve (858) and booth 55 (840) are unchanged. e2e "print: nothing covers anything else" passes.
- Comments updated to match: the barricade entry, the Acoustic Stage entry in `pins.js`, and
  the `LABEL_AT` note in `src/print/PrintSheet.jsx`.

## Phone: no change, confirmed

Barricades are `print: true`, so the phone never draws them. `npm run pr-shots` on this machine
gives **byte-identical** before and after PNGs for phone and desktop. Only the print PNG differs,
and all of that diff is in one 90×31 px box around the cones.

## Crops of the McLendon east end, print sheet

`docs/pr-shots/before-print-mclendon-east.png` → `docs/pr-shots/after-print-mclendon-east.png`

## Checks

- `npm run lint`: clean. `npm run build`: clean.
- `npm run test:e2e`: **318/318** behaviour checks pass. The local visual diffs (all three) are
  this container's text rasterisation, the known 0.4–3.8%+ gap from the runner. CI has the verdict.
- `npm run print` builds cleanly.

## For Cowork (CLAUDE.md is yours)

The 9/23 round-5 line in CLAUDE.md, "the McLendon-east barricade to (979, 789.9) east of Mell",
is now out of date: it's at (912, 789.9), west of Mell, and Mell is open (Jess, 9/24).

## Questions / skipped / nudges

- No pin nudges. Nothing skipped. No open questions.
