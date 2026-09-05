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

// Matches claude/color-tokens.md's Category pin palette exactly.
export const PIN_COLOR = {
  food: '#C97636',
  drinks: '#B78B34',
  stage: '#8F71B7',
  kids: '#C25B7E',
  wc: '#3D9E6E',
  info: '#407EB5',
  firstaid: '#C84B46',
  water: '#3D8FA4',
  // "Structural / neutral" row of color-tokens.md's palette: low-frequency
  // services (bike valet, entrances, ADA, picnic/seating) share this one
  // quiet neutral (--cat-utility) instead of each taking a vivid pin hue.
  bikevalet: '#6E7C93',
};

// Marker radius in map units. The export draws its own markers at r 17.25-21.27;
// this sits at the top of that range so the tap target survives the overview
// zoom level.
export const PIN_R = 22;

export const SLATE = '#47597A';
export const NAVY = '#23385B';
export const CREAM = '#F5EFDA';
export const TEAL = '#56AC9B';
export const CORAL = '#E89370';
