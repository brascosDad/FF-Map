// Pin positions taken from the "festival elements (z=2)" group of the canonical
// Figma export (fall-fest-desktop-map-wireframe, 1440x900). Each x/y is the
// marker circle's own cx/cy in that export -- these replace the hand-placed
// coordinates carried over from the mobile prototype.
//
// `c` is the category key: it drives both PIN_COLOR below and the Phosphor glyph
// looked up in assets/icons.js, so it has to stay one of the keys already in
// this file. `d` is the DetailSheet entry the pin opens.
//
// `overview: true` keeps a pin on the phone's opening view. At that zoom the
// whole festival is squeezed into a phone screen and pins hold one physical
// size, so only a few fit without their 44px targets overlapping. The
// destinations do, plus the two landmarks beta testers reached for first
// (bike valet and the beer stand, Alex 9/17) and the merch booth at the gate.
// Everything else arrives at the first zoom step or when its chip is tapped.
// Before adding one, check the spacing: scripts/e2e.mjs asserts that no two
// overview targets overlap on a 375px phone.
export const PINS = [
  // Markers that carry a standing label on the map
  { x: 859.7, y: 292.3, c: 'food', d: 'food', label: 'Food Court', overview: true },
  { x: 741.1, y: 288.5, c: 'stage', d: 'stageMain', label: 'Main Stage', overview: true },
  { x: 938.5, y: 797.9, c: 'stage', d: 'stageAcoustic', label: 'Acoustic', overview: true },
  { x: 550.9, y: 422.3, c: 'kids', d: 'kids', label: 'Kidlandia', overview: true },

  // The beer stand: the main one, on the field below the Main Stage -- the
  // landmark the food chair places Mr Softee against ("to the right of the
  // beer stand when facing it"). It is the export's main-lawn beverage marker
  // (734.7, 442.0), moved 25 units west-north-west so its overview target
  // clears the in-park art market marker; nothing else on the field is that
  // close. Confirm the spot against the 2026 site plan.
  { x: 712.0, y: 428.0, c: 'drinks', d: 'beer', label: 'Beer', overview: true },
  // The other beverage stations the export marks
  { x: 802.5, y: 308.9, c: 'drinks', d: 'drinks' },
  { x: 522.3, y: 735.3, c: 'drinks', d: 'drinks' },
  { x: 897.3, y: 747.3, c: 'drinks', d: 'drinks' },

  // Merch: the CPNO Merch Tent on Jess's 2026 site plan, on the EAST side of
  // the entrance path (the path mouth is x ~598-622), a little north of
  // McLendon -- 20 units above the street band (y ~776), well short of
  // halfway to where the park's booth rows start (y ~650). The same spot
  // every year (Jess, 9/17). Not in the export. The bike valet moved 10 units
  // east so this overview target clears its own (86 units; the floor is 81 on
  // a 375px phone).
  { x: 630.0, y: 756.0, c: 'merch', d: 'merch', label: 'Merch', overview: true },

  // Restrooms (category key is `wc`, matching icons.js and the filter chips)
  { x: 934.3, y: 138.3, c: 'wc', d: 'wc' },
  { x: 601.6, y: 665.1, c: 'wc', d: 'wc' },

  { x: 715.0, y: 373.0, c: 'firstaid', d: 'firstaid' },

  // Water refill stations -- the export marks two. The southern one is the
  // export's (588.1, 708.3) nudged 4 units west and 1 south so its target
  // clears the info booth's, now stacked above merch on the far side of the
  // path. Water placement is still being confirmed with Jess for 2026 anyway.
  { x: 668.2, y: 318.7, c: 'water', d: 'water' },
  { x: 584.0, y: 709.0, c: 'water', d: 'water' },

  // Info booth: directly north of the merch tent, on the same (east) side of
  // the entrance path, the two pins stacked so their 44px targets touch at the
  // first zoom step (46 units apart; the floor is 45.8 on a 375px phone) and
  // do not overlap (Ernest, 9/19, per Jess's 2026 site plan). Was the
  // export's (644.3, 733.3). The water pin to the west clears it by the same
  // 46 units.
  { x: 630.0, y: 710.0, c: 'info', d: 'info' },

  // Drawn as a placeholder red circle in the export at (702.4, 730.1); here it
  // is the Phosphor bicycle on the utility neutral, 10 units east of the
  // export's spot so its overview target clears the merch tent's on the
  // corner (the McLendon marker moved east with it).
  { x: 712.4, y: 730.1, c: 'bikevalet', d: 'bikevalet', overview: true },
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
};

export const SLATE = 'var(--cat-booth)';
export const NAVY = 'var(--ff-navy)';
export const CREAM = 'var(--ff-cream)';
export const TEAL = 'var(--ff-teal)';
export const CORAL = 'var(--ff-coral)';
