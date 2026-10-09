// The picture of the WhatsOnNow card for design-system.html §4, at 390px.
//
//   node scripts/demo-whats-on-now.mjs [out.png]
//
// The card is behind FESTIVAL.showNow: false, so no build of the app shows it.
// This serves the source with Vite and flips the flag for this one page only
// (the festival.js module is rewritten in flight; nothing on disk changes),
// with the clock held at Saturday 1:45 PM, festival time, when the Main Stage
// is mid-set.
import { createServer } from 'vite';
import { launch } from './lib/browser.mjs';

const OUT = process.argv[2] || 'docs/demo/whats-on-now-390.png';
const AT = '2026-10-03T13:45:00-04:00';

const server = await createServer({ server: { port: 4320, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await launch();
try {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await p.route('**/src/data/festival.js*', async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    if (!body.includes('showNow: false')) throw new Error('festival.js: no "showNow: false" to flip');
    await route.fulfill({ response: res, body: body.replace('showNow: false', 'showNow: true') });
  });
  await p.clock.setFixedTime(new Date(AT));
  await p.goto('http://localhost:4320/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const pins = p.locator('g.ffc-pin--stage');
  for (let i = 0; i < await pins.count(); i++) {
    await pins.nth(i).dispatchEvent('click'); await p.waitForTimeout(800);
    if (/Main Stage/.test(await p.locator('.ffc-panel__title').first().innerText())) break;
  }
  await p.locator('.ffc-whatsonnow').waitFor();
  await p.screenshot({ path: OUT });
  console.log(`${OUT}  390x844 @2x, ${AT}`);
} finally {
  await browser.close();
  await server.close();
}
