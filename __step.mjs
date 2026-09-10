import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [name, w, h] of [['tablet',834,1112],['desktop',1440,900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.goto('http://localhost:4330/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('.zbtn').first().click(); await p.waitForTimeout(600);
  await p.locator('.zbtn').first().click(); await p.waitForTimeout(700);
  let opened = false;
  const n = await p.locator('svg.ff-map g.ff-booth').count();
  for (let i = 0; i < n && !opened; i++) {
    const bb = await p.locator('svg.ff-map g.ff-booth').nth(i).boundingBox().catch(() => null);
    if (!bb || bb.x < 4 || bb.y < 4 || bb.x + bb.width > w - 4 || bb.y + bb.height > h - 4) continue;
    await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
    await p.waitForTimeout(400);
    opened = (await p.locator('.boothnav').count()) > 0;
  }
  if (!opened) { console.log(`${name}: FAIL could not open a booth (${n} booth groups)`); await p.close(); continue; }
  const read = async () => (await p.locator('.bnpos').textContent()).match(/^(\d+) of (\d+) · (.+)$/);
  const start = await read();
  const areas = new Set([start[3]]);
  let wrapped = false, prev = +start[1];
  for (let s = 0; s < +start[2]; s++) {
    await p.locator('.bn').last().click(); await p.waitForTimeout(80);
    const c = await read(); if (!c) break;
    areas.add(c[3]);
    if (+c[1] === 1 && prev === +c[2]) wrapped = true;
    prev = +c[1];
  }
  const btn = await p.locator('.bn').first().boundingBox();
  console.log(`${name}: opened from "${start[3]}" (${start[2]} booths) | areas touched: ${[...areas].join('+')} | wrapped: ${wrapped} | caret ${btn.width}x${btn.height}`);
  console.log(`${name}: ${areas.size === 1 && wrapped && btn.width >= 44 ? 'PASS' : 'FAIL'}`);
  await p.close();
}
await b.close();
