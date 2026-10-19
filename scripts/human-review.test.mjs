// The human-review check's reading of a PR description against pr-notes.md.
// `npm run test:review` runs these; CI runs them on every pull request.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verdict } from './human-review.mjs';

const NOTES = `# notes

## Expected answers (human-review)

1. Yes -- the marker moved west
2. No -- it waits for level 3

## For Ernest to look at

- the judgment calls
`;
const item = (n, yes, no, extra = '') => `${n}. **Level 1, somewhere:** is the thing showing?\n   - [${yes}] Yes\n   - [${no}] No\n${extra}`;
const body = (...its) => `Summary.\n\n## For Ernest to look at\n\n${its.join('\n')}\n## Screenshots\n\n- [x] No (not an item)\n`;

test('all answered and matching passes', () => {
  assert.equal(verdict(body(item(1, 'x', ' '), item(2, ' ', 'x')), NOTES).pass, true);
});

test('the one-line form "[ ] Yes  [ ] No" reads the same', () => {
  const b = `## For Ernest to look at\n\n1. Level 1: x?\n   [x] Yes  [ ] No\n2. Level 2: y?\n   [ ] Yes  [X] No\n`;
  assert.equal(verdict(b, NOTES).pass, true);
});

test('no box or both boxes ticked is unanswered', () => {
  const none = verdict(body(item(1, ' ', ' '), item(2, ' ', 'x')), NOTES);
  assert.equal(none.pass, false);
  assert.match(none.lines.join(), /Item 1: unanswered \(no box ticked\)/);
  const both = verdict(body(item(1, 'x', 'x'), item(2, ' ', 'x')), NOTES);
  assert.match(both.lines.join(), /Item 1: unanswered \(both boxes ticked\)/);
});

test('an unexpected answer fails, naming the item, until "Expected was wrong:" is added', () => {
  const v = verdict(body(item(1, 'x', ' '), item(2, 'x', ' ')), NOTES);
  assert.equal(v.pass, false);
  assert.match(v.lines.join(), /Item 2: answered Yes, expected No .*map wrong, or the expectation/);
  const w = verdict(body(item(1, 'x', ' '), item(2, 'x', ' ', '   Expected was wrong: it does show now.\n')), NOTES);
  assert.equal(w.pass, true);
});

test('a missing section, in either place, fails', () => {
  assert.equal(verdict('No section here.', NOTES).pass, false);
  assert.match(verdict(body(item(1, 'x', ' '), item(2, ' ', 'x')), NOTES.replace('## For Ernest to look at', '## Other')).lines.join(),
    /pr-notes.md has no "For Ernest to look at"/);
  assert.match(verdict(body(item(1, 'x', ' ')), '## For Ernest to look at\n').lines.join(), /no "Expected answers/);
});

test('an expected item missing from the description fails', () => {
  assert.match(verdict(body(item(1, 'x', ' ')), NOTES).lines.join(), /Item 2: expected .* not in the PR description/);
});

test('the section stops at the next heading: boxes below it are not items', () => {
  // The Screenshots section's "[x] No" in body() must not count toward item 2.
  assert.equal(verdict(body(item(1, 'x', ' '), item(2, ' ', 'x')), NOTES).lines.length, 2);
});
