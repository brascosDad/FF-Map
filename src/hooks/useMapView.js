import { useCallback, useEffect, useRef, useState } from 'react';

// Discrete, stepped zoom. This is the direction the design decision landed
// on: the overview you land on is the fixed, most-zoomed-out floor, and
// zooming in snaps between a fixed number of levels. The one continuous
// motion is a pinch in progress -- the map follows the fingers, then settles
// on the nearest stop when they lift. Edit LEVEL_RATIOS to try 3 vs. 4 vs. 5
// stops; everything else adapts.
//
// All figures below are in the canonical export's 1440x900 map space (see
// assets/basemapTrace.js). They are the old 340x460 stops scaled by ~1.94 and
// then reframed: the overview deliberately does NOT show the whole 1440-wide
// canvas, because several hundred units either side are empty park and street.
// It frames the festival footprint (roughly x 385-1055, y 110-830) instead.
//
// Three stops, not four, and each one means something specific on the map:
//   0 Overview - area blobs, no individual booths, whole festival in frame
//   1 Booths   - blobs give way to the individual squares
//   2 Detail   - area names appear alongside them
//
// The stops are RATIOS, not fixed widths, because the right overview width
// depends on the shape of the container. A phone is tall and narrow, a desktop
// map pane is wide and short; with preserveAspectRatio="slice" a single fixed
// viewBox would crop one of them badly. Level 0 is computed to fit the whole
// festival box in whatever shape it is given, and 1 and 2 step in from there.
export const LEVEL_RATIOS = [1, 0.565, 0.315];
// (The level names live in the comment above rather than an exported array --
// nothing renders them now that the zoom readout is gone.)

// The festival footprint in map space, plus breathing room so the McLendon x
// Candler Park Dr corner never sits flush against the edge.
const FESTIVAL = { x: 385, y: 110, w: 670, h: 720 };
const MARGIN = 45;
const CX = FESTIVAL.x + FESTIVAL.w / 2;
const CY = FESTIVAL.y + FESTIVAL.h / 2;

// You can pan around the festival, and nowhere else. This is not a general
// street map: Callan Circle and the neighbourhood exist to give the desktop
// view context, not to be explored. REGION is the only ground the viewport is
// ever allowed over -- the festival footprint plus a little slack.
//
// Deliberately ONE region rather than a table of per-zoom limits. The reachable
// pan range already scales with the zoom on its own: the constraint is that the
// viewport stays inside REGION, so a wide overview viewport has almost no room
// to move while a close one can roam the whole festival. A per-level table would
// restate the same thing and drift out of sync with LEVEL_RATIOS.
const PAN_SLACK = 30;
const REGION = {
  x0: FESTIVAL.x - PAN_SLACK,
  y0: FESTIVAL.y - PAN_SLACK,
  x1: FESTIVAL.x + FESTIVAL.w + PAN_SLACK,
  y1: FESTIVAL.y + FESTIVAL.h + PAN_SLACK,
};

/** Overview viewBox that fits the festival box into a container of this pixel
 *  size. Wide containers are limited by height, tall ones by width -- take
 *  whichever constraint binds.
 *
 *  `insetRight` is how many pixels on the right are covered by the floating
 *  panel. The map still paints full-bleed underneath it (that is the Google
 *  Maps look), but the festival is fitted and centred into the part you can
 *  actually see, so nothing important ends up hidden behind the panel. */
function fitOverview(px, py, insetRight = 0, zoom = 1) {
  const usable = Math.max(px - insetRight, 120);
  const w = Math.max(
    ((FESTIVAL.w + MARGIN * 2) * px) / usable,
    ((FESTIVAL.h + MARGIN * 2) * px) / py
  );
  // zoom > 1 draws the map bigger by showing less of it.
  return w / zoom;
}

