/**
 * Automated pass over TESTING.md.
 *
 *   npm run test:e2e            # builds, serves, runs
 *   npm run test:e2e -- --keep  # leave screenshots in .e2e-out/
 *
 * Covers what a machine can check: zoom-level semantics, pan clamping, tap
 * targets, filters, breakpoints, data honesty. It cannot judge whether the map
 * LOOKS right -- that stays a human job, and the cases marked "?" in TESTING.md
 * are design decisions, not assertions.
 */
import { mkdirSync } from 'node:fs';
import { BASE, launch } from './lib/browser.mjs';

const OUT = '.e2e-out';
mkdirSync(OUT, { recursive: true });

const FEST = { x0: 385, y0: 110, x1: 1055, y1: 830 };
const SLACK = 30;
const R = { x0: FEST.x0 - SLACK, y0: FEST.y0 - SLACK, x1: FEST.x1 + SLACK, y1: FEST.y1 + SLACK };
const GAP = 20, PANEL = 360;   // --space-5, --panel-width

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'pass' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
/** One broken assertion should not abort the whole pass. */
async function safe(name, fn) {
  try { await fn(); } catch (e) { check(name, false, `threw: ${String(e.message).split('\n')[0]}`); }
}
/** A point that is genuinely bare map: not a feature, not the sheet, not chrome. */
async function bareMapPoint(p, w, h) {
  return p.evaluate(({ w, h }) => {
    const blocked = (el) => !el || el.closest('.ff-tap, .sheet, .sheetwrap, .topbar, .float, .zoomctl, .locate');
    for (const fx of [0.08, 0.5, 0.92, 0.25, 0.75]) {
      for (const fy of [0.42, 0.35, 0.5, 0.3, 0.55]) {
        const x = w * fx, y = h * fy;
        if (!blocked(document.elementFromPoint(x, y))) return { x, y };
      }
    }
    return null;
  }, { w, h });
}

/**
 * First tappable map feature that is actually reachable -- inside the viewport
 * AND not underneath floating chrome. The topbar and panel sit over the map, so
 * a feature can be perfectly visible in the SVG and still un-clickable.
 */
async function visibleTap(p, w, h) {
  const n = await p.locator('svg.ff-map g.ff-tap').count();
  for (let i = 0; i < Math.min(n, 120); i++) {
    const b = await p.locator('svg.ff-map g.ff-tap').nth(i).boundingBox();
    if (!b || b.x <= 4 || b.y <= 4 || b.x + b.width >= w - 4 || b.y + b.height >= h - 4) continue;
    const reachable = await p.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return !!el && !!el.closest('svg.ff-map');
    }, [b.x + b.width / 2, b.y + b.height / 2]);
    if (reachable) return b;
  }
  return null;
}

const SIZES = [['mobile', 390, 800], ['tablet', 834, 1112], ['desktop', 1440, 900]];
const reserveFor = (w, docked) => (docked ? PANEL + GAP * 2 : 0);

async function viewBox(p) {
  return (await p.locator('svg.ff-map').getAttribute('viewBox')).split(' ').map(Number);
}
async function drag(p, dx, dy) {
  const box = await p.locator('.mapwrap').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await p.mouse.move(cx, cy);
  await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(cx + (dx * i) / 8, cy + (dy * i) / 8);
  await p.mouse.up();
  await p.waitForTimeout(200);
}
const zoomIn = async (p) => { await p.locator('.zoomctl button').first().click(); await p.waitForTimeout(600); };
const zoomOut = async (p) => { await p.locator('.zoomctl button').nth(1).click(); await p.waitForTimeout(600); };

const browser = await launch();
const pageErrors = [];

