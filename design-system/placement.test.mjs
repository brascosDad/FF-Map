// The pin placement rules (src/pinPlacement.js) on made-up pins, one case per
// rule. Today's real pins never tie and never nudge, so these are what keeps
// the split, the cap and the paper flag honest. `npm run test:ds` runs them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NUDGE_CAP, STAYS_RANK, layoutMap, placeStop } from '../src/pinPlacement.js';

const pin = (key, x, y, rank, r = 10) => ({ key, x, y, rank, r });
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('rule 3: the higher rank keeps its true location, the lower waits', () => {
  const m = placeStop([pin('low', 15, 0, 4), pin('high', 0, 0, 2)]);
  assert.deepEqual([m.get('high').shown, m.get('high').nudge], [true, 0]);
  assert.equal(m.get('low').shown, false);
});

test('rule 3: a waiting pin still holds its spot against lower ranks', () => {
  // b waits for a; c is clear of a but sits on b's true location, and ranks below it.
  const m = placeStop([pin('a', 0, 0, 1), pin('b', 15, 0, 2), pin('c', 30, 0, 3)]);
  assert.equal(m.get('b').shown, false);
  assert.equal(m.get('c').shown, false);
});

test('rule 4: two of a rank split the difference, edge to edge', () => {
  const m = placeStop([pin('a', 0, 0, 3), pin('b', 16, 0, 3)]);
  const a = m.get('a'), b = m.get('b');
  assert.ok(a.shown && b.shown);
  assert.ok(Math.abs(a.nudge - 2) < 0.01 && Math.abs(b.nudge - 2) < 0.01, `${a.nudge} ${b.nudge}`);
  assert.ok(d(a, b) >= 20 && d(a, b) < 20.05);
  assert.equal(a.y, 0); assert.equal(b.y, 0);   // along the line between them
});

test('rule 5: a tie that needs more than the cap sends both to wait', () => {
  // Targets 60 across, 59 apart from edge to edge: each would move 29.5.
  const m = placeStop([pin('a', 0, 0, 3, 30), pin('b', 1, 0, 3, 30)]);
  assert.equal(m.get('a').shown, false);
  assert.equal(m.get('b').shown, false);
});

test('rule 6: a split that would hit a third target sends both to wait', () => {
  // c (higher rank) is clear of a and b where they stand, but the split
  // would carry b to 18, two units onto c.
  const m = placeStop([pin('c', 38, 0, 1), pin('a', 0, 0, 3), pin('b', 16, 0, 3)]);
  assert.equal(m.get('c').shown, true);
  assert.equal(m.get('a').shown, false);
  assert.equal(m.get('b').shown, false);
  // With c further off the same split goes through.
  const n = placeStop([pin('c', 45, 0, 1), pin('a', 0, 0, 3), pin('b', 16, 0, 3)]);
  assert.ok(n.get('a').shown && n.get('b').shown && n.get('b').nudge > 0);
});

test('rule 6 restart: a pair sent to wait still holds lower ranks back; the rest place', () => {
  // a/b fail their split (over the cap); a lower pin d near them stays held
  // (they still block lower ranks), an equal-rank pin e far off shows.
  const m = placeStop([pin('a', 0, 0, 3, 30), pin('b', 1, 0, 3, 30), pin('d', 0, 18, 4), pin('e', 100, 0, 3)]);
  assert.deepEqual(['a', 'b', 'd', 'e'].map((k) => m.get(k).shown), [false, false, false, true]);
});

test('fixed targets (the art-market markers) are never moved; pins give way', () => {
  const m = placeStop([pin('a', 5, 0, 1)], { fixed: [{ x: 0, y: 0, r: 10 }] });
  assert.equal(m.get('a').shown, false);
});

test('Detail ("all"): every pin at its true location', () => {
  const m = placeStop([pin('a', 0, 0, 3), pin('b', 1, 0, 5)], { mode: 'all' });
  assert.ok([...m.values()].every((v) => v.shown && v.nudge === 0));
});

test('rule 7, paper: the lower rank nudges within the cap instead of waiting', () => {
  const m = placeStop([pin('high', 0, 0, 1), pin('low', 15, 0, 4)], { mode: 'paper' });
  const low = m.get('low');
  assert.ok(low.shown && !low.flagged);
  assert.ok(low.nudge > 0 && low.nudge <= NUDGE_CAP, `${low.nudge}`);
  assert.ok(d(low, m.get('high')) >= 20 - 1e-6);
});

test('rule 7, paper: past the cap a pin is flagged at its true location, not moved', () => {
  const m = placeStop([pin('high', 0, 0, 1), pin('low', 1, 0, 4)], { mode: 'paper' });
  const low = m.get('low');
  assert.equal(low.flagged, true);
  assert.deepEqual([low.x, low.y], [1, 0]);
});

