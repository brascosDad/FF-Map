// Visual regression: three screenshots against approved baselines.
//
//     node scripts/visual.mjs                  # compare (what `npm run test:e2e` runs)
//     node scripts/visual.mjs --accept=<json>  # the accept Action: write the baselines,
//                                              # but only if the render is the one shown
//     node scripts/visual.mjs --update         # write what renders now, no questions (local use)
//
// The cases are the surfaces people see first: the phone as it opens, the
// phone with a bottom sheet open, and the print sheet. Each renders at a fixed
// viewport, device scale 1, motion reduced, and is diffed pixel by pixel
// against tests/visual/<case>.png. A case fails when more than MAX_DIFF of its
// pixels differ. That share is only the trigger: what a person judges is the
// "from → to" image (scripts/lib/from-to.mjs), written for every failed case to
// .e2e-out/visual/<case>-from-to.png -- the old position of each element that
// moved as a ghost, the new one solid with a dashed outline -- with one plain
// line per change, in pin-widths. Next to each baseline, tests/visual/<case>.json
// records where every named element sat in it; that is how the from → to knows
// what moved. The failed cases, their lines and a hash of each new render go to
// .e2e-out/visual/from-to.json, which CI posts as a PR comment
// (scripts/visual-comment.mjs).
//
// The baselines are the CI runner's renders. Text rasterises differently on
// every OS and Chromium build (a laptop's phone-open differed from the
// runner's by 0.4% of pixels, the print sheet by 3.8% -- more than a moved
// pin), so one machine has to own them, and the one that gates the PR is it.
// So: on CI (the CI env var, set by GitHub Actions) a mismatch fails the
// suite; elsewhere it is reported but does not fail, because a local diff
// cannot tell a real change from a different font engine. A visual change
// therefore FAILS the PR until it is accepted on purpose:
//   1. CI posts the from → to comment on the PR, with the render's hash
//   2. Ernest looks at it and, if those are the changes he wants, puts the
//      "accept-visual-changes" label on the PR
//   3. the Action re-renders on the runner with --accept: if every changed
//      case still hashes to what the comment showed, it commits the
//      baselines; if not, the branch changed since, so it posts a fresh
//      from → to and asks again
// See tests/visual/README.md and docs/checks-and-review.md.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { BASE, launch } from './lib/browser.mjs';
import { collectElements, compareElements, describe, drawFromTo, inPinWidths, pinWidth, renderHash, unexplainedRegions } from './lib/from-to.mjs';

const BASELINES = 'tests/visual';
const OUT = '.e2e-out/visual';
const REPORT = join(OUT, 'from-to.json');
const UPDATE = process.argv.includes('--update');
const ACCEPT = process.argv.find((a) => a.startsWith('--accept='))?.slice(9);
const CI = Boolean(process.env.CI);
// Share of pixels allowed to differ before a case fails. Anti-aliasing on a
// different GPU or OS moves edge pixels; a moved pin or a changed label moves
// far more than this. The trigger only: no person is shown this number.
const MAX_DIFF = 0.001;
// pixelmatch's own per-pixel colour threshold (0..1); 0.1 ignores sub-pixel
// font hinting. It does NOT catch every colour change: PR #18 moved merch from
// #9E3F94 to #AF4FA5 and passed under it. That is by design (decided 10/18,
// both values kept): this check's job is LAYOUT -- something moved, appeared
// or vanished in its three snapshots. Colour is checked at the token, by the
// palette rules (npm run ds -- check-palette, npm run test:ds), not at the
// pixel. What this check cannot see: docs/checks-and-review.md.
const THRESHOLD = 0.1;
// At most this many named changes get a line each; the rest are counted.
const MAX_LINES = 12;

const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' };
const CASES = [
  { name: 'phone-open', title: 'Phone at open', path: '/', ctx: phone },
  {
    name: 'sheet-open', title: 'Phone with the Kidlandia sheet open', path: '/', ctx: phone,
    // Kidlandia: a destination pin that is on the opening view at every size.
    act: async (p) => {
      const b = await p.locator('g.ffc-pin--kids').first().boundingBox();
      await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await p.waitForTimeout(500);
    },
  },
  { name: 'print', title: 'Print sheet', path: '/?print=1', ctx: { viewport: { width: 1632, height: 1056 }, deviceScaleFactor: 1, reducedMotion: 'reduce' }, fullPage: true },
];

const r1 = (n) => Math.round(n * 10) / 10;
const manifest = (elements, hash) => JSON.stringify({
  note: 'Where each named element sits in the baseline PNG beside this file. Written with it by scripts/visual.mjs; do not hand-edit.',
  hash, pinWidth: pinWidth(elements),
  elements: elements.map(({ box, ...e }) => ({ ...e, box: { x: r1(box.x), y: r1(box.y), w: r1(box.w), h: r1(box.h) } })),
}, null, 1) + '\n';
const writeBaseline = (name, shot, elements, hash) => {
  writeFileSync(join(BASELINES, `${name}.png`), shot);
  writeFileSync(join(BASELINES, `${name}.json`), manifest(elements, hash));
};

