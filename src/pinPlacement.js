// Where each pin sits, and whether it shows, at each stop -- computed from the
// placement rules rather than set by hand. One pure function, no React, no
// DOM: MapCanvas runs it for the phone's (or the docked desktop's) three
// stops, PrintSheet runs it once for paper, and scripts read it to report
// what moved. The rules are the design system's `no-overlap` (with its
// priority list), `true-location` and `nudge-cap` (design-system/manifest.json),
// and CLAUDE.md's Decided section ("Pin placement rules") in words:
//
//   1. Every pin has a rank (PIN_RANK in assets/pins.js, 1 is highest).
//   2. A pin's stored x/y is its TRUE LOCATION. At Detail, the closest stop,
//      every pin shows there, and no two overlap (e2e measures it).
//   3. At a coarser stop, when two targets would overlap, the higher rank
//      keeps its true location and the lower one waits for a closer stop. A
//      waiting pin still holds its spot against anything ranked below it, so
//      a lower pin never shows over a higher one that is hidden.
//   4. Two pins of EQUAL rank split the difference: each moves half the
//      overlap along the line between their centres, to edge to edge.
//   5. No pin sits more than NUDGE_CAP from its true location. A tie that
//      needs more makes both pins wait.
//   6. A nudge may not create a new overlap: if moving apart would hit a
//      third target, both pins wait. One split per pin per stop.
//   7. Paper is one more stop, where nothing can wait: a pin that cannot
//      sit at its true location nudges alone within the cap, and if no spot
//      within the cap is clear it is FLAGGED -- drawn at its true location
//      and listed for a person to place. Nothing on paper moves past the cap.
//
// Deterministic: pins are taken in rank order, then in the order they are
// listed, and every search below runs in a fixed order, so the same pins at
// the same scale always give the same map.

/**
 * The nudge cap, in map units: half a pin's tap area (half of --pin-hit, so
 * 22 CSS px) at the Detail stop on a 375px phone, where 44px is 25.5 units.
 * A map-unit constant rather than a pixel one so it means the same distance
 * on the ground at every stop and on paper. The design system's `nudge-cap`
 * rule names it, and npm run manifest checks the value there against this.
 */
export const NUDGE_CAP = 12.75;

// Edge to edge, with a hair of air so rounding never reads as a crossing.
const AIR = 0.01;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const hits = (a, ra, b, rb) => dist(a, b) < ra + rb - 1e-6;

/**
 * Place one stop's pins.
 *
 * @param items  [{ key, x, y, rank, r }] -- every candidate at this stop, in
 *               the order they are listed (the tiebreak). `r` is the target's
 *               radius in map units.
 * @param opts.fixed  [{ x, y, r }] targets the rules cannot move or hide (the
 *               art-market markers): every pin gives way to them.
 * @param opts.mode  'wait' (a coarser stop on the phone), 'paper' (nothing
 *               waits; nudge within the cap or flag) or 'all' (Detail: every
 *               pin at its true location).
 * @returns Map key -> { x, y, shown, dx, dy, nudge, flagged, reason }
 *          `reason` says why a pin waits or was flagged, for the PR notes.
 */
export function placeStop(items, { fixed = [], mode = 'wait', cap = NUDGE_CAP } = {}) {
  const order = items.map((it, i) => ({ ...it, i })).sort((a, b) => a.rank - b.rank || a.i - b.i);
  const out = new Map();
  const done = (it, x, y, extra = {}) => out.set(it.key, { x, y, shown: true, dx: x - it.x, dy: y - it.y, nudge: Math.hypot(x - it.x, y - it.y), flagged: false, ...extra });

  if (mode === 'all') {
    for (const it of order) done(it, it.x, it.y);
    return out;
  }

  // A tie that failed (over the cap, or into a third target) sends both pins
  // to wait; the stop is then placed again from the top without them, so
  // whatever they were blocking gets its chance. Each round adds at least one
  // pin to `forced`, so this ends.
  const forced = new Map();
  for (;;) {
    out.clear();
    const placed = [];   // { it, x, y, nudged }
    const waiting = [];  // { it } -- held at their true location against lower ranks
    let retry = false;

    // Is this spot clear for a pin of this rank? `skip` are the pins moving
    // together in a split, which do not block each other.
    const clear = (p, r, rank, skip = []) =>
      !fixed.some((f) => hits(p, r, f, f.r)) &&
      !placed.some((q) => !skip.includes(q) && hits(p, r, q, q.it.r)) &&
      !waiting.some((w) => w.it.rank < rank && hits(p, r, w.it, w.it.r));

    for (const it of order) {
      if (forced.has(it.key)) { waiting.push({ it }); out.set(it.key, { x: it.x, y: it.y, shown: false, reason: forced.get(it.key) }); continue; }
      const wait = (reason) => { waiting.push({ it }); out.set(it.key, { x: it.x, y: it.y, shown: false, reason }); };

      const fixedHit = fixed.find((f) => hits(it, it.r, f, f.r));
      const higher = placed.find((q) => q.it.rank < it.rank && hits(it, it.r, q, q.it.r))
        || waiting.find((w) => w.it.rank < it.rank && hits(it, it.r, w.it, w.it.r));
      const peers = placed.filter((q) => q.it.rank === it.rank && hits(it, it.r, q, q.it.r));
      const why = fixedHit ? 'an art-market marker' : higher ? (higher.it.key) : null;

      if (!fixedHit && !higher && !peers.length) { placed.push({ it, x: it.x, y: it.y }); done(it, it.x, it.y); continue; }

      // Rule 4: one tied peer, not already moved -> split the difference.
      if (!fixedHit && !higher && peers.length === 1 && !peers[0].nudged) {
        const q = peers[0];
        const split = splitPair(q, it, cap);
        if (split && clear(split.b, it.r, it.rank, [q]) && clear(split.a, q.it.r, it.rank, [q])) {
          q.x = split.a.x; q.y = split.a.y; q.nudged = true;
          done(q.it, q.x, q.y);
          placed.push({ it, x: split.b.x, y: split.b.y, nudged: true });
          done(it, split.b.x, split.b.y);
          continue;
        }
        if (mode === 'wait') {
          const reason = split ? `tie with ${q.it.key}: moving apart would hit a third target` : `tie with ${q.it.key}: needs more than the cap`;
          forced.set(it.key, reason);
          forced.set(q.it.key, reason.replace(q.it.key, it.key));
          retry = true;
          break;
        }
      }

      if (mode === 'wait') { wait(why ? `gives way to ${why}` : `tied with ${peers.map((q) => q.it.key).join(', ')}`); continue; }

      // Paper: nothing waits. Nudge this pin alone, within the cap.
      const spot = nearestClear(it, cap, (p) => clear(p, it.r, Infinity));
      if (spot) { placed.push({ it, x: spot.x, y: spot.y, nudged: true }); done(it, spot.x, spot.y); continue; }
      placed.push({ it, x: it.x, y: it.y });
      done(it, it.x, it.y, { flagged: true, reason: `no clear spot within ${cap} units (overlaps ${why || peers.map((q) => q.it.key).join(', ')})` });
    }
    if (!retry) return out;
  }
}