test('deterministic: the same pins in any input order give the same map', () => {
  const pins = [pin('a', 0, 0, 3), pin('b', 16, 0, 3), pin('c', 30, 5, 4), pin('e', 8, 14, 2)];
  const a = placeStop(pins), b = placeStop([...pins]);
  assert.deepEqual([...a.entries()].sort(), [...b.entries()].sort());
  // Listed order is the tiebreak within a rank, and only within a rank.
  const r1 = placeStop([pin('x', 0, 0, 3), pin('y', 15, 0, 3), pin('z', 30, 0, 3)]);
  const r2 = placeStop([pin('x', 0, 0, 3), pin('y', 15, 0, 3), pin('z', 30, 0, 3)]);
  assert.deepEqual([...r1.entries()], [...r2.entries()]);
});

test('the cap is half of --pin-hit at Detail on a 375px phone', () => {
  // 44px at Detail on a 375px phone is 25.5 map units (CLAUDE.md), so half
  // the target is 12.75.
  assert.equal(NUDGE_CAP, 12.75);
});

test('stays-shown: a pin on the opening view stays at every closer stop and outranks what it meets there', () => {
  // A rank-4 landmark on the overview, and a rank-3 station 26 units off that
  // is not an overview candidate: at the first step (targets 46 across) the
  // two collide, and the landmark keeps its spot; the station waits.
  const pins = [
    { c: 'merch', d: 'merch', x: 0, y: 0, overview: true },
    { c: 'water', d: 'water', x: 26, y: 0 },
  ];
  const rankOf = (p) => ({ merch: 4, water: 3 })[p.c];
  const [o, f, d] = layoutMap({ pins, rankOf, tapR: [40, 23, 12.75] });
  const key = (p) => `${p.c} (${p.x}, ${p.y})`;
  assert.equal(o.get(key(pins[0])).shown, true);
  assert.equal(f.get(key(pins[0])).shown, true);
  assert.equal(f.get(key(pins[1])).shown, false);
  assert.ok(d.get(key(pins[0])).shown && d.get(key(pins[1])).shown);
  // Without the overview flag, plain rank decides: the station wins.
  const [, g] = layoutMap({ pins: [{ ...pins[0], overview: false }, pins[1]], rankOf, tapR: [40, 23, 12.75] });
  assert.equal(g.get(key(pins[1])).shown, true);
  assert.equal(g.get(key(pins[0])).shown, false);
  assert.ok(STAYS_RANK < 1);
});

test('--pin-gap: at levels 2 and 3 two targets need the gap between them, at level 1 they may touch', async () => {
  // Two rank-3 pins 21 units apart with 10-unit targets: touching-plus-one
  // passes with no gap, and collides once a 2-unit gap is asked for.
  const pins = [{ c: 'a', d: 'a', x: 0, y: 0, overview: true }, { c: 'b', d: 'b', x: 21, y: 0, overview: true }];
  const rankOf = (p) => ({ a: 3, b: 4 })[p.c];
  const key = (p) => `${p.c} (${p.x}, ${p.y})`;
  const [noGap] = layoutMap({ pins, rankOf, tapR: [10, 10, 10], gap: [0, 0, 0] });
  assert.equal(noGap.get(key(pins[1])).shown, true);
  const [, withGap] = layoutMap({ pins: pins.map((p) => ({ ...p, overview: false })), rankOf, tapR: [10, 10, 10], gap: [0, 2, 2] });
  assert.equal(withGap.get(key(pins[1])).shown, false);
});

test('level 3 scale floor: no screen shows more map units per px at level 3 than the 375px reference', async () => {
  const { LEVEL3_MAX_UNITS_PER_PX, LEVEL_RATIOS, REFERENCE_PHONE_PX, MOBILE_OVERVIEW_ZOOM, fitOverview, stopUnitsPerPx } = await import('../src/hooks/useMapView.js');
  // The constant is the reference phone's own level 3, to a hair above.
  const ref = (fitOverview(REFERENCE_PHONE_PX, 667, 0, MOBILE_OVERVIEW_ZOOM) * LEVEL_RATIOS[2]) / REFERENCE_PHONE_PX;
  assert.ok(LEVEL3_MAX_UNITS_PER_PX >= ref && LEVEL3_MAX_UNITS_PER_PX - ref < 1e-4, `${LEVEL3_MAX_UNITS_PER_PX} vs ${ref}`);
  for (const w of [280, 314, 320, 360, 375, 390, 430]) {
    const u = stopUnitsPerPx(w, Math.round(w * 2.1), 0, MOBILE_OVERVIEW_ZOOM);
    assert.ok(u[2] <= LEVEL3_MAX_UNITS_PER_PX + 1e-9, `${w}px: ${u[2]}`);
    // Levels 1 and 2 keep their ratio.
    assert.ok(Math.abs(u[1] / u[0] - LEVEL_RATIOS[1]) < 1e-9);
  }
  // A screen wide enough is not touched: level 3 keeps 0.315.
  const d = stopUnitsPerPx(1440, 900, 400, 1);
  assert.ok(Math.abs(d[2] / d[0] - LEVEL_RATIOS[2]) < 1e-9);
});
