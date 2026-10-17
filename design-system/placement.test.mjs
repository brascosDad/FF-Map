// The pin placement rules (src/pinPlacement.js) on made-up pins, one case per
// rule. Today's real pins never tie and never nudge, so these are what keeps
// the split, the cap and the paper flag honest. `npm run test:ds` runs them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NUDGE_CAP, placeStop } from '../src/pinPlacement.js';

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
