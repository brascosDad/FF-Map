# PR notes — 9/22 committee feedback, rounds 1 and 2 (PR #12)

Overwritten each PR. Everything here is a question, an open decision, a skipped item or a pin
nudge from this PR; the PR description summarises it. Coordinates are map units (1440×900).

## Questions for people

- **Jess:** what do the two beverage stations serve? The card says "Beverage station — drinks for
  sale." until then (`TODO(Jess)` in `directory.js` and `DetailSheet.jsx`).
- **Jess:** which PTA runs the booth in Kidlandia? Card says "PTA booth." until then.
- **Jess:** the barricade Ernest's brief put at "Candler Park Dr at McLendon (395, 791)" is drawn
  across **McLendon just west of Candler Park Dr**, not across Candler Park Dr — read that way
  because her four barricades then close every road into the zone (CPD north end, Miller Ave
  mouth, McLendon west, McLendon at Mell). Say if it was meant across CPD.
- **Courtney / setup:** every 9/21 and 9/22 placement was read off the printed sheet; verify
  against the grounds on 10/2, especially the Kidlandia column (K0 north), AWARE Wildlife and
  Achieve with Steve.

## Open decisions

- **Print index leading** is 1.3 (8pt, the floor) with 0.24" spare on this container's render.
  The next two rows Courtney adds may not fit; the runner's render has the real number.
- **Phosphor has no `Cup` glyph** (core 2.1.1 checked). The beverage cup is PintGlass; one line
  in `icons.js` to swap if a different glyph is wanted.
- **Info on the phone arrives at Detail** (rule 1: the south restroom bank on the path above it
  outranks it at the first step). Desktop unchanged. Ernest's endpoint (638, 723) for info was
  not used: 19 units from merch, it overlaps at every stop.

## Skipped / not done on purpose

- Vercel preview toolbar over the zoom stepper: preview-only overlay, not worked around in code.
- Todd's tentative truck layout: trucks stay a list, unpinned.
- No instruction to move AWARE Wildlife onto the grass at (578, 692) was received; had one
  arrived it would have been ignored per Ernest's 9/22 correction. AWARE stays on the path.

## Pin nudges (round 2, against Ernest's endpoints)

| Pin | Ernest's target | Placed | Why |
|---|---|---|---|
| Beverage (upper) | (671, 370) | (669, 370) | 44 from EMS → 46, edge to edge at the first step |
| Beverage (lower) | (720, 385) | (761, 379) | 13 from EMS; edge to edge on EMS's east side |
| Beer (field) | (728, 472) | (728, 472) | none — the **in-park art-market marker** moved up the path from (774.9, 484.3) to (801, 433) instead, 83 units off (81 is touching at the overview) |
| Water (field) | (731, 413) | (731, 413), Detail only | 43 from EMS, 30 from the lower station |
| Restroom (south) | between 54 and AWARE | **(610.8, 661.2)** | the exact midpoint of 54 (623.1, 645.3) → AWARE (598.5, 677); 20.1 from each. Edge to edge: at Detail 0.7 units (~1px) of air to each hit cell's corner, on paper the disc clears both squares |
| AWARE Wildlife | a little further down, if needed | **(598.5, 677), unchanged** | not needed: the restroom fits between with no overlap at Detail and on paper. Edge-to-edge would in fact allow 54 → AWARE at 38.7 (it is 40.1). `where` text unchanged |
| Info | (638, 723) | (630, 694), unchanged | see open decisions |
| Water (entrance) | (636, 749) | (645, 762), Detail only | 11 from merch; edge to edge at Detail on his bearing (26.6; 25.5 is touching on a 375 phone) |
| Water (Acoustic) | (877, 746) | (888, 750), Detail only | 15 from the beer; edge to edge at Detail (26 east) |
| Water (CPD speed bump) | new | (438, 585) | off the street's east edge, park side; 21.6 from booths 111/112 at Detail |
| King of Pops (Main Stage) | "field side, west of the truck row" | (690, 320) | 60 from the stage pin, 54 from the west beverage station |
| King of Pops (entrance) | "near the entrance" | (583, 735) | west lawn edge at the path mouth, 47 from merch |

## Pin nudges (round 1, against Jess's boxes) still in force

- Barricades centred on the street they close (CPD north 411.5, 71; Miller 395, 480.7; McLendon
  west 395, 789.9; McLendon at Mell 912, 789.9).
- Generators/dumpsters by the changing rooms lifted a few units (806/828, 236/256) to clear the
  Food Court label on paper.
- Kidlandia water (527, 378) clear of the Kidlandia pin (50 units). PTA now at Ernest's (519, 520).
