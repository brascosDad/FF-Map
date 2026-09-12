// Render public/favicon.svg to the PNG sizes a phone asks for.
//   python3 scripts/build-icon.py && node scripts/build-icon.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg', 'utf8');
const OUT = process.argv[2];   // optional: also drop a big one here for review
const sizes = [
  [180, 'public/apple-touch-icon.png'],
  [32, 'public/favicon-32.png'],
  [512, 'public/icon-512.png'],   // the web manifest's install icon
];
if (OUT) sizes.push([512, OUT]);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [size, out] of sizes) {
  const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await p.waitForTimeout(120);
  await p.screenshot({ path: out, omitBackground: true });
  console.log('wrote', out, size + 'px');
  await p.close();
}
await b.close();
