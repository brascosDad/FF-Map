// The "from → to" picture of a visual change, for a person to judge by eye.
//
// scripts/visual.mjs records, next to every baseline PNG, where each named
// element sat in it (tests/visual/<case>.json: pins, art-market markers, area
// labels, booths, chips, buttons, the sheet; on paper the pins, booths, legend
// and index rows). When a case fails, this compares that record with the new
// render and draws, on the NEW render:
//   - moved:    the old position as a ghost (35% opacity) and the new one
//               solid, with a dashed black outline on a white halo a few px
//               outside it, so the outline never covers the edge being judged;
//               a thin dashed line joins them when they don't overlap. No
//               arrowheads: ghost = was, solid = is.
//   - appeared: the dashed outline only.
//   - vanished: the ghost, with the dashed outline.
//   - anything else that changed (text, colour, the basemap: pixels no named
//     element explains): a dashed outline round the area.
// No red, no green, no colour coding. Each change also gets one plain line
// ("McLendon Ave art marker moved about 4 pin-widths west"), measured in
// pin-widths, never pixels or percentages -- the pixel share is only the
// pass/fail trigger in visual.mjs.
import { createHash } from 'node:crypto';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// The app's data modules import each other without extensions (Vite resolves
// them). Teach Node the same, so names come from the data, not a copy of it.
register('data:text/javascript,' + encodeURIComponent(
  'export async function resolve(s, c, n) { try { return await n(s, c); } catch (e) {'
  + ' if (/^\\.\\.?\\//.test(s) && !/\\.[a-z]+$/i.test(s)) return n(s + ".js", c); throw e; } }'));
const load = (p) => import(pathToFileURL(resolve(p)).href);
const { PINS } = await load('src/assets/pins.js');
const { LEGEND, PRINT_SITE_LEGEND } = await load('src/data/directory.js');
const { AREAS } = await load('src/data/areas.js');

/** sha256 of what a render shows (its size and RGBA pixels), not of the PNG
 *  bytes, so an encoder difference can't make the same picture look new. */
export function renderHash(png) {
  return createHash('sha256').update(`${png.width}x${png.height}:`).update(png.data).digest('hex');
}

/** Every named element in the page, with its box in page pixels (the
 *  screenshot's own coordinates; the print case is a full-page shot). Runs in
 *  the browser. An element faded out (a marker at Detail) doesn't count. */
