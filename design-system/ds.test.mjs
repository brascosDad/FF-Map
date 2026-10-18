// `npm run test:ds`. The manifest, the query layer, and both doors onto it.
// Plain node:test: no browser, no build, runs in a second.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { buildManifest, readDeprecation, readNames, serialise } from './build-manifest.mjs';
import { parseCss, subjectClasses } from './lib/css.mjs';
import { checkCss, checkPalette, getComponent, paletteDistances, getRules, getTokens, loadManifest } from './lib/query.mjs';
import { contrastOnWhite, deltaE, hueGap, oklch } from './lib/color.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'design-system/cli.mjs');
const SERVER = join(ROOT, 'design-system/mcp/server.mjs');
const m = loadManifest();

/** A snippet that breaks four rules. */
const FAILS = `.pager-button {
  min-height: 44px;
  padding: 12px 16px;
  background: #23385B;
  color: var(--text-bold);
}`;
/** The same control, built from the system. */
const PASSES = `.ffc-itempager button {
  min-height: var(--tap-min);
  padding: var(--space-3) var(--space-4);
  background: var(--surface-selected);
  color: var(--text-on-navy);
}`;

const cli = (args, input) => spawnSync('node', [CLI, ...args], { input, encoding: 'utf8', cwd: ROOT });
const cliJson = (args, input) => JSON.parse(cli([...args, '--json'], input).stdout);

// ---- the manifest ------------------------------------------------------------

test('manifest is current: a fresh generation is byte-for-byte the committed file', () => {
  assert.equal(serialise(buildManifest()), readFileSync(join(ROOT, 'design-system/manifest.json'), 'utf8'));
});

test('manifest: one component per row of the Names table, in the table\'s order', () => {
  const names = readNames(readFileSync(join(ROOT, 'design-system.html'), 'utf8')).map((n) => n.name);
  assert.deepEqual(m.components.map((c) => c.name), names);
  assert.ok(names.includes('ItemPager') && names.includes('BoothRow') && names.includes('ArtistLine'));
});

test('manifest: tokens carry a tier, and every tier is used', () => {
  assert.deepEqual([...new Set(m.tokens.map((t) => t.tier))].sort(), ['component', 'primitive', 'semantic']);
  const navy = m.tokens.find((t) => t.name === '--ff-navy');
  assert.equal(navy.tier, 'primitive');
  assert.equal(navy.value, '#23385B');
  const strong = m.tokens.find((t) => t.name === '--text-strong');
  assert.deepEqual([strong.tier, strong.pointsAt, strong.resolved], ['semantic', ['--ff-navy'], '#23385B']);
  assert.match(m.tokens.find((t) => t.name === '--pin-merch').note, /own destination/);
  assert.equal(m.tokens.find((t) => t.name === '--chip-bg').tier, 'component');
});

test('manifest: the fifteen rules are there, each with a reason, a source and an enforcer', () => {
  assert.deepEqual(m.rules.map((r) => r.id), ['no-overlap', 'true-location', 'nudge-cap', 'stays-shown', 'area-label-tap', 'level3-scale-floor', 'tap-floor', 'booth-tap-equivalent', 'token-first', 'one-name', 'close-top-right', 'step-in-step-out', 'paper-number-row', 'coral-is-now', 'category-lightness-band', 'category-hue-spacing']);
  for (const r of m.rules) for (const k of ['statement', 'reason', 'source']) assert.ok(r[k], `${r.id}.${k}`);
  for (const r of m.rules) assert.ok(r.enforcedBy.length, `${r.id} is enforced by something, or by "review"`);
});

test('css reader: a comment covers the declarations under it until a blank line; a trailing one wins', () => {
  const d = parseCss(`:root {
  /* Group */
  --a: 1px;
  --b: 2px;   /* just b */

  --c: 3px;
}`);
  assert.deepEqual(d.map((x) => [x.prop, x.above, x.trailing]), [['--a', 'Group', null], ['--b', 'Group', 'just b'], ['--c', null, null]]);
  assert.deepEqual(subjectClasses('.ffc-panel__footer:has(.ffc-itempager)'), ['ffc-panel__footer']);
  assert.deepEqual(subjectClasses('.ffc-zoom button'), ['ffc-zoom']);
});

