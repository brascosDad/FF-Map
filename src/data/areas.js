// The three art-market runs, as one shared list.
//
// This used to live inside MapCanvas as a private const. The docked
// panel lists the same three areas and has to centre the map on them, so the
// list moved here rather than being typed out a second time.
//
// `mk` is where the area's marker sits, in map units -- it doubles as the point
// the panel centres on. `shortName` is how the panel lists the run; `label` is
// the only text the map itself still draws for it. `blobs`/`clip` are drawing concerns the panel ignores.
// Counts in `range` are the committee's stated numbers, which run slightly
// ahead of what the export actually draws (see data/booths.js).
import { BLOBS } from '../assets/basemapBlobs';
import { BOOTHS } from './booths';

export const AREAS = [
  { id: 'cpd', blobs: BLOBS.cpd, clip: 'clip-cpd', booths: BOOTHS.cpd, mk: [411.5, 541.5], label: null, shortName: 'Candler Park Dr', name: 'Candler Park Dr · Art Market', range: 'Booths 89–164 · 76 booths' },
  { id: 'mcl', blobs: BLOBS.mcl, clip: 'clip-mcl', booths: BOOTHS.mcl, mk: [666.4, 787.9], label: null, shortName: 'McLendon Ave', name: 'McLendon Ave · Art Market', range: 'Booths 62–88 · 27 booths' },
  // The car-path marker sits 25 units north of where the export put it (509.3).
  // At the booth-level zoom the original position covered booth 29's number and
  // sat 9px inside it; 25 north clears every number in the row with 15px to
  // spare, and the marker is still plainly in the middle of its own run.
  { id: 'spine', blobs: BLOBS.spine, booths: BOOTHS.spine, mk: [774.9, 484.3], label: 'Art Market', shortName: 'In the Park', name: 'In the Park · Art Market', range: 'Booths 1–61 & K1–K8 · 69 booths' },
];

/**
 * How far each run's booth squares are rotated, in degrees, so they sit square
 * to the path they line rather than square to the screen. A booth at the
 * festival faces the aisle; a grid of screen-aligned rectangles along a diagonal
 * path does not look like anything real.
 *
 * Measured, not guessed: each run splits into its two facing columns, and each
 * column's own principal axis is fitted. The two columns agree to within a
 * degree on the car path (35.8 and 36.4) and within seven on the shorter food
 * row (24.2 and 17.5), which is where the 36 and 21 come from. The two street
 * markets line straight streets, so their squares are already square to them.
 */
export const BOOTH_ANGLE = { cpd: 0, mcl: 0, spine: 36, food: 21 };
