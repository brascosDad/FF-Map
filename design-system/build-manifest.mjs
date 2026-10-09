// Regenerates the generated parts of design-system/manifest.json.
//
//   npm run manifest            rewrite the file
//   npm run manifest -- --check exit 1 if the committed file is stale (CI: "manifest is current")
//
// GENERATED, never hand-edited:
//   tokens                       src/styles/tokens.css + src/styles/components.css
//   components[].name, description   the Names table in design-system.html (section 3)
//   components[].states          docs/interaction-states.md, by the state ids listed in inStates
//   components[].cssParts, cssVariants, tokens, knobs, shipped   a scan of components.css and src/
//   unlistedClasses              .ffc- classes in components.css that the Names table does not name
//
// HAND-WRITTEN, kept as they are in the committed file and checked against the
// real files here, so they cannot quietly rot:
//   version, updated, rules
//   components[].cssClass, file, inStates, rules, notCalled, doNot
//     cssClass must exist in components.css; file must exist and use the class;
//     every id in inStates must be a state in the doc;
//   rules[].enforcedBy      "e2e: <text of a check in scripts/e2e.mjs>", "ci: <step>", "ds: ..." or "review"
//   rules[].source          "CLAUDE.md › <heading> › <phrase>": every part must be in CLAUDE.md
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCss, subjectClasses, varRefs } from './lib/css.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'design-system/manifest.json');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const TOKENS_CSS = 'src/styles/tokens.css';
const COMPONENTS_CSS = 'src/styles/components.css';
const TIER = [[/^1\./, 'primitive'], [/^2\./, 'semantic'], [/^3\./, 'component']];
const tierOf = (section) => (TIER.find(([re]) => re.test(section || '')) || [])[1] || null;

const text = (html) => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** The Names table in design-system.html section 3: [{ name, description }], in table order. */
export function readNames(html) {
  const at = html.indexOf('<h3>Names</h3>');
  if (at < 0) throw new Error('design-system.html: no "Names" heading');
  const table = html.slice(at, html.indexOf('</table>', at));
  const out = [];
  for (const [, th, td] of table.matchAll(/<tr><th>(.*?)<\/th><td>(.*?)<\/td><\/tr>/gs)) {
    for (const name of text(th).split(' · ')) out.push({ name: name.trim(), description: text(td) });
  }
  if (!out.length) throw new Error('design-system.html: the Names table has no rows');
  return out;
}

/** The state table in docs/interaction-states.md section 1: { S1: 'Map only', ... }. */
export function readStates(md) {
  const out = {};
  for (const [, id, name] of md.matchAll(/^\|\s*(S\d+)\s*\|\s*\*\*(.+?)\*\*\s*\|/gm)) out[id] = name;
  if (!Object.keys(out).length) throw new Error('docs/interaction-states.md: no state table');
  return out;
}

const rootOf = (cls) => cls.split(/__|--/)[0];