for (const [name, w, h] of SIZES) {
  console.log(`\n=== ${name} ${w}x${h} ===`);
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => pageErrors.push(`${name}: ${e.message}`));
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const docked = (await p.locator('.ff-screen.docked').count()) > 0;
  const reserve = reserveFor(w, docked);

  // ---- layout ----
  check(`${name}: ${docked ? 'docked panel' : 'bottom sheet'} at this width`, docked === (w >= 1024));
  if (docked) {
    const panel = await p.locator('.sheetwrap').boundingBox();
    const gaps = [panel.x + panel.width - (w - GAP), panel.y - GAP, (h - GAP) - (panel.y + panel.height)];
    check(`${name}: panel inset ${GAP}px on all three sides`,
      gaps.every((g) => Math.abs(g) <= 1.5), `right/top/bottom off by ${gaps.map((g) => g.toFixed(1)).join('/')}`);
    check(`${name}: panel width ${PANEL}px`, Math.abs(panel.width - PANEL) <= 1.5, `${panel.width.toFixed(0)}px`);

    // The panel is the desktop way into everything on the map, so it has to
    // actually list everything -- a summary card is what it replaced.
    const sections = await p.locator('.dir-section').count();
    const rows = await p.locator('.ffc-poirow').count();
    check(`${name}: panel lists every section`, sections === 5, `${sections} sections`);
    check(`${name}: panel lists every location`, rows >= 12, `${rows} rows`);
    check(`${name}: directory rows are real touch targets`, await (async () => {
      for (let i = 0; i < rows; i++) {
        const b = await p.locator('.ffc-poirow').nth(i).boundingBox();
        if (!b || b.height < 44) return false;
      }
      return true;
    })());
    check(`${name}: key sits in the panel footer`,
      (await p.locator('.panel-foot .ffc-legend__dot').count()) === 12,
      `${await p.locator('.panel-foot .ffc-legend__dot').count()} swatches`);
    check(`${name}: no scroll region hides the key`,
      await p.locator('.panel-foot').evaluate((el, vh) => el.getBoundingClientRect().bottom <= vh, h));

    // Row -> detail -> back. Closing a docked detail returns to the list; it
    // does not dismiss the panel, because the panel is furniture.
    await p.locator('.ffc-poirow', { hasText: 'Main Stage' }).first().click();
    await p.waitForTimeout(400);
    check(`${name}: directory row opens its detail`,
      (await p.locator('.sheet h3').first().innerText()).includes('Main Stage'));
    check(`${name}: selected pin is ringed on the map`,
      (await p.locator('svg.ff-map .ff-pin circle[stroke]').count()) >= 2);
    check(`${name}: docked detail offers back, not close`,
      (await p.locator('.panel-back').count()) === 1 && (await p.locator('.sheet .close').count()) === 0);
    await p.locator('.panel-back').click();
    await p.waitForTimeout(400);
    check(`${name}: back returns to the full list`,
      (await p.locator('.ffc-poirow').count()) === rows);
    // A single-place row now flies the map in a level (decided 9/10), and "back"
    // leaves the map where it is. Reset like a user would before the overview checks.
    await p.locator('.zoomctl button[aria-label="Reset to overview"]').click();
    await p.waitForTimeout(400);

    // A multi-pin category has no single point to fly to, so it filters instead.
    await p.locator('.ffc-poirow', { hasText: 'Restrooms' }).first().click();
    await p.waitForTimeout(400);
    check(`${name}: category row filters the map`,
      (await p.locator('.chips .ffc-chip[aria-pressed="true"]').count()) === 1);
    await p.locator('.panel-back').click();
    await p.waitForTimeout(400);
  }

  // ---- no grey header scrim ----
  const scrim = await p.locator('.topbar').evaluate((el) => getComputedStyle(el).backgroundImage);
  check(`${name}: no grey header band`, scrim === 'none', scrim);

  // ---- overview semantics ----
  // Blobs are fill-only now (no stroke), so identify them by their fill opacity.
  const blobCount = await p.locator('svg.ff-map path[fill-opacity="0.34"]').count();
  check(`${name}: overview shows ${docked ? 'squares (docked)' : 'blobs'}`,
    docked ? blobCount === 0 : blobCount > 0, `${blobCount} blob paths`);
  const labels = await p.locator('svg.ff-map text').allTextContents();
  check(`${name}: no pin labels at overview`,
    !labels.some((t) => /Kidlandia|Main Stage|Acoustic|Food Court|Art Market/.test(t)), labels.join(' | '));
  check(`${name}: street names kept at overview`,
    labels.some((t) => t.includes('Candler Park Dr')) && labels.some((t) => t.includes('McLendon Ave')));
  check(`${name}: no zoom-level readout`, (await p.locator('.zlevel').count()) === 0);

  // ---- zoom buttons ----
  check(`${name}: zoom-out disabled at overview`,
    (await p.locator('.zoomctl button').nth(1).getAttribute('aria-disabled')) === 'true');
  check(`${name}: reset button present in the zoom stack`,
    (await p.locator('.zoomctl button').count()) === 3);
  check(`${name}: reset caret removed from the topbar`, (await p.locator('.navbtn').count()) === 0);
  const zc = await p.locator('.zoomctl').boundingBox();
  check(`${name}: locate button removed (GPS cut)`, (await p.locator('.locate').count()) === 0);
  check(`${name}: zoom control is a single segmented card of 3`, !!zc && zc.height > 110, `${zc?.height?.toFixed(0)}px tall`);

  // ---- audit: closed dialog must leave the tab order ----
  await safe(`${name}: closed sheet accessibility`, async () => {
    if (docked) {
      check(`${name}: docked panel is not a dialog`,
        (await p.locator('.sheet').getAttribute('role')) === null);
      return;
    }
    const vis = await p.locator('.sheet').evaluate((el) => getComputedStyle(el).visibility);
    check(`${name}: closed sheet is visibility:hidden, not just translated`, vis === 'hidden', vis);
    check(`${name}: closed sheet has no focusable children`,
      (await p.locator('.sheet button:visible').count()) === 0);
    check(`${name}: bottom sheet is role=dialog`,
      (await p.locator('.sheet').getAttribute('role')) === 'dialog');
  });

  // ---- audit: touch targets and selection semantics ----
  await safe(`${name}: control sizes`, async () => {
    // On a phone the pill is painted shorter than the floor and an ::after
    // carries the target; everywhere else the box itself is the target. Measure
    // whichever is bigger -- what matters is what a thumb can hit.
    const chip = await p.locator('.ffc-chip').first().boundingBox();
    const chipTap = await p.locator('.ffc-chip').first().evaluate((el) => {
      const after = parseFloat(getComputedStyle(el, '::after').height);
      return Math.max(el.getBoundingClientRect().height, Number.isFinite(after) ? after : 0);
    });
    check(`${name}: chip meets the 44px touch target`, chipTap >= 43,
      `${chipTap.toFixed(0)}px target, ${chip?.height?.toFixed(0)}px painted`);
    const pressed = await p.locator('.ffc-chip').first().getAttribute('aria-pressed');
    check(`${name}: chip carries aria-pressed`, pressed !== null, String(pressed));
    const zb = await p.locator('.zoomctl button').first().boundingBox();
    check(`${name}: zoom button is 40px`, zb && Math.abs(zb.height - 40) <= 1, `${zb?.height?.toFixed(0)}px`);
  });

  // ---- pan clamping, every level ----
  for (let lvl = 0; lvl < 3; lvl++) {
    if (lvl) await zoomIn(p);
    let eH = 0, eV = 0, uW = 0, vH = 0;
    for (const [dx, dy] of [[3000, 0], [-3000, 0], [0, 3000], [0, -3000], [2500, 2500], [-2500, -2500]]) {
      await drag(p, dx, dy);
      const vb = await viewBox(p);
      uW = vb[2] - (reserve * vb[2]) / w;
      vH = vb[3];
      if (uW < R.x1 - R.x0) eH = Math.max(eH, R.x0 - vb[0], vb[0] + uW - R.x1);
      if (vH < R.y1 - R.y0) eV = Math.max(eV, R.y0 - vb[1], vb[1] + vb[3] - R.y1);
    }
    const locked = uW >= R.x1 - R.x0 && vH >= R.y1 - R.y0;
    check(`${name}: level ${lvl} cannot pan off the festival`, eH <= 1 && eV <= 1,
      locked ? 'viewport larger than festival — locked' : `escape ${eH.toFixed(1)}u / ${eV.toFixed(1)}u`);
  }
  check(`${name}: zoom-in disabled at closest level`,
    (await p.locator('.zoomctl button').first().getAttribute('aria-disabled')) === 'true');

  // ---- level semantics on the way back out ----
  const numbersAtDetail = await p.locator('svg.ff-map text').allTextContents();
  check(`${name}: booth numbers at Detail`, numbersAtDetail.some((t) => /^\d+$/.test(t)));
  await zoomOut(p);
  const atBooths = await p.locator('svg.ff-map text').allTextContents();
  check(`${name}: pin labels stay off at every level`,
    !atBooths.some((t) => /Kidlandia|Main Stage|Acoustic|Food Court|Art Market/.test(t)), atBooths.join(' | '));
  check(`${name}: no booth numbers at Booths level`, !atBooths.some((t) => /^\d+$/.test(t)));

  // ---- pin sizing ----
  // One visible size, 40px, at every level (the overview used to draw 34, and
  // that step showed as a pop at the end of every pinch that crossed it). The
  // thing a FINGER has to hit is 44px at every level regardless.
  await safe(`${name}: pin sizing`, async () => {
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    // the drawn circle lives inside the shadow group; the hit area is the
    // transparent circle that is a direct child of the pin group
    const drawn = async () => (await p.locator('svg.ff-map g.ff-pin g circle').first().boundingBox())?.width;
    const hit = async () => (await p.locator('svg.ff-map g.ff-pin > circle').first().boundingBox())?.width;
    const d0 = await drawn(), h0 = await hit();
    await zoomIn(p);
    const d1 = await drawn(), h1 = await hit();
    await zoomIn(p);
    const d2 = await drawn(), h2 = await hit();
    check(`${name}: pins are one size at every level`,
      [d0, d1, d2].every((v) => Math.abs(v - 40) <= 1.5),
      [d0, d1, d2].map((v) => v.toFixed(0)).join(' / ') + 'px');
    check(`${name}: the touch target stays 44px at every level`,
      [h0, h1, h2].every((v) => v >= 43.5), [h0, h1, h2].map((v) => v.toFixed(0)).join(' / ') + 'px');
    const area = await p.locator('svg.ff-map g.ff-area__mk > circle').first().boundingBox();
    check(`${name}: area marker is a 44px target too`, !!area && area.width >= 43.5,
      area ? `${area.width.toFixed(0)}px` : 'none');
  });

  // ---- taps ----
  // reload first: the pan stress-test above leaves the map in a corner, so
  // features are off-screen and nothing is clickable.
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await zoomIn(p);

  await safe(`${name}: tapping a map feature opens detail`, async () => {
    const t = await visibleTap(p, w, h);
    if (!t) return check(`${name}: tapping a map feature opens detail`, false, 'no feature on screen');
    await p.mouse.click(t.x + t.width / 2, t.y + t.height / 2);
    await p.waitForTimeout(450);
    const titles = await p.locator('.sheet .hd h3').allTextContents();
    check(`${name}: tapping a map feature opens detail`, titles.length > 0, titles.join(' | '));
    check(`${name}: detail title is real, not undefined`,
      titles.length > 0 && !/undefined|null|NaN/.test(titles.join(' ')), titles.join(' | '));
  });

  await safe(`${name}: background tap dismisses detail`, async () => {
    // must be bare map: the bottom of a phone screen is the open sheet, and the
    // top of a docked screen is the chip row, which stops propagation.
    const bare = await bareMapPoint(p, w, h);
    if (!bare) return check(`${name}: background tap dismisses detail`, false, 'no bare map point found');
    await p.mouse.click(bare.x, bare.y);
    await p.waitForTimeout(450);
    const stillOpen = docked
      ? (await p.locator('.sheet .close').count()) > 0
      : (await p.locator('.sheet.open').count()) > 0;
    check(`${name}: background tap dismisses detail`, !stillOpen);
  });

  await safe(`${name}: dragging from a pin pans without opening detail`, async () => {
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await zoomIn(p);
    const t = await visibleTap(p, w, h);
    if (!t) return;
    const cx = t.x + t.width / 2, cy = t.y + t.height / 2;
    await p.mouse.move(cx, cy);
    await p.mouse.down();
    for (let i = 1; i <= 6; i++) await p.mouse.move(cx - i * 12, cy);
    await p.mouse.up();
    await p.waitForTimeout(450);
    const opened = docked
      ? (await p.locator('.sheet .close').count()) > 0
      : (await p.locator('.sheet.open').count()) > 0;
    check(`${name}: dragging from a pin pans without opening detail`, !opened);
  });

  // ---- no stall carries a truck name and 14 of 15 vendors have no spot ----
  await safe(`${name}: stall with no vendor still reads sensibly`, async () => {
    const bad = await p.evaluate(() => {
      // null locations and unassigned stalls must never print "undefined"
      return document.body.innerText.includes('undefined');
    });
    check(`${name}: no "undefined" rendered anywhere`, !bad);
  });

  // ---- booth stepper: wraps inside its own area, never leaks ----
  await safe(`${name}: booth stepper`, async () => {
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await zoomIn(p); await zoomIn(p);           // squares + numbers
    // click a booth square directly
    let opened = false;
    const n = await p.locator('svg.ff-map g.ff-booth').count();
    for (let i = 0; i < n && !opened; i++) {
      const bb = await p.locator('svg.ff-map g.ff-booth').nth(i).boundingBox().catch(() => null);
      if (!bb) continue;
      if (bb.x < 4 || bb.y < 4 || bb.x + bb.width > w - 4 || bb.y + bb.height > h - 4) continue;
      await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await p.waitForTimeout(400);
      opened = (await p.locator('.boothnav').count()) > 0;
    }
    check(`${name}: tapping a booth square opens the stepper`, opened);
    if (!opened) return;

    const readPos = async () => {
      const t = await p.locator('.ffc-step__pos').textContent();
      const m = t.match(/^(\d+) of (\d+) · (.+)$/);
      return m ? { i: +m[1], total: +m[2], area: m[3] } : null;
    };
    const start = await readPos();
    check(`${name}: stepper reports position within the area`, !!start,
      start ? `${start.i} of ${start.total} in ${start.area}` : 'unparsed');
    if (!start) return;

    // Wrap is checked in one click rather than by walking the whole area --
    // stepping 60+ booths three times over is what made this suite crawl.
    await p.locator('.ffc-step button').first().click();   // previous
    await p.waitForTimeout(150);
    const back = await readPos();
    const expected = start.i === 1 ? start.total : start.i - 1;
    check(`${name}: back caret steps back${start.i === 1 ? ', wrapping to the end' : ''}`,
      back && back.i === expected, back ? `${start.i} -> ${back.i} (expected ${expected})` : 'unparsed');
    check(`${name}: stepping stays in the same area`, back && back.area === start.area,
      back ? `${start.area} -> ${back.area}` : 'unparsed');
    // 58 + 27 + 54 numbered art booths, 11 Kidlandia, 16 food stalls.
    check(`${name}: total matches the area, not all booths`,
      [58, 27, 54, 11, 16].includes(start.total), `${start.total} in ${start.area}`);

    await p.locator('.ffc-step button').last().click();    // forward again
    await p.waitForTimeout(150);
    const fwd = await readPos();
    check(`${name}: forward caret returns`, fwd && fwd.i === start.i, fwd ? `${back?.i} -> ${fwd.i}` : 'unparsed');

    const btn = await p.locator('.ffc-step button').first().boundingBox();
    const stepGap = await p.evaluate(() => {
      const s = document.querySelector('.boothnav').getBoundingClientRect();
      const h = document.querySelector('.sheet .hd').getBoundingClientRect();
      return Math.round(h.top - s.bottom);
    });
    check(`${name}: stepper has air between it and the title`, stepGap >= 16, `${stepGap}px`);
    check(`${name}: caret is a real touch target`, btn && btn.width >= 40 && btn.height >= 38,
      btn ? `${btn.width}x${btn.height}` : 'none');
  });

  // ---- the 2026 assignments: every art booth names its artist, and an area
  // sheet lists its booths so an artist can be found by name ----
  await safe(`${name}: artist assignments`, async () => {
    // The stepper block above left an art or food booth open. Whatever it is,
    // the sheet never promises names that are "coming".
    const body = await p.locator('.sheet .panel-scroll').textContent();
    check(`${name}: no booth still says artist names are coming`, !/arrive with the 2026/.test(body || ''));
    // Open an area from its marker. Any run will do; the count is checked
    // against whichever one it was.
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await zoomIn(p);
    let opened = false;
    const n = await p.locator('svg.ff-map g.ff-area .ff-marker').count();
    for (let i = 0; i < n && !opened; i++) {
      const bb = await p.locator('svg.ff-map g.ff-area .ff-marker').nth(i).boundingBox().catch(() => null);
      if (!bb || bb.x < 4 || bb.y < 120 || bb.x + bb.width > w - 4 || bb.y + bb.height > h - 4) continue;
      await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await p.waitForTimeout(450);
      opened = (await p.locator('.boothrow').count()) > 0;
    }
    check(`${name}: an area sheet lists its booths`, opened);
    if (!opened) return;
    const rows = await p.locator('button.boothrow').count();
    // 58 on Candler Park Dr; 27 on McLendon + Achieve with Steve; 54 + 11
    // Kidlandia + AWARE Wildlife in the park. The unnumbered pair are rows too.
    check(`${name}: the list is the whole run`, [58, 28, 66].includes(rows), `${rows} rows`);
    const named = await p.locator('button.boothrow .who').allTextContents();
    check(`${name}: every row names an artist or says it is open`,
      named.every((t) => t.trim().length > 0 && !/undefined|null/.test(t)));
    const first = await p.locator('button.boothrow').first();
    const num = (await first.locator('.n').textContent()).trim();
    await first.click();
    await p.waitForTimeout(600);
    const title = await p.locator('.sheet .hd h3').textContent();
    check(`${name}: tapping a row opens that booth`, title === `Booth ${num}`, `${title} for row ${num}`);
    const who = await p.locator('.sheet .li b').first().textContent().catch(() => null);
    check(`${name}: the booth sheet names the business`, !!who && who.trim().length > 0, who || '(none)');
    check(`${name}: the map is at the booth zoom`, (await p.locator('.boothnav').count()) > 0);
  });

  // ---- Esc closes, focus returns to the map ----
  await safe(`${name}: escape and focus return`, async () => {
    if (docked) return;
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await zoomIn(p);
    const t = await visibleTap(p, w, h);
    if (!t) return;
    await p.mouse.click(t.x + t.width / 2, t.y + t.height / 2);
    await p.waitForTimeout(450);
    const focusedOnOpen = await p.evaluate(() => document.activeElement?.className || '');
    check(`${name}: focus moves into the sheet on open`, /close/.test(focusedOnOpen), focusedOnOpen || '(none)');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(450);
    check(`${name}: Escape closes the sheet`, (await p.locator('.sheet.open').count()) === 0);
    const focusedAfter = await p.evaluate(() => document.activeElement?.tagName + '.' + (document.activeElement?.className?.baseVal ?? document.activeElement?.className ?? ''));
    check(`${name}: focus returns to the map, not <body>`, /ff-map/.test(focusedAfter), focusedAfter);
  });

  // ---- filters ----
  await safe(`${name}: filters`, async () => {
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await zoomIn(p);
    await p.locator('.ffc-chip', { hasText: 'Restrooms' }).click();
    await p.waitForTimeout(450);
    const dimmed = await p.locator('svg.ff-map g.ffc-dimmed').count();
    check(`${name}: filter dims non-matching pins`, dimmed > 0, `${dimmed} dimmed`);
    const mutedChips = await p.locator('.ffc-chip--muted').count();
    check(`${name}: unselected chips go muted, not faded`, mutedChips === 2, `${mutedChips} muted`);
    const op = await p.locator('.ffc-chip--muted').first().evaluate((el) => getComputedStyle(el).opacity);
    check(`${name}: muted chip keeps full opacity`, Number(op) === 1, op);
    check(`${name}: filter resets to overview`,
      (await p.locator('.zoomctl button').nth(1).getAttribute('aria-disabled')) === 'true');
    await p.locator('.ffc-chip', { hasText: 'Restrooms' }).click();
    await p.waitForTimeout(450);
    check(`${name}: filter toggles off`,
      (await p.locator('svg.ff-map g[opacity="0.28"]').count()) === 0);
  });

  await p.screenshot({ path: `${OUT}/${name}.png` });
  await p.close();
}

