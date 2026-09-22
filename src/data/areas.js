// The three art-market runs, as one shared list.
//
// This used to live inside MapCanvas as a private const. The docked
// panel lists the same three areas and has to centre the map on them, so the
// list moved here rather than being typed out a second time.
//
// `mk` is where the area's marker sits, in map units -- it doubles as the point
// the panel centres on. `shortName` is how the panel lists the run; `label` is
// the only text the map itself still draws for it. `blobs`/`clip` are drawing concerns the panel ignores.
// `range` is read off the booths themselves (data/booths.js, generated from
// the chair's sheet), so it cannot say 82-142 after the sheet says 82-139.
// The K stack counts toward the in-park run but sits in its own stack by
// Kidlandia, drawn by MapCanvas outside these areas.
import { BLOBS } from '../assets/basemapBlobs';
import { BOOTHS } from './booths';

/** "82–139" for a run: its booths are in number order, so first and last. */
export const span = (booths) => `${booths[0].n}–${booths[booths.length - 1].n}`;

export const AREAS = [
  { id: 'cpd', blobs: BLOBS.cpd, clip: 'clip-cpd', booths: BOOTHS.cpd, mk: [411.5, 541.5], label: null, shortName: 'Candler Park Dr', name: 'Candler Park Dr · Art Market',
    range: `Booths ${span(BOOTHS.cpd)} · ${BOOTHS.cpd.length} booths` },
  // The McLendon marker sits in the run's east box (the export put it at
  // 666.4, just past the park entrance). At the phone overview the bike valet
  // pin is on screen too, and the two 44px targets have to clear on the
  // smallest phone we test: at 775 they clear by 4 units with the bike valet
  // at 712.4 (it moved east to make room for the merch tent on the corner).
  { id: 'mcl', blobs: BLOBS.mcl, clip: 'clip-mcl', booths: BOOTHS.mcl, mk: [775.0, 787.9], label: null, shortName: 'McLendon Ave', name: 'McLendon Ave · Art Market',
    range: `Booths ${span(BOOTHS.mcl)} · ${BOOTHS.mcl.length} booths` },
  // The car-path marker sits up the path from where the export put it
  // (774.9, 509.3): first 25 units north so it cleared booth 29's number at
  // the booth zoom (moot now that markers fade out at Detail), then on 9/22
  // a further 55 along the path so its overview target clears the beer
  // stand's, which moved to Jess's spot at (728, 472) -- 83 units, where 81
  // is touching on a 375px phone. Still between the two rows, in the run's
  // north half.
  { id: 'spine', blobs: BLOBS.spine, booths: BOOTHS.spine, mk: [801.0, 433.0], label: 'Art Market', shortName: 'In the Park', name: 'In the Park · Art Market',
    range: `Booths ${span(BOOTHS.spine)} & ${span(BOOTHS.kid)} · ${BOOTHS.spine.length + BOOTHS.kid.length} booths` },
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
export const BOOTH_ANGLE = { cpd: 0, mcl: 0, spine: 36, kid: 0, food: 21 };
