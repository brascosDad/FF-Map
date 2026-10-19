// The from → to: how a change is worded, and how the accept step reads the
// comment it accepts against. `npm run test:from-to` runs these; CI runs them
// on every pull request.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareElements, describe, inPinWidths, unexplainedRegions } from './lib/from-to.mjs';
import { BOT, MARKER, formatComment, latestFromTo, parseShown, sameRenders } from './visual-comment.mjs';

const el = (kind, id, x, y, w = 40, h = 40, shape = 'circle') => ({ kind, id, key: `${kind}:${id}`, shape, box: { x, y, w, h } });

test('distances are in pin-widths, never pixels', () => {
  assert.equal(inPinWidths(160, 40), 'about 4 pin-widths');
  assert.equal(inPinWidths(20, 40), 'about half a pin-width');
  assert.equal(inPinWidths(40, 40), 'about 1 pin-width');
  assert.equal(inPinWidths(3, 40), 'under a quarter of a pin-width');
  assert.doesNotMatch(inPinWidths(123, 40), /px|%/);
});

test('a moved art marker reads as a compass move', () => {
  const [c] = compareElements([el('marker', 'mcl', 300, 700)], [el('marker', 'mcl', 140, 702)]);
  assert.equal(c.type, 'moved');
  assert.equal(describe(c, 40), 'McLendon Ave art marker moved about 4 pin-widths west');
});

test('appeared, vanished and resized, and sub-pixel drift ignored', () => {
  const before = [el('pin', '1', 0, 0), el('pin', '2', 100, 100), el('chip', 'Water', 10, 10, 80, 44, 'rect'), el('pin', '4', 50, 50)];
  const after = [el('pin', '1', 0.6, 0.4), el('chip', 'Water', 10, 10, 120, 44, 'rect'), el('pin', '3', 200, 200), el('pin', '4', 50, 50)];
  const lines = compareElements(before, after).map((c) => describe(c, 40));
  assert.deepEqual(lines.sort(), [
    '"Water" chip is about 1 pin-width wider',
    'Kidlandia pin appeared',
    'Acoustic pin is gone',
  ].sort());
});

test('changed pixels a named change explains are not outlined again', () => {
  const w = 100, h = 100, mask = new Uint8Array(w * h);
  mask[10 * w + 10] = 1;      // under the moved pin
  mask[80 * w + 80] = 1;      // nothing named here
  const changes = [{ type: 'moved', from: { x: 0, y: 0, w: 20, h: 20 }, to: { x: 30, y: 0, w: 20, h: 20 } }];
  const r = unexplainedRegions(mask, w, h, changes);
  assert.equal(r.length, 1);
  assert.ok(r[0].x <= 80 && r[0].x + r[0].w > 80);
});

const REPORT = { cases: [
  { name: 'phone-open', title: 'Phone at open', hash: 'a'.repeat(64), lines: ['McLendon Ave art marker moved about 4 pin-widths west'] },
  { name: 'print', title: 'Print sheet', hash: 'b'.repeat(64), lines: ['Beer pin is gone'] },
] };
const url = (n) => `https://example.test/${n}.png`;

test('the comment carries every render hash, and reads back', () => {
  const body = formatComment(REPORT, url, { head: 'c0ffee' });
  assert.ok(body.startsWith(MARKER));
  assert.match(body, /accept-visual-changes/);
  assert.match(body, /- McLendon Ave art marker moved about 4 pin-widths west/);
  assert.doesNotMatch(body.replace(/<!--[\s\S]*?-->/g, '').replace(/width="\d+"/g, ''), /\d+(\.\d+)?\s*(px|%)/);
  assert.deepEqual(parseShown(body), { 'phone-open': 'a'.repeat(64), print: 'b'.repeat(64) });
});

test('only the bot\'s latest from → to counts', () => {
  const ok = { user: { login: BOT }, body: formatComment(REPORT, url) };
  const forged = { user: { login: 'someone' }, body: formatComment({ cases: [{ ...REPORT.cases[0], hash: 'f'.repeat(64) }] }, url) };
  const older = { user: { login: BOT }, body: formatComment({ cases: [REPORT.cases[0]] }, url) };
  assert.equal(latestFromTo([older, ok, forged, { user: { login: BOT }, body: 'unrelated' }]), ok);
  assert.equal(latestFromTo([]), null);
});

test('a push that changes nothing visible is not posted again', () => {
  const posted = { user: { login: BOT }, body: formatComment(REPORT, url) };
  assert.equal(sameRenders(posted, REPORT), true);
  assert.equal(sameRenders(posted, { cases: [REPORT.cases[0]] }), false);
  assert.equal(sameRenders(posted, { cases: [REPORT.cases[0], { ...REPORT.cases[1], hash: 'd'.repeat(64) }] }), false);
  assert.equal(sameRenders(null, REPORT), false);
});
