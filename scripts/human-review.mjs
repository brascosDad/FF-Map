// The "human-review" check: did Ernest look at what this PR asked him to,
// and did he see what the PR expected? (docs/checks-and-review.md, "The
// human review gate"; the design system's rule `human-review`.)
//
//     node scripts/human-review.mjs --body <file with the PR description>
//
// The PR DESCRIPTION has a "For Ernest to look at" section: numbered items,
// each an observation on the preview with a Yes and a No checkbox. The
// EXPECTED answers are in docs/pr-notes.md, under "Expected answers
// (human-review)", one line per item ("3. No -- why"), so the description
// does not give them away. pr-notes.md also has to carry its own "For
// Ernest to look at" section (the judgment calls).
//
//   an item with no box ticked, or both  -> fail: unanswered
//   an answer that differs from expected -> fail, naming the item: is the map
//                                           wrong, or the expectation? It
//                                           passes once the map is fixed (and
//                                           the answer changes) or Ernest adds
//                                           a line under the item starting
//                                           "Expected was wrong:"
//   all answered and matching            -> pass
//
// It verifies that he looked at specific things, not his judgment. The PR
// description is untrusted text: it is only read and matched here, never run.
import { readFileSync } from 'node:fs';

const HEADING = /^#{2,3}\s+For Ernest to look at\s*$/im;
const EXPECTED = /^#{2,3}\s+Expected answers \(human-review\)\s*$/im;
const OVERRIDE = /^\s*(?:[-*>]\s*)?Expected was wrong:/im;

/** The text of a markdown section, from its heading to the next heading of
 *  the same or a higher level (or the screenshots block). null if absent. */
export function section(text, heading) {
  const m = heading.exec(text);
  if (!m) return null;
  const level = m[0].match(/^#+/)[0].length;
  const rest = text.slice(m.index + m[0].length);
  const end = rest.search(new RegExp(`^#{1,${level}}\\s|<!-- pr-shots:start -->`, 'm'));
  return end < 0 ? rest : rest.slice(0, end);
}

/** The numbered items of a section: [{ n, text }], each item's text running
 *  to the next numbered line. */
function items(sec) {
  const out = [];
  for (const line of sec.split('\n')) {
    const m = line.match(/^(\d+)\.\s/);
    if (m) out.push({ n: Number(m[1]), text: `${line}\n` });
    else if (out.length) out[out.length - 1].text += `${line}\n`;
  }
  return out;
}

/** Each item in the PR description's section, with what was ticked. */
export function parseItems(body) {
  const sec = section(body, HEADING);
  if (sec == null) return null;
  return items(sec).map(({ n, text }) => {
    const ticked = [...text.matchAll(/\[([ xX])\]\s*\**(Yes|No)\b/g)].filter((b) => b[1] !== ' ').map((b) => b[2]);
    return { n, ticked, override: OVERRIDE.test(text), title: text.split('\n')[0].replace(/^\d+\.\s*/, '').trim() };
  });
}

/** The expected answers from pr-notes.md: Map n -> 'Yes' | 'No'. */
export function parseExpected(notes) {
  const sec = section(notes, EXPECTED);
  if (sec == null) return null;
  const out = new Map();
  for (const { n, text } of items(sec)) {
    const m = text.match(/^\d+\.\s+\**(Yes|No)\b/);
    if (m) out.set(n, m[1]);
  }
  return out;
}

/** The verdict: { pass, lines } -- one line per problem, or per item when all is well. */
export function verdict(body, notes) {
  const lines = [];
  const got = parseItems(body || '');
  const want = parseExpected(notes || '');
  if (got == null) lines.push('The PR description has no "For Ernest to look at" section.');
  if (section(notes || '', HEADING) == null) lines.push('docs/pr-notes.md has no "For Ernest to look at" section.');
  if (want == null) lines.push('docs/pr-notes.md has no "Expected answers (human-review)" section.');
  if (lines.length) return { pass: false, lines };
  if (!got.length) return { pass: false, lines: ['"For Ernest to look at" has no numbered items.'] };
  const problems = [], ok = [];
  for (const it of got) {
    const exp = want.get(it.n);
    if (!exp) { problems.push(`Item ${it.n}: no expected answer in docs/pr-notes.md.`); continue; }
    if (it.ticked.length !== 1) { problems.push(`Item ${it.n}: unanswered (${it.ticked.length ? 'both boxes ticked' : 'no box ticked'}) -- "${it.title}"`); continue; }
    if (it.ticked[0] !== exp && !it.override) {
      problems.push(`Item ${it.n}: answered ${it.ticked[0]}, expected ${exp} -- "${it.title}". Is the map wrong, or the expectation? Fix the map, or add a line under the item starting "Expected was wrong:".`);
      continue;
    }
    ok.push(`Item ${it.n}: ${it.ticked[0]}${it.ticked[0] !== exp ? ` (expected ${exp}; Ernest says the expectation was wrong)` : ''}`);
  }
  for (const n of want.keys()) if (!got.some((it) => it.n === n)) problems.push(`Item ${n}: expected in docs/pr-notes.md but not in the PR description.`);
  return problems.length ? { pass: false, lines: problems } : { pass: true, lines: ok };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const at = process.argv.indexOf('--body');
  const body = at > 0 ? readFileSync(process.argv[at + 1], 'utf8') : '';
  const notes = readFileSync(new URL('../docs/pr-notes.md', import.meta.url), 'utf8');
  const v = verdict(body, notes);
  console.log(v.pass ? 'human-review: every item answered, and as expected' : 'human-review: not yet');
  for (const l of v.lines) console.log(`  ${l}`);
  process.exit(v.pass ? 0 : 1);
}
