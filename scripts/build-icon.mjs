// Render public/favicon.svg to the PNG sizes a phone asks for.
//   python3 scripts/build-icon.py && node scripts/build-icon.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

// Two sources, deliberately. Brice Black is the masthead's weight and the one
// the home-screen icon should carry; at 32px its counters close up and the pair
// starts reading as PP. The small favicon is built from SemiBold, whose counters
// survive the size. Nobody can read weight at 32px -- they can only read whether
// it says FF.
const big = readFileSync('public/favicon.svg', 'utf8');
// Not in public/: this one is a build input for the 32px PNG, not a file the
// site serves.
const small = readFileSync('scripts/favicon-small.svg', 'utf8');
const OUT = process.argv[2];   // optional: also drop a big one here for review
const sizes = [
  [180, 'public/apple-touch-icon.png', big],
  [512, 'public/icon-512.png', big],     // the web manifest's install icon
  [32, 'public/favicon-32.png', small],
];
if (OUT) sizes.push([512, OUT, big]);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [size, out, svg] of sizes) {
  const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await p.waitForTimeout(120);
  await p.screenshot({ path: out, omitBackground: true });
  console.log('wrote', out, size + 'px');
  await p.close();
}
await b.close();
