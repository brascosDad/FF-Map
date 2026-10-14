// The one place the design system's questions are answered. The CLI
// (design-system/cli.mjs) and the MCP server (design-system/mcp/server.mjs)
// are two doors onto these functions, so they cannot disagree.
//
// Every function takes the manifest and returns plain JSON-able data; the doors
// only decide how to print it.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastOnWhite, deltaE, hueGap, oklch, parseHex } from './color.mjs';
import { parseCss, varRefs } from './css.mjs';

export const MANIFEST_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'manifest.json');
export const loadManifest = (path = MANIFEST_PATH) => JSON.parse(readFileSync(path, 'utf8'));

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}
const nearest = (word, options, max = 3) => options
  .map((o) => [o, distance(norm(word), norm(o))]).filter(([, d]) => d <= Math.max(2, Math.floor(norm(word).length / 3)))
  .sort((a, b) => a[1] - b[1]).slice(0, max).map(([o]) => o);

// ---- components -------------------------------------------------------------

export function listComponents(m) {
  return m.components.map(({ name, cssClass, file, shipped, description }) => ({ name, cssClass, file, shipped, description }));
}

/** By name (any case, spaces and punctuation ignored), CSS class, or a name the docs say it is never called. */
export function getComponent(m, query) {
  const q = norm(query);
  const hit = m.components.find((c) => norm(c.name) === q || norm(c.cssClass) === q || norm(c.cssClass.replace(/^\.ffc-/, '')) === q);
  if (hit) return { ...hit, rules: (hit.rules || []).map((id) => m.rules.find((r) => r.id === id)).filter(Boolean) };
  const alias = m.components.find((c) => (c.notCalled || []).some((n) => norm(n) === q));
  if (alias) return { error: `"${query}" is not a name here: the component is ${alias.name}.`, rule: 'one-name', use: alias.name };
  return { error: `no component called "${query}"`, rule: 'one-name', didYouMean: nearest(query, m.components.map((c) => c.name)), names: m.components.map((c) => c.name) };
}

// ---- tokens -----------------------------------------------------------------

/**
 * No filter: every token. A filter matches a token's name, tier, note or value,
 * case-insensitively; a filter that is a component's name returns what that
 * component reads and declares.
 */
export function getTokens(m, filter = '') {
  const f = String(filter || '').trim();
  const comp = f && m.components.find((c) => norm(c.name) === norm(f));
  let list;
  if (comp) {
    const names = new Set([...comp.tokens, ...comp.knobs]);
    list = m.tokens.filter((t) => names.has(t.name));
  } else if (f) {
    const q = f.toLowerCase();
    list = m.tokens.filter((t) => [t.name, t.tier, t.value, t.resolved, t.note].some((x) => x && String(x).toLowerCase().includes(q)));
  } else list = m.tokens;
  return { filter: f, component: comp ? comp.name : null, count: list.length, tokens: list };
}

// ---- rules ------------------------------------------------------------------

export function getRules(m, id = '') {
  const q = String(id || '').trim();
  if (!q) return { count: m.rules.length, rules: m.rules };
  const r = m.rules.filter((x) => x.id === q);
  if (!r.length) return { error: `no rule "${q}"`, ids: m.rules.map((x) => x.id), didYouMean: nearest(q, m.rules.map((x) => x.id)) };
  return { count: 1, rules: r };
}

// ---- check ------------------------------------------------------------------

const NAMED = { white: '#ffffff', black: '#000000' };
const SIZING = /^--(tap-min|pin-hit|pin-size|panel-width|sheet-[\w-]+)$/;
const FAMILY = [
  [/^font-size$/, /^--text-/, 'type'],
  [/^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left)(-[a-z]+)*$/, /^--space-/, 'space'],
  [/^border(-[a-z]+)*-radius$|^border-radius$/, /^--radius-/, 'radius'],
  [/^(min-|max-)?(width|height)$/, SIZING, 'size'],
];

const hex6 = (h) => {
  let x = h.slice(1).toLowerCase();
  if (x.length === 3 || x.length === 4) x = [...x].map((c) => c + c).join('');
  return `#${x.slice(0, 6)}${x.length === 8 && x.slice(6) !== 'ff' ? x.slice(6) : ''}`;
};

/** Comments blanked out, newlines kept, so line numbers still match. */
const blank = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