// ---- the phone's opening state (beta round 1, 9/17) ----
// Bike valet and the beer stand are landmarks and were reached for first; the
// merch tent is the festival's own, at the gate. All three show at open, on
// the smallest phone we care about, and no two overview targets overlap --
// 44px is the floor and circles may touch but not cross. The info booth sits
// 48 units above merch and arrives at the first zoom step (see pins.js).
for (const [name, w, h] of [['iPhone SE', 375, 667], ['iPhone 16', 393, 852]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const cats = await p.locator('svg.ff-map g.ff-pin').evaluateAll((els) => els.map((e) => [...e.classList].find((c) => c.startsWith('ffc-pin--'))?.slice(9)));
  check(`${name}: bike valet, beer and merch are on the opening view`,
    cats.includes('bikevalet') && cats.includes('merch') && cats.includes('drinks'), cats.join(','));
  check(`${name}: still only a handful of pins at open`, cats.length <= 8, `${cats.length} pins`);
  const titles = [];
  for (const sel of ['g.ffc-pin--bikevalet', 'g.ffc-pin--merch', 'g.ffc-pin--drinks']) {
    const b = await p.locator(sel).first().boundingBox();
    await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await p.waitForTimeout(450);
    titles.push(await p.locator('.sheet .hd h3').first().textContent());
    await p.locator('.sheet .close').click();
    await p.waitForTimeout(350);
  }
  check(`${name}: the three open their own sheets`, /Bike Valet/.test(titles[0]) && /Merch/.test(titles[1]) && /Beer Stand/.test(titles[2]), titles.join(' | '));
  const overlap = await p.evaluate(() => {
    const cs = [...document.querySelectorAll('svg.ff-map g.ff-pin > circle, svg.ff-map g.ff-area__mk > circle')]
      .map((c) => { const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, r: r.width / 2, n: c.parentElement.className.baseVal }; });
    const out = [];
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const d = Math.hypot(cs[i].x - cs[j].x, cs[i].y - cs[j].y);
      if (d < cs[i].r + cs[j].r - 0.5) out.push(`${cs[i].n.replace(/ff-tap |ffc-pin /g, '')} x ${cs[j].n.replace(/ff-tap |ffc-pin /g, '')} by ${(cs[i].r + cs[j].r - d).toFixed(1)}px`);
    }
    return out;
  });
  check(`${name}: no two overview touch targets overlap`, overlap.length === 0, overlap.join(' | '));
  await p.close();
}

