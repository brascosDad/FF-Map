# PR notes — 9/22 committee feedback, rounds 1, 2 and 4 (PR #12)

## Round 4 (Ernest's iPhone check, 9/22)

**Round 3 never reached this session.** Round 4's brief says to finish round 3 first and refers
to "round 3's moves"; no round-3 brief arrived here and nothing landed on the branch between
round 2 and round 4. Round 4 is done against the round-2 positions. Send round 3 and it goes on
this branch. Where lines below were checked against the round-2 positions, none needed changing.

### Location lines written from the map (single items) — Ernest to check
| Pin | Line |
|---|---|
| First aid / EMS (715, 373) | On the lawn below the Main Stage, between the two beverage stations |
| Info (630, 694) | Just inside the McLendon entrance, east side of the path, above the merch tent |
| Merch (630, 740) | McLendon entrance, east side of the path |
| Bike valet (712.4, 730.1) | Off McLendon, east of the park entrance |
| PTA booth (519, 520) | Inside Kidlandia, at its south-west edge |
| Main Stage (741.1, 288.5) | North end of the lawn, below the pool |
| Acoustic Stage (885, 797.9) | On McLendon Ave at Mell Ave, the east end of the McLendon art market |
| Food Court (859.7, 292.3) | The car path north of the lawn, east of the Main Stage |
| Kidlandia (550.9, 422.3) | The west lawn, off Candler Park Dr |

Ernest's own lines (restrooms, water, beer, beverage stations, King of Pops) are in `pins.js`
verbatim, each marked `TODO(Jess): confirm location`. Two of his read oddly against the map but
were kept as written: the Main Stage King of Pops cart (690, 320) says "On the lawn beside
Kidlandia" though it sits north of Kidlandia by the Main Stage; the field water (731, 413) says
"next to the beer stand" though the stand is 59 units south of it.

### Interaction model — decisions taken
- Turning a chip **on** still goes to the overview (so the whole category is in frame); the
  spec only fixes what turning it **off** does (map stays). Say if chip-on should also hold.
- "Zoom only if needed": the tapped pin is always shown at the current stop (it was tappable),
  so the only zoom is when the overview cannot pan far enough to put the pin above the sheet —
  then the nearest closer stop that can. The south restroom does this (overview → Detail; the
  first step still leaves it behind the sheet).
- One tapped pin wears the ring. A category row in the desktop directory (no one pin) still
  rings every pin of that category, as before.
- No pin moved in round 4. No nudges.

### Skipped
- Vercel preview toolbar: not touched (Ernest).
- A screen recording: not possible from this container; the Water flow is a four-shot sequence
  in `docs/pr-shots/flow-water-{1-chip-on,2-pin-tapped,3-sheet-closed,4-empty-map-tapped}.png`.


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
