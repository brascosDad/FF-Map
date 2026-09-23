// Pin positions taken from the "festival elements (z=2)" group of the canonical
// Figma export (fall-fest-desktop-map-wireframe, 1440x900). Each x/y is the
// marker circle's own cx/cy in that export -- these replace the hand-placed
// coordinates carried over from the mobile prototype.
//
// `c` is the category key: it drives both PIN_COLOR below and the Phosphor glyph
// looked up in assets/icons.js, so it has to stay one of the keys already in
// this file. `d` is the DetailSheet entry the pin opens.
//
// `overview: true` keeps a pin on the opening view at every breakpoint. At
// that zoom the whole festival is squeezed into a phone screen and pins hold
// one physical size, so only a few fit without their 44px targets
// overlapping. The destinations do, plus the two landmarks beta testers
// reached for first (bike valet and the beer stand, Alex 9/17), and the merch
// tent at the gate. `overview: 'docked'` keeps a pin on the opening view only
// where the panel is docked (desktop), whose overview draws the map at half
// the phone's scale and has room the phone does not. Everything else arrives
// at the first zoom step or when its chip is tapped. Before adding one, check
// the spacing: scripts/e2e.mjs asserts that no two overview targets overlap
// on a 375px phone.
//
// STANDING RULE (Ernest, 9/22): no tap target may overlap another tap target at
// any zoom stop, on either map -- an overlap invites a wrong tap. Circles may
// touch edge to edge; they may not cross. When two collide, one of two things
// happens: the lower-priority pin waits for a closer stop (`from: 'detail'`
// below), or the two are moved edge to edge. Priority when something must
// wait: labelled destinations (stages, Food Court, Kidlandia) > first aid /
// EMS > restrooms > info, merch, bike valet, beer > water, beverage stations,
// PTA, food carts. scripts/e2e.mjs measures every stop on a 375px phone.
//
// `from: 'detail'` holds a pin back until the Detail stop, the closest one,
// where its 44px target has room -- on the phone. Where the panel is docked
// the first step's 44px is 22 units against the phone's 46, so there the pin
// arrives at the first step (and `overview: 'docked'` still puts it on that
// opening view). Everything else arrives at the first zoom step (or at the
// overview, per `overview` above). A filter chip overrides it: the chip's
// category is always drawn, on top, and while a chip is on the dimmed pins
// cannot be tapped.
//
// `print: true` marks a pin PAPER-ONLY: it exists for EMS and the fire
// inspector (Jess, operations, 9/21), not for a visitor with a phone. The phone
// map skips it entirely -- no pin, no tap target, no directory row -- so it
// needs no `d`. PrintSheet draws it and keys it in the print legend
// (PRINT_SITE_LEGEND in data/directory.js). Next year: the print-only entries
// are the ones with `print: true` below -- barricades, speed bumps,
// generators, dumpsters; every restroom is on both maps (Ernest, 9/22).
//
// `hidden: true` takes a pin off BOTH maps: no mark, no tap target, no
// directory row, no legend row -- and if every pin of a category is hidden,
// that category's legend rows and chip go with it. Kept for next year / on
// request; delete the flag to bring it back (its card copy and its
// TODO(Jess) stay in place, so that is a one-line change). Round 5, 9/23:
// what Jess's markup did not ask for is hidden this way, not deleted.
//
// `shape: 'square'` draws the pin as a booth-sized square in its category
// colour, no glyph -- the King of Pops carts, which read like food stalls
// rather than places (Ernest, round 3). The tap target is still the 44px
// circle, and rule 1 applies to it.
//
// `where` is the card's location line -- how someone confirms which of a
// category's pins they tapped (Ernest, 9/22). Plain words from the map, one
// line, on every visitor pin; the lines Ernest wrote carry TODO(Jess):
// confirm location, the rest are listed in docs/pr-notes.md for him to check.
//
// A `barricade` is three cones in a row ACROSS a street, so it carries `axis`:
// 'x' when the row runs east-west (across a north-south street), 'y' when it
// runs north-south (across an east-west one).
export const PINS = [
  // Markers that carry a standing label on the map
  { x: 859.7, y: 292.3, c: 'food', d: 'food', label: 'Food Court', overview: true, where: 'The car path north of the lawn, east of the Main Stage' },
  { x: 741.1, y: 288.5, c: 'stage', d: 'stageMain', label: 'Main Stage', overview: true, where: 'North end of the lawn, below the pool' },
  // The Acoustic Stage sits where the export drew it until Mell Ave moved to
  // x 938.5 (Figma, 9/21) -- exactly where the pin was. The east end of
  // McLendon repacked west of Mell's kerb (924.5): barricade ~912, stage 885,
  // Achieve with Steve 858, booth 55 at 840 (Jess, Ernest, 9/22).
  { x: 885.0, y: 797.9, c: 'stage', d: 'stageAcoustic', label: 'Acoustic', overview: true, where: 'On McLendon Ave at Mell Ave, the east end of the McLendon art market' },
  { x: 550.9, y: 422.3, c: 'kids', d: 'kids', label: 'Kidlandia', overview: true, where: 'The west lawn, off Candler Park Dr' },

  // The beer stand: the main one, on the field below the Main Stage -- the
  // landmark the food chair places Mr Softee against ("to the right of the
  // beer stand when facing it"). Where Jess's 2026 site plan puts it (Ernest,
  // 9/22, confirmed unchanged in round 3): down and a little east of the
  // export's (734.7, 442.0). It is on the phone's opening view, where two
  // targets need 81 units on a 375px screen, so the in-park art market
  // marker moved up the path to 83 units from it (areas.js) rather than the
  // stand leaving its spot; the marker's old spot (774.9, 484.3) is 48.5
  // from here, so it cannot come back while the stand is here.
  { x: 728.0, y: 472.0, c: 'drinks', d: 'beer', label: 'Beer', overview: true, where: 'On the lawn beside Kidlandia' }, // TODO(Jess): confirm location
  // The other beer stations the export marks
  { x: 802.5, y: 308.9, c: 'drinks', d: 'drinks', where: 'By the Main Stage, next to the Food Court' }, // TODO(Jess): confirm location
  { x: 522.3, y: 735.3, c: 'drinks', d: 'drinks', where: 'West lawn, near the McLendon entrance' }, // TODO(Jess): confirm location
  // ...and the one just north of the Acoustic Stage, which Jess's plan pairs
  // with a water station tight against it (9/21; the water is in the water
  // block below, held to Detail). Was the export's (897.3, 747.3); 53 units
  // from the stage pin, clear of the bike valet.
  { x: 862.0, y: 750.0, c: 'drinks', d: 'drinks', where: 'By the Acoustic Stage' }, // TODO(Jess): confirm location

  // King of Pops: two carts (Todd, 9/21), in the food colour, each opening
  // the cart's card. The Main Stage cart is in the front row on the lawn
  // beside Kidlandia, down off the white path onto the green (Ernest, round
  // 3: 693, 378; half a unit out so its Detail target is edge to edge with
  // first aid's), waiting for Detail like the stations beside it. The
  // entrance cart is by the park entrance, on the west lawn edge at the path
  // mouth -- 47 units from merch (46 is edge to edge at the first step),
  // clear of the west beer station and booth 69. Cart spots move at load-in
  // like the trucks.
  // Both carts draw as SQUARES like the food stalls (shape: 'square'), the
  // same 8-unit tick in --pin-food at full strength, no glyph, with a 44px
  // tap target on the phone like any pin (Ernest, round 3). A cart carries
  // its number `n` (C1-C3: a C prefix, the way Kidlandia uses K, so it
  // cannot be read as art booth 1-3), its `vendor` (the name in
  // vendors.json, which is its card) and a short `tag` that tells two carts
  // of one vendor apart in the print index. The number is stored here and
  // nowhere else: the print map, the print index and the phone card read it.
  { x: 692.5, y: 377.5, c: 'food', d: 'kingofpops', shape: 'square', n: 'C1', vendor: 'King of Pops', tag: 'Main Stage', from: 'detail', where: 'On the lawn beside Kidlandia' }, // TODO(Jess): confirm location
  { x: 583.0, y: 735.0, c: 'food', d: 'kingofpops', shape: 'square', n: 'C2', vendor: 'King of Pops', tag: 'entrance', where: 'Near the McLendon entrance' }, // TODO(Jess): confirm location
  // Mr Softee: "Add an additional food icon here (this one is Mr Softee)"
  // (Jess's markup, 9/23), a food-cart square like King of Pops, on the lawn
  // south-west of the beer stand. Clear of everything at every stop, so on
  // the map from the first step.
  { x: 678.0, y: 476.0, c: 'food', d: 'mrsoftee', shape: 'square', n: 'C3', vendor: 'Mr Softee', where: 'On the lawn beside Kidlandia, south-west of the beer stand' },

  // Merch: the CPNO Merch Tent on Jess's 2026 site plan, on the EAST side of
  // the entrance path (the path mouth is x ~598-622), a little north of
  // McLendon -- 36 units above the street band (y ~776), well short of
  // halfway to where the park's booth rows start (y ~650). The same spot
  // every year (Jess, 9/17). Not in the export. The bike valet moved 10 units
  // east so this overview target clears its own (83 units; the floor is 81 on
  // a 375px phone).
  { x: 630.0, y: 740.0, c: 'merch', d: 'merch', label: 'Merch', overview: true, where: 'McLendon entrance, east side of the path' },

  // Restrooms (category key is `wc`, matching icons.js and the filter chips).
  // The southern bank is ON the entrance path between booth 54 and AWARE
  // Wildlife's square, in that order going down the path as Jess's plan has
  // it (Ernest, 9/22): at the exact midpoint of the line from 54
  // (623.1, 645.3) to the square (598.5, 677), 20.1 units from each. Edge to
  // edge with both: at Detail its 44px target clears each hit cell's corner
  // by 0.7 units (about 1px), and on paper the disc clears both squares. So
  // the square did not need to move down the path. Was the export's
  // (601.6, 665.1), then (582, 658).
  { x: 934.3, y: 138.3, c: 'wc', d: 'wc', where: 'North end, past the Food Court, by the cul-de-sac' }, // TODO(Jess): confirm location
  { x: 610.8, y: 661.2, c: 'wc', d: 'wc', where: 'Just inside the McLendon entrance, by art booth 54' }, // TODO(Jess): confirm location
  // The two banks Jess's plan added (9/21), on both maps since 9/22 (Ernest:
  // every restroom shows everywhere). One symbol for every toilet, ADA units
  // included -- the print key says "Restroom (+ ADA)", the phone card too.
  //   The field side of the art-market path, at Jess's (679, 555) moved 8
  //   units out onto the lawn, at a right angle to the path away from the
  //   row (Ernest, 9/23): at her spot the disc sat 1.4 units off the numbers
  //   of booths 45 and 46 on paper; here it clears them by 9.3. 44 units
  //   from the generator, 65 from the ice truck.
  { x: 672.5, y: 550.0, c: 'wc', d: 'wc', where: 'On the lawn beside Kidlandia, by art booths 45 and 46' },
  //   Candler Park Dr, by the north pathway into the park (her ~422, 217).
  { x: 422.0, y: 217.0, c: 'wc', d: 'wc', where: 'Candler Park Dr, at the north path into the park' }, // TODO(Jess): confirm location

  // The lawn beside Kidlandia, as Ernest drew it on the print sheet (round 3,
  // 9/22): six pins ride the edge of the green lawn shape, just inside it --
  // a front row, close together, of beverage station, King of Pops cart
  // (below), first aid, beverage station; then water and the beer stand just
  // below. Print is the priority and the discs clear each other at his
  // spots, but on the phone the front row's 44px targets need 25.5 units
  // between neighbours at Detail (the closest stop, where the lower-priority
  // pins finally show), so with first aid anchored at his (712, 395) each
  // neighbour sits edge to edge on his own bearing: the King of Pops cart
  // 0.5 units out from (693, 378), the west station 7.8 units WSW of
  // (677, 387), the east station 4 units E of (734, 391). First aid is on the
  // map from the first zoom step; the stations and the cart wait for Detail.
  //
  // Beverage stations are NOT beer (`drinks`): their own category, the cup on
  // the darker amber.
  { x: 712.0, y: 395.0, c: 'firstaid', d: 'firstaid', where: 'On the lawn below the Main Stage, beside the King of Pops cart' },
  // The two beverage stations are not on Jess's markup (9/23): hidden, not
  // deleted -- delete `hidden` to bring one back.
  { x: 670.0, y: 391.5, c: 'beverage', d: 'beverage', from: 'detail', hidden: true, where: 'On the lawn beside Kidlandia, near first aid' }, // TODO(Jess): confirm location
  { x: 738.0, y: 390.5, c: 'beverage', d: 'beverage', from: 'detail', hidden: true, where: 'On the lawn beside Kidlandia, near first aid' }, // TODO(Jess): confirm location

  // Water refill stations, per Jess's 2026 site plan (9/21, Ernest 9/22).
  // Water is the lowest priority on the map, so where a station sits close
  // to something it waits for the Detail stop (from: 'detail') -- the Water
  // chip shows it at any stop.
  //
  // On the lawn just above-left of the beer stand (Ernest, round 3: 712, 459).
  // His spot is 20.6 units from the stand, under the 25.5 two Detail targets
  // need, so it sits edge to edge on his bearing, 5.7 units further out:
  // 26.3 from the stand. Detail only.
  { x: 707.5, y: 455.5, c: 'water', d: 'water', from: 'detail', where: 'On the lawn beside Kidlandia, next to the beer stand' }, // TODO(Jess): confirm location
  // The water half of the beer + water pair north of the Acoustic Stage:
  // tight against the beer at (862, 750) -- edge to edge at Detail, 26
  // units east (25.5 is touching on a 375px phone; half a unit of air) -- so
  // it too waits for Detail. Ernest's 877 would overlap.
  { x: 888.0, y: 750.0, c: 'water', d: 'water', from: 'detail', where: 'By the Acoustic Stage, next to the beer' }, // TODO(Jess): confirm location
  // At the Candler Park Dr speed bump, in the break between 94/95 and
  // 111/112. Not on Jess's markup (9/23): hidden, not deleted.
  { x: 438.0, y: 585.0, c: 'water', d: 'water', hidden: true, where: 'Candler Park Dr, at the speed bump by booths 95 and 112' }, // TODO(Jess): confirm location
  // The entrance-path station (the export's 588.1, 708.3) is at the McLendon
  // entrance tucked against the merch tent's lower-right side, edge to edge
  // at Detail (26.6 units on Ernest's bearing, where 25.5 is touching on a
  // 375px phone; his (636, 749) was 11 from merch). Hidden at the first zoom
  // step, where it would sit on merch.
  { x: 645.0, y: 762.0, c: 'water', d: 'water', from: 'detail', where: 'McLendon entrance, next to the merch tent' }, // TODO(Jess): confirm location

  // Kidlandia, per Jess's plan (9/21): a water station in the north-centre
  // of the lawn -- clear of the Kidlandia pin's target at the first zoom
  // step (50 units; 46 is touching) and of the K column at x 592 -- and the
  // PTA booth inside the shape's south-west, where Ernest read it off her
  // plan (9/22), clear of the generator at (507, 488) on paper. The rocket
  // is her own legend's glyph for it, in the Kidlandia colour.
  // Kidlandia's water is south-east of the Kidlandia pin, where Jess's markup
  // put it (9/23; was the north-centre of the lawn). 38.7 units from the pin,
  // so it waits for Detail on the phone.
  { x: 552.0, y: 461.0, c: 'water', d: 'water', from: 'detail', where: 'Inside Kidlandia, at its south end' },
  // At the top of the Candler Park Dr booth run, park side of the street:
  // Jess asked for water here, not the speed bump the 9/22 round drew
  // (hidden below). Her (421, 361), one unit north so its Detail target
  // clears booth 131's hit cell.
  { x: 421.0, y: 360.0, c: 'water', d: 'water', where: 'Candler Park Dr, at the north end of the booth run' },
  // The PTA booth is not on Jess's markup (9/23): hidden, not deleted.
  { x: 519.0, y: 520.0, c: 'pta', d: 'pta', hidden: true, where: 'Inside Kidlandia, at its south-west edge' },

  // Info booth: directly on top of the merch tent, edge to edge. "The info
  // booth and the merch booth are the same place" (Jess, 9/20). Ernest's
  // round-3 endpoint is (635, 721), 19.6 units from merch on a bearing a
  // little east of north; the two 44px targets need 25.5 at the phone's
  // Detail stop, so info sits at the closest point on that bearing where
  // they are edge to edge: 26.4 units out. Detail only on the phone, and no
  // longer on the desktop's opening view (there 44px is 40 units); it arrives
  // at the desktop's first step, where 44px is 22 units. Was (630, 694), 46
  // above merch, from 9/20 to 9/22. The export had it at (644.3, 733.3).
  { x: 637.0, y: 714.5, c: 'info', d: 'info', from: 'detail', where: 'Just inside the McLendon entrance, east side of the path, above the merch tent' },

  // Drawn as a placeholder red circle in the export at (702.4, 730.1); here it
  // is the Phosphor bicycle on the utility neutral, 10 units east of the
  // export's spot so its overview target clears the merch tent's on the
  // corner (the McLendon marker moved east with it).
  { x: 712.4, y: 730.1, c: 'bikevalet', d: 'bikevalet', overview: true, where: 'Off McLendon, east of the park entrance' },

  // ---- PAPER ONLY from here: the EMS / fire-inspector layer (Jess, 9/21) ----

  // Barricades: one across every road into the closed streets, as on Jess's
  // plan. Her boxes were read off the printed sheet; each is centred on the
  // street it closes (Candler Park Dr is centred on x 411.5, McLendon on
  // y 789.9, both 28 wide), which is the only nudge.
  //   Candler Park Dr at the north edge of the sheet (her ~414, 71).
  { x: 411.5, y: 71.0, c: 'barricade', print: true, axis: 'x' },
  //   Miller Ave where it meets Candler Park Dr, by booths 121-122 (her
  //   ~395, 481 -- Miller's centreline is y 480.7, and x 395 is its mouth,
  //   just west of the Candler Park Dr kerb).
  { x: 395.0, y: 480.7, c: 'barricade', print: true, axis: 'y' },
  //   McLendon just west of Candler Park Dr (her ~395, 791).
  { x: 395.0, y: 789.9, c: 'barricade', print: true, axis: 'y' },
  //   McLendon east of the Acoustic Stage AND east of Mell Ave (her box,
  //   9/23; Mell is at x 938.5 and its kerb at 952.5), across McLendon.
  { x: 979.0, y: 789.9, c: 'barricade', print: true, axis: 'y' },

  // Generators (Phosphor lightning) and dumpsters (trash), where Jess's plan
  // puts them. By the changing rooms north of the Main Stage: the musicians'
  // tent at her (805, 267), and the generator pair and the dumpster pair
  // stacked above it -- her spots for the pairs were (811, 239) and
  // (836, 239); each pair's lower disc sits edge to edge with the tent
  // (20.9 units) and the upper one 20 above it, and the dumpsters clear the
  // "Food Court" label and food stall 4 on paper (9/23).
  { x: 805.0, y: 267.0, c: 'musicianTent', print: true },
  { x: 811.0, y: 247.0, c: 'generator', print: true },
  { x: 811.0, y: 227.0, c: 'generator', print: true },
  { x: 836.0, y: 247.0, c: 'dumpster', print: true },
  { x: 836.0, y: 227.0, c: 'dumpster', print: true },
  // On the lawn beside Kidlandia, from Jess's markup (9/23): the ice truck
  // ("Please label this 'Ice truck'") and one more generator, both paper only.
  { x: 710.0, y: 497.0, c: 'iceTruck', print: true },
  { x: 708.0, y: 524.0, c: 'generator', print: true },
  // Two on the east side of the food-truck row (her ~911, 291), stacked so
  // neither sits on stall 5 or 7.
  { x: 912.0, y: 281.0, c: 'generator', print: true },
  { x: 912.0, y: 303.0, c: 'generator', print: true },
  // One at the south edge of Kidlandia.
  { x: 507.0, y: 488.0, c: 'generator', print: true },


  // Speed bumps on Candler Park Dr: thin bars across the street (x is the
  // street's centreline, 411.5). One just north of the top of the booth run,
  // above 139 / 131 (her ~421, 360); one in the break the mid-run bump makes
  // in both columns, between 94 and 95 on the street side and 111 and 112 on
  // the park side -- her plan calls that 106/107 and 128/129 in the old
  // numbering. Its y is the midpoint of that break as build-booths.py lays
  // it (CPD_BUMP); re-check after any re-pull that moves the columns.
  // Neither speed bump is on Jess's markup (9/23; the top one is a water
  // station in her hand): hidden, not deleted.
  { x: 411.5, y: 360.0, c: 'speedbump', print: true, hidden: true },
  { x: 411.5, y: 585.0, c: 'speedbump', print: true, hidden: true },
];

