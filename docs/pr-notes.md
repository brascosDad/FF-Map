# PR notes — 9/22 committee feedback, rounds 1–4 (PR #12)

## Round 3 (Ernest's print-sheet review of round 2; arrived after round 4, applied on top of it)

### Nudges (coordinates in map units)
| Pin | Ernest's target | Placed | Why |
|---|---|---|---|
| First aid / EMS | (712, 395) | **(712, 395)** | anchor of the front row; on the map from the first zoom step |
| King of Pops, Main Stage cart | (693, 378) | **(692.5, 377.5)** | 25.5 from first aid; half a unit out so the two Detail targets are edge to edge (26.2) |
| Beverage station (west) | (677, 387) | **(670, 391.5)** | 18.4 from the cart; 7.8 units WSW on its own bearing so it is edge to edge with the cart at Detail (26.5) |
| Beverage station (east) | (734, 391) | **(738, 390.5)** | 22.4 from first aid; 4 units E so it is edge to edge at Detail (26.4) |
| Water (field) | (712, 459) | **(707.5, 455.5)** | 20.6 from the beer; 5.7 further out on the same bearing so the two Detail targets are edge to edge (26.3) |
| Beer (field) | unchanged | **(728, 472)** | — |
| Info | toward (635, 721) | **(637, 714.5)** | the closest point on that bearing where info and merch are edge to edge at Detail: 26.4 from merch. Also off the desktop's opening view (44px is 40 units there); arrives at the desktop's first step, 12px gap |

On paper all six lawn discs clear each other at Ernest's own spots; the nudges above are the
phone's, and they are 0.5–7.8 units. Order kept: beverage, King of Pops, first aid, beverage.

### Hidden at a stop (phone, rule 1)
| Stop | Shown from the lawn group and the entrance | Hidden until a closer stop |
|---|---|---|
| Overview | beer stand (with the destinations, merch, bike valet) | everything else |
| First step | first aid, entrance King of Pops square, merch, restrooms, Kidlandia water, speed-bump water | both beverage stations, the Main Stage King of Pops square, the field water, the entrance water, the Acoustic water, **info** (all `from: 'detail'`) |
| Detail | everything | — |
A chip shows its whole category at any stop. The desktop's first step already has room, so
`from: 'detail'` pins arrive there at the first step.

### Art Market marker
It moved in round 2 from (774.9, 484.3) to (801, 433) to clear the beer stand's opening-view
target (81 units is touching). The beer stand is unchanged in round 3, and its old spot is 48.5
from the stand, so the marker **cannot come back**; it stays at (801, 433).

### King of Pops squares
Both carts are 8-unit squares in `--pin-food` at full strength, no glyph, with the usual 44px
tap target; tapping opens the vendor-record card. Legend row "King of Pops" (dark orange square)
beside "Food stall" on the print sheet. The phone footer legend was not changed: it lists
categories, and the carts are the food category — say if a row is wanted there too.

### Location lines after the moves (item 4)
Checked every line against the new positions. **No change needed**: the Main Stage King of Pops
cart is now on the lawn beside Kidlandia (its line fits), the field water is 26 units from the
beer stand ("next to the beer stand" fits), first aid is between the two beverage stations, info
is above the merch tent. The two lines round 4 flagged as odd now match.

## Round 4 (Ernest's iPhone check, 9/22)

Round 3 arrived after round 4 and was applied on top of it; round 4's interaction model and
location lines are unchanged by it.


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
verbatim, each marked `TODO(Jess): confirm location`. (Two read oddly before round 3 landed;
after round 3's moves both fit — see round 3 above.)

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