function homeFor(px, py, insetRight = 0, zoom = 1) {
  const w = fitOverview(px, py, insetRight, zoom);
  const h = (w * py) / px;
  // Placement is entirely clampPan's job now -- it centres on the usable
  // viewport, which is what keeps the festival clear of the panel.
  return clampPan({ x: CX - w / 2, y: CY - h / 2, w, h }, px, insetRight);
}

const STEP_COOLDOWN = 420;
// How long a directory fly-to takes, and how long a released pinch takes to
// settle onto its stop. The settle is short: the fingers did the travelling.
const FLY_MS = 320;
const SNAP_MS = 180;
// A pinch may run this far past the outermost and innermost stops before it
// stops following the fingers -- a little give, so the ends feel like ends
// rather than walls, and the snap brings it back.
const PINCH_OVERSHOOT = 1.15;

/**
 * Hold the viewport over REGION.
 *
 * The comparison is against the USABLE viewport -- the part not hidden behind
 * the floating panel -- so the festival is never pushed under it. When the
 * usable viewport is larger than REGION the region is centred in it (there is
 * nothing to pan to); when smaller, it is clamped so it cannot leave.
 *
 * Because the viewBox aspect is kept equal to the container aspect, the viewBox
 * and the visible area are the same rectangle, so this can clamp vb directly.
 */
function clampPan(vb, px = 1, insetRight = 0) {
  const insetMap = px > 0 ? (insetRight * vb.w) / px : 0;
  const usableW = Math.max(vb.w - insetMap, 1);
  const regionW = REGION.x1 - REGION.x0;
  const regionH = REGION.y1 - REGION.y0;

  vb.x = usableW >= regionW
    ? REGION.x0 - (usableW - regionW) / 2
    : Math.min(Math.max(vb.x, REGION.x0), REGION.x1 - usableW);

  vb.y = vb.h >= regionH
    ? REGION.y0 - (vb.h - regionH) / 2
    : Math.min(Math.max(vb.y, REGION.y0), REGION.y1 - vb.h);

  return vb;
}

/**
 * Drives the map's SVG viewBox through a fixed set of discrete zoom levels
 * (pan + step-zoom), instead of free continuous scaling. Wire mapRef and
 * wrapRef to the <svg> and its wrapping <div> respectively.
 */
// The three art-market markers are gone at the Detail stop: there the area
// names are drawn and every booth is its own target, and a marker the size of
// a pin sat on booths 96-98, 113-115 and 60-62 so those could not be reached
// (Ernest, iPhone 9/20). They fade out over the second half of the way in
// from Booths to Detail and back in on the way out, driven by the view's
// position between the stops (levelPosition) rather than by which stop it
// snapped to -- so under a pinch the fade follows the fingers, a released
// pinch settles the fade with the map, and a pinch that hovers around the
// snap threshold cannot blink a marker on and off. 1.5 is the log-space
// midpoint between the two stops: the same point the snap decides at, so a
// pinch that settles back to Booths has not started the fade.
const MARKER_FADE_FROM = 1.5;

/** The view's position between the stops for a width ratio r = vb.w / base:
 *  0 at the overview, 1, 2 at the stops, log-interpolated between (a zoom is
 *  a ratio), clamped to the stops' range. */
function levelPosition(r) {
  const L = LEVEL_RATIOS.map(Math.log), x = Math.log(r);
  if (!(x < L[0])) return 0;
  for (let i = 0; i < L.length - 1; i++) if (x >= L[i + 1]) return i + (L[i] - x) / (L[i] - L[i + 1]);
  return L.length - 1;
}

