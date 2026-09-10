// Screenshot helper. The e2e suite asserts behaviour; this is for looking at
// the thing. Three bugs this project has shipped were invisible to a green
// suite, so anything visual gets eyeballed here before it gets pushed.
//
//   npm run build && npx vite preview --port 4310 &
//   node scripts/shot.mjs [outdir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'shots';
const URL = process.env.SHOT_URL || 'http://localhost:4310/';
const VIEWS = [
  { name: 'mobile', width: 390, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'tablet', width: 834, height: 1112, hasTouch: true },
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'desktop-wide', width: 1600, height: 1000 },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const { name, width, height, ...rest } of VIEWS) {
  const page = await browser.newPage({ viewport: { width, height }, ...rest });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${OUT}/${name}.png  ${width}x${height}`);
  await page.close();
}
await browser.close();