export function checkCss(m, css) {
  const findings = [];
  const add = (f) => findings.push(f);
  const src = String(css);
  const wrapped = src.includes('{') ? src : `.snippet{${src}}`;
  const decls = parseCss(wrapped);
  // Knobs the snippet declares itself, and properties the app sets from JS (a booth's accent, a bullet's colour).
  const own = new Set([...decls.filter((d) => d.prop.startsWith('--')).map((d) => d.prop), ...m.components.flatMap((c) => c.setElsewhere || [])]);
  const byName = new Map(m.tokens.map((t) => [t.name, t]));
  const shared = m.tokens.filter((t) => t.tier !== 'component');
  const semanticFirst = (list) => [...list.filter((t) => t.tier === 'semantic'), ...list.filter((t) => t.tier === 'primitive')];

  for (const d of decls) {
    const at = { line: d.line, property: d.prop, value: d.value };

    // 1. Colours: raw hex, rgb()/hsl(), white/black.
    const colours = [...d.value.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((x) => x[0])
      .concat([...d.value.replace(/var\([^)]*\)/g, '').matchAll(/(?<![\w-])(white|black)(?![\w-])/g)].map((x) => NAMED[x[1]]));
    for (const raw of new Set(colours)) {
      const want = hex6(raw);
      const matches = semanticFirst(shared.filter((t) => /^#[0-9a-fA-F]{3,8}$/.test(t.resolved || t.value) && hex6(t.resolved || t.value) === want));
      if (matches.length) {
        const sem = matches.filter((t) => t.tier === 'semantic');
        add({ ...at, rule: 'token-first', severity: 'error', found: raw,
          message: !sem.length
            ? `${raw} is only a primitive (${matches[0].name}): components read semantic tokens, so add one named for the job first`
            : sem.length === 1 ? `${raw} is a token: use var(${sem[0].name})`
              : `${raw} is a token: use whichever of ${sem.slice(0, 4).map((t) => `var(${t.name})`).join(', ')} names the job`,
          suggest: matches.slice(0, 6).map((t) => t.name) });
      } else {
        add({ ...at, rule: 'token-first', severity: 'error', found: raw,
          message: `${raw} is not a token: add it to src/styles/tokens.css and document it in design-system.html before using it` });
      }
    }
    if (/\b(rgba?|hsla?)\(/.test(d.value.replace(/var\([^)]*\)/g, ''))) {
      add({ ...at, rule: 'token-first', severity: 'error', found: d.value.match(/\b(rgba?|hsla?)\([^)]*\)/)?.[0],
        message: 'a raw colour function: use a token, or add one to src/styles/tokens.css and document it first' });
    }

    // 2. Pixel values that have a token, in the property's own family.
    const fam = !d.prop.startsWith('--') && FAMILY.find(([re]) => re.test(d.prop));
    if (fam) {
      for (const [, n] of d.value.replace(/var\([^)]*\)/g, '').matchAll(/(?<![\w.#-])(\d+(?:\.\d+)?)px\b/g)) {
        const px = `${n}px`;
        const matches = shared.filter((t) => fam[1].test(t.name) && (t.resolved || t.value) === px);
        if (!matches.length) continue;
        const tap = fam[2] === 'size' && n === '44';
        add({ ...at, rule: tap ? 'tap-floor' : 'token-first', severity: 'error', found: px,
          message: tap
            ? `${px} is the tap floor: use var(--tap-min) on a control, var(--pin-hit) on a pin`
            : `${px} is a token: use ${matches.slice(0, 3).map((t) => `var(${t.name})`).join(' or ')}`,
          suggest: matches.map((t) => t.name) });
      }
    }

    // 3. Tokens that do not exist, and tokens on their way out.
    for (const ref of new Set(varRefs(d.value))) {
      if (byName.get(ref)?.deprecated) {
        const to = byName.get(ref).replacement;
        add({ ...at, rule: 'token-first', severity: 'warning', found: ref,
          message: `${ref} is deprecated${to ? `: use var(${to})` : ''}. It is removed in the next major version`, suggest: to ? [to] : [] });
      }
      if (byName.has(ref) || own.has(ref)) continue;
      const near = nearest(ref, m.tokens.map((t) => t.name).filter((n) => !byName.get(n) || byName.get(n).tier !== 'component'), 4);
      add({ ...at, rule: 'token-first', severity: 'error', found: ref,
        message: `${ref} is not a token${near.length ? `; did you mean ${near.join(', ')}?` : '.'} A new value is added to tokens.css and documented before it is used`,
        suggest: near });
    }
  }

  // 4. Class names that are not in the Names table.
  const roots = new Map(m.components.map((c) => [c.cssClass.replace(/^\./, ''), c]));
  const unlisted = new Set(m.unlistedClasses.map((c) => c.replace(/^\./, '')));
  const bare = blank(wrapped);
  const seen = new Set();
  for (const [, prelude, offset] of [...bare.matchAll(/([^{}]+)\{/g)].map((x) => [x[0], x[1], x.index])) {
    if (/^\s*@(keyframes|font-face|media|supports)/.test(prelude) && !/\./.test(prelude)) continue;
    for (const c of prelude.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) {
      const cls = c[1];
      if (cls === 'snippet' || seen.has(cls)) continue;
      seen.add(cls);
      const line = bare.slice(0, offset + prelude.indexOf(c[0])).split('\n').length;
      const root = cls.split(/__|--/)[0];
      if (roots.has(root)) {
        const dep = roots.get(root);
        if (dep.deprecated) add({ line, property: null, value: null, rule: 'one-name', found: `.${cls}`, severity: 'warning',
          message: `${dep.name} is deprecated${dep.replacement ? `: use ${dep.replacement}` : ''}. It is removed in the next major version`, suggest: dep.replacement ? [dep.replacement] : [] });
        continue;
      }
      const base = { line, property: null, value: null, rule: 'one-name', found: `.${cls}` };
      if (unlisted.has(root)) {
        add({ ...base, severity: 'warning', message: `.${root} is in components.css but the Names table does not name it: add a row to design-system.html §3 (and the manifest) before building on it` });
        continue;
      }
      const alias = m.components.find((x) => (x.notCalled || []).some((n) => norm(root.replace(/^ffc-/, '')).includes(norm(n))));
      const byName2 = m.components.find((x) => norm(root.replace(/^ffc-/, '')) === norm(x.name));
      const use = alias || byName2;
      // An .ffc- class that is not a component, or a word the docs say it is never called, is an error. Any other
      // class (.ff-screen, .sheetwrap: the layout classes in map.css) is not a component at all: noted, not failed.
      const severity = use || root.startsWith('ffc-') ? 'error' : 'warning';
      add({ ...base, severity, suggest: use ? [use.cssClass] : nearest(root, [...roots.keys()], 3).map((r) => `.${r}`),
        message: use
          ? `.${cls} is not a name here: the component is ${use.name}, class ${use.cssClass}`
          : `.${cls} is not in the Names table (design-system.html §3): components are .ffc-<name>; check the table before adding a word for something` });
    }
  }

  findings.sort((a, b) => a.line - b.line);
  const errors = findings.filter((f) => f.severity === 'error').length;
  return { ok: errors === 0, errors, warnings: findings.length - errors, findings };
}

// ---- the palette ---------------------------------------------------------------

/** Rules category-lightness-band and category-hue-spacing, as numbers. */
export const PALETTE = { pinMin: 57, pinMax: 67, coralAbove: 70, minContrast: 3, minDeltaE: 9.5 };
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

/**
 * Every --pin-* colour and --ff-coral, measured as the eye sees it (OKLCH) and
 * against the white glyph, and checked against category-lightness-band; every
 * pair of pins checked against category-hue-spacing. Takes
 * anything with a tokens list of { name, value, resolved? } (the manifest, or
 * tokens.css parsed), so the test and both doors measure the same way.
 */
export function checkPalette(m) {
  const hex = (t) => t.resolved || t.value;
  const colour = (t) => t.tier !== 'component' && parseHex(hex(t));
  const measure = (t) => {
    const o = oklch(hex(t));
    return { name: t.name, value: hex(t), l: r1(o.l), c: Math.round(o.c * 1000) / 1000, h: r1(o.h), contrastOnWhite: r2(contrastOnWhite(hex(t))) };
  };
  const pins = m.tokens.filter((t) => t.name.startsWith('--pin-') && colour(t)).map(measure).sort((a, b) => a.l - b.l);
  const coral = m.tokens.filter((t) => t.name === '--ff-coral' && colour(t)).map(measure)[0] || null;
  const exempt = m.tokens.filter((t) => t.name.startsWith('--cat-') && colour(t)).map(measure);
  const { pinMin, pinMax, coralAbove, minContrast } = PALETTE;
  const findings = [];
  for (const p of pins) {
    if (p.l < pinMin || p.l > pinMax) findings.push({ token: p.name, rule: 'category-lightness-band',
      message: `${p.name} ${p.value} is OKLCH L ${p.l}, outside the category band ${pinMin}–${pinMax}` });
    if (p.contrastOnWhite < minContrast) findings.push({ token: p.name, rule: 'category-lightness-band',
      message: `${p.name} ${p.value} is ${p.contrastOnWhite}:1 under the white glyph, below ${minContrast}:1` });
  }
  if (!coral) findings.push({ token: '--ff-coral', rule: 'category-lightness-band', message: '--ff-coral is not a hex colour in tokens.css' });
  else if (coral.l <= coralAbove) findings.push({ token: coral.name, rule: 'category-lightness-band',
    message: `--ff-coral ${coral.value} (--current) is OKLCH L ${coral.l}, not above ${coralAbove}: "now" could be read as a category` });
  if (!pins.length) findings.push({ token: '--pin-*', rule: 'category-lightness-band', message: 'no --pin-* colours found' });
  const { pairs } = paletteDistances(m);
  const spaced = pairs.filter((p) => !p.exempt);
  for (const p of spaced.filter((x) => x.deltaE < PALETTE.minDeltaE)) findings.push({ token: p.a, pair: [p.a, p.b], rule: 'category-hue-spacing',
    message: `${p.a} ${p.aValue} and ${p.b} ${p.bValue} are ΔE ${p.deltaE} apart (hue gap ${p.hueGap}°), closer than ${PALETTE.minDeltaE}: with lightness held, hue is the only cue between them` });
  return { ok: findings.length === 0, band: PALETTE, pins, coral, exempt, closest: spaced[0] || null, findings };
}

/** Colours the category pins have to stay clear of: the lawns' teal, coral ("now"), the structural slates. */
export const RESERVED = ['--ff-teal', '--ff-coral', '--cat-booth', '--cat-utility'];
/** A pin that is a declared step of another pin's hue, not a hue of its own. */
export const HUE_FAMILY = { '--pin-beverage': '--pin-drinks' };

/**
 * Every pair of category pins (--pin-* colours), closest first: ΔE in OKLab
 * (×100, the lightness scale) and the plain hue angle between them. A pair
 * with a declared family member (HUE_FAMILY) is marked exempt. Also where
 * each reserved colour falls: its nearest pins.
 */
export function paletteDistances(m) {
  const hex = (t) => t.resolved || t.value;
  const pins = m.tokens.filter((t) => t.name.startsWith('--pin-') && t.tier !== 'component' && parseHex(hex(t))).map((t) => ({ name: t.name, value: hex(t) }));
  const pairs = [];
  for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
    const [a, b] = [pins[i], pins[j]];
    const exempt = Boolean(HUE_FAMILY[a.name] || HUE_FAMILY[b.name]);
    pairs.push({ a: a.name, b: b.name, aValue: a.value, bValue: b.value, deltaE: r1(deltaE(a.value, b.value)), hueGap: r1(hueGap(a.value, b.value)), ...(exempt ? { exempt: true } : {}) });
  }
  pairs.sort((x, y) => x.deltaE - y.deltaE || x.a.localeCompare(y.a));
  const reserved = RESERVED.map((name) => m.tokens.find((t) => t.name === name)).filter((t) => t && parseHex(hex(t))).map((t) => {
    const o = oklch(hex(t));
    const nearest = pins.map((p) => ({ pin: p.name, deltaE: r1(deltaE(hex(t), p.value)), hueGap: r1(hueGap(hex(t), p.value)) })).sort((x, y) => x.deltaE - y.deltaE).slice(0, 2);
    return { name: t.name, value: hex(t), l: r1(o.l), c: Math.round(o.c * 1000) / 1000, h: r1(o.h), nearest };
  });
  return { family: HUE_FAMILY, pairs, reserved };
}
