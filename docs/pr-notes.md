# PR notes — 9/22–23 committee feedback, rounds 1–6 (PR #12)

## Round 6 (print legibility and clutter; 9/23)

### 1. Header — measured ink to ink on this render (the runner's will differ by a px or two)
| Gap | Before | After |
|---|---|---|
| Wordmark size | 44pt (no token) | **40pt**, `--print-brand-size` (a tenth smaller) |
| Wordmark → "Candler Park · …" line | `--space-2` (8px) margin **+ ~17px** of the all-caps wordmark's own descender air = **25px** optical | **0** margin + ~16px air = **16px** optical |
| "Candler Park · …" line → rule | `--space-3` (12px) padding + 3px descender = **15px** | unchanged: **15px** |

"Halve the gap" was read as the optical gap, which is what the eye sees: halving only the token
(`--space-2` → `--space-1`) would have left 20px against 15px, because the wordmark's line box
carries the air whatever the margin. With no margin the two gaps are 16 and 15 — equal, as aimed.
The room recovered (≈14px) went to the index.

### 2. C1–C3 — where they landed
| No. | Cart | Square | Number | Nudge |
|---|---|---|---|---|
| C1 | King of Pops (Main Stage) | (692.5, 377.5) | to the right of the square, level, like a Candler Park Dr number | none — clears first aid's disc by 5 units on paper |
| C2 | King of Pops (entrance) | (583, 735) | same | none |
| C3 | Mr Softee | (678, 476) | same | none |

Stored once, on each cart's pin (`n`, `vendor`, `tag` in `pins.js`); the print map, the print
index and the phone card ("Cart C1 · Frozen pops") all read it. Index rows: "King of Pops
(Main Stage)", "King of Pops (entrance)", "Mr Softee" — the first two still wrap to two lines
in the 8pt column; shorter wording that would not wrap: **"King of Pops · Stage" / "King of Pops
· Gate"**, if Ernest prefers.

### Index fit — DECISION NEEDED
| State | Spare (this render) |
|---|---|
| Round 5, leading 1.3 | 0.03" (the ice-truck and musicians'-tent rows had wrapped the site key to two rows) |
| After item 1, leading 1.3, no cart rows | 0.16" |
| After item 2 at leading 1.3 | **−0.12" (over)** |
| After item 2 at leading **1.25 — shipped, provisional** | **0.16"** |

The brief said stop and report if the rows did not fit at 1.3. They do not, so the sheet ships at
leading 1.25 (type stays 8pt, the floor) to keep the head whole and CI green — one line in
`print.css` to change. Options: (a) keep 1.25; (b) 1.3 and drop one legend row (the site key's
fifth entry is what wraps it to two rows); (c) 1.3 and shorter cart wording, which saves only
~0.07" and still does not fit. No 8pt-floor change in any option.

### 3. Stall numbers
Off the paper; the squares stay. **Phone:** the stall numbers do mean something there — each stall
is tappable and opens a "Stall N" card saying which truck parks there is not assigned yet, with the
Food Court pin listing all 16 vendors. Ernest may want the numbers off the phone too; that is a
`numbers` switch in `MapCanvas`.

### 4. "Art Market" label
Off the paper. **Phone:** the phone draws no slanted "Art Market" label at any stop (only the three
area markers, which fade out at Detail, and the "FOOD COURT" caps at Detail); nothing to remove.

### 5. Field restroom
(679, 555) → **(672.5, 550)**: 8 units at a right angle to the path, out onto the lawn. The disc
clears the numbers of booths 45 and 46 by 9.3 units on paper (was 1.4); 44 from the generator, 65
from the ice truck; every phone target clear. Line unchanged: "by art booths 45 and 46".

### Baselines
The print baseline changes (header, C1–C3, no stall numbers, no Art Market label, the restroom);
phone-open and sheet-open may change a few pixels for the restroom. Label re-applied.

## Round 5 (Jess's markup PDF, fit to the map; 9/23)

Ernest's rule: missing → add; wrong spot → move; not asked for → hide (`hidden: true`, never
delete). Print exact; edge to edge where two would touch; rule 1 on the phone.

