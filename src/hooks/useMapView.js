import { useCallback, useEffect, useRef, useState } from 'react';

// Discrete, stepped zoom — not continuous. This is the direction the design
// decision landed on: the overview you land on is the fixed, most-zoomed-out
// floor, and zooming in snaps between a fixed number of levels. Edit LEVELS
// (viewBox widths) to try 3 vs. 4 vs. 5 stops; everything else adapts.
//
// All figures below are in the canonical export's 1440x900 map space (see
// assets/basemapTrace.js). They are the old 340x460 stops scaled by ~1.94 and
// then reframed: the overview deliberately does NOT show the whole 1440-wide
// canvas, because several hundred units either side are empty park and street.
// It frames the festival footprint (roughly x 385-1055, y 110-830) instead.
export const LEVELS = [700, 410, 270, 175];
export const LEVEL_LABELS = ['Overview', 'Zone', 'Detail', 'Booth level'];

// h is the tall-phone companion to w: with preserveAspectRatio="xMidYMid slice"
// the viewBox has to be at least as tall-and-narrow as the screen, or the map
// gets cropped horizontally instead of letterboxed.
const HOME = { x: 370, y: -270, w: 700, h: 1440 };
const PAN_BOUNDS = { minX: 250, minY: -100, maxX: 1200, maxY: 1000 };
const STEP_COOLDOWN = 420;

function clampPan(vb) {
  const loX = PAN_BOUNDS.minX, hiX = PAN_BOUNDS.maxX - vb.w;
  vb.x = hiX < loX ? (loX + hiX) / 2 : Math.min(Math.max(vb.x, loX), hiX);
  const loY = PAN_BOUNDS.minY, hiY = PAN_BOUNDS.maxY - vb.h;
  vb.y = hiY < loY ? (loY + hiY) / 2 : Math.min(Math.max(vb.y, loY), hiY);
  return vb;
}

/**
 * Drives the map's SVG viewBox through a fixed set of discrete zoom levels
 * (pan + step-zoom), instead of free continuous scaling. Wire mapRef and
 * wrapRef to the <svg> and its wrapping <div> respectively.
 */
export function useMapView() {
  const [vb, setVb] = useState({ ...HOME });
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
    idx = Math.min(Math.max(idx, 0), LEVELS.length - 1);
    setVb((prev) => {
      const nw = LEVELS[idx];
      const af = nw / prev.w;
      const p = (cx != null && cy != null) ? toSvg(cx, cy) : { x: prev.x + prev.w / 2, y: prev.y + prev.h / 2 };
      const next = { x: p.x - (p.x - prev.x) * af, y: p.y - (p.y - prev.y) * af, w: nw, h: prev.h * af };
      return clampPan(next);
    });
    setLevelIdx(idx);
  }, [toSvg]);

  const stepLevel = useCallback((dir, cx, cy) => setLevel(levelRef.current + dir, cx, cy), [setLevel]);
  const resetToOverview = useCallback(() => setLevel(0), [setLevel]);

  // Pan (single pointer) + pinch step-zoom (two pointers) + wheel step-zoom + dblclick step-in.
  useEffect(() => {
    const wrap = wrapRef.current;
    const map = mapRef.current;
    if (!wrap || !map) return;

    const pointers = new Map();
    let dragMoved = false;
    let pinchStartDist = 0;
    let lastWheelStep = 0;
    let lastPinchStep = 0;

    function onMove(e) {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = map.getBoundingClientRect();
      if (pointers.size === 1) {
        const scale = Math.max(r.width / vbRef.current.w, r.height / vbRef.current.h);
        const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
        setVb((cur) => clampPan({ ...cur, x: cur.x - dx / scale, y: cur.y - dy / scale }));
      } else if (pointers.size === 2) {
        const pts = [...pointers.values()];
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
        if (!pinchStartDist) pinchStartDist = d;
        dragMoved = true;
        const now = Date.now();
        if (now - lastPinchStep > STEP_COOLDOWN) {
          const delta = d - pinchStartDist;
          if (delta > 28) { stepLevel(1, mx, my); pinchStartDist = d; lastPinchStep = now; }
          else if (delta < -28) { stepLevel(-1, mx, my); pinchStartDist = d; lastPinchStep = now; }
        }
      }
    }
    function onUp(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStartDist = 0;
      if (pointers.size === 0) {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (dragMoved) {
          suppressClickRef.current = true;
          setTimeout(() => { suppressClickRef.current = false; }, 60);
        }
        dragMoved = false;
      }
    }
    function onDown(e) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }
    function onWheel(e) {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelStep < STEP_COOLDOWN) return;
      lastWheelStep = now;
      stepLevel(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
    }
    function onDblClick(e) {
      e.preventDefault();
      if (levelRef.current >= LEVELS.length - 1) setLevel(0, e.clientX, e.clientY);
      else stepLevel(1, e.clientX, e.clientY);
    }

    wrap.addEventListener('wheel', onWheel, { passive: false });
    map.addEventListener('dblclick', onDblClick);
    map.addEventListener('pointerdown', onDown);
    return () => {
      wrap.removeEventListener('wheel', onWheel);
      map.removeEventListener('dblclick', onDblClick);
      map.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [setLevel, stepLevel]);

  const viewBoxStr = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
  const detail = levelIdx >= 2; // semantic swap (e.g. food-court dots -> real list) ties to a level, not a pixel width

  return { mapRef, wrapRef, suppressClickRef, viewBox: viewBoxStr, levelIdx, detail, setLevel, stepLevel, resetToOverview };
}
