// Visual regression: three screenshots against approved baselines.
//
//     node scripts/visual.mjs             # compare (what `npm run test:e2e` runs)
//     node scripts/visual.mjs --update    # accept what renders now as the baselines
//
// The cases are the surfaces people see first: the phone as it opens, the
// phone with a bottom sheet open, and the print sheet. Each renders at a fixed
// viewport, device scale 1, motion reduced, and is diffed pixel by pixel
// against tests/visual/<case>.png. A case fails when more than MAX_DIFF of its
// pixels differ; the actual render and a diff image land in .e2e-out/visual/
// so the failure can be looked at.
//
// A visual change FAILS until someone updates the baseline on purpose:
//   1. look at .e2e-out/visual/<case>-diff.png and decide the change is right
//   2. node scripts/visual.mjs --update
//   3. commit tests/visual/*.png with the change, and say in the PR which
//      baselines changed and why
// See tests/visual/README.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { BASE, launch } from './lib/browser.mjs';

const BASELINES = 'tests/visual';
const OUT = '.e2e-out/visual';
const UPDATE = process.argv.includes('--update');
// Share of pixels allowed to differ before a case fails. Anti-aliasing on a
// different GPU or OS moves edge pixels; a moved pin or a changed label moves
// far more than this.
const MAX_DIFF = 0.001;
// pixelmatch's own per-pixel colour threshold (0..1); 0.1 ignores sub-pixel
// font hinting, catches any real colour change.
const THRESHOLD = 0.1;

const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' };
const CASES = [
  { name: 'phone-open', path: '/', ctx: phone },
  {
    name: 'sheet-open', path: '/', ctx: phone,
    // Kidlandia: a destination pin that is on the opening view at every size.
    act: async (p) => {
      const b = await p.locator('g.ffc-pin--kids').first().boundingBox();
      await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await p.waitForTimeout(500);
    },
  },
  { name: 'print', path: '/?print=1', ctx: { viewport: { width: 1632, height: 1056 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }, fullPage: true },
];

mkdirSync(OUT, { recursive: true });
mkdirSync(BASELINES, { recursive: true });
const browser = await launch();
let failed = 0, updated = 0;
for (const { name, path, ctx, act, fullPage } of CASES) {
  const page = await browser.newPage(ctx);
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  if (act) await act(page);
  const shot = await page.screenshot({ fullPage });
  await page.close();

  const file = join(BASELINES, `${name}.png`);
  if (UPDATE || !existsSync(file)) {
    writeFileSync(file, shot);
    updated++;
    console.log(`  ${existsSync(file) && !UPDATE ? 'new ' : 'updated'}  ${file}`);
    continue;
  }
  const want = PNG.sync.read(readFileSync(file));
  const got = PNG.sync.read(shot);
  if (want.width !== got.width || want.height !== got.height) {
    failed++;
    writeFileSync(join(OUT, `${name}-actual.png`), shot);
    console.log(`  FAIL  ${name}: size ${got.width}x${got.height}, baseline ${want.width}x${want.height}`);
    continue;
  }
  const diff = new PNG({ width: want.width, height: want.height });
  const bad = pixelmatch(want.data, got.data, diff.data, want.width, want.height, { threshold: THRESHOLD });
  const share = bad / (want.width * want.height);
  if (share > MAX_DIFF) {
    failed++;
    writeFileSync(join(OUT, `${name}-actual.png`), shot);
    writeFileSync(join(OUT, `${name}-diff.png`), PNG.sync.write(diff));
    console.log(`  FAIL  ${name}: ${bad} pixels differ (${(share * 100).toFixed(3)}%) -- see ${OUT}/${name}-diff.png`);
  } else {
    console.log(`  pass  ${name}${bad ? `  (${bad} pixels within tolerance)` : ''}`);
  }
}
await browser.close();

if (updated) console.log(`\n${updated} baseline(s) written to ${BASELINES}/ -- commit them, and say in the PR what changed and why.`);
if (failed) {
  console.log(`\n${failed} visual case(s) changed. If the change is intended: node scripts/visual.mjs --update, commit tests/visual/, explain in the PR.`);
  process.exit(1);
}