### Added
| Jess | Placed | Maps | Notes |
|---|---|---|---|
| "Add an additional food icon here (this one is Mr Softee)" | **(678, 476)**, food-cart square | both | opens Mr Softee's vendor card; `vendors.json` location now points here (Todd's own note had him right of the beer stand). Clear at every stop → shown from the first step |
| "Please label this 'Ice truck'" | **(710, 497)** | print | new `iceTruck`, Phosphor **Truck**, token **`--ops-ice-truck` #CFEAF5** (ice blue; navy glyph, 9.2:1) — reads on the lawn, no visitor hue (water is a mid teal-blue under white). Legend "Ice truck" |
| "Add 1 generator icon here" | **(708, 524)** | print | existing generator |
| "Add Musician's tent" | **(805, 267)** | print | new `musicianTent`, Phosphor **Tent** (it exists), token **`--ops-musician-tent` #6B4A2B** (canvas brown, white glyph 8.1:1). Legend "Musicians' tent" |

Generator/dumpster pairs by the changing rooms moved up edge to edge above the tent, at her x's:
generators (811, 247) and (811, 227), dumpsters (836, 247) and (836, 227) — the lower discs 20.9
from the tent, the upper 20 above; Food Court label and stall 4 clear. Print legend: "King of
Pops" row renamed **"Food cart"** (covers both carts; each card names its vendor).

### Moved
| Pin | Was | Now | Notes |
|---|---|---|---|
| Water, top of the CPD booth run | a speed bump at (411.5, 360) | **(421, 360)**, both maps | her (421, 361); 1 unit north so the Detail target clears booth 131's hit cell (nudge). Line: "Candler Park Dr, at the north end of the booth run" |
| Water, Kidlandia | (527, 378) | **(552, 461)** | 38.7 from the Kidlandia pin → Detail only on the phone. Line: "Inside Kidlandia, at its south end" |
| Restroom, field | (680, 526) | **(679, 555)**, her spot exactly | 23 units from booths 45 and 46 (17.45 is touching at Detail): no overlap, no nudge. Line: "On the lawn beside Kidlandia, by art booths 45 and 46" |
| Barricade, McLendon east | (912, 789.9) | **(979, 789.9)** | east of the Acoustic Stage and of Mell Ave, across McLendon |

Her markup settles the CPD/McLendon corner barricade: across McLendon, as drawn (question removed).
Optional, not done: the "Acoustic Stage" print label was anchored to run left of its pin only to
clear the old barricade at 912; it could go back to centred now.

### Hidden (`hidden: true`; delete the flag to bring one back)
- Beverage station (west) (670, 391.5) and (east) (738, 390.5) — the beverage category has no
  pin left, so its legend rows, directory row and card are off; `--pin-beverage` and the cup
  glyph stay defined.
- PTA booth (519, 520) — its print-legend row goes with it.
- Speed bumps (411.5, 360) and (411.5, 585) — the "Speed bump" print-key row goes with them.
- Water at the CPD speed bump (438, 585).

### After hiding
- First aid's line rewritten: **"On the lawn below the Main Stage, beside the King of Pops
  cart"** — Ernest to check.
- `from: 'detail'` pins on the lawn re-checked for an earlier stop: the King of Pops cart is
  26.2 units from first aid and the field water 26.3 from the beer stand; the first step needs
  46, so both stay Detail-only. Info (26.4 from merch) too.
- The beverage-station and PTA questions are withdrawn (hidden items).

### Hidden at a stop (phone, rule 1) — current
| Stop | Hidden until a closer stop |
|---|---|
| Overview | everything but the destinations, the beer stand, merch, bike valet |
| First step | King of Pops (Main Stage cart), field water, Kidlandia water, entrance water, Acoustic water, info |
| Detail | nothing |

### Location lines written or rewritten this round (Ernest to check)
| Pin | Line |
|---|---|
| First aid (712, 395) | On the lawn below the Main Stage, beside the King of Pops cart |
| Mr Softee (678, 476) | On the lawn beside Kidlandia, south-west of the beer stand |
| Water, CPD north (421, 360) | Candler Park Dr, at the north end of the booth run |
| Water, Kidlandia (552, 461) | Inside Kidlandia, at its south end |
| Restroom, field (679, 555) | On the lawn beside Kidlandia, by art booths 45 and 46 |

### Open
- **Jess:** which PTA runs the booth — moot while it is hidden.
- **Courtney / setup:** verify every placement against the grounds on 10/2.

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