// ---- the area markers leave at the Detail stop ----
// Ernest, iPhone 9/20: at the closest stop the art-market marker sat on booths
// 96-98 and 113-115 (Candler Park Dr) and 60-62 (McLendon), so those could not
// be reached. At Detail the three markers are invisible and keep no tap
// target: a tap on each of those booths' squares, and on its number, reaches
// the booth. One step out brings the marker back, a 44px target again.
for (const [name, w, h] of [['mobile', 390, 800], ['desktop', 1440, 900]]) {
  // The pan between the two steps: at the overview both markers sit near an
  // edge of the screen (the phone overview crops the west; McLendon is the
  // south edge), and the booths under them have to be on screen at Detail.
  for (const [area, ids, nx, ny] of [['cpd', ['cpd-096', 'cpd-097', 'cpd-098', 'cpd-113', 'cpd-114', 'cpd-115'], 180, 0],
                                     ['mcl', ['mcl-060', 'mcl-061', 'mcl-062'], 0, -160]]) {
    const p = await browser.newPage({ viewport: { width: w, height: h }, isMobile: w < 1024, hasTouch: w < 1024 });
    await p.goto(BASE, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    // Step in to Detail with the marker under the pointer: a wheel step zooms
    // about the pointer, so the marker stays put on screen (a double-tap on
    // it would open it; the buttons zoom about the centre and push it off).
    const onMarker = async () => { const b = await p.locator(`svg.ff-map g.ff-area[data-area="${area}"] .ff-marker circle`).boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); };
    await onMarker(); await p.mouse.wheel(0, -100); await p.waitForTimeout(700);
    await drag(p, nx, ny);
    await onMarker(); await p.mouse.wheel(0, -100); await p.waitForTimeout(700);
    const r = await p.evaluate((ids) => {
      const mk = [...document.querySelectorAll('svg.ff-map g.ff-area__mk')].map((g) => ({ opacity: +getComputedStyle(g).opacity, pe: getComputedStyle(g).pointerEvents }));
      const at = (x, y) => document.elementFromPoint(x, y);
      const booths = ids.map((id) => {
        const g = document.querySelector(`svg.ff-map [data-booth="${id}"]`);
        const tap = g?.querySelector('rect[fill="transparent"]'), num = g?.querySelector('text');
        if (!tap || !num) return { id, drawn: false };
        const t = tap.getBoundingClientRect(), n = num.getBoundingClientRect();
        const onScreen = t.x > 0 && t.y > 0 && t.right < innerWidth && t.bottom < innerHeight;
        // The square's own cell has to take the tap. A number sits in the
        // cell above its square (a column pitch is one cell), so what is
        // asked of it is only that no marker is over it.
        return { id, drawn: true, onScreen, tap: at(t.x + t.width / 2, t.y + t.height / 2)?.closest?.('[data-booth]')?.dataset.booth === id,
                 num: !at(n.x + n.width / 2, n.y + n.height / 2)?.closest?.('.ff-area__mk') };
      });
      return { mk, numbers: [...document.querySelectorAll('svg.ff-map text')].some((t) => /^\d+$/.test(t.textContent)), booths };
    }, ids);
    const seen = r.booths.filter((b) => b.drawn && b.onScreen);
    check(`${name}: reached Detail by ${area}`, r.numbers && seen.length === ids.length, `${seen.length} of ${ids.length} on screen, numbers ${r.numbers}`);
    check(`${name}: at Detail every area marker is invisible and has no tap target`,
      r.mk.length === 3 && r.mk.every((m) => m.opacity === 0 && m.pe === 'none'), r.mk.map((m) => `${m.opacity}/${m.pe}`).join(' '));
    check(`${name}: at Detail no marker is over the ${area} booths' squares or numbers`,
      seen.every((b) => b.tap && b.num), seen.map((b) => `${b.id}${b.tap && b.num ? '' : b.tap ? ' (number covered)' : ' (square covered)'}`).join(' '));
    await zoomOut(p);
    const back = await p.evaluate(() => {
      const g = document.querySelector('svg.ff-map g.ff-area__mk');
      return { opacity: +getComputedStyle(g).opacity, tap: g.querySelector('circle').getBoundingClientRect().width };
    });
    check(`${name}: one step out and the ${area} marker is back, a 44px target again`, back.opacity === 1 && back.tap >= 43.5, `opacity ${back.opacity}, ${back.tap.toFixed(0)}px`);
    await p.close();
  }
}

// ---- the info booth is a pin, everywhere, just above merch ----
// Phone, desktop and paper: a circle filled with --pin-info carrying the info
// glyph, drawn like every other pin. Never a booth square (Ernest, 9/19). And
// on the desktop overview it sits directly above merch with an 8-16px gap --
// as close as that allows, since the two are one spot with two jobs (Jess,
// 9/20); at the phone's first zoom step the two 44px targets may touch but
// not overlap, and the 375px phone is the case that decides it.
for (const [name, w, h, zoomFirst] of [['iPhone SE', 375, 667, true], ['mobile', 390, 800, true], ['desktop', 1440, 900, false]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  if (zoomFirst) { await p.locator('.zoomctl button').first().click(); await p.waitForTimeout(600); }
  const info = await p.evaluate(() => {
    const g = document.querySelector('svg.ff-map g.ffc-pin--info');
    if (!g) return { present: false };
    // :scope > g -- the drawn circle sits in the shadowed inner group; the
    // outer transparent circle is the 44px tap target, not the pin.
    const circle = g.querySelector(':scope > g circle'), glyph = g.querySelector(':scope > g svg');
    return { present: true, fill: circle && getComputedStyle(circle).fill, glyph: !!glyph, rects: g.querySelectorAll('rect').length,
             size: circle ? Math.round(circle.getBoundingClientRect().width) : 0 };
  });
  check(`${name}: the info booth draws as a pin in --pin-info`,
    info.present && info.fill === 'rgb(64, 126, 181)' && info.glyph && info.rects === 0 && Math.abs(info.size - 40) <= 1.5,
    info.present ? `${info.fill}, glyph ${info.glyph}, ${info.rects} rects, ${info.size}px` : 'no info pin drawn');
  // Desktop measures the drawn 40px circles (the visible gap); the phone
  // measures the 44px tap circles, the direct children of the pin groups.
  const stack = await p.evaluate((desktop) => {
    const at = (c) => { const r = document.querySelector(desktop ? `svg.ff-map g.ffc-pin--${c} > g circle` : `svg.ff-map g.ffc-pin--${c} > circle`).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, r: r.width / 2 }; };
    const i = at('info'), m = at('merch');
    return { dx: Math.abs(i.x - m.x), gap: (m.y - i.y) - i.r - m.r };
  }, w >= 1024);
  check(`${name}: the info pin sits directly above merch${w >= 1024 ? ', 8-16px clear' : ', targets touching or clear'}`,
    stack.dx <= 1 && (w >= 1024 ? stack.gap >= 8 && stack.gap <= 16 : stack.gap >= -0.5), `${stack.gap.toFixed(1)}px gap, ${stack.dx.toFixed(1)}px off centre`);
  await p.close();
}

