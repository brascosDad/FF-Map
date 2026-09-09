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
const GAP = 16, PANEL = { tablet: 300, desktop: 380 };

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

/** First tappable map feature whose box is actually inside the viewport. */
async function visibleTap(p, w, h) {
  const n = await p.locator('svg.ff-map g.ff-tap').count();
  for (let i = 0; i < n; i++) {
    const b = await p.locator('svg.ff-map g.ff-tap').nth(i).boundingBox();
    if (b && b.x > 4 && b.y > 4 && b.x + b.width < w - 4 && b.y + b.height < h - 4) return b;
  }
  return null;
}

const SIZES = [['mobile', 390, 800], ['tablet', 834, 1112], ['desktop', 1440, 900]];
const reserveFor = (w, docked) => (docked ? (w >= 1180 ? PANEL.desktop : PANEL.tablet) + GAP * 2 : 0);

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
const zoomIn = async (p) => { await p.locator('.zbtn').first().click(); await p.waitForTimeout(600); };
const zoomOut = async (p) => { await p.locator('.zbtn').last().click(); await p.waitForTimeout(600); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pageErrors = [];

for (const [name, w, h] of SIZES) {
  console.log(`\n=== ${name} ${w}x${h} ===`);
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => pageErrors.push(`${name}: ${e.message}`));
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const docked = (await p.locator('.ff-screen.docked').count()) > 0;
  const isDesktop = w >= 1180;
  const reserve = reserveFor(w, docked);

  // ---- layout ----
  check(`${name}: ${docked ? 'docked panel' : 'bottom sheet'} at this width`, docked === (w >= 768));
  if (docked) {
    const panel = await p.locator('.sheetwrap').boundingBox();
    const gaps = [panel.x + panel.width - (w - GAP), panel.y - GAP, (h - GAP) - (panel.y + panel.height)];
    check(`${name}: panel inset ${GAP}px on all three sides`,
      gaps.every((g) => Math.abs(g) <= 1.5), `right/top/bottom off by ${gaps.map((g) => g.toFixed(1)).join('/')}`);
    check(`${name}: panel width ${isDesktop ? PANEL.desktop : PANEL.tablet}px`,
      Math.abs(panel.width - (isDesktop ? PANEL.desktop : PANEL.tablet)) <= 1.5, `${panel.width.toFixed(0)}px`);
    check(`${name}: panel shows resting summary, not a blank card`,
      (await p.locator('.panel-list').count()) > 0);
  }

  // ---- no grey header scrim ----
  const scrim = await p.locator('.topbar').evaluate((el) => getComputedStyle(el).backgroundImage);
  check(`${name}: no grey header band`, scrim === 'none', scrim);

  // ---- overview semantics ----
  const blobCount = await p.locator('svg.ff-map path[stroke-opacity="0.5"]').count();
  check(`${name}: overview shows ${isDesktop ? 'squares (desktop)' : 'blobs'}`,
    isDesktop ? blobCount === 0 : blobCount > 0, `${blobCount} blob paths`);
  const labels = await p.locator('svg.ff-map text').allTextContents();
  check(`${name}: no pin labels at overview`,
    !labels.some((t) => /Kidlandia|Main Stage|Acoustic|Food Court|Art Market/.test(t)), labels.join(' | '));
  check(`${name}: street names kept at overview`,
    labels.some((t) => t.includes('Candler Park Dr')) && labels.some((t) => t.includes('McLendon Ave')));
  check(`${name}: no zoom-level readout`, (await p.locator('.zlevel').count()) === 0);

  // ---- zoom buttons ----
  check(`${name}: zoom-out disabled at overview`,
    (await p.locator('.zbtn').last().getAttribute('class')).includes('disabled'));
  const zc = await p.locator('.zoomctl').boundingBox();
  const lc = await p.locator('.locate').boundingBox();
  check(`${name}: locate matches zoom button size`,
    Math.abs(lc.width - 42) <= 1 && Math.abs(lc.height - 42) <= 1, `${lc.width}x${lc.height}`);
  check(`${name}: gap between zoom group and locate`,
    lc.y - (zc.y + zc.height) > 4, `${(lc.y - (zc.y + zc.height)).toFixed(0)}px`);

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
    (await p.locator('.zbtn').first().getAttribute('class')).includes('disabled'));

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

  // ---- filters ----
  await safe(`${name}: filters`, async () => {
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await zoomIn(p);
    await p.locator('.chip', { hasText: 'Restrooms' }).click();
    await p.waitForTimeout(450);
    const dimmed = await p.locator('svg.ff-map g[opacity="0.28"]').count();
    check(`${name}: filter dims non-matching pins`, dimmed > 0, `${dimmed} dimmed`);
    check(`${name}: filter resets to overview`,
      (await p.locator('.zbtn').last().getAttribute('class')).includes('disabled'));
    await p.locator('.chip', { hasText: 'Restrooms' }).click();
    await p.waitForTimeout(450);
    check(`${name}: filter toggles off`,
      (await p.locator('svg.ff-map g[opacity="0.28"]').count()) === 0);
  });

  await p.screenshot({ path: `${OUT}/${name}.png` });
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