export function useMapView({ insetRight = 0, overviewZoom = 1 } = {}) {
  // Container size in px. Seeded phone-shaped so the very first paint is right;
  // the ResizeObserver below corrects it immediately.
  const sizeRef = useRef({ px: 390, py: 800 });
  const insetRef = useRef(insetRight);
  useEffect(() => { insetRef.current = insetRight; }, [insetRight]);
  const zoomRef = useRef(overviewZoom);
  useEffect(() => { zoomRef.current = overviewZoom; }, [overviewZoom]);

  const [vb, setVb] = useState(() => homeFor(390, 800, insetRight, overviewZoom));
  const [levelIdx, setLevelIdx] = useState(0);
  const mapRef = useRef(null);
  const wrapRef = useRef(null);
  const suppressClickRef = useRef(false);
  const vbRef = useRef(vb);
  const levelRef = useRef(levelIdx);
  useEffect(() => { vbRef.current = vb; }, [vb]);
  useEffect(() => { levelRef.current = levelIdx; }, [levelIdx]);

  const toSvg = useCallback((cx, cy) => {
    const m = mapRef.current;
    if (!m) return { x: vbRef.current.x + vbRef.current.w / 2, y: vbRef.current.y + vbRef.current.h / 2 };
    const r = m.getBoundingClientRect();
    const scale = Math.max(r.width / vbRef.current.w, r.height / vbRef.current.h);
    const dw = r.width - vbRef.current.w * scale, dh = r.height - vbRef.current.h * scale;
    return { x: vbRef.current.x + (cx - r.left - dw / 2) / scale, y: vbRef.current.y + (cy - r.top - dh / 2) / scale };
  }, []);

  const setLevel = useCallback((idx, cx, cy) => {
    idx = Math.min(Math.max(idx, 0), LEVEL_RATIOS.length - 1);
    setVb((prev) => {
      const { px, py } = sizeRef.current;
      const nw = fitOverview(px, py, insetRef.current, zoomRef.current) * LEVEL_RATIOS[idx];
      const af = nw / prev.w;
      const p = (cx != null && cy != null) ? toSvg(cx, cy) : { x: prev.x + prev.w / 2, y: prev.y + prev.h / 2 };
      const next = { x: p.x - (p.x - prev.x) * af, y: p.y - (p.y - prev.y) * af, w: nw, h: (nw * py) / px };
      return clampPan(next, px, insetRef.current);
    });
    setLevelIdx(idx);
  }, [toSvg]);

  const stepLevel = useCallback((dir, cx, cy) => setLevel(levelRef.current + dir, cx, cy), [setLevel]);

  /** Bring a map point to the middle of the USABLE viewport (panel excluded),
   *  keeping the current zoom. Used when stepping through booths: the sheet is
   *  the control, the map is the readout. */
  /** Unconditional recentre. ensureVisible and focusOn are what callers want;
   *  this stays exported as the primitive underneath them. */
  const centerOn = useCallback((x, y) => {
    const { px } = sizeRef.current;
    setVb((prev) => {
      const insetMap = px > 0 ? (insetRef.current * prev.w) / px : 0;
      return clampPan({ ...prev, x: x - (prev.w - insetMap) / 2, y: y - prev.h / 2 }, px, insetRef.current);
    });
  }, []);
  /**
   * Centre on a point ONLY if it is not already comfortably on screen.
   *
   * Stepping through a booth row used to recentre on every press, so the map
   * lurched under you while you read a row you could already see. Now it holds
   * still until the next booth would actually be out of sight -- then it moves
   * once, and the row carries on scrolling past.
   *
   * Margins are in CSS pixels. They describe the band the point has to land in
   * -- caller's choice what counts as cover. App.jsx counts the fixed top bar,
   * which you cannot move, and nothing else: a booth under the open sheet is
   * still on screen, and moving the map for it is the lurch this exists to
   * prevent.
   *
   * Returns true if it moved.
   */
  const ensureVisible = useCallback((x, y, { top = 24, right = 24, bottom = 24, left = 24 } = {}) => {
    const { px, py } = sizeRef.current;
    const vb = vbRef.current;
    if (!px || !py) return false;
    const u = vb.w / px;                                   // map units per CSS pixel
    const insetMap = (insetRef.current * vb.w) / px;       // the docked panel
    const x0 = vb.x + left * u;
    const x1 = vb.x + vb.w - insetMap - right * u;
    const y0 = vb.y + top * u;
    const y1 = vb.y + vb.h - bottom * u;
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return false;
    centerOn(x, y);
    return true;
  }, [centerOn]);

  /** Ease the viewBox from where it is to `to` over `dur` ms. Snaps instead
   *  when the user has asked for reduced motion. One animator for every move
   *  that is not the user's own finger: the directory fly-to and the pinch
   *  settling onto a stop. */
  const flyRef = useRef(0);
  const animateTo = useCallback((to, dur) => {
    const from = vbRef.current;
    cancelAnimationFrame(flyRef.current);
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof requestAnimationFrame === 'undefined') { setVb(to); return; }
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur), e = ease(t);
      setVb({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e,
              w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e });
      if (t < 1) flyRef.current = requestAnimationFrame(step);
    };
    flyRef.current = requestAnimationFrame(step);
  }, []);

  /** Fly to a map point for a directory row: zoom in to at least `minLevel`
   *  (never out), centre the point in the usable viewport, and ease there so
   *  the eye can follow where it went. */
  const focusOn = useCallback((x, y, minLevel = 1) => {
    const idx = Math.min(Math.max(levelRef.current, minLevel), LEVEL_RATIOS.length - 1);
    const { px, py } = sizeRef.current;
    const from = vbRef.current;
    const nw = idx === levelRef.current ? from.w : fitOverview(px, py, insetRef.current, zoomRef.current) * LEVEL_RATIOS[idx];
    const nh = px > 0 ? (nw * py) / px : from.h;
    const insetMap = px > 0 ? (insetRef.current * nw) / px : 0;
    const to = clampPan({ x: x - (nw - insetMap) / 2, y: y - nh / 2, w: nw, h: nh }, px, insetRef.current);
    setLevelIdx(idx);
    animateTo(to, FLY_MS);
  }, [animateTo]);

  /**
   * Land a free-scaled viewBox (mid-pinch) on the nearest of the three stops.
   *
   * The stops are what the map means -- blobs, squares, numbers -- so a pinch
   * must end on one. Nearest is judged in log space (a zoom is a ratio), and
   * the point that was under the fingers' midpoint stays under it, so the
   * snap reads as the map settling rather than jumping somewhere else.
   */
  const snapToLevel = useCallback((cx, cy) => {
    const { px, py } = sizeRef.current;
    const cur = vbRef.current;
    const base = fitOverview(px, py, insetRef.current, zoomRef.current);
    let idx = 0, best = Infinity;
    LEVEL_RATIOS.forEach((r, i) => {
      const d = Math.abs(Math.log(cur.w) - Math.log(base * r));
      if (d < best) { best = d; idx = i; }
    });
    const nw = base * LEVEL_RATIOS[idx];
    const p = toSvg(cx, cy);
    const af = nw / cur.w;
    const to = clampPan({ x: p.x - (p.x - cur.x) * af, y: p.y - (p.y - cur.y) * af, w: nw, h: (nw * py) / px }, px, insetRef.current);
    setLevelIdx(idx);
    animateTo(to, SNAP_MS);
  }, [toSvg, animateTo]);
  const resetToOverview = useCallback(() => {
    const { px, py } = sizeRef.current;
    setVb(homeFor(px, py, insetRef.current, zoomRef.current));
    setLevelIdx(0);
  }, []);

  // Re-fit whenever the container changes shape (rotation, window resize, the
  // panel appearing at a breakpoint). Keeps the current level and centre, but
  // takes the new size so nothing gets cropped.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width: px, height: py } = entry.contentRect;
      if (!px || !py) return;
      const prevSize = sizeRef.current;
      if (Math.abs(px - prevSize.px) < 1 && Math.abs(py - prevSize.py) < 1) return;
      sizeRef.current = { px, py };
      // At the overview, re-home properly: homeFor re-applies the panel-aware
      // offset that keeps the festival clear of the docked panel. Preserving the
      // previous centre here (as this used to) silently discarded that offset on
      // every resize, including the very first one after mount -- which is why
      // the panel was still sitting on top of the festival's east edge.
      // Once zoomed in, preserving the centre is the right behaviour.
      if (levelRef.current === 0) {
        setVb(homeFor(px, py, insetRef.current, zoomRef.current));
        return;
      }
      setVb((prev) => {
        const w = fitOverview(px, py, insetRef.current, zoomRef.current) * LEVEL_RATIOS[levelRef.current];
        const h = (w * py) / px;
        return clampPan({ x: prev.x + prev.w / 2 - w / 2, y: prev.y + prev.h / 2 - h / 2, w, h }, px, insetRef.current);
      });
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // The panel appearing or disappearing changes the usable area, so re-home.
  useEffect(() => {
    const { px, py } = sizeRef.current;
    if (levelRef.current === 0) setVb(homeFor(px, py, insetRight, overviewZoom));
  }, [insetRight, overviewZoom]);

  // Pan (single pointer) + pinch zoom (two pointers) + wheel step-zoom + dblclick step-in.
  //
  // The pinch is continuous while the fingers are down and snaps to a stop
  // when they lift. It used to step a level every 28px of spread, on a 420ms
  // cooldown, which is what testers meant by "awkward": the map did nothing,
  // then jumped, then ignored them. Now it scales under the fingers like every
  // other map does, and the three-stop design survives because the release
  // always lands on one of them (snapToLevel).
  useEffect(() => {
    const wrap = wrapRef.current;
    const map = mapRef.current;
    if (!wrap || !map) return;

    const pointers = new Map();
    let dragMoved = false;
    // The pinch's starting geometry: finger spread, midpoint, the viewBox, and
    // the map point under the midpoint. Everything mid-gesture is computed
    // from these, not incrementally, so the gesture cannot drift.
    let pinch = null;
    let lastWheelStep = 0;

    function onMove(e) {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = map.getBoundingClientRect();
      if (pointers.size === 1) {
        const scale = Math.max(r.width / vbRef.current.w, r.height / vbRef.current.h);
        const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
        setVb((cur) => clampPan({ ...cur, x: cur.x - dx / scale, y: cur.y - dy / scale }, sizeRef.current.px, insetRef.current));
      } else if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
        if (!pinch) {
          cancelAnimationFrame(flyRef.current);
          pinch = { d, vb: { ...vbRef.current }, at: toSvg(mx, my) };
        }
        dragMoved = true;
        if (d < 1) return;
        const { px, py } = sizeRef.current;
        const base = fitOverview(px, py, insetRef.current, zoomRef.current);
        // Spread the fingers and the map grows: the viewBox shrinks by the
        // same ratio, held between the two end stops with a little give.
        const wMax = base * LEVEL_RATIOS[0] * PINCH_OVERSHOOT;
        const wMin = (base * LEVEL_RATIOS[LEVEL_RATIOS.length - 1]) / PINCH_OVERSHOOT;
        const nw = Math.min(wMax, Math.max(wMin, pinch.vb.w * (pinch.d / d)));
        const nh = (nw * py) / px;
        // Keep the map point that was under the fingers under the fingers.
        const scale = r.width / nw;
        const next = { x: pinch.at.x - (mx - r.left) / scale, y: pinch.at.y - (my - r.top) / scale, w: nw, h: nh };
        setVb(clampPan(next, px, insetRef.current));
      }
    }
    function onUp(e) {
      pointers.delete(e.pointerId);
      if (pinch && pointers.size < 2) {
        // The fingers came off (or one did): settle on the nearest stop around
        // the point that was under them. The remaining finger, if any, drops
        // out of the gesture too -- a pan after a pinch starts fresh, rather
        // than fighting the settle -- and its lift must not read as a tap.
        pinch = null;
        const pts = [...pointers.values()];
        const c = pts.length ? pts[0] : { x: e.clientX, y: e.clientY };
        pointers.clear();
        snapToLevel(c.x, c.y);
        suppressClickRef.current = true;
        setTimeout(() => { suppressClickRef.current = false; }, STEP_COOLDOWN);
      }
      if (pointers.size === 0) {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (dragMoved && !suppressClickRef.current) {
          suppressClickRef.current = true;
          setTimeout(() => { suppressClickRef.current = false; }, 60);
        }
        dragMoved = false;
      }
    }
    function onDown(e) {
      cancelAnimationFrame(flyRef.current); // a grab stops any fly-to in progress
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      // iOS cancels the pointer (rather than lifting it) when the gesture
      // becomes a system one; without this the map thinks a finger is still
      // down and the next touch reads as a pinch.
      window.addEventListener('pointercancel', onUp);
    }
    function onWheel(e) {
      e.preventDefault();
      cancelAnimationFrame(flyRef.current);
      const now = Date.now();
      if (now - lastWheelStep < STEP_COOLDOWN) return;
      lastWheelStep = now;
      stepLevel(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
    }
    function onDblClick(e) {
      e.preventDefault();
      // Tap a pin, booth or area marker = open it. Double-tap anywhere else =
      // zoom in. A double-tap that lands on a tappable feature is two opens,
      // not a zoom, so the view doesn't jump out from under the sheet.
      if (e.target.closest?.('.ff-pin, .ff-booth, .ff-marker')) return;
      if (levelRef.current >= LEVEL_RATIOS.length - 1) setLevel(0, e.clientX, e.clientY);
      else stepLevel(1, e.clientX, e.clientY);
    }

    // Safari's own page zoom on a two-finger gesture. touch-action: none on the
    // wrap already declines it; this is the belt to that suspender.
    const swallow = (e) => e.preventDefault();

    wrap.addEventListener('wheel', onWheel, { passive: false });
    wrap.addEventListener('gesturestart', swallow);
    wrap.addEventListener('gesturechange', swallow);
    map.addEventListener('dblclick', onDblClick);
    map.addEventListener('pointerdown', onDown);
    return () => {
      wrap.removeEventListener('wheel', onWheel);
      wrap.removeEventListener('gesturestart', swallow);
      wrap.removeEventListener('gesturechange', swallow);
      map.removeEventListener('dblclick', onDblClick);
      map.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [setLevel, stepLevel, snapToLevel, toSvg]);

  const viewBoxStr = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
  // Map units per CSS pixel. Anything that should hold a constant SCREEN size
  // (pins, labels) multiplies its pixel size by this; anything that represents
  // real ground (booth footprints, blobs, streets) does not.
  const unitsPerPx = vb.w / (sizeRef.current.px || 1);
  // Semantic swaps tie to a level, not a pixel width.
  const overview = levelIdx === 0; // area blobs instead of individual booths
  const detail = levelIdx >= 2;    // area names
  // Where the view is BETWEEN the stops, continuously: 0 at the overview, 1 at
  // Booths, 2 at Detail, in between mid-pinch or mid-fly. For the one thing
  // that fades with the zoom rather than swapping at a stop (the area
  // markers), so a pinch drives the fade under the fingers and nothing pops
  // when they lift.
  const levelPos = levelPosition(vb.w / fitOverview(sizeRef.current.px || 1, sizeRef.current.py || 1, insetRef.current, zoomRef.current));
  const areaMarkerFade = Math.min(1, Math.max(0, (levelPos - MARKER_FADE_FROM) / (LEVEL_RATIOS.length - 1 - MARKER_FADE_FROM)));

  return { mapRef, wrapRef, suppressClickRef, viewBox: viewBoxStr, levelIdx, overview, detail, unitsPerPx, areaMarkerFade, setLevel, stepLevel, centerOn, ensureVisible, focusOn, resetToOverview };
}