mkdirSync(OUT, { recursive: true });
mkdirSync(BASELINES, { recursive: true });
rmSync(REPORT, { force: true });
if (UPDATE && !CI) console.log('  note: baselines are the CI runner\'s renders; ones written here will not match it. Accept changes with the accept-visual-changes label on the PR instead.');
const browser = await launch();
let updated = 0;
const failed = [], passed = [];
for (const { name, title, path, ctx, act, fullPage } of CASES) {
  const page = await browser.newPage(ctx);
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  if (act) await act(page);
  const shot = await page.screenshot({ fullPage });
  const elements = await collectElements(page);
  await page.close();
  const got = PNG.sync.read(shot);
  const hash = renderHash(got);

  const file = join(BASELINES, `${name}.png`);
  if (UPDATE || !existsSync(file)) {
    const isNew = !existsSync(file);
    writeBaseline(name, shot, elements, hash);
    updated++;
    console.log(`  ${isNew ? 'new    ' : 'updated'}  ${file}`);
    continue;
  }
  const oldPng = readFileSync(file);
  const want = PNG.sync.read(oldPng);
  let share = 1, mask = null;
  if (want.width === got.width && want.height === got.height) {
    const diff = new PNG({ width: want.width, height: want.height });
    const bad = pixelmatch(want.data, got.data, diff.data, want.width, want.height, { threshold: THRESHOLD });
    share = bad / (want.width * want.height);
    if (share <= MAX_DIFF) {
      passed.push({ name, shot, elements, hash });
      console.log(`  pass  ${name}${bad ? `  (${bad} pixels within tolerance)` : ''}`);
      continue;
    }
    writeFileSync(join(OUT, `${name}-diff.png`), PNG.sync.write(diff));
    // The same comparison as a bare mask (real differences only, no
    // anti-aliasing), for the areas no named element explains.
    const m = new PNG({ width: want.width, height: want.height });
    pixelmatch(want.data, got.data, m.data, want.width, want.height, { threshold: THRESHOLD, diffMask: true });
    mask = new Uint8Array(want.width * want.height);
    for (let i = 0; i < mask.length; i++) mask[i] = m.data[i * 4 + 3] > 0 ? 1 : 0;
  }
  writeFileSync(join(OUT, `${name}-actual.png`), shot);

  // From → to: what moved, appeared or vanished, against the baseline's record.
  const oldManifest = join(BASELINES, `${name}.json`);
  const before = existsSync(oldManifest) ? JSON.parse(readFileSync(oldManifest, 'utf8')).elements : [];
  // No record yet (a baseline from before records were kept): nothing to
  // compare elements with, so every changed area is just outlined.
  const changes = before.length ? compareElements(before, elements) : [];
  const regions = mask ? unexplainedRegions(mask, got.width, got.height, changes) : [];
  const pw = pinWidth(elements);
  const lines = changes.slice(0, MAX_LINES).map((c) => describe(c, pw));
  if (changes.length > MAX_LINES) lines.push(`…and ${changes.length - MAX_LINES} more named changes, all outlined in the image`);
  if (regions.length) lines.push(`${regions.length === 1 ? 'Something else changed in the outlined area' : `Something else changed in ${regions.length} outlined areas`}: no named element explains it (text, colour or the map itself), so look at it closely`);
  if (got.height !== want.height) lines.push(`The page is ${inPinWidths(got.height - want.height, pw)} ${got.height > want.height ? 'taller' : 'shorter'}`);
  if (got.width !== want.width) lines.push(`The page is ${inPinWidths(got.width - want.width, pw)} ${got.width > want.width ? 'wider' : 'narrower'}`);
  if (!before.length) lines.push('(This baseline has no element record yet, so moves are shown as outlined areas only.)');
  const image = join(OUT, `${name}-from-to.png`);
  writeFileSync(image, await drawFromTo(browser, { oldPng, newPng: shot, changes, regions }));
  failed.push({ name, title, hash, lines, image, shot, elements });
  console.log(`  ${CI ? 'FAIL' : 'diff'}  ${name}: changed -- see ${image}`);
  for (const l of lines) console.log(`          ${l}`);
}
await browser.close();

if (failed.length) {
  writeFileSync(REPORT, JSON.stringify({
    cases: failed.map(({ name, title, hash, lines, image }) => ({ name, title, hash, lines, image })),
  }, null, 2) + '\n');
}

// The accept Action: write the baselines only if every changed case renders
// exactly what the from → to comment showed (same hash). Anything else means
// the branch changed since, and the Action posts a fresh from → to instead.
if (ACCEPT) {
  const shown = JSON.parse(readFileSync(ACCEPT, 'utf8')).hashes || {};
  const stale = failed.filter((c) => shown[c.name] !== c.hash).map((c) => c.name);
  let result;
  if (stale.length) {
    result = 'reask';
    console.log(`\nNot accepted: ${stale.join(', ')} ${stale.length === 1 ? 'renders' : 'render'} differently from the from → to that was shown. Nothing written.`);
  } else {
    for (const c of failed) writeBaseline(c.name, c.shot, c.elements, c.hash);
    // A case that still matches keeps its PNG; its element record is refreshed
    // from this runner's render (it describes the same picture).
    for (const c of passed) writeFileSync(join(BASELINES, `${c.name}.json`), manifest(c.elements, c.hash));
    result = failed.length ? 'accepted' : 'nothing';
    console.log(failed.length ? `\nAccepted: ${failed.map((c) => c.name).join(', ')} -- the renders match the from → to that was shown.` : '\nNothing to accept: every case matches its baseline.');
  }
  writeFileSync(join(OUT, 'accept.json'), JSON.stringify({ result, accepted: result === 'accepted' ? failed.map((c) => c.name) : [], stale }) + '\n');
  process.exit(0);
}

if (updated) console.log(`\n${updated} baseline(s) written to ${BASELINES}/ -- commit them, and say in the PR what changed and why.`);
if (failed.length && CI) {
  console.log(`\n${failed.length} visual case(s) changed. CI posts the from → to on the PR; if those are the changes you want, label the PR accept-visual-changes.`);
  process.exit(1);
}
if (failed.length) console.log(`\n${failed.length} case(s) differ from the CI baselines. This machine renders text differently from the runner, so that is advisory here; CI has the verdict.`);
