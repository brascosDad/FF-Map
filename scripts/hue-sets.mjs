// The candidate pin palettes for the hue-spacing PR, measured and drawn.
//
//   node scripts/hue-sets.mjs              a table per set in docs/hue-sets.json (Markdown)
//   node scripts/hue-sets.mjs --render     also writes docs/pr-shots/hue-set-<id>.png
//
// A swatch strip is every category pin glyph on its colour, in three rows: the
// brand cream, the map's green ground, and white. The sets live in
// docs/hue-sets.json; the one in use is whatever src/styles/tokens.css says.
// Measured with the design system's own paletteDistances(), so these numbers
// and `npm run ds -- check-palette` cannot disagree.
import { mkdirSync, readFileSync } from 'node:fs';
import { contrastOnWhite, oklch } from '../design-system/lib/color.mjs';
import { paletteDistances } from '../design-system/lib/query.mjs';
import { ICONS } from '../src/assets/icons.js';
import { launch } from './lib/browser.mjs';

const { pins: ORDER, glyph, reserved, current, sets, rejected = {} } = JSON.parse(readFileSync('docs/hue-sets.json', 'utf8'));
const f1 = (x) => x.toFixed(1);
const tokensOf = (palette) => [...ORDER.map((p) => ({ name: `--pin-${p}`, value: palette[p] })), ...Object.entries(reserved).map(([name, value]) => ({ name, value }))];

/** The rule's view (beverage exempt) and beverage's own nearest neighbour. */
export function measure(palette) {
  const d = paletteDistances({ tokens: tokensOf(palette) });
  const ruled = d.pairs.filter((p) => !p.exempt);
  const bev = d.pairs.filter((p) => p.exempt && ![p.a, p.b].includes('--pin-drinks'));
  return { min: ruled[0], next: ruled.slice(1, 4), beverage: bev[0], reserved: d.reserved };
}

const short = (n) => n.replace('--pin-', '');
function table(id, set) {
  const m = measure(set.palette);
  const out = [`### Set ${id.toUpperCase()}: ${set.title}`, '', set.note, '',
    '| Pin | Old | New | L | Hue | Contrast |', '|---|---|---|---|---|---|'];
  for (const p of ORDER) {
    const o = oklch(current[p]), n = oklch(set.palette[p]);
    out.push(`| ${p} | ${current[p]} (L ${f1(o.l)}, ${f1(o.h)}°) | **${set.palette[p]}** | ${f1(n.l)} | ${f1(n.h)}° | ${contrastOnWhite(set.palette[p]).toFixed(2)}:1 |`);
  }
  out.push('', `Smallest pairwise ΔE (beverage exempt): **${f1(m.min.deltaE)}**, ${short(m.min.a)} / ${short(m.min.b)} (hue gap ${f1(m.min.hueGap)}°). Next: ${m.next.map((p) => `${short(p.a)}/${short(p.b)} ${f1(p.deltaE)}`).join(', ')}.`);
  out.push(`Beverage's nearest pin other than drinks: ${short(m.beverage.a === '--pin-beverage' ? m.beverage.b : m.beverage.a)} ${f1(m.beverage.deltaE)}. Reserved colours, nearest pin: ${m.reserved.map((r) => `${r.name} → ${short(r.nearest[0].pin)} ${f1(r.nearest[0].deltaE)}`).join(', ')}.`);
  return out.join('\n');
}

const all = { ...sets, ...rejected };
for (const [id, set] of Object.entries(all)) console.log(`${table(id, set)}\n`);

if (process.argv.includes('--render')) {
  mkdirSync('docs/pr-shots', { recursive: true });
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  const v = (name) => css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))[1];
  const grounds = [['cream', v('--ff-cream')], ['map ground', v('--green-neighbourhood')], ['white', v('--ff-white')]];
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 760, height: 300 }, deviceScaleFactor: 2 });
  const strips = [['now', { title: 'today (main before this PR)', palette: current }], ...Object.entries(all)];
  for (const [id, set] of strips) {
    const m = measure(set.palette);
    const cell = (p) => `<div class="c"><i style="background:${set.palette[p]}"><svg viewBox="0 0 256 256">${ICONS[glyph[p]]}</svg></i><b>${p}</b><s>${set.palette[p]}</s></div>`;
    const name = id === 'now' ? 'Today' : rejected[id] ? set.title : `Set ${id.toUpperCase()}: ${set.title}`;
    await page.setContent(`<html><body style="margin:0;font:600 12px/1.25 system-ui,sans-serif;color:${v('--ff-navy')};background:#fff">
      <style>.row{display:flex;gap:4px;padding:10px 10px;align-items:flex-start}.c{width:68px;text-align:center}
      i{display:flex;width:40px;height:40px;border-radius:50%;margin:0 auto 4px;align-items:center;justify-content:center}
      svg{width:22px;height:22px;fill:#fff}b{display:block;font-size:11px}s{display:block;text-decoration:none;font:500 9px/1.3 ui-monospace,monospace}
      h1{font-size:15px;margin:10px 10px 0}p{margin:2px 10px 6px;font-weight:500}.lab{width:70px;font-weight:500;font-size:11px;padding-top:13px}</style>
      <h1>${name}</h1><p>smallest ΔE ${f1(m.min.deltaE)} (${short(m.min.a)} / ${short(m.min.b)})</p>
      ${grounds.map(([n, bg]) => `<div class="row" style="background:${bg}"><div class="lab">${n}</div>${ORDER.map(cell).join('')}</div>`).join('')}
      </body></html>`);
    await page.setViewportSize({ width: 760, height: await page.evaluate(() => document.body.scrollHeight) });
    await page.screenshot({ path: `docs/pr-shots/hue-set-${id}.png` });
  }
  await browser.close();
}