export async function collectElements(page) {
  return page.evaluate(() => {
    const out = [];
    const opaque = (el) => {
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
      }
      return true;
    };
    const add = (kind, id, el, shape = 'rect', extra = {}) => {
      if (!el || !opaque(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      out.push({ kind, id: String(id), shape, box: { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }, ...extra });
    };
    const text = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    // The phone map. A pin's box is its visible mark, not its 44px hit circle.
    $$('svg.ff-map g.ffc-pin[data-pin]').forEach((g) => {
      const mark = g.querySelector(':scope > g[filter], :scope > rect');
      add('pin', g.dataset.pin, mark, mark?.tagName === 'rect' ? 'rect' : 'circle');
    });
    $$('svg.ff-map g.ff-area[data-area]').forEach((g) => add('marker', g.dataset.area, g.querySelector('.ff-marker'), 'circle'));
    $$('svg.ff-map g.ffc-arealabel[data-arealabel]').forEach((g) => {
      const t = g.querySelector('text');
      add('arealabel', g.dataset.arealabel, t, 'rect', { label: text(t) });
    });
    $$('svg.ff-map g.ff-booth[data-booth]').forEach((g) => add('booth', g.dataset.booth, g.querySelector('rect')));
    // Phone UI.
    $$('.ffc-chip').forEach((el) => add('chip', text(el), el));
    $$('button[aria-label]').forEach((el) => { if (!el.closest('svg')) add('button', el.getAttribute('aria-label'), el); });
    add('ui', 'brand', document.querySelector('.ffc-brand'));
    add('ui', 'whatsonnow', document.querySelector('.ffc-whatsonnow'));
    add('ui', 'sheet', document.querySelector('.ffc-panel'));
    // Paper.
    $$('svg.print-map g.print-pin[data-pin]').forEach((g) => {
      const mark = g.firstElementChild;
      add('pin', g.dataset.pin, mark, mark?.tagName === 'circle' ? 'circle' : 'rect');
    });
    $$('svg.print-map g.print-booth').forEach((g, i) => add('booth', text(g) || `#${i}`, g.querySelector('rect')));
    add('ui', 'qr', document.querySelector('.print-qr'));
    add('ui', 'print-head', document.querySelector('.print-head'));
    $$('.print-legend__row').forEach((el) => add('legend', text(el), el));
    $$('.print-index li').forEach((el) => add('index', text(el.querySelector('.print-index__n')), el));
    // Keys are kind:id; the rare duplicate (two print booths with no number)
    // gets #2, #3 in document order, which is stable for a given page.
    const seen = {};
    for (const e of out) {
      const k = `${e.kind}:${e.id}`;
      seen[k] = (seen[k] || 0) + 1;
      e.key = seen[k] > 1 ? `${k}#${seen[k]}` : k;
    }
    return out;
  });
}

// ---------------------------------------------------------------- naming

const categoryName = (c) => [...LEGEND, ...PRINT_SITE_LEGEND].find((l) => l.cat === c)?.label || c;
const AREA_NAME = Object.fromEntries(AREAS.map((a) => [a.id, a.shortName]));
const firstClause = (s) => (s || '').split(/[,;(]/)[0].trim();

/** What a person calls an element, from the app's own data. */
export function nameOf(el) {
  switch (el.kind) {
    case 'pin': {
      const p = PINS[Number(el.id)];
      if (!p) return `pin ${el.id}`;
      if (p.label) return `${p.label} pin`;
      return `${categoryName(p.c)} pin${p.where ? ` (${firstClause(p.where)})` : ''}`;
    }
    case 'marker': return `${AREA_NAME[el.id] || el.id} art marker`;
    case 'arealabel': return `"${el.label || el.id}" area label`;
    case 'booth': {
      const m = /^(?:[a-z]+-)?0*([A-Z]?\d+)$/i.exec(el.id);
      return m ? `booth ${m[1]}` : `booth ${el.id}`;
    }
    case 'chip': return `"${el.id}" chip`;
    case 'button': return `"${el.id}" button`;
    case 'legend': return `legend row "${el.id}"`;
    case 'index': return `index row ${el.id}`;
    case 'ui': return { brand: 'the Fall Fest header', whatsonnow: 'the "What\'s on now" card', sheet: 'the bottom sheet',
      qr: 'the QR code', 'print-head': 'the print heading' }[el.id] || el.id;
    default: return el.key;
  }
}

/** The width of one pin in this render: the visible mark, median, so a square
 *  cart or a paper-only cone doesn't skew it. */
export function pinWidth(elements, fallback = 40) {
  const w = elements.filter((e) => e.kind === 'pin' && e.shape === 'circle').map((e) => e.box.w).sort((a, b) => a - b);
  return w.length ? w[Math.floor(w.length / 2)] : fallback;
}

// ---------------------------------------------------------------- comparing

const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
export const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const pad = (b, p) => ({ x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p });

/** Old element list vs new: what moved, changed size, appeared or vanished.
 *  `tol` px absorbs sub-pixel text drift. */
export function compareElements(before, after, tol = 1.5) {
  const old = new Map(before.map((e) => [e.key, e]));
  const now = new Map(after.map((e) => [e.key, e]));
  const changes = [];
  for (const [k, n] of now) {
    const o = old.get(k);
    if (!o) { changes.push({ type: 'appeared', key: k, el: n, to: n.box }); continue; }
    const a = centre(o.box), b = centre(n.box);
    const dx = b.x - a.x, dy = b.y - a.y;
    const dw = n.box.w - o.box.w, dh = n.box.h - o.box.h;
    const grew = Math.abs(dw) > tol || Math.abs(dh) > tol;
    // A box that grew from one edge (a chip with a longer word) shifts its
    // centre by half the growth: that is a size change, not a move.
    const growthOnly = grew && Math.abs(dx) <= Math.abs(dw) / 2 + tol && Math.abs(dy) <= Math.abs(dh) / 2 + tol;
    if (Math.hypot(dx, dy) > tol && !growthOnly) changes.push({ type: 'moved', key: k, el: n, from: o.box, to: n.box, dx, dy });
    else if (grew) changes.push({ type: 'resized', key: k, el: n, from: o.box, to: n.box, dw, dh });
  }
  for (const [k, o] of old) if (!now.has(k)) changes.push({ type: 'vanished', key: k, el: o, from: o.box });
  return changes;
}

/** Changed pixels no named change explains, as boxes: the diff mask in 12px
 *  cells, neighbours joined, anything touching a named change dropped. */
export function unexplainedRegions(mask, width, height, changes, cell = 12) {
  const cw = Math.ceil(width / cell), ch = Math.ceil(height / cell);
  const hot = new Uint8Array(cw * ch);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (mask[y * width + x]) hot[Math.floor(y / cell) * cw + Math.floor(x / cell)] = 1;
  const seen = new Uint8Array(cw * ch), boxes = [];
  for (let i = 0; i < hot.length; i++) {
    if (!hot[i] || seen[i]) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    const stack = [i]; seen[i] = 1;
    while (stack.length) {
      const j = stack.pop(), cx = j % cw, cy = (j - cx) / cw;
      x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const nx = cx + ox, ny = cy + oy, nj = ny * cw + nx;
        if (nx >= 0 && ny >= 0 && nx < cw && ny < ch && hot[nj] && !seen[nj]) { seen[nj] = 1; stack.push(nj); }
      }
    }
    boxes.push({ x: x0 * cell, y: y0 * cell, w: Math.min((x1 + 1) * cell, width) - x0 * cell, h: Math.min((y1 + 1) * cell, height) - y0 * cell });
  }
  const named = changes.flatMap((c) => [c.from, c.to]).filter(Boolean).map((b) => pad(b, 8));
  return boxes.filter((b) => !named.some((n) => overlaps(b, n)));
}

// ---------------------------------------------------------------- words

const MAP_KINDS = new Set(['pin', 'marker', 'arealabel', 'booth']);

// Both maps are drawn north up.
function direction(dx, dy, compass) {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  const ns = dy < 0 ? (compass ? 'north' : 'up') : (compass ? 'south' : 'down');
  const ew = dx < 0 ? (compass ? 'west' : 'left') : (compass ? 'east' : 'right');
  if (ay < ax * 0.4) return ew;
  if (ax < ay * 0.4) return ns;
  return compass ? `${ns}-${ew}` : `${ns} and ${ew}`;
}

/** "about 4 pin-widths", "about half a pin-width", "under a quarter of a pin-width". */
export function inPinWidths(px, pw) {
  const n = Math.abs(px) / pw;
  if (n < 0.125) return 'under a quarter of a pin-width';
  if (n < 1.875) {
    const q = Math.round(n * 4) / 4;
    const words = { 0.25: 'a quarter of a pin-width', 0.5: 'half a pin-width', 0.75: 'three quarters of a pin-width',
      1: '1 pin-width', 1.25: '1¼ pin-widths', 1.5: '1½ pin-widths', 1.75: '1¾ pin-widths' };
    return `about ${words[q]}`;
  }
  return `about ${Math.round(n)} pin-widths`;
}

/** One plain line for one change. */
export function describe(change, pw) {
  const name = nameOf(change.el);
  const cap = name[0].toUpperCase() + name.slice(1);
  switch (change.type) {
    case 'moved': return `${cap} moved ${inPinWidths(Math.hypot(change.dx, change.dy), pw)} ${direction(change.dx, change.dy, MAP_KINDS.has(change.el.kind))}`;
    case 'resized': {
      const wide = Math.abs(change.dw) >= Math.abs(change.dh);
      const d = wide ? change.dw : change.dh;
      const word = wide ? (d > 0 ? 'wider' : 'narrower') : (d > 0 ? 'taller' : 'shorter');
      return `${cap} is ${inPinWidths(d, pw)} ${word}`;
    }
    case 'appeared': return `${cap} appeared`;
    case 'vanished': return `${cap} is gone`;
    default: return cap;
  }
}

// ---------------------------------------------------------------- drawing

/** Compose the from → to PNG in the browser's canvas (antialiased lines and
 *  dashes for free). `oldPng`/`newPng` are PNG buffers. Returns a PNG buffer. */
export async function drawFromTo(browser, { oldPng, newPng, changes, regions }) {
  const page = await browser.newPage();
  try {
    const dataUrl = await page.evaluate(async ({ oldSrc, newSrc, changes, regions }) => {
      const img = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
      const [oldImg, newImg] = await Promise.all([img(oldSrc), img(newSrc)]);
      const cv = document.createElement('canvas');
      cv.width = newImg.width; cv.height = newImg.height;
      const g = cv.getContext('2d');
      g.drawImage(newImg, 0, 0);
      const GAP = 4;       // outline sits this far outside the element
      const path = (b, shape, p = 0) => {
        g.beginPath();
        if (shape === 'circle') g.arc(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) / 2 + p, 0, Math.PI * 2);
        else g.rect(b.x - p, b.y - p, b.w + 2 * p, b.h + 2 * p);
      };
      // Copy a box from one image to the same place on the canvas, clipped to
      // the element's shape so a round pin doesn't drag a square of map along.
      const stamp = (src, b, shape, alpha) => {
        g.save();
        path(b, shape, 1); g.clip();
        g.globalAlpha = alpha;
        const x = Math.floor(b.x - 2), y = Math.floor(b.y - 2), w = Math.ceil(b.w + 4), h = Math.ceil(b.h + 4);
        g.drawImage(src, x, y, w, h, x, y, w, h);
        g.restore();
      };
      const dashed = (draw) => {
        g.save();
        g.setLineDash([6, 4]); g.lineCap = 'butt';
        g.strokeStyle = '#fff'; g.lineWidth = 4; draw(); g.stroke();
        g.strokeStyle = '#000'; g.lineWidth = 1.5; draw(); g.stroke();
        g.restore();
      };
      const outline = (b, shape) => dashed(() => path(b, shape, GAP));
      // Where the segment between two centres leaves a (padded) box.
      const exit = (from, to, b, shape) => {
        const p = GAP + 2;
        const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy) || 1;
        let t;
        if (shape === 'circle') t = (Math.max(b.w, b.h) / 2 + p) / len;
        else {
          const hx = b.w / 2 + p, hy = b.h / 2 + p;
          t = Math.min(dx ? hx / Math.abs(dx) : Infinity, dy ? hy / Math.abs(dy) : Infinity);
        }
        return { x: from.x + dx * t, y: from.y + dy * t };
      };
      const c = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
      const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

      // Ghosts first, then the new element stamped back on top at full
      // strength, so a ghost that overlaps it only peeks out.
      for (const ch of changes) if (ch.from) stamp(oldImg, ch.from, ch.el.shape, 0.35);
      for (const ch of changes) if (ch.to && ch.from) stamp(newImg, ch.to, ch.el.shape, 1);
      for (const ch of changes) {
        if (ch.type === 'vanished') outline(ch.from, ch.el.shape);
        else outline(ch.to, ch.el.shape);
        if (ch.type === 'moved' && !hit(ch.from, ch.to)) {
          const a = exit(c(ch.from), c(ch.to), ch.from, ch.el.shape), b = exit(c(ch.to), c(ch.from), ch.to, ch.el.shape);
          dashed(() => { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); });
        }
      }
      for (const r of regions) outline(r, 'rect');
      return cv.toDataURL('image/png');
    }, { oldSrc: `data:image/png;base64,${oldPng.toString('base64')}`, newSrc: `data:image/png;base64,${newPng.toString('base64')}`,
         changes: changes.map(({ type, el, from, to }) => ({ type, el: { shape: el.shape }, from, to })), regions });
    return Buffer.from(dataUrl.split(',')[1], 'base64');
  } finally {
    await page.close();
  }
}
