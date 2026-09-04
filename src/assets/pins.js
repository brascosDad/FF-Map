// Pin positions extracted verbatim from the locked mobile prototype
// (fall-fest-zoom-level-test.html) so the coordinates carry over exactly —
// these sit on the same 340×460 viewBox as fall-fest-map-trace-1.svg.
// Replace with real traced coordinates once the illustrated basemap SVG is finalized.
export const PINS = [
  { x: 296, y: 120, c: 'food', d: 'food', label: 'Food Court' },
  { x: 212, y: 138, c: 'stage', d: 'stageMain', label: 'Main Stage' },
  { x: 300, y: 414, c: 'stage', d: 'stageAcoustic', label: 'Acoustic' },
  { x: 120, y: 200, c: 'kids', d: 'kids', label: 'Kidlandia' },
  { x: 255, y: 258, c: 'drinks', d: 'drinks' },
  { x: 312, y: 60, c: 'wc', d: 'wc' },
  { x: 150, y: 352, c: 'wc', d: 'wc' },
  { x: 235, y: 232, c: 'firstaid', d: 'firstaid' },
  { x: 175, y: 300, c: 'water', d: 'water' },
  { x: 95, y: 300, c: 'info', d: 'info' },
  // Position is approximate: back-derived from the red circle Ernest marked
  // "bike-valet" in fall-fest-desktop-map-wireframe.svg (cx 702.386, cy 730.147
  // on that file's 1440x900 canvas), roughly cross-referenced against nearby
  // POIs shared between that file and this 340x460 viewBox (restrooms, info,
  // water). That cross-reference wasn't precise enough to trust to the pixel —
  // nudge this once the real illustrated basemap is finalized (same caveat as
  // the other placeholder coordinates in this file).
  { x: 185, y: 320, c: 'bikevalet', d: 'bikevalet' },
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

export const SLATE = '#47597A';
export const NAVY = '#23385B';
export const CREAM = '#F5EFDA';
export const TEAL = '#56AC9B';
export const CORAL = '#E89370';
