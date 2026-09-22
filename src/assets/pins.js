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
// A `barricade` is three cones in a row ACROSS a street, so it carries `axis`:
// 'x' when the row runs east-west (across a north-south street), 'y' when it
// runs north-south (across an east-west one).
export const PINS = [
  // Markers that carry a standing label on the map
  { x: 859.7, y: 292.3, c: 'food', d: 'food', label: 'Food Court', overview: true },
  { x: 741.1, y: 288.5, c: 'stage', d: 'stageMain', label: 'Main Stage', overview: true },
  // The Acoustic Stage sits where the export drew it until Mell Ave moved to
  // x 938.5 (Figma, 9/21) -- exactly where the pin was. The east end of
  // McLendon repacked west of Mell's kerb (924.5): barricade ~912, stage 885,
  // Achieve with Steve 858, booth 55 at 840 (Jess, Ernest, 9/22).
  { x: 885.0, y: 797.9, c: 'stage', d: 'stageAcoustic', label: 'Acoustic', overview: true },
  { x: 550.9, y: 422.3, c: 'kids', d: 'kids', label: 'Kidlandia', overview: true },

  // The beer stand: the main one, on the field below the Main Stage -- the
  // landmark the food chair places Mr Softee against ("to the right of the
  // beer stand when facing it"). Where Jess's 2026 site plan puts it (Ernest,
  // 9/22): down and a little east of the export's (734.7, 442.0). It is on
  // the phone's opening view, where two targets need 81 units on a 375px
  // screen, so the in-park art market marker moved up the path to 83 units
  // from it (areas.js) rather than the stand leaving its spot.
  { x: 728.0, y: 472.0, c: 'drinks', d: 'beer', label: 'Beer', overview: true },
  // The other beer stations the export marks
  { x: 802.5, y: 308.9, c: 'drinks', d: 'drinks' },
  { x: 522.3, y: 735.3, c: 'drinks', d: 'drinks' },
  // ...and the one just north of the Acoustic Stage, which Jess's plan pairs
  // with a water station tight against it (9/21; the water is in the water
  // block below, held to Detail). Was the export's (897.3, 747.3); 53 units
  // from the stage pin, clear of the bike valet.
  { x: 862.0, y: 750.0, c: 'drinks', d: 'drinks' },

  // King of Pops: two carts (Todd, 9/21), in the food colour, each opening
  // the cart's card. One on the field side near the Main Stage, west of the
  // truck row per Todd's layout -- 60 units from the stage pin, 54 from the
  // west beverage station, clear of the "Main Stage" label on paper. One by
  // the park entrance, on the west lawn edge at the path mouth -- 47 units
  // from merch (46 is edge to edge at the first step), clear of the west
  // beer station and booth 69. Cart spots move at load-in like the trucks.
  { x: 690.0, y: 320.0, c: 'food', d: 'kingofpops' },
  { x: 583.0, y: 735.0, c: 'food', d: 'kingofpops' },

  // Merch: the CPNO Merch Tent on Jess's 2026 site plan, on the EAST side of
  // the entrance path (the path mouth is x ~598-622), a little north of
  // McLendon -- 36 units above the street band (y ~776), well short of
  // halfway to where the park's booth rows start (y ~650). The same spot
  // every year (Jess, 9/17). Not in the export. The bike valet moved 10 units
  // east so this overview target clears its own (83 units; the floor is 81 on
  // a 375px phone).
  { x: 630.0, y: 740.0, c: 'merch', d: 'merch', label: 'Merch', overview: true },

  // Restrooms (category key is `wc`, matching icons.js and the filter chips).
  // The southern bank is ON the entrance path between booth 54 and AWARE
  // Wildlife's square, in that order going down the path as Jess's plan has
  // it (Ernest, 9/22): centred on the line from 54 (623.1, 645.3) to the
  // square (598.5, 677), 20 units from each -- its Detail target (12.75) and
  // a booth's hit cell (4.7) need 17.45, so it overlaps neither and the
  // square did not have to move. Was the export's (601.6, 665.1), then
  // (582, 658).
  { x: 934.3, y: 138.3, c: 'wc', d: 'wc' },
  { x: 611.0, y: 661.0, c: 'wc', d: 'wc' },
  // The two banks Jess's plan added (9/21), on both maps since 9/22 (Ernest:
  // every restroom shows everywhere). One symbol for every toilet, ADA units
  // included -- the print key says "Restroom (+ ADA)", the phone card too.
  //   The field side of the art-market path, up from Jess's (678, 554) to
  //   where Ernest read it (9/22), clear of booths 43-45.
  { x: 680.0, y: 526.0, c: 'wc', d: 'wc' },
  //   Candler Park Dr, by the north pathway into the park (her ~422, 217).
  { x: 422.0, y: 217.0, c: 'wc', d: 'wc' },

  // The field below the Main Stage, per Jess's 2026 plan as Ernest read it
  // against the printed sheet (9/22): EMS is the export's first-aid spot, and
  // the two beverage stations flank it up the field -- one west, one just
  // east. Ernest's endpoints were (671, 370) and (720, 385); the first is 44
  // units from EMS and the second 13, so each sits edge to edge with EMS at
  // the first zoom step instead (46 units): the west one 2 units further
  // west, the east one out to 761 on its own side. The east one clears the
  // beer station at (802.5, 309) and the park's west row at Detail.
  //
  // Beverage stations are NOT beer (`drinks`): their own category, the cup on
  // the darker amber.
  { x: 715.0, y: 373.0, c: 'firstaid', d: 'firstaid' },
  { x: 669.0, y: 370.0, c: 'beverage', d: 'beverage' },
  { x: 761.0, y: 379.0, c: 'beverage', d: 'beverage' },

  // Water refill stations, per Jess's 2026 site plan (9/21, Ernest 9/22).
  // Water is the lowest priority on the map, so where a station sits close
  // to something it waits for the Detail stop (from: 'detail') -- the Water
  // chip shows it at any stop.
  //
  // On the field, exactly at Jess's box, between EMS and the beer stand: 43
  // units from EMS and 30 from the east beverage station, so it arrives at
  // Detail, where a 44px target is 25.5 units and both clear.
  { x: 731.0, y: 413.0, c: 'water', d: 'water', from: 'detail' },
  // The water half of the beer + water pair north of the Acoustic Stage:
  // tight against the beer at (862, 750) -- edge to edge at Detail, 26
  // units east (25.5 is touching on a 375px phone; half a unit of air) -- so
  // it too waits for Detail. Ernest's 877 would overlap.
  { x: 888.0, y: 750.0, c: 'water', d: 'water', from: 'detail' },
  // At the Candler Park Dr speed bump, in the break between 94/95 (street
  // side) and 111/112 (park side), which Jess's plan marks and the 9/22 PR
  // missed (Ernest). Off the street's east edge (425.6) on the park side:
  // 438 keeps its Detail target 21.6 units from booths 111 and 112 (17.45 is
  // touching) and, on paper, the disc off the bar and off their numbers.
  { x: 438.0, y: 585.0, c: 'water', d: 'water' },
  // The entrance-path station (the export's 588.1, 708.3) is at the McLendon
  // entrance tucked against the merch tent's lower-right side, edge to edge
  // at Detail (26.6 units on Ernest's bearing, where 25.5 is touching on a
  // 375px phone; his (636, 749) was 11 from merch). Hidden at the first zoom
  // step, where it would sit on merch.
  { x: 645.0, y: 762.0, c: 'water', d: 'water', from: 'detail' },

  // Kidlandia, per Jess's plan (9/21): a water station in the north-centre
  // of the lawn -- clear of the Kidlandia pin's target at the first zoom
  // step (50 units; 46 is touching) and of the K column at x 592 -- and the
  // PTA booth inside the shape's south-west, where Ernest read it off her
  // plan (9/22), clear of the generator at (507, 488) on paper. The rocket
  // is her own legend's glyph for it, in the Kidlandia colour.
  { x: 527.0, y: 378.0, c: 'water', d: 'water' },
  { x: 519.0, y: 520.0, c: 'pta', d: 'pta' },

  // Info booth: directly north of the merch tent, on the same (east) side of
  // the entrance path. "The info booth and the merch booth are the same
  // place" (Jess, 9/20): one spot with two jobs, so the two pins sit as close
  // as the touch rule allows -- 46 units apart, the 44px targets edge to
  // edge at the phone's first zoom step on a 375px screen. Ernest's 9/22
  // endpoint (638, 723) is 19 units from merch, which would overlap at every
  // stop, so it stays at 46, directly above. On the phone it now arrives at
  // Detail: the south restroom bank, on the path 38 units above it since
  // 9/22, outranks it and the two would cross at the first step. On the
  // desktop it is on the opening view (an 11px gap between the 40px pins)
  // and at every step. Was the export's (644.3, 733.3).
  { x: 630.0, y: 694.0, c: 'info', d: 'info', overview: 'docked', from: 'detail' },

  // Drawn as a placeholder red circle in the export at (702.4, 730.1); here it
  // is the Phosphor bicycle on the utility neutral, 10 units east of the
  // export's spot so its overview target clears the merch tent's on the
  // corner (the McLendon marker moved east with it).
  { x: 712.4, y: 730.1, c: 'bikevalet', d: 'bikevalet', overview: true },

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
  //   McLendon just west of Mell Ave, between the Acoustic Stage and Mell
  //   (her ~912, 792; Mell's kerb is at 924.5).
  { x: 912.0, y: 789.9, c: 'barricade', print: true, axis: 'y' },

  // Generators (Phosphor lightning) and dumpsters (trash), where Jess's plan
  // puts them. By the changing rooms north of the Main Stage: two generators
  // west, two dumpsters east, a 2x2 in her (800-840, 238-267) box, lifted a
  // few units so the dumpsters clear the "Food Court" label on paper.
  { x: 806.0, y: 236.0, c: 'generator', print: true },
  { x: 806.0, y: 256.0, c: 'generator', print: true },
  { x: 828.0, y: 236.0, c: 'dumpster', print: true },
  { x: 828.0, y: 256.0, c: 'dumpster', print: true },
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
  { x: 411.5, y: 360.0, c: 'speedbump', print: true },
  { x: 411.5, y: 585.0, c: 'speedbump', print: true },
];

// Colours are references into the token layer, not hex literals. tokens.css is
// the single source of truth; this file used to carry a second copy of the same
// nine values, which is exactly the kind of duplication that drifts.
//
// These resolve as CSS in both places they are used: as an SVG `fill` on the map
// and as a `background` on the panel badges.
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
};

// Where a disc is not "category fill, white glyph": the glyph's colour and,
// if it has one, the ring. Only the ops layer so far -- the generator's navy
// bolt on yellow, the dumpster's charcoal glyph and ring on white (Ernest,
// 9/22). Read by PrintSheet for the disc and for the legend swatch.
export const PIN_INK = {
  generator: { glyph: 'var(--ff-navy)' },
  dumpster: { glyph: 'var(--ops-dumpster-ink)', ring: 'var(--ops-dumpster-ink)' },
};

export const SLATE = 'var(--cat-booth)';
export const NAVY = 'var(--ff-navy)';
export const CREAM = 'var(--ff-cream)';
export const TEAL = 'var(--ff-teal)';
export const CORAL = 'var(--ff-coral)';