function walk(dir, ext, out = []) {
  for (const f of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${f}`;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, ext, out);
    else if (ext.some((e) => f.endsWith(e))) out.push(rel);
  }
  return out;
}

export function buildTokens() {
  const base = parseCss(read(TOKENS_CSS)).filter((d) => d.prop.startsWith('--'))
    .map((d) => ({ ...d, file: TOKENS_CSS, tier: tierOf(d.section) }));
  const comp = parseCss(read(COMPONENTS_CSS)).filter((d) => d.prop.startsWith('--'))
    .map((d) => ({ ...d, file: COMPONENTS_CSS, tier: 'component' }));
  const unTiered = base.filter((d) => !d.tier);
  if (unTiered.length) throw new Error(`tokens.css: ${unTiered[0].prop} sits above the first tier marker`);

  const byName = new Map();
  for (const d of [...base, ...comp]) {
    if (!byName.has(d.prop)) byName.set(d.prop, []);
    byName.get(d.prop).push(d);
  }
  for (const [name, ds] of byName) {
    const files = new Set(ds.map((d) => d.file));
    if (files.size > 1) throw new Error(`${name} is declared in both tokens.css and components.css`);
  }

  const baseValue = (name) => (byName.get(name) || []).find((d) => !d.media)?.value;
  const resolve1 = (name, seen = new Set()) => {
    const v = baseValue(name) ?? byName.get(name)?.[0]?.value;
    const m = v && v.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (!m || seen.has(name)) return v;
    return resolve1(m[1], seen.add(name)) ?? v;
  };

  const tokens = [];
  for (const [name, ds] of byName) {
    const first = ds.find((d) => !d.media) || ds[0];
    const t = { name, tier: first.tier, value: first.value };
    const resolved = resolve1(name);
    if (resolved && resolved !== first.value) t.resolved = resolved;
    t.pointsAt = [...new Set(varRefs(first.value))];
    const note = first.trailing || first.above;
    if (note) t.note = note;
    t.file = first.file;
    const overrides = ds.filter((d) => d.media && d !== first).map((d) => ({ when: d.media, value: d.value }));
    if (first.media) t.when = first.media;
    if (overrides.length) t.overrides = overrides;
    if (first.tier === 'component') {
      const selectors = ds.filter((d) => !d.media).map((d) => ({ selector: d.selector, value: d.value }));
      t.declaredIn = selectors.length > 1 ? selectors : [{ selector: first.selector, value: first.value }];
    }
    tokens.push(t);
  }
  return { tokens, byName };
}

export function buildManifest() {
  const prev = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
  const html = read('design-system.html');
  const names = readNames(html);
  const states = readStates(read('docs/interaction-states.md'));
  const { tokens, byName } = buildTokens();
  const declared = new Set(byName.keys());
  const tokenTier = new Map(tokens.map((t) => [t.name, t.tier]));

  const comps = parseCss(read(COMPONENTS_CSS));
  const srcFiles = [...walk('src', ['.jsx', '.js']), 'index.html'].filter((f) => !f.startsWith('src/assets/'));
  const srcText = new Map(srcFiles.map((f) => [f, read(f)]));
  const handBy = new Map((prev.components || []).map((c) => [c.name, c]));

  const problems = [];
  const components = names.map(({ name, description }) => {
    const hand = handBy.get(name);
    if (!hand) {
      problems.push(`Names table row "${name}" has no entry in manifest.json. Add { "name": "${name}", "cssClass": ".ffc-…", "file": "src/…", "inStates": [], "doNot": [] } and run npm run manifest again.`);
      return null;
    }
    const root = hand.cssClass.replace(/^\./, '');
    // Every ffc- class of this component, whichever selector it appears in.
    const mine = comps.filter((d) => subjectClasses(d.selector || '').some((c) => rootOf(c) === root));
    const classes = new Set(comps.flatMap((d) => subjectClasses(d.selector || '')).filter((c) => rootOf(c) === root));
    if (!classes.size) problems.push(`${name}: ${hand.cssClass} is not in components.css`);
    const users = srcFiles.filter((f) => srcText.get(f).includes(root));
    if (hand.file) {
      if (!existsSync(join(ROOT, hand.file))) problems.push(`${name}: file ${hand.file} does not exist`);
      else if (!read(hand.file).includes(root)) problems.push(`${name}: ${hand.file} never uses ${hand.cssClass}`);
    } else if (users.length) problems.push(`${name}: file is null but ${users[0]} uses ${hand.cssClass}`);
    for (const id of hand.rules || []) if (!(prev.rules || []).some((r) => r.id === id)) problems.push(`${name}: rule ${id} is not in rules`);
    for (const id of hand.inStates || []) if (!states[id]) problems.push(`${name}: state ${id} is not in docs/interaction-states.md`);

    const reads = new Set(), knobs = new Set();
    for (const d of mine) {
      if (d.prop.startsWith('--')) knobs.add(d.prop);
      for (const r of varRefs(d.value)) reads.add(r);
    }
    const shared = [...reads].filter((r) => tokenTier.get(r) && tokenTier.get(r) !== 'component' && !knobs.has(r)).sort();
    const loose = [...reads].filter((r) => !declared.has(r) && !knobs.has(r));
    return {
      name,
      description,
      cssClass: hand.cssClass,
      file: hand.file,
      shipped: users.length > 0,
      inStates: hand.inStates || [],
      rules: hand.rules || [],
      notCalled: hand.notCalled || [],
      states: (hand.inStates || []).map((id) => ({ id, name: states[id] })),
      cssParts: [...classes].filter((c) => c.startsWith(`${root}__`)).map((c) => `.${c}`).sort(),
      cssVariants: [...classes].filter((c) => c.startsWith(`${root}--`)).map((c) => `.${c}`).sort(),
      tokens: shared,
      knobs: [...knobs].sort(),
      ...(loose.length ? { setElsewhere: loose.sort() } : {}),
      doNot: hand.doNot || [],
    };
  });
  const stray = (prev.components || []).filter((c) => !names.some((n) => n.name === c.name)).map((c) => c.name);
  if (stray.length) problems.push(`manifest.json names ${stray.join(', ')}, which the Names table does not: add the row to design-system.html or delete the entry.`);

  const roots = new Set(components.filter(Boolean).map((c) => c.cssClass.replace(/^\./, '')));
  const unlisted = [...new Set(comps.flatMap((d) => subjectClasses(d.selector || '')).map(rootOf))].filter((r) => !roots.has(r)).sort().map((r) => `.${r}`);

  // Rules: hand-written, but every pointer in them has to be real.
  const e2e = read('scripts/e2e.mjs'), claude = read('CLAUDE.md').replace(/\s+/g, ' '), ci = read('.github/workflows/ci.yml');
  for (const r of prev.rules || []) {
    for (const e of r.enforcedBy || []) {
      const [kind, ...rest] = e.split(/:\s*/);
      const what = rest.join(': ');
      if (e === 'review') continue;
      if (kind === 'e2e' && !e2e.includes(what)) problems.push(`rule ${r.id}: no check in scripts/e2e.mjs contains "${what}"`);
      else if (kind === 'ci' && !ci.includes(what)) problems.push(`rule ${r.id}: no step in ci.yml is named "${what}"`);
      else if (!['e2e', 'ci', 'ds'].includes(kind)) problems.push(`rule ${r.id}: enforcedBy "${e}" must be review, e2e: …, ci: … or ds: …`);
    }
    const [file, ...parts] = (r.source || '').split(' › ');
    if (file !== 'CLAUDE.md' || !parts.length) problems.push(`rule ${r.id}: source must be "CLAUDE.md › <heading> › <phrase>"`);
    for (const p of parts) if (!claude.includes(p)) problems.push(`rule ${r.id}: "${p}" is not in CLAUDE.md`);
  }
  if (problems.length) throw new Error(`manifest: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);

  return {
    name: 'Fall Fest design system',
    version: prev.version ?? '1.0.0',
    updated: prev.updated ?? null,
    provenance: {
      generatedBy: 'npm run manifest (design-system/build-manifest.mjs); CI fails if this file is stale',
      generated: [
        'tokens (from src/styles/tokens.css and components.css)',
        'components[].name, description (the Names table, design-system.html §3)',
        'components[].states (docs/interaction-states.md), shipped, cssParts, cssVariants, tokens, knobs, setElsewhere',
        'unlistedClasses',
      ],
      handWritten: [
        'version, updated',
        'components[].cssClass, file, inStates, rules, notCalled, doNot (checked against the files)',
        'rules (every enforcedBy test name and every source phrase is checked against the files)',
      ],
    },
    tokens,
    components,
    unlistedClasses: unlisted,
    rules: prev.rules || [],
  };
}

export const serialise = (m) => `${JSON.stringify(m, null, 2)}\n`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let fresh;
  try { fresh = serialise(buildManifest()); } catch (e) { console.error(e.message); process.exit(1); }
  if (process.argv.includes('--check')) {
    const have = existsSync(MANIFEST) ? readFileSync(MANIFEST, 'utf8') : '';
    if (have === fresh) { console.log('manifest is current'); process.exit(0); }
    const a = have.split('\n'), b = fresh.split('\n');
    const i = a.findIndex((l, n) => l !== b[n]);
    console.error(`manifest is out of date: design-system/manifest.json differs from a fresh generation (first difference at line ${i + 1}).\n  have: ${a[i]}\n  want: ${b[i]}\nRun \`npm run manifest\` and commit the result.`);
    process.exit(1);
  }
  writeFileSync(MANIFEST, fresh);
  const m = JSON.parse(fresh);
  console.log(`wrote design-system/manifest.json: ${m.tokens.length} tokens, ${m.components.length} components, ${m.rules.length} rules`);
}