/** Two overlapping pins of equal rank, each moved half the overlap apart
 *  along the line between them. null when that is more than the cap. */
function splitPair(q, it, cap) {
  const d = dist(q, it);
  const need = q.it.r + it.r + AIR;
  const half = (need - d) / 2;
  if (half > cap) return null;
  // Coincident pins have no line between them: part them east-west.
  const ux = d > 1e-9 ? (it.x - q.x) / d : 1, uy = d > 1e-9 ? (it.y - q.y) / d : 0;
  return {
    a: { x: q.x - ux * half, y: q.y - uy * half },
    b: { x: it.x + ux * half, y: it.y + uy * half },
  };
}

/** The clear spot closest to a pin's true location, no further than the cap.
 *  Rings outward in quarter-unit steps, 72 bearings each, starting due north
 *  and turning clockwise: the first clear spot found is the answer. */
function nearestClear(it, cap, ok) {
  for (let s = 0.25; s <= cap + 1e-9; s += 0.25) {
    for (let k = 0; k < 72; k++) {
      const a = (k * 5 * Math.PI) / 180;
      const p = { x: it.x + Math.sin(a) * s, y: it.y - Math.cos(a) * s };
      if (ok(p)) return p;
    }
  }
  return null;
}

/** A pin's name in a report: its category and true location. */
export const pinKey = (p) => `${p.c} (${p.x}, ${p.y})`;

/**
 * The phone's (or the docked desktop's) three stops. `pins` are the visitor
 * pins (no paper-only, no hidden ones), `tapR` the tap target's radius in map
 * units at each stop for this screen, `markers` the art-market markers'
 * centres, which are targets at the overview and the first step and gone at
 * Detail. Returns one Map per stop, keyed by pinKey.
 *
 *   overview   candidates are the pins flagged `overview` (true, or 'docked'
 *              where the panel is docked); the rules decide among them
 *   first step every pin is a candidate
 *   Detail     every pin at its true location -- except the Food Court pin,
 *              which gives way to its own stalls there
 */
export function layoutMap({ pins, rankOf, tapR, markers = [], docked = false }) {
  const items = (list, r) => list.map((p) => ({ key: pinKey(p), x: p.x, y: p.y, rank: rankOf(p), r }));
  const fixed = (r) => markers.map(([x, y]) => ({ x, y, r }));
  const onOverview = (p) => p.overview === true || (p.overview === 'docked' && docked);
  return [
    placeStop(items(pins.filter(onOverview), tapR[0]), { fixed: fixed(tapR[0]) }),
    placeStop(items(pins, tapR[1]), { fixed: fixed(tapR[1]) }),
    placeStop(items(pins.filter((p) => p.d !== 'food'), tapR[2]), { mode: 'all' }),
  ];
}

/** Paper: every pin PrintSheet draws as a disc or a cart square, `r` its
 *  symbol's radius. One Map, keyed by pinKey; a `flagged` entry is a pin no
 *  spot within the cap could clear -- drawn at its true location, listed in
 *  docs/pr-notes.md for a person to place. */
export function layoutPaper({ pins, rankOf, r }) {
  return placeStop(pins.map((p) => ({ key: pinKey(p), x: p.x, y: p.y, rank: rankOf(p), r: r(p) })), { mode: 'paper' });
}
