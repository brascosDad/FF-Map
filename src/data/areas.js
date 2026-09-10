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
  { id: 'spine', blobs: BLOBS.spine, booths: BOOTHS.spine, mk: [774.9, 509.3], label: 'Art Market', shortName: 'In the Park', name: 'In the Park · Art Market', range: 'Booths 1–61 & K1–K8 · 69 booths' },
];