// ---- the query layer ----------------------------------------------------------

test('query: a component answers by name, class, or a name it is never called', () => {
  assert.equal(getComponent(m, 'ItemPager').cssClass, '.ffc-itempager');
  assert.equal(getComponent(m, 'itempager').name, 'ItemPager');
  assert.equal(getComponent(m, '.ffc-itempager').name, 'ItemPager');
  assert.equal(getComponent(m, 'stepper').use, 'ItemPager');
  assert.ok(getComponent(m, 'FilterChp').didYouMean.includes('FilterChip'));
  assert.ok(getTokens(m, 'ItemPager').tokens.some((t) => t.name === '--tap-min'));
  assert.equal(getRules(m, 'no-overlap').rules[0].priority.length, 5);
  assert.match(getRules(m, 'no-overlap').rules[0].priority[2], /water/);
});

test('query: check fails the snippet that breaks rules, and cites a rule on every finding', () => {
  const r = checkCss(m, FAILS);
  assert.equal(r.ok, false);
  const by = (rule, found) => r.findings.find((f) => f.rule === rule && f.found === found);
  assert.ok(by('one-name', '.pager-button'), 'a class that is not in the Names table');
  assert.ok(by('tap-floor', '44px'), 'a raw 44px');
  assert.ok(by('token-first', '12px'), 'a px value that has a token');
  assert.ok(by('token-first', '#23385B'), 'a hex that has a token');
  assert.ok(by('token-first', '--text-bold'), 'a token that does not exist');
  for (const f of r.findings) assert.ok(m.rules.some((x) => x.id === f.rule), `${f.message} cites a real rule`);
});

test('query: check passes the snippet built from tokens and Names-table classes', () => {
  assert.deepEqual(checkCss(m, PASSES), { ok: true, errors: 0, warnings: 0, findings: [] });
});

test('query: a hex with no token says to add one, and a knob the snippet declares itself is fine', () => {
  const r = checkCss(m, '.ffc-chip { --chip-x: var(--space-2); color: #ABCDEF; padding: var(--chip-x); }');
  assert.equal(r.findings.length, 1);
  assert.match(r.findings[0].message, /not a token: add it to src\/styles\/tokens\.css/);
});

test('deprecation: a comment starting "Deprecated: use --x" marks a token; check warns on use, never errors', () => {
  assert.deepEqual(readDeprecation('Deprecated: use --text-strong. Removed in 2.0.0.'), { replacement: '--text-strong' });
  assert.equal(readDeprecation('Text — all of these clear 4.5:1'), null);
  const old = structuredClone(m);
  old.tokens.find((t) => t.name === '--text-muted').deprecated = true;
  old.tokens.find((t) => t.name === '--text-muted').replacement = '--text-body';
  old.components.find((c) => c.name === 'ItemPager').deprecated = true;
  old.components.find((c) => c.name === 'ItemPager').replacement = 'Panel';
  const r = checkCss(old, '.ffc-itempager { color: var(--text-muted); }');
  assert.equal(r.ok, true);
  assert.deepEqual(r.findings.map((f) => [f.rule, f.severity, f.suggest[0]]).sort(), [['one-name', 'warning', 'Panel'], ['token-first', 'warning', '--text-body']]);
});

test('manifest: the nudge cap names the constant the placement code uses, at its value', async () => {
  const { NUDGE_CAP } = await import('../src/pinPlacement.js');
  const { PIN_RANK } = await import('../src/assets/pins.js');
  const cap = getRules(m, 'nudge-cap').rules[0].constant;
  assert.deepEqual([cap.name, cap.value, cap.file], ['NUDGE_CAP', NUDGE_CAP, 'src/pinPlacement.js']);
  // The priority list and PIN_RANK agree on how many tiers there are.
  assert.equal(Math.max(...Object.values(PIN_RANK)), getRules(m, 'no-overlap').rules[0].priority.length);
});

