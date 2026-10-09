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
import { checkCss, getComponent, getRules, getTokens, loadManifest } from './lib/query.mjs';

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

test('manifest: the eight starting rules are there, each with a reason, a source and an enforcer', () => {
  assert.deepEqual(m.rules.map((r) => r.id), ['no-overlap', 'tap-floor', 'token-first', 'one-name', 'close-top-right', 'step-in-step-out', 'paper-number-row', 'coral-is-now']);
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

test('governance: the changelog\'s newest entry is the manifest\'s version', () => {
  const log = readFileSync(join(ROOT, 'design-system/CHANGELOG.md'), 'utf8');
  assert.equal(log.match(/^## (\d+\.\d+\.\d+)/m)[1], m.version);
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
  assert.equal(cliJson(['rules']).count, 8);
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

test('mcp: the five tools are listed, each with a schema', () => withClient(async (c) => {
  const { tools } = await c.listTools();
  assert.deepEqual(tools.map((t) => t.name), ['list_components', 'get_component', 'get_tokens', 'get_rules', 'check_css']);
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
