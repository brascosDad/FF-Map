#!/usr/bin/env node
// npm run ds -- <command>
//
//   components                    every component, one line each
//   component <Name>              one component: files, states, tokens, rules, do-nots
//   tokens [filter]               tokens, or those matching a name / tier / note / value / component
//   rules [id]                    the standing rules
//   check [file | -]              a CSS snippet (a file, or stdin) against the rules; exit 1 on an error
//   check-palette                 every pin colour and coral in OKLCH, against category-lightness-band; exit 1 outside it
//   palette-distances             every pair of category pins, closest first: ΔE (OKLab) and hue gap; and the reserved colours
//
// --json prints exactly what the MCP server returns for the same question.
import { readFileSync } from 'node:fs';
import { checkCss, checkPalette, getComponent, paletteDistances, getRules, getTokens, listComponents, loadManifest } from './lib/query.mjs';

const USAGE = `usage: npm run ds -- <command> [--json]
  components            list every component
  component <Name>      one component (ItemPager, FilterChip, ...)
  tokens [filter]       tokens; filter by name, tier, note, value or component
  rules [id]            the standing rules
  check [file | -]      check a CSS snippet (file, or stdin) against the rules
  check-palette         measure every pin colour and coral (OKLCH L, contrast under white)
  palette-distances     every pair of category pins, closest first (ΔE in OKLab, hue gap)`;

const wrap = (s, indent = '  ', width = 92) => {
  const out = []; let line = '';
  for (const w of String(s).split(/\s+/)) {
    if ((line + ' ' + w).trim().length > width - indent.length) { out.push(line); line = w; } else line = (line + ' ' + w).trim();
  }
  if (line) out.push(line);
  return out.map((l) => indent + l).join('\n');
};

function formatComponent(c) {
  if (c.error) return [c.error, c.didYouMean?.length ? `did you mean ${c.didYouMean.join(', ')}?` : '', c.names ? `components: ${c.names.join(', ')}` : ''].filter(Boolean).join('\n');
  const out = [
    `${c.name}   ${c.cssClass}   ${c.file || '(defined in CSS only, not used in the app)'}${c.flag ? `   (not shipped: behind ${c.flag})` : ''}`,
    wrap(c.description),
    '',
    `states     ${c.states.length ? c.states.map((s) => `${s.id} ${s.name}`).join(' · ') : 'none in docs/interaction-states.md'}`,
    `parts      ${c.cssParts.join(' ') || 'none'}`,
    `variants   ${c.cssVariants.join(' ') || 'none'}`,
    `tokens     ${c.tokens.join(' ') || 'none'}`,
    `knobs      ${c.knobs.join(' ') || 'none'}`,
  ];
  if (c.setElsewhere) out.push(`set by JS  ${c.setElsewhere.join(' ')}`);
  if (c.notCalled.length) out.push(`never      ${c.notCalled.map((n) => `"${n}"`).join(', ')}`);
  out.push('', 'do not');
  out.push(...(c.doNot.length ? c.doNot.map((d) => wrap(`- ${d}`)) : ['  (the docs name nothing)']));
  out.push('', 'rules that apply');
  out.push(...(c.rules.length ? c.rules.map((r) => wrap(`${r.id}: ${r.statement}`)) : ['  none specific to it (token-first and one-name apply to everything)']));
  return out.join('\n');
}

function formatTokens(r) {
  const rows = r.tokens.map((t) => [t.name, t.tier, t.resolved && t.resolved !== t.value ? `${t.value} = ${t.resolved}` : t.value, t.note || '']);
  const w = [0, 1, 2].map((i) => Math.max(...rows.map((x) => x[i].length), 0));
  const head = `${r.count} token${r.count === 1 ? '' : 's'}${r.component ? ` read or declared by ${r.component}` : r.filter ? ` matching "${r.filter}"` : ''}`;
  return [head, ...rows.map((x) => `${x[0].padEnd(w[0])}  ${x[1].padEnd(w[1])}  ${x[2].padEnd(Math.min(w[2], 44))}  ${x[3].length > 70 ? `${x[3].slice(0, 69)}…` : x[3]}`)].join('\n');
}

function formatRules(r) {
  if (r.error) return `${r.error}\nrules: ${r.ids.join(', ')}`;
  return r.rules.map((x) => [
    `${x.id}`,
    wrap(x.statement),
    ...(x.priority ? ['  priority, highest first:', ...x.priority.map((p, i) => `    ${i + 1}. ${p}`)] : []),
    wrap(`why: ${x.reason}`),
    wrap(`enforced by: ${x.enforcedBy.join(' | ')}`),
    wrap(`source: ${x.source}`),
  ].join('\n')).join('\n\n');
}

