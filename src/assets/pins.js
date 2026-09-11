// Pin positions taken from the "festival elements (z=2)" group of the canonical
// Figma export (fall-fest-desktop-map-wireframe, 1440x900). Each x/y is the
// marker circle's own cx/cy in that export -- these replace the hand-placed
// coordinates carried over from the mobile prototype.
//
// `c` is the category key: it drives both PIN_COLOR below and the Phosphor glyph
// looked up in assets/icons.js, so it has to stay one of the keys already in
// this file. `d` is the DetailSheet entry the pin opens.
export const PINS = [
  // Markers that carry a standing label on the map
  { x: 859.7, y: 292.3, c: 'food', d: 'food', label: 'Food Court' },
  { x: 741.1, y: 288.5, c: 'stage', d: 'stageMain', label: 'Main Stage' },
  { x: 938.5, y: 797.9, c: 'stage', d: 'stageAcoustic', label: 'Acoustic' },
  { x: 550.9, y: 422.3, c: 'kids', d: 'kids', label: 'Kidlandia' },

  // Beer / beverage stations -- the export marks four
  { x: 802.5, y: 308.9, c: 'drinks', d: 'drinks' },
  { x: 734.7, y: 442.0, c: 'drinks', d: 'drinks' },
  { x: 522.3, y: 735.3, c: 'drinks', d: 'drinks' },
  { x: 897.3, y: 747.3, c: 'drinks', d: 'drinks' },

  // Restrooms (category key is `wc`, matching icons.js and the filter chips)
  { x: 934.3, y: 138.3, c: 'wc', d: 'wc' },
  { x: 601.6, y: 665.1, c: 'wc', d: 'wc' },

  { x: 715.0, y: 373.0, c: 'firstaid', d: 'firstaid' },

  // Water refill stations -- the export marks two
  { x: 668.2, y: 318.7, c: 'water', d: 'water' },
  { x: 588.1, y: 708.3, c: 'water', d: 'water' },

  { x: 644.3, y: 733.3, c: 'info', d: 'info' },

  // Drawn as a placeholder red circle in the export; recolored here to the
  // utility neutral. The position itself is real, so it is no longer the
  // approximation the previous coordinate was.
  { x: 702.4, y: 730.1, c: 'bikevalet', d: 'bikevalet' },
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
  // Low-frequency services (bike valet, entrances, ADA, picnic/seating) share
  // one quiet neutral rather than each taking a vivid pin hue.
  bikevalet: 'var(--cat-utility)',
};

export const SLATE = 'var(--cat-booth)';
export const NAVY = 'var(--ff-navy)';
export const CREAM = 'var(--ff-cream)';
export const TEAL = 'var(--ff-teal)';
export const CORAL = 'var(--ff-coral)';
