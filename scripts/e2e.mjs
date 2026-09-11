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
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.E2E_BASE || 'http://localhost:4310';
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

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
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
      (await p.locator('.panel-foot .ffc-legend__dot').count()) === 10,
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
    const chip = await p.locator('.ffc-chip').first().boundingBox();
    check(`${name}: chip meets the 44px touch target`, chip && chip.height >= 43, `${chip?.height?.toFixed(0)}px tall`);
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

  // ---- pins hold a constant screen size across zooms ----
  await safe(`${name}: pin size constant across zoom`, async () => {
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    // measure a category pin specifically -- area markers are a separate class
    const sizeAt = async () => {
      const b = await p.locator('svg.ff-map g.ff-pin circle').first().boundingBox();
      return b ? b.width : null;
    };
    const s0 = await sizeAt();
    await zoomIn(p);
    const s1 = await sizeAt();
    await zoomIn(p);
    const s2 = await sizeAt();
    const sizes = [s0, s1, s2].filter(Boolean);
    const spread = Math.max(...sizes) - Math.min(...sizes);
    check(`${name}: pin size constant across zoom`, spread <= 2,
      sizes.map((v) => v.toFixed(0)).join(' / ') + 'px');
    check(`${name}: pin meets the 40px touch target`, Math.min(...sizes) >= 39,
      `${Math.min(...sizes).toFixed(0)}px`);
    const area = await p.locator('svg.ff-map g.ff-area circle').first().boundingBox();
    check(`${name}: area marker also meets 40px`, !!area && area.width >= 39,
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

  // ---- the 16th food stall has no vendor in last year's 15-name list ----
  await safe(`${name}: stall with no vendor still reads sensibly`, async () => {
    const bad = await p.evaluate(() => {
      // BOOTHS.food[15] has no vendor; make sure nothing renders "undefined"
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
    check(`${name}: total matches the area, not all booths`,
      [74, 27, 62, 16].includes(start.total), `${start.total} in ${start.area}`);

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
  check(`${name}: masthead is 48px, all caps, out of its pill`,
    brand.size === 48 && brand.caps === 'uppercase' && brand.border === '0px' && brand.bg === 'rgba(0, 0, 0, 0)',
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
{
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.locator('.zoomctl button').first().click(); await p.waitForTimeout(620);
  await p.locator('.zoomctl button').first().click(); await p.waitForTimeout(620);
  const n = await p.locator('g.ff-booth').count();
  for (let i = 0; i < n; i++) {
    const bb = await p.locator('g.ff-booth').nth(i).boundingBox();
    if (!bb || bb.x < 80 || bb.y < 220 || bb.x > 700 || bb.y > 650) continue;
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
  let held = 0, moved = 0, lost = 0;
  for (let i = 0; i < 30; i++) {
    const before = await vbOf();
    await p.locator('.boothnav button').nth(1).click();
    await p.waitForTimeout(300);
    if (await vbOf() === before) held++; else moved++;
    const s = await selPos();
    if (!s || s.x < 0 || s.y < 0 || s.x > 1280 || s.y > 900) lost++;
  }
  check('desktop: stepping mostly holds the map still', held >= 24, `held ${held} of 30, moved ${moved}`);
  check('desktop: but it does recentre when the row walks off', moved >= 1, `${moved} recentre(s)`);
  check('desktop: the selected booth is never lost off screen', lost === 0, `${lost} step(s) off screen`);
  await p.close();
}

// Swapping one sheet for another is a move, not a cut: it drops away, the
// content changes off screen, and the new one rises. Budget 0.3-0.4s.
{
  const p = await browser.newPage({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const at = async (sel) => { const b = await p.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
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

check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '));

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log('\nFAILURES:');
  for (const f of failed) console.log(`  - ${f.name}${f.detail ? `  — ${f.detail}` : ''}`);
}
process.exit(failed.length ? 1 : 0);