function formatCheck(r, name) {
  if (!r.findings.length) return `${name}: no findings`;
  const lines = r.findings.map((f) => `  line ${String(f.line).padEnd(3)} ${f.rule.padEnd(11)} ${f.severity.padEnd(7)} ${f.message}`);
  return [`${name}: ${r.errors} error${r.errors === 1 ? '' : 's'}, ${r.warnings} warning${r.warnings === 1 ? '' : 's'}`, ...lines].join('\n');
}

function formatPalette(r) {
  const row = (t) => `  ${t.name.padEnd(16)} ${t.value}  L ${t.l.toFixed(1).padStart(4)}  C ${t.c.toFixed(3)}  H ${t.h.toFixed(1).padStart(5)}  ${t.contrastOnWhite.toFixed(2)}:1`;
  const b = r.band;
  return [
    `category-lightness-band: pins OKLCH L ${b.pinMin}–${b.pinMax}, coral above ${b.coralAbove}, every pin ${b.minContrast}:1 under white`,
    'pins, darkest first (contrast is under the white glyph)',
    ...r.pins.map(row),
    'coral (--current)',
    ...(r.coral ? [row(r.coral)] : ['  (missing)']),
    'exempt: structural neutrals',
    ...r.exempt.map(row),
    '',
    r.ok ? 'ok: every pin is in the band and coral is above it' : `${r.findings.length} problem${r.findings.length === 1 ? '' : 's'}:\n${r.findings.map((f) => `  - ${f.message}`).join('\n')}`,
  ].join('\n');
}

function formatDistances(r) {
  const pair = (p) => `  ${p.a.padEnd(15)} ${p.b.padEnd(15)} ΔE ${p.deltaE.toFixed(1).padStart(5)}   hue gap ${p.hueGap.toFixed(1).padStart(5)}°${p.exempt ? '   (exempt: declared family)' : ''}`;
  return [
    'category pins, closest first (ΔE is OKLab distance ×100, on the lightness scale)',
    ...r.pairs.map(pair),
    '',
    'reserved colours, and the pins nearest them',
    ...r.reserved.map((x) => `  ${x.name.padEnd(15)} ${x.value}  L ${x.l.toFixed(1)}  H ${x.h.toFixed(1).padStart(5)}   ${x.nearest.map((n) => `${n.pin} ΔE ${n.deltaE.toFixed(1)}`).join(', ')}`),
    '',
    `declared families (exempt from hue spacing): ${Object.entries(r.family).map(([k, v]) => `${k} is a step of ${v}`).join('; ')}`,
  ].join('\n');
}

async function stdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const args = process.argv.slice(2);
const json = args.includes('--json');
const [cmd, ...rest] = args.filter((a) => a !== '--json');
const m = loadManifest();
let result, text, status = 0;

switch (cmd) {
  case 'components':
    result = listComponents(m);
    text = result.map((c) => `${c.name.padEnd(12)} ${c.cssClass.padEnd(18)} ${(c.file || '(CSS only)').padEnd(36)} ${c.description.length > 70 ? `${c.description.slice(0, 69)}…` : c.description}`).join('\n');
    break;
  case 'component':
    if (!rest[0]) { console.error(USAGE); process.exit(2); }
    result = getComponent(m, rest.join(' '));
    text = formatComponent(result);
    if (result.error) status = 1;
    break;
  case 'tokens':
    result = getTokens(m, rest.join(' '));
    text = formatTokens(result);
    break;
  case 'rules':
    result = getRules(m, rest[0]);
    text = formatRules(result);
    if (result.error) status = 1;
    break;
  case 'check': {
    const file = rest[0];
    if (!file && process.stdin.isTTY) { console.error('check: give a file, or pipe CSS in on stdin (npm run ds -- check < snippet.css)'); process.exit(2); }
    const css = !file || file === '-' ? await stdin() : readFileSync(file, 'utf8');
    result = checkCss(m, css);
    text = formatCheck(result, !file || file === '-' ? 'stdin' : file);
    if (!result.ok) status = 1;
    break;
  }
  case 'palette-distances':
    result = paletteDistances(m);
    text = formatDistances(result);
    break;
  case 'check-palette':
    result = checkPalette(m);
    text = formatPalette(result);
    if (!result.ok) status = 1;
    break;
  default:
    console.error(USAGE);
    process.exit(cmd ? 2 : 0);
}
console.log(json ? JSON.stringify(result, null, 2) : text);
process.exit(status);
