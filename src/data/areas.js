// The three art-market runs, as one shared list.
//
// This used to live inside MapCanvas as a private const. The docked
// panel lists the same three areas and has to centre the map on them, so the
// list moved here rather than being typed out a second time.
//
// `mk` is where the area's marker sits, in map units -- it doubles as the point
// the panel centres on.
//
// Two names per run, and each has one job:
//   `name`       the sheet's title when the run's list is open
//                ("In the Park · Art Market")
//   `shortName`  how the directory lists the run AND what the back row says
//                above a booth opened from its list ("‹ In the Park"): the
//                previous screen, short, the way an iOS back button names it.
//                Never derive it from `name` in a component; give the record
//                one here.
// `label` is the area's name on the map at the Detail stop, drawn at
// `labelAt` -- where the marker has faded out and the booths are the targets,
// the label is the tap that opens this card (rule area-label-tap). Each
// labelAt is the nearest spot to the marker where a 44px target clears every
// booth and pin at Detail on a 375px phone: on the lawn east of the Candler
// Park Dr columns, between the McLendon rows, and on the lawn below the
// car-path run. `blobs`/`clip`
// are drawing concerns the panel ignores.
// `range` is read off the booths themselves (data/booths.js, generated from
// the chair's sheet), so it cannot say 82-142 after the sheet says 82-139.
// The K stack counts toward the in-park run but sits in its own stack by
// Kidlandia, drawn by MapCanvas outside these areas.
import { BLOBS } from '../assets/basemapBlobs';
import { BOOTHS, UNNUMBERED } from './booths';

/** "82–139" for a run: its booths are in number order, so first and last. */
export const span = (booths) => `${booths[0].n}–${booths[booths.length - 1].n}`;

export const AREAS = [
  { id: 'cpd', blobs: BLOBS.cpd, clip: 'clip-cpd', booths: BOOTHS.cpd, mk: [411.5, 541.5], label: 'Art Market', labelAt: [447.5, 541.5], shortName: 'Candler Park Dr', name: 'Candler Park Dr · Art Market',
    range: `Booths ${span(BOOTHS.cpd)} · ${BOOTHS.cpd.length} booths` },
  // The McLendon marker sits on the run's own line (y 787.9), in its WEST
  // half, over booths 76-78 (Ernest, 10/18). It was at 775 in the east box
  // (the export put it at 666.4, just past the park entrance), where at
  // level 1 on a phone under 375px wide its target crossed the bike valet's
  // and the valet waited. West of 538 it clears the valet, merch and the
  // entrance water at level 1 and level 2 on every screen down to 300px;
  // 492 is the middle of the clear stretch. A marker is not a pin, so no
  // true location moved. It leaves at level 3 like the others.
  { id: 'mcl', blobs: BLOBS.mcl, clip: 'clip-mcl', booths: BOOTHS.mcl, mk: [492.0, 787.9], label: 'Art Market', labelAt: [772.9, 780.2], shortName: 'McLendon Ave', name: 'McLendon Ave · Art Market',
    range: `Booths ${span(BOOTHS.mcl)} · ${BOOTHS.mcl.length} booths` },
  // The car-path marker sits up the path from where the export put it
  // (774.9, 509.3): first 25 units north so it cleared booth 29's number at
  // the booth zoom (moot now that markers fade out at Detail), then on 9/22
  // a further 55 along the path so its overview target clears the beer
  // stand's, which moved to Jess's spot at (728, 472) -- 83 units, where 81
  // is touching on a 375px phone. On 10/18 a further 21 units up the path's
  // own axis (direction 0.584, -0.812), so the beer stand also shows at
  // level 1 on phones under 375px wide (Ernest's iPhone with its text
  // zoomed is 314), where 44px is more map units. Still between the two
  // rows, in the run's north half.
  { id: 'spine', blobs: BLOBS.spine, booths: BOOTHS.spine, mk: [813.3, 415.9], label: 'Art Market', labelAt: [785.4, 466.5], shortName: 'In the Park', name: 'In the Park · Art Market',
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

/**
 * Is this booth one of the area's own list rows? The area's numbered booths, the
 * Kidlandia stack (it counts toward the in-park run) and the unnumbered spots
 * grouped under it. A booth tapped on the map keeps the area's list under it
 * (a back row to it) only when it is in the open area (round 2, item 4.5).
 */
export function boothInArea(booth, area) {
  if (!booth || !area) return false;
  if (area.booths.some((b) => b.id === booth.id)) return true;
  if (area.id === 'spine' && BOOTHS.kid.some((b) => b.id === booth.id)) return true;
  return UNNUMBERED.some((u) => u.id === booth.id && u.group === area.id);
}