// ---- pinch ----
// Testers reach for a pinch before the buttons (Amy, iPhone 16). The map has to
// follow the fingers while they move and land on a stop when they lift -- not
// step once, ignore the rest of the gesture, then step again.
{
  const p = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const width = async () => Number((await p.locator('svg.ff-map').getAttribute('viewBox')).split(' ')[2]);
  const w0 = await width();
  // Two pointers, spread from 60px apart to 200px in eight moves, then lift.
  const trace = await p.evaluate(async () => {
    const svg = document.querySelector('svg.ff-map');
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const ev = (type, id, x, y, target = svg) => target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }));
    const widths = [];
    ev('pointerdown', 1, cx - 30, cy); ev('pointerdown', 2, cx + 30, cy);
    for (let i = 1; i <= 8; i++) {
      const s = 30 + i * 8.75;
      ev('pointermove', 1, cx - s, cy, window); ev('pointermove', 2, cx + s, cy, window);
      await new Promise((r) => requestAnimationFrame(r));
      widths.push(Number(svg.getAttribute('viewBox').split(' ')[2]));
    }
    ev('pointerup', 1, cx - 100, cy, window); ev('pointerup', 2, cx + 100, cy, window);
    return widths;
  });
  await p.waitForTimeout(500);
  const w1 = await width();
  const monotone = trace.every((v, i) => i === 0 || v <= trace[i - 1] + 0.01);
  check('pinch: the map follows the fingers while they move', monotone && trace[trace.length - 1] < trace[0] * 0.8,
    trace.map((v) => Math.round(v)).join(' > '));
  // Spreading 60 -> 200px is x3.33; the closest stop is Detail (0.315). It
  // must land exactly on a stop, with the zoom-out button now live.
  check('pinch: it settles on a stop when the fingers lift', Math.abs(w1 - w0 * 0.315) < 1 || Math.abs(w1 - w0 * 0.565) < 1,
    `${Math.round(w0)} -> ${Math.round(w1)} (stops at ${Math.round(w0 * 0.565)} and ${Math.round(w0 * 0.315)})`);
  check('pinch: the buttons agree about where it landed',
    (await p.locator('.zoomctl button').nth(1).getAttribute('aria-disabled')) === 'false');
  check('pinch: numbers appear if it landed on Detail',
    Math.abs(w1 - w0 * 0.315) >= 1 || (await p.locator('svg.ff-map text').allTextContents()).some((t) => /^\d+$/.test(t)));

  // Only the map scales. A pin, its glyph and a street label hold one on-screen
  // size for the whole gesture and through the settle (Ernest, iPhone 9/19:
  // pins shrank under the fingers and popped back on release). Real two-finger
  // touch input through the DevTools protocol, measured every move -- the
  // synthetic pointer events above cannot reproduce a browser's touch path.
  await p.locator('.zoomctl button[aria-label="Reset to overview"]').click();
  await p.waitForTimeout(400);
  const cdp = await p.context().newCDPSession(p);
  const sizes = () => p.evaluate(() => {
    const pin = document.querySelector('svg.ff-map g.ffc-pin--kids g circle');
    const glyph = document.querySelector('svg.ff-map g.ffc-pin--kids g svg');
    const label = document.querySelector('svg.ff-map text');
    const mk = document.querySelector('svg.ff-map g.ff-area__mk');
    return { pin: pin.getBoundingClientRect().width, glyph: glyph.getBoundingClientRect().width, label: label.getBoundingClientRect().height,
             mk: +getComputedStyle(mk).opacity };
  });
  const cx = 196, cy = 500;
  const two = (s) => [{ x: cx - s, y: cy, id: 1 }, { x: cx + s, y: cy, id: 2 }];
  const run = async (spreads) => {
    const frames = [await sizes()];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: two(spreads[0]) });
    for (const s of spreads.slice(1)) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: two(s) });
      await p.waitForTimeout(40);
      frames.push(await sizes());
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    for (let i = 0; i < 6; i++) { await p.waitForTimeout(50); frames.push(await sizes()); }
    return frames;
  };
  const steady = (frames, key) => Math.max(...frames.map((f) => f[key])) - Math.min(...frames.map((f) => f[key])) <= 0.5;
  const report = (frames, key) => `${key} ${Math.min(...frames.map((f) => f[key])).toFixed(1)}–${Math.max(...frames.map((f) => f[key])).toFixed(1)}px`;
  const inward = await run([30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);
  check('pinch in: pin, glyph and label hold their on-screen size, gesture and settle',
    steady(inward, 'pin') && steady(inward, 'glyph') && steady(inward, 'label'),
    ['pin', 'glyph', 'label'].map((k) => report(inward, k)).join(', '));
  // The area markers cross-fade with the zoom, under the fingers and through
  // the settle: opacity moves one way per gesture, never jumps, and ends at 0
  // on Detail. Spreading x4 from the overview lands on Detail (see below).
  const fadeSteps = (frames) => frames.slice(1).map((f, i) => f.mk - frames[i].mk);
  const mkIn = inward.map((f) => f.mk);
  check('pinch in: the area markers fade out with the zoom, no pop, gone at Detail',
    fadeSteps(inward).every((d) => d <= 0.01 && d > -0.5) && mkIn[0] === 1 && mkIn[mkIn.length - 1] === 0,
    `opacity ${mkIn.map((v) => v.toFixed(2)).join(' > ')}`);
  const outward = await run([120, 110, 100, 90, 80, 70, 60, 50, 40, 30]);
  check('pinch out: pin, glyph and label hold their on-screen size, gesture and settle',
    steady(outward, 'pin') && steady(outward, 'glyph') && steady(outward, 'label'),
    ['pin', 'glyph', 'label'].map((k) => report(outward, k)).join(', '));
  const mkOut = outward.map((f) => f.mk);
  check('pinch out: the area markers fade back in, no pop, whole again at the stop',
    fadeSteps(outward).every((d) => d >= -0.01 && d < 0.5) && mkOut[0] === 0 && mkOut[mkOut.length - 1] === 1,
    `opacity ${mkOut.map((v) => v.toFixed(2)).join(' > ')}`);
  const wEnd = await width();
  check('pinch out: it landed back on a stop', [1, 0.565, 0.315].some((r) => Math.abs(wEnd - w0 * r) < 1),
    `${Math.round(wEnd)} (stops at ${[1, 0.565, 0.315].map((r) => Math.round(w0 * r)).join(' / ')})`);
  await p.close();
}

// ---- chrome must not swallow taps ----
// The topbar spans the full width. Its empty strip used to sit invisibly over
// any pin beneath it (Main Stage and Food Court on a landscape phone). A pin may
// be covered by a real control -- a chip, the zoom buttons -- but never by the
// bare bar around them.
for (const [name, w, h] of [['landscape phone', 844, 390], ['small phone', 320, 568], ['mobile', 390, 800]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const swallowed = await p.evaluate(({ w, h }) => {
    const out = [];
    for (const g of document.querySelectorAll('svg.ff-map g.ff-pin')) {
      const r = g.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > w || y > h) continue;
      const el = document.elementFromPoint(x, y);
      if (!el || el.closest('svg.ff-map g.ff-tap, button, a, .sheet, .sheetwrap')) continue;
      out.push(`${Math.round(x)},${Math.round(y)} under ${el.className?.baseVal ?? el.className ?? el.tagName}`);
    }
    return out;
  }, { w, h });
  check(`${name}: no pin hidden under empty chrome`, swallowed.length === 0, swallowed.join(' | '));
  await p.close();
}