test('governance: the changelog\'s newest entry is the manifest\'s version', () => {
  const log = readFileSync(join(ROOT, 'design-system/CHANGELOG.md'), 'utf8');
  assert.equal(log.match(/^## (\d+\.\d+\.\d+)/m)[1], m.version);
});

// ---- the palette -----------------------------------------------------------------

test('color: OKLCH and contrast match known values', () => {
  assert.equal(Math.round(oklch('#FFFFFF').l), 100);
  assert.equal(Math.round(oklch('#000000').l), 0);
  assert.equal(oklch('#808080').c < 1e-4, true);
  assert.equal(Math.round(oklch('#FF0000').l * 10) / 10, 62.8);
  assert.equal(Math.round(oklch('#FF0000').h), 29);
  assert.equal(Math.round(contrastOnWhite('#000000') * 10) / 10, 21);
  assert.equal(Math.round(contrastOnWhite('#767676') * 100) / 100, 4.54);
});

test('color: ΔE is 0 for one colour, 100 from black to white, symmetric; hue gap takes the short way round', () => {
  assert.equal(deltaE('#AF4FA5', '#AF4FA5'), 0);
  assert.equal(Math.round(deltaE('#000000', '#FFFFFF')), 100);
  assert.equal(deltaE('#C97636', '#B78B34'), deltaE('#B78B34', '#C97636'));
  assert.equal(Math.round(hueGap('#C25B7E', '#AF4FA5')), 29);
});

test('palette-distances: every pair of category pins once, closest first, beverage marked as drinks\' family', () => {
  const r = paletteDistances(m);
  const n = m.tokens.filter((t) => t.name.startsWith('--pin-') && t.tier !== 'component' && (t.resolved || t.value).startsWith('#')).length;
  assert.equal(r.pairs.length, (n * (n - 1)) / 2);
  for (let i = 1; i < r.pairs.length; i++) assert.ok(r.pairs[i - 1].deltaE <= r.pairs[i].deltaE);
  assert.ok(r.pairs.filter((p) => p.exempt).every((p) => [p.a, p.b].includes('--pin-beverage')));
  assert.deepEqual(r.reserved.map((x) => x.name), ['--ff-teal', '--ff-coral', '--cat-booth', '--cat-utility']);
  assert.deepEqual(cliJson(['palette-distances']), r);
});

test('category-lightness-band: every --pin-* hue sits in OKLCH L 57–67, coral above 70, each pin 3:1 under white', () => {
  // Straight from tokens.css, not the manifest, so a stale manifest cannot hide a bad value.
  const tokens = parseCss(readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8')).filter((d) => !d.media && d.prop.startsWith('--')).map((d) => ({ name: d.prop, value: d.value }));
  const r = checkPalette({ tokens });
  const table = [...r.pins, r.coral].filter(Boolean).map((t) => `${t.name} ${t.value} L ${t.l} ${t.contrastOnWhite}:1`).join('; ');
  assert.ok(r.pins.length >= 10, `expected the ten category pins, measured: ${table}`);
  const band = r.findings.filter((f) => f.rule === 'category-lightness-band');
  assert.equal(band.length, 0, `${band.map((f) => f.message).join('\n')}\nmeasured: ${table}`);
});

/** tokens.css as { name, value } rows, read straight from the file, not the manifest. */
const tokensCss = () => parseCss(readFileSync(join(ROOT, 'src/styles/tokens.css'), 'utf8')).filter((d) => !d.media && d.prop.startsWith('--')).map((d) => ({ name: d.prop, value: d.value }));

test("category-hue-spacing: no two category pins closer than ΔE 9.5 in OKLab, beverage exempt as drinks' darker step", () => {
  const r = checkPalette({ tokens: tokensCss() });
  const spacing = r.findings.filter((f) => f.rule === 'category-hue-spacing');
  const pairs = paletteDistances({ tokens: tokensCss() }).pairs.filter((p) => !p.exempt).slice(0, 5).map((p) => `${p.a}/${p.b} ${p.deltaE}`).join(', ');
  assert.equal(spacing.length, 0, `${spacing.map((f) => f.message).join('\n')}\nclosest: ${pairs}`);
  assert.ok(r.closest.deltaE >= 9.5);
});

test('category-hue-spacing fails the palette before this PR, naming each pair and its distance', () => {
  const before = { '--pin-food': '#C97636', '--pin-drinks': '#B78B34', '--pin-restroom': '#3D9E6E', '--pin-water': '#3D8FA4', '--pin-info': '#407EB5',
    '--pin-stage': '#8F71B7', '--pin-kids': '#C25B7E', '--pin-firstaid': '#C84B46', '--pin-merch': '#AF4FA5', '--pin-beverage': '#997332', '--ff-coral': '#E89370' };
  const r = checkPalette({ tokens: Object.entries(before).map(([name, value]) => ({ name, value })) });
  assert.equal(r.ok, false);
  const msgs = r.findings.filter((f) => f.rule === 'category-hue-spacing').map((f) => f.message);
  assert.deepEqual(r.findings.filter((f) => f.rule === 'category-hue-spacing').map((f) => f.pair.join(' ')), [
    '--pin-food --pin-drinks', '--pin-water --pin-info', '--pin-kids --pin-firstaid', '--pin-kids --pin-merch', '--pin-stage --pin-merch']);
  assert.match(msgs[0], /--pin-food #C97636 and --pin-drinks #B78B34 are ΔE 5\.9 apart \(hue gap 25\.9°\), closer than 9\.5/);
  assert.match(msgs[1], /--pin-water #3D8FA4 and --pin-info #407EB5 are ΔE 6\.3 apart/);
  // Beverage beside drinks is the declared family: never a finding.
  assert.ok(!r.findings.some((f) => f.pair?.includes('--pin-beverage')));
  // The same palette passes the lightness band: the two rules are separate questions.
  assert.equal(r.findings.filter((f) => f.rule === 'category-lightness-band').length, 0);
});

test('check-palette fails a pin outside the band, coral at 70 or below, and a pin under 3:1', () => {
  const r = checkPalette({ tokens: [
    { name: '--pin-merch', value: '#9E3F94' }, { name: '--pin-pale', value: '#F0E0A0' }, { name: '--ff-coral', value: '#C84B46' },
    { name: '--cat-booth', value: '#47597A' }, { name: '--pin-size', value: '40px' } ] });
  assert.equal(r.ok, false);
  const msgs = r.findings.map((f) => f.message).join('\n');
  assert.match(msgs, /--pin-merch #9E3F94 is OKLCH L 52\.7, outside the category band 57–67/);
  assert.match(msgs, /--pin-pale #F0E0A0 is 1\.\d+:1 under the white glyph, below 3:1/);
  assert.match(msgs, /--ff-coral #C84B46 \(--current\) is OKLCH L 58\.1, not above 70/);
  assert.deepEqual(r.exempt.map((t) => t.name), ['--cat-booth']);
  assert.deepEqual(r.pins.map((t) => t.name).sort(), ['--pin-merch', '--pin-pale']);
});

// ---- door 1: the CLI ------------------------------------------------------------

test('cli: component ItemPager', () => {
  const r = cli(['component', 'ItemPager']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /ItemPager\s+\.ffc-itempager\s+src\/components\/DetailSheet\.jsx/);
  assert.match(r.stdout, /S6 List → booth/);
  assert.match(r.stdout, /--tap-min/);
  assert.match(r.stdout, /Call it a pager, stepper or booth nav/);
});

test('cli: components, tokens [filter], rules', () => {
  assert.equal(cli(['components']).stdout.trim().split('\n').length, m.components.length);
  const t = cli(['tokens', 'tap']);
  assert.match(t.stdout, /--tap-min/);
  assert.doesNotMatch(t.stdout, /--ff-cream/);
  assert.equal(cliJson(['tokens']).count, m.tokens.length);
  assert.equal(cliJson(['rules']).count, 16);
  assert.match(cli(['rules', 'nudge-cap']).stdout, /constant: NUDGE_CAP = 12.75 map units/);
  assert.equal(cli(['component', 'pager']).status, 1);
  assert.equal(cli(['nope']).status, 2);
});

test('cli: check exits 1 and lists findings for the failing snippet', () => {
  const r = cli(['check'], FAILS);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /one-name\s+error\s+\.pager-button/);
  assert.match(r.stdout, /tap-floor\s+error\s+44px/);
  assert.match(r.stdout, /token-first\s+error\s+#23385B is a token/);
});

test('cli: check exits 0 for the passing snippet', () => {
  const r = cli(['check'], PASSES);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /no findings/);
});

test('cli: check-palette lists every pin with its OKLCH L and contrast, and exits 0 inside the band', () => {
  const r = cli(['check-palette']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /--pin-merch\s+#[0-9A-F]{6}\s+L \d+\.\d/);
  assert.match(r.stdout, /--ff-coral\s+#E89370\s+L 74\.3/);
  assert.match(r.stdout, /ok: every pin is in the band, coral is above it, and every pair is far enough apart/);
  assert.match(r.stdout, /closest pair: --pin-\w+ \/ --pin-\w+, ΔE \d+\.\d/);
});

// ---- door 2: the MCP server -----------------------------------------------------

async function withClient(fn) {
  const client = new Client({ name: 'ds-test', version: '0' });
  await client.connect(new StdioClientTransport({ command: 'node', args: [SERVER], cwd: ROOT }));
  try { return await fn(client); } finally { await client.close(); }
}
const call = async (client, name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  return { isError: !!r.isError, data: JSON.parse(r.content[0].text) };
};

test('mcp: the six tools are listed, each with a schema', () => withClient(async (c) => {
  const { tools } = await c.listTools();
  assert.deepEqual(tools.map((t) => t.name), ['list_components', 'get_component', 'get_tokens', 'get_rules', 'check_css', 'check_palette']);
  for (const t of tools) { assert.ok(t.description); assert.equal(t.inputSchema.type, 'object'); }
}));

test('mcp: same answers as the CLI for the same questions', () => withClient(async (c) => {
  assert.deepEqual((await call(c, 'list_components')).data, cliJson(['components']));
  assert.deepEqual((await call(c, 'get_component', { name: 'ItemPager' })).data, cliJson(['component', 'ItemPager']));
  assert.deepEqual((await call(c, 'get_tokens', { filter: 'tap' })).data, cliJson(['tokens', 'tap']));
  assert.deepEqual((await call(c, 'get_tokens')).data, cliJson(['tokens']));
  assert.deepEqual((await call(c, 'get_rules')).data, cliJson(['rules']));
  assert.deepEqual((await call(c, 'get_rules', { id: 'close-top-right' })).data, cliJson(['rules', 'close-top-right']));
  assert.deepEqual((await call(c, 'check_css', { css: FAILS })).data, cliJson(['check'], FAILS));
  assert.deepEqual((await call(c, 'check_css', { css: PASSES })).data, cliJson(['check'], PASSES));
  assert.deepEqual((await call(c, 'check_palette')).data, cliJson(['check-palette']));
}));

test('mcp: check_css fails one snippet and passes the other', () => withClient(async (c) => {
  const bad = (await call(c, 'check_css', { css: FAILS })).data;
  assert.equal(bad.ok, false);
  assert.ok(bad.findings.length >= 5 && bad.findings.every((f) => f.rule));
  assert.equal((await call(c, 'check_css', { css: PASSES })).data.ok, true);
}));

test('mcp: a missing argument or an unknown tool is an error, not a crash', () => withClient(async (c) => {
  assert.equal((await c.callTool({ name: 'check_css', arguments: {} })).isError, true);
  assert.equal((await c.callTool({ name: 'nope', arguments: {} })).isError, true);
}));

test('.mcp.json registers the server as ff-design-system', () => {
  const cfg = JSON.parse(readFileSync(join(ROOT, '.mcp.json'), 'utf8'));
  assert.deepEqual(cfg.mcpServers['ff-design-system'], { command: 'node', args: ['design-system/mcp/server.mjs'] });
  assert.doesNotThrow(() => execFileSync('node', ['--check', join(ROOT, cfg.mcpServers['ff-design-system'].args[0])]));
});