// Colours are references into the token layer, not hex literals. tokens.css is
// the single source of truth; this file used to carry a second copy of the same
// nine values, which is exactly the kind of duplication that drifts.
//
// These resolve as CSS in both places they are used: as an SVG `fill` on the map
// and as a `background` on the panel badges.
// The pins that are on a map at all: everything not `hidden`. Every consumer
// of the list -- both maps, the directory, the legends, the chips -- reads
// this, so one flag is the whole switch.
export const ACTIVE_PINS = PINS.filter((p) => !p.hidden);
/** Whether any pin of a category is on a map (hidden ones do not count). */
export const hasPins = (c) => ACTIVE_PINS.some((p) => p.c === c);

export const PIN_COLOR = {
  food: 'var(--pin-food)',
  drinks: 'var(--pin-drinks)',
  beverage: 'var(--pin-beverage)',
  stage: 'var(--pin-stage)',
  kids: 'var(--pin-kids)',
  wc: 'var(--pin-restroom)',
  info: 'var(--pin-info)',
  firstaid: 'var(--pin-firstaid)',
  water: 'var(--pin-water)',
  merch: 'var(--pin-merch)',
  // Low-frequency services (bike valet, entrances, ADA, picnic/seating) share
  // one quiet neutral rather than each taking a vivid pin hue.
  bikevalet: 'var(--cat-utility)',
  // The PTA booth is in Kidlandia and wears its colour; the rocket glyph
  // tells it from the Kidlandia pin (Ernest, 9/22).
  pta: 'var(--pin-kids)',
  // The paper-only operations layer (print: true), in the --ops-* tokens.
  barricade: 'var(--ops-barricade)',
  generator: 'var(--ops-generator)',
  dumpster: 'var(--ops-dumpster-fill)',
  speedbump: 'var(--ops-speed-bump)',
  iceTruck: 'var(--ops-ice-truck)',
  musicianTent: 'var(--ops-musician-tent)',
};

// Where a disc is not "category fill, white glyph": the glyph's colour and,
// if it has one, the ring. Only the ops layer so far -- the generator's navy
// bolt on yellow, the dumpster's charcoal glyph and ring on white (Ernest,
// 9/22). Read by PrintSheet for the disc and for the legend swatch.
export const PIN_INK = {
  generator: { glyph: 'var(--ff-navy)' },
  iceTruck: { glyph: 'var(--ff-navy)' },
  dumpster: { glyph: 'var(--ops-dumpster-ink)', ring: 'var(--ops-dumpster-ink)' },
};

export const SLATE = 'var(--cat-booth)';
export const NAVY = 'var(--ff-navy)';
export const CREAM = 'var(--ff-cream)';
export const TEAL = 'var(--ff-teal)';
export const CORAL = 'var(--ff-coral)';