// ---- tap semantics (decided 9/10) ----
// Single tap on a pin opens it. A second pin swaps the sheet rather than closing
// it. A double-tap on a pin is two opens, not a zoom; a double-tap on bare map
// zooms in. On desktop, a directory row for one place flies in a level.
for (const [name, w, h] of [['mobile', 390, 800], ['desktop', 1280, 900]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const title = async () => (await p.locator('.sheet .hd h3').allTextContents()).join('|');
  const centre = async (sel) => { const b = await p.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const vb = () => p.locator('svg.ff-map').getAttribute('viewBox');
  // Amenities only appear once you zoom in -- the overview carries destinations.
  await p.locator('.zoomctl button').first().click();
  await p.waitForTimeout(650);
  await safe(`${name}: second pin swaps the sheet`, async () => {
    await p.mouse.click(...await centre('g.ffc-pin--kids')); await p.waitForTimeout(400);
    await p.mouse.click(...await centre('g.ffc-pin--firstaid')); await p.waitForTimeout(400);
    const t = await title();
    check(`${name}: second pin swaps the sheet`, /First Aid/.test(t), t || '(closed)');
  });
  await safe(`${name}: double-tap on a pin opens, does not zoom`, async () => {
    const v0 = await vb();
    await p.mouse.dblclick(...await centre('g.ffc-pin--water')); await p.waitForTimeout(600);
    const t = await title();
    check(`${name}: double-tap on a pin opens, does not zoom`, /Water/.test(t) && v0 === await vb(), `${t || '(closed)'}; zoomed=${v0 !== await vb()}`);
  });
  if (w >= 1024) {
    await safe(`${name}: directory row flies in a level`, async () => {
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
      const w0 = Number((await vb()).split(' ')[2]);
      await p.locator('.sheetwrap').getByText('Main Stage', { exact: true }).first().click();
      await p.waitForTimeout(700);
      const w1 = Number((await vb()).split(' ')[2]);
      check(`${name}: directory row flies in a level`, w1 < w0 * 0.8, `${Math.round(w0)} -> ${Math.round(w1)} units wide`);
    });
  }
  await p.close();
}

// ---- the 9/11 design pass ----
for (const [name, w, h] of [['mobile', 390, 800], ['desktop', 1280, 900]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);

  // Blobs are area, not outline, and carry their category's own hue.
  await safe(`${name}: blobs have no stroke`, async () => {
    const strokes = await p.locator('svg.ff-map path[fill-opacity="0.34"]')
      .evaluateAll((els) => els.map((e) => getComputedStyle(e).stroke));
    check(`${name}: blobs have no stroke`, strokes.every((v) => v === 'none'), strokes.join(',') || '(none drawn here)');
  });

  // The document itself must never scroll -- that is what dragged the whole
  // screen down on a phone when the sheet took focus.
  const scrollable = await p.evaluate(() => {
    const e = document.scrollingElement;
    return e.scrollHeight > e.clientHeight + 1 || document.body.scrollHeight > window.innerHeight + 1;
  });
  check(`${name}: the page itself cannot scroll`, !scrollable);

  // Masthead: a link, no pill, and big.
  const brand = await p.locator('.ffc-brand').evaluate((el) => ({
    tag: el.tagName, href: el.getAttribute('href'),
    size: parseFloat(getComputedStyle(el.querySelector('.ffc-brand__name')).fontSize),
    caps: getComputedStyle(el.querySelector('.ffc-brand__name')).textTransform,
    bg: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopWidth,
  }));
  check(`${name}: masthead links out`, brand.tag === 'A' && !!brand.href, brand.href || brand.tag);
  // 48 by default, 36 on a phone -- at full size it took the top eighth of the
  // screen and pushed the chips down onto the park.
  const wantBrand = w <= 480 ? 28 : 48;
  check(`${name}: masthead is ${wantBrand}px, all caps, out of its pill`,
    brand.size === wantBrand && brand.caps === 'uppercase' && brand.border === '0px' && brand.bg === 'rgba(0, 0, 0, 0)',
    `${brand.size}px, ${brand.caps}, border ${brand.border}, bg ${brand.bg}`);

  // Booth squares sit square to the run they line, not to the screen.
  await safe(`${name}: car-path booths are rotated to the path`, async () => {
    await p.locator('.zoomctl button').first().click(); await p.waitForTimeout(600);
    await p.locator('.zoomctl button').first().click(); await p.waitForTimeout(600);
    const t = await p.locator('g.ff-area[data-area="spine"] rect[transform]').first().getAttribute('transform');
    const mcl = await p.locator('g.ff-area[data-area="mcl"] rect').first().getAttribute('transform');
    check(`${name}: car-path booths are rotated to the path`, (t || '').startsWith('rotate(36 '), t || '(none)');
    check(`${name}: street-market booths are not rotated`, mcl === null, mcl || 'no transform');
  });
  await p.close();
}

// Stepping a row holds the map still. It recentres only when the next booth
// would actually be out of sight -- and then the booth is never lost off screen.
//
// Both sizes, and the phone is the one that matters. This used to be checked on
// desktop only, where the directory takes WIDTH; it passed at 29 held of 30
// while the phone, where the sheet takes HEIGHT, was moving the map on 5 presses
// out of 12. A check that only runs on the roomy breakpoint is not a check.
for (const [name, vp, box] of [
  ['desktop', { width: 1280, height: 900 }, { x0: 80, y0: 220, x1: 700, y1: 650 }],
  ['mobile', { width: 390, height: 844 }, { x0: 60, y0: 200, x1: 330, y1: 420 }],
]) {
  const p = await browser.newPage({ viewport: vp, isMobile: name === 'mobile', hasTouch: name === 'mobile' });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.locator('.zoomctl button').first().click(); await p.waitForTimeout(620);
  await p.locator('.zoomctl button').first().click(); await p.waitForTimeout(620);
  const n = await p.locator('g.ff-booth').count();
  for (let i = 0; i < n; i++) {
    const bb = await p.locator('g.ff-booth').nth(i).boundingBox();
    if (!bb || bb.x < box.x0 || bb.y < box.y0 || bb.x > box.x1 || bb.y > box.y1) continue;
    await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); break;
  }
  await p.waitForTimeout(450);
  const vbOf = () => p.locator('svg.ff-map').getAttribute('viewBox');
  const selPos = () => p.evaluate(() => {
    const r = [...document.querySelectorAll('g.ff-booth rect')].find((e) => (e.getAttribute('fill') || '').includes('navy'));
    if (!r) return null;
    const b = r.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  const steps = name === 'mobile' ? 12 : 30;
  let held = 0, moved = 0, lost = 0;
  for (let i = 0; i < steps; i++) {
    const before = await vbOf();
    await p.locator('.boothnav button').nth(1).click();
    await p.waitForTimeout(300);
    if (await vbOf() === before) held++; else moved++;
    const s = await selPos();
    if (!s || s.x < 0 || s.y < 0 || s.x > vp.width || s.y > vp.height) lost++;
  }
  check(`${name}: stepping mostly holds the map still`, held >= Math.ceil(steps * 0.8),
    `held ${held} of ${steps}, moved ${moved}`);
  check(`${name}: the selected booth is never lost off screen`, lost === 0, `${lost} step(s) off screen`);
  // The other half of the contract, and the reason this is not just `held === steps`:
  // walk a row far enough and it does leave the screen, and then the map must follow.
  // Asserted on desktop, where 30 presses reliably walk a row off the edge.
  if (name === 'desktop') check('desktop: but it does recentre when the row walks off', moved >= 1, `${moved} recentre(s)`);
  await p.close();
}

// The open sheet does NOT count as covering the map for that hold: a booth
// behind it is still on screen, and moving for it is the lurch the stepper
// exists to avoid. So the phone has to keep most of its screen as live map.
{
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.locator('.zoomctl button').first().click(); await p.waitForTimeout(620);
  await p.locator('.zoomctl button').first().click(); await p.waitForTimeout(620);
  const n = await p.locator('g.ff-booth').count();
  for (let i = 0; i < n; i++) {
    const bb = await p.locator('g.ff-booth').nth(i).boundingBox();
    if (!bb || bb.x < 60 || bb.y < 200 || bb.x > 330 || bb.y > 420) continue;
    await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); break;
  }
  await p.waitForTimeout(450);
  const h = await p.evaluate(() => Math.round(document.querySelector('.sheet.open').getBoundingClientRect().height));
  check('mobile: a booth sheet leaves most of the phone as map', h <= 320, `sheet ${h}px of 844`);
  const foot = await p.locator('.sheet .foot').textContent();
  check('mobile: the booth footer says where the position came from',
    /official map/.test(foot || ''), foot || '(none)');
  await p.close();
}

// Swapping one sheet for another is a move, not a cut: it drops away, the
// content changes off screen, and the new one rises. Budget 0.3-0.4s.
{
  const p = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const at = async (sel) => { const b = await p.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  await p.locator('.zoomctl button').first().click();   // amenities appear here
  await p.waitForTimeout(650);
  await p.mouse.click(...await at('g.ffc-pin--kids'));
  await p.waitForTimeout(600);
  const t0 = Date.now();
  await p.mouse.click(...await at('g.ffc-pin--firstaid'));
  const frames = [];
  for (let i = 0; i < 20; i++) {
    frames.push(await p.evaluate((t) => {
      const el = document.querySelector('.sheet');
      return { ms: Date.now() - t, y: Math.round(new DOMMatrix(getComputedStyle(el).transform).m42),
               title: document.querySelector('.sheet .hd h3')?.textContent || '' };
    }, t0));
    await p.waitForTimeout(25);
  }
  const drop = Math.max(...frames.map((f) => f.y));
  const settled = frames.find((f, i) => i > 3 && f.y === 0 && /First Aid/.test(f.title));
  check('mobile: a sheet swap drops out of the way first', drop > 40, `${drop}px drop`);
  check('mobile: the swap lands inside 0.4s', !!settled && settled.ms <= 450, settled ? `${settled.ms}ms` : 'never settled');
  check('mobile: the swap ends on the new content',
    /First Aid/.test(frames[frames.length - 1].title) && frames[frames.length - 1].y === 0,
    `${frames[frames.length - 1].title} at y=${frames[frames.length - 1].y}`);
  await p.close();
}

// Closing has to be a move too. The content used to unmount the instant the
// sheet closed, collapsing it to nothing -- and a zero-height sheet has no
// height to translate, so closing read as vanishing rather than leaving.
// And the grip is a real handle now: drag it down and the sheet follows.
{
  const p = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const at = async (sel) => { const b = await p.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  const state = () => p.evaluate(() => {
    const el = document.querySelector('.sheet');
    return { y: Math.round(new DOMMatrix(getComputedStyle(el).transform).m42),
             h: Math.round(el.getBoundingClientRect().height),
             open: el.classList.contains('open') };
  });

  await p.mouse.click(...await at('g.ffc-pin--kids'));
  await p.waitForTimeout(600);
  const openH = (await state()).h;
  await p.mouse.click(30, 300);                       // tap the bare map to close
  const frames = [];
  for (let i = 0; i < 8; i++) { frames.push(await state()); await p.waitForTimeout(30); }
  const slid = frames.filter((f) => f.y > 10 && f.h >= openH - 2);
  check('mobile: closing slides the sheet down rather than vanishing',
    slid.length >= 3, `${slid.length} frames mid-slide at full height (${openH}px)`);

  // Drag the grip: the sheet follows the finger, and a real pull dismisses it.
  await p.mouse.click(...await at('g.ffc-pin--kids'));
  await p.waitForTimeout(600);
  const g = await p.locator('.griparea').boundingBox();
  check('mobile: the grip is a 44px grab area', g.height >= 44, `${Math.round(g.height)}px`);
  await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await p.mouse.down();
  const follow = [];
  for (const dy of [20, 80, 160, 230]) { await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + dy); follow.push((await state()).y); }
  await p.mouse.up();
  await p.waitForTimeout(500);
  check('mobile: the sheet follows the grip', follow[0] > 0 && follow[3] > follow[0], follow.join(' -> '));
  check('mobile: a real pull dismisses it', !(await state()).open);

  // A small tug is not a dismissal.
  await p.mouse.click(...await at('g.ffc-pin--kids'));
  await p.waitForTimeout(600);
  await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await p.mouse.down();
  await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + 18);
  await p.mouse.up();
  await p.waitForTimeout(450);
  const after = await state();
  check('mobile: a small tug springs back', after.open && after.y === 0, `open=${after.open} y=${after.y}`);
  await p.close();
}

// All three filters have to be on screen at once on a phone -- a chip you have
// to discover by swiping is a chip you will not find.
{
  for (const [name, w, h] of [['iPhone 390', 390, 844], ['iPhone 430', 430, 932]]) {
    const p = await browser.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
    await p.goto(BASE, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const c = document.querySelector('.chips');
      const last = c.children[c.children.length - 1].getBoundingClientRect();
      return { headroom: Math.round(window.innerWidth - last.right),
               needsScroll: c.scrollWidth > c.clientWidth,
               // The PAINTED pill is shorter than the floor on a phone; the tap
               // area is an ::after that extends past it. Measure the target,
               // not the paint -- they are deliberately different now.
               paintedHeight: Math.round(c.children[0].getBoundingClientRect().height),
               tapHeight: Math.round(parseFloat(getComputedStyle(c.children[0], '::after').height)),
               tapTop: Math.round(parseFloat(getComputedStyle(c.children[0], '::after').top)),
               brand: Math.round(parseFloat(getComputedStyle(document.querySelector('.ffc-brand__name')).fontSize)) };
    });
    check(`${name}: all three chips fit without scrolling`, !r.needsScroll && r.headroom > 20, `${r.headroom}px to spare`);
    check(`${name}: the pill is painted shorter than the floor`, r.paintedHeight < 44, `${r.paintedHeight}px painted`);
    check(`${name}: ...but a thumb still gets 44px`, r.tapHeight >= 44 && r.tapTop <= 0,
      `${r.tapHeight}px tap area, ${r.tapTop}px above the pill`);
    check(`${name}: masthead is 28px on a phone`, r.brand === 28, `${r.brand}px`);
    await p.close();
  }
}

// The icons a phone uses when the map is saved to a home screen.
{
  const p = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  const icons = await p.evaluate(() => [...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')].map((l) => l.href));
  let allOk = icons.length >= 3;
  for (const href of icons) {
    const res = await p.request.get(href);
    if (!res.ok()) allOk = false;
  }
  check('every declared icon resolves', allOk, `${icons.length} icons: ${icons.map((h) => h.split('/').pop()).join(', ')}`);
  await p.close();
}

// The lockup should sit in even air. It is set all caps, so the bottom quarter
// of its line box is empty descender space -- that made the gap below the logo
// half again the gap above it (19px against 13) while both margins read
// --space-3 and looked correct in the CSS. Measured optically, from the caps.
for (const [name, w, h] of [['mobile', 390, 844], ['desktop', 1280, 900]]) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const g = await p.evaluate(async () => {
    await document.fonts.ready;
    const bar = document.querySelector('.topbar');
    const brand = document.querySelector('.ffc-brand__name');
    const chip = document.querySelector('.ffc-chip');
    const cs = getComputedStyle(brand);
    const cv = document.createElement('canvas').getContext('2d');
    cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = cv.measureText('FALL FEST');
    const box = brand.getBoundingClientRect();
    const L = parseFloat(cs.fontSize);
    const baseline = (L - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
    return {
      above: Math.round(box.top + baseline - m.actualBoundingBoxAscent - bar.getBoundingClientRect().top),
      below: Math.round(chip.getBoundingClientRect().top - (box.top + baseline + m.actualBoundingBoxDescent)),
    };
  });
  check(`${name}: the logo sits in even air`, Math.abs(g.above - g.below) <= 2,
    `${g.above}px above the caps, ${g.below}px below`);
  await p.close();
}

// No blue flash on a booth tap. The highlight paints over the nearest clickable
// ancestor, and a booth's is its whole area group -- so the default put a
// screen-sized box on screen every time you tapped one.
{
  const p = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const hl = await p.locator('svg.ff-map').evaluate((el) => ({
    tap: getComputedStyle(el).webkitTapHighlightColor,
    select: getComputedStyle(el).userSelect,
  }));
  check('mobile: no tap-highlight flash on the map',
    /rgba\(0, 0, 0, 0\)|transparent/.test(hl.tap), hl.tap);
  check('mobile: map text cannot be selected by a drag', hl.select === 'none', hl.select);
  await p.close();
}

// Sheet bullets take the colour of the thing you opened, not one shared teal.
{
  const p = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.locator('g.ffc-pin--kids').first().click();
  await p.waitForTimeout(400);
  const bullet = await p.locator('.li .b').first().evaluate((e) => getComputedStyle(e).backgroundColor);
  check('mobile: sheet bullets match the pin you opened', bullet === 'rgb(194, 91, 126)', `${bullet} (want --pin-kids)`);
  // The stepper belongs above the title: where you are, then what you are looking at.
  await p.close();
}

// ---- the map has to work with no signal ----
// Ten thousand people share a few cell towers at Candler Park in October. This
// is the case the service worker exists for, and it is worth a real test: the
// first version of it cached everything correctly and still served a blank
// green screen, because "Vary: Origin" made every script and stylesheet miss.
// The printed sheet is a route of the same app: every booth on it, none of the
// phone chrome, and it does not disturb the map route's own layout.
{
  const p = await browser.newPage({ viewport: { width: 1632, height: 1056 } });
  await p.goto(`${BASE}/?print=1`, { waitUntil: 'networkidle' });
  await p.waitForSelector('.print-page', { timeout: 5000 }).catch(() => {});
  const pr = await p.evaluate(() => ({
    page: !!document.querySelector('.print-page'),
    numbers: document.querySelectorAll('.print-map rect + text').length,
    chrome: document.querySelectorAll('.zoomctl, .ffc-chip, .sheet').length,
    index: document.querySelectorAll('.print-index li').length,
    unnumbered: document.querySelectorAll('.print-booth--unnumbered').length,
    infoPin: (() => { const c = document.querySelector('.print-pin--info circle'); return c ? getComputedStyle(c).fill : 'none'; })(),
    infoGlyph: !!document.querySelector('.print-pin--info svg'),
    infoRects: document.querySelectorAll('.print-pin--info rect').length,
    text: document.querySelector('.print-side').innerText,
    // The run labels only: the map's textContent runs every booth number
    // together, so "41 42" would read as "142".
    runLabels: [...document.querySelectorAll('.print-map text')].map((t) => t.textContent).filter((t) => /^Art Market|^K\d/.test(t)),
    overflow: (() => { const el = document.querySelector('.print-side'); return el ? el.scrollHeight - el.clientHeight : -1; })(),
  }));
  check('print: the sheet renders at /?print=1', pr.page);
  check('print: the info booth is a pin in --pin-info, not a square', pr.infoPin === 'rgb(64, 126, 181)' && pr.infoGlyph && pr.infoRects === 0,
    `${pr.infoPin}, glyph ${pr.infoGlyph}, ${pr.infoRects} rects`);
  // 58 + 27 + 54 numbered art booths, 11 Kidlandia, 16 food stalls. The two
  // unnumbered squares print with no number, so they are not counted here.
  check('print: every booth square carries its number', pr.numbers === 58 + 27 + 54 + 11 + 16, `${pr.numbers} numbers`);
  check('print: the two unnumbered artists have a square', pr.unnumbered === 2, `${pr.unnumbered} squares`);
  // innerText carries the heading's CSS uppercase, hence the /i.
  check('print: the public count is "over 130 artists", never a booth total',
    /over 130 artists/i.test(pr.text) && !/\b1[3-6]\d booths\b/i.test(pr.text) && !pr.text.includes('164'));
  check('print: run endpoints on the map come from the sheet',
    pr.runLabels.some((t) => t.includes('82–139')) && pr.runLabels.some((t) => t.includes('K0–K10')) && !pr.runLabels.some((t) => t.includes('142')) && !pr.text.includes('142'),
    pr.runLabels.join(' | '));
  check('print: no phone chrome on paper', pr.chrome === 0, `${pr.chrome} controls`);
  check('print: the artist index is on the sheet', pr.index >= 140, `${pr.index} rows`);
  check('print: the side column fits the page', pr.overflow <= 0, `${pr.overflow}px over`);
  await p.close();
}

// Nothing in the console but "failed to fetch". Only opening it offline catches
// that.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, serviceWorkers: 'allow' });
  const warm = await ctx.newPage();
  await warm.goto(BASE, { waitUntil: 'networkidle' });
  await warm.waitForTimeout(1000);
  // `ready` never resolves if sw.js is missing or served as HTML (a plain
  // `vite build` empties dist and drops it; `npm run build` writes it), so the
  // wait is bounded: a missing worker is a failure to report, not a hang.
  const sw = await warm.evaluate(async () => {
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 8000))]);
    if (!reg) return { active: false, cache: '(no service worker registered in 8s -- was sw.js built?)', entries: 0 };
    const keys = await caches.keys();
    const c = await caches.open(keys[0]);
    return { active: !!reg.active, cache: keys[0], entries: (await c.keys()).length };
  });
  check('a service worker takes control', sw.active && String(sw.cache).startsWith('fallfest-'), sw.cache);
  check('the whole map is precached', sw.entries >= 15, `${sw.entries} files`);
  await warm.close();

  // No signal, fresh tab -- someone opening the map at the gate.
  await ctx.setOffline(true);
  const p = await ctx.newPage();
  const failed = [];
  p.on('requestfailed', (r) => failed.push(r.url().replace(BASE, '')));
  await p.goto(BASE, { waitUntil: 'load' }).catch(() => {});
  await p.waitForTimeout(1800);
  const off = await p.evaluate(() => ({
    markers: document.querySelectorAll('svg.ff-map g.ff-pin, svg.ff-map g.ff-area').length,
    basemap: document.querySelectorAll('svg.ff-map path').length,
    chips: document.querySelectorAll('.ffc-chip').length,
    // Both faces have to survive the network being gone: Brice for the
    // masthead, Manrope for everything else.
    // The faces the overview actually paints with. check() only reports what has
    // been fetched, and a weight nothing on screen uses is never fetched -- so
    // asking about a weight the overview does not paint proves nothing.
    brice: document.fonts.check('900 36px Brice'),
    manrope: document.fonts.check('400 15px Manrope') && document.fonts.check('700 14px Manrope'),
  }));
  check('offline: the map draws', off.markers >= 6 && off.basemap > 20, `${off.markers} markers, ${off.basemap} basemap paths`);
  check('offline: the chrome draws', off.chips === 3, `${off.chips} chips`);
  check('offline: the real fonts are there, not fallbacks', off.brice && off.manrope,
    `Brice ${off.brice ? 'loaded' : 'MISSING'}, Manrope ${off.manrope ? 'loaded' : 'MISSING'}`);
  check('offline: nothing failed to load', failed.length === 0, failed.join(' | '));

  // and it is still usable, not just visible
  const bb = await p.locator('g.ffc-pin--kids').first().boundingBox();
  await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await p.waitForTimeout(600);
  check('offline: tapping a pin still opens its detail',
    (await p.locator('.sheet .hd h3').first().textContent()) === 'Kidlandia');
  await p.locator('.sheet .close').click();
  await p.waitForTimeout(500);
  const before = await p.locator('svg.ff-map').getAttribute('viewBox');
  await p.locator('.zoomctl button').first().click();
  await p.waitForTimeout(700);
  check('offline: zoom still works', (await p.locator('svg.ff-map').getAttribute('viewBox')) !== before);
  await ctx.close();
}

check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '));

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('\nFAILURES:');
  for (const f of failed) console.log(`  - ${f.name}${f.detail ? `  — ${f.detail}` : ''}`);
}
process.exit(failed.length ? 1 : 0);
