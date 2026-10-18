// `npm run pin-layout`: what the pin placement rules (src/pinPlacement.js) do
// with today's pins -- which level each pin shows at, every nudge, and every
// paper flag -- on a 320px phone, the 375px reference phone, the docked
// desktop (1440x900) and paper.
// The answer to "why isn't that pin showing yet?" without opening a browser.
// `--json` prints the same as data.
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const load = (p) => vite.ssrLoadModule(p);
const { ACTIVE_PINS, PINS, rankOf } = await load('/src/assets/pins.js');
const { AREAS } = await load('/src/data/areas.js');
const { MOBILE_OVERVIEW_ZOOM, stopUnitsPerPx } = await load('/src/hooks/useMapView.js');
const { NUDGE_CAP, layoutMap, layoutPaper, pinKey } = await load('/src/pinPlacement.js');
await vite.close();

// --pin-hit (44px), read from the token file rather than restated.
import { readFileSync } from 'node:fs';
const TOKENS = readFileSync('src/styles/tokens.css', 'utf8');
const hit = Number(TOKENS.match(/--pin-hit:\s*([\d.]+)px/)[1]);
const gapPx = Number(TOKENS.match(/--pin-gap:\s*([\d.]+)px/)[1]);
// --panel-width + two --space-5 gaps (App.jsx's insetRight when docked).
const DOCKED_INSET = 360 + 20 * 2;
// The paper's footprints, as PrintSheet draws them (PIN_R, TICK).
const PAPER_R = (p) => (p.shape === 'square' ? 4 * Math.SQRT2 : 10);
const PAPER_MARKS = ['barricade', 'speedbump'];

const STOPS = ['level 1', 'level 2', 'level 3'];
const visitor = ACTIVE_PINS.filter((p) => !p.print);
const name = (p) => `${p.d || p.c}${p.n ? ` ${p.n}` : ''} (${p.x}, ${p.y}) #${PINS.indexOf(p)}`;

const profiles = [['320px phone', 320, 672, 0, MOBILE_OVERVIEW_ZOOM, false], ['375px phone', 375, 667, 0, MOBILE_OVERVIEW_ZOOM, false],
  ['docked desktop', 1440, 900, DOCKED_INSET, 1, true]];
const report = { cap: NUDGE_CAP, profiles: [], paper: null };
for (const [label, px, py, inset, zoom, docked] of profiles) {
  // The same per-stop scale the map uses, the level 3 floor included.
  const upp = stopUnitsPerPx(px, py, inset, zoom);
  const tapR = upp.map((u) => (hit / 2) * u);
  const gap = upp.map((u, s) => (s ? gapPx * u : 0));
  const L = layoutMap({ pins: visitor, rankOf, tapR, gap, markers: AREAS.map((a) => a.mk), docked });
  const pins = visitor.map((p) => {
    const at = L.map((m) => m.get(pinKey(p)));
    return { pin: name(p), rank: rankOf(p), shown: at.map((e) => !!e?.shown),
             nudges: at.map((e) => (e?.shown ? +e.nudge.toFixed(2) : null)), waits: at.map((e) => (e && !e.shown ? e.reason : null)) };
  });
  const maxNudge = STOPS.map((_, s) => Math.max(0, ...pins.map((p) => p.nudges[s] ?? 0)));
  report.profiles.push({ label, unitsPerPx: upp.map((u) => +u.toFixed(4)), tapR: tapR.map((r) => +r.toFixed(2)), pins, maxNudge });
}
const paperPins = ACTIVE_PINS.filter((p) => !PAPER_MARKS.includes(p.c));
const P = layoutPaper({ pins: paperPins, rankOf, r: PAPER_R });
report.paper = {
  nudged: paperPins.filter((p) => P.get(pinKey(p)).nudge > 1e-6 && !P.get(pinKey(p)).flagged).map((p) => ({ pin: name(p), nudge: +P.get(pinKey(p)).nudge.toFixed(2) })),
  flagged: paperPins.filter((p) => P.get(pinKey(p)).flagged).map((p) => ({ pin: name(p), reason: P.get(pinKey(p)).reason })),
};

if (process.argv.includes('--json')) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }
console.log(`Nudge cap: ${NUDGE_CAP} map units\n`);
for (const pr of report.profiles) {
  console.log(`== ${pr.label} (map units per px: ${pr.unitsPerPx.join(' / ')}; tap radius: ${pr.tapR.join(' / ')} units)`);
  console.log('| Pin | Rank | Shown at | Waits because |\n|---|---|---|---|');
  for (const p of pr.pins) console.log(`| ${p.pin} | ${p.rank} | ${STOPS.filter((_, s) => p.shown[s]).join(', ')} | ${p.waits.map((w, s) => (w ? `${STOPS[s]}: ${w}` : '')).filter(Boolean).join('; ')} |`);
  console.log(`Largest nudge per stop: ${pr.maxNudge.map((n, s) => `${STOPS[s]} ${n}`).join(', ')}\n`);
}
console.log(`== paper: ${report.paper.nudged.length} nudged, ${report.paper.flagged.length} flagged`);
for (const n of report.paper.nudged) console.log(`  nudged ${n.pin} by ${n.nudge}`);
for (const f of report.paper.flagged) console.log(`  FLAGGED ${f.pin}: ${f.reason}`);
