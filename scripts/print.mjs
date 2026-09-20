// Render the printed map to files the printer can take.
//
//     npm run print            builds, then writes print/fall-fest-map-2026.pdf
//                              (vector, 17x11in) and print/fall-fest-map-2026.png
//                              (300dpi, 5100x3300)
//     node scripts/print.mjs   same, against an existing dist/
//
// The page is the app's own /?print=1 route (src/print/PrintSheet.jsx) served
// from dist/, so what prints is exactly what the deployed site would show at
// that URL -- one artwork, two outputs. Fonts are the bundled Brice and Manrope
// and embed in the PDF.
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { launch } from './lib/browser.mjs';

const DIST = resolve('dist');
const OUT = resolve('print');
const NAME = 'fall-fest-map-2026';
const DPI = 300;
const PAGE = { w: 17, h: 11 };   // inches, landscape tabloid

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('no dist/ -- run `npm run build` first (or `npm run print`, which does)');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.otf': 'font/otf', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json' };

// A throwaway static server: no dependency on `vite preview` being up.
const server = createServer((req, res) => {
  let p = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(DIST, 'index.html');
  res.setHeader('Content-Type', MIME[extname(p)] || 'application/octet-stream');
  createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await launch();
try {
  // Screen pixels at 96dpi; the sheet is laid out in inches so this is exact.
  const ctx = await browser.newContext({ viewport: { width: PAGE.w * 96, height: PAGE.h * 96 }, deviceScaleFactor: DPI / 96 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.goto(`${base}/?print=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.print-page');
  await page.evaluate(() => document.fonts.ready);

  // Sanity: every booth the data has is on the sheet, and the fonts are real.
  const check = await page.evaluate(() => ({
    numbers: document.querySelectorAll('.print-map rect + text').length,
    index: document.querySelectorAll('.print-index li').length,
    brice: document.fonts.check('900 44pt Brice'),
    manrope: document.fonts.check('700 8pt Manrope'),
  }));
  console.log(`sheet: ${check.numbers} numbered squares, ${check.index} index rows, fonts ${check.brice && check.manrope ? 'ok' : 'MISSING'}`);
  if (!check.brice || !check.manrope) process.exitCode = 1;

  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: join(OUT, `${NAME}.pdf`), width: `${PAGE.w}in`, height: `${PAGE.h}in`,
                   printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await page.emulateMedia({ media: 'screen' });
  const sheet = await page.locator('.print-page');
  await sheet.screenshot({ path: join(OUT, `${NAME}.png`) });
  console.log(`wrote ${join('print', NAME)}.pdf and .png (${PAGE.w}x${PAGE.h}in, ${DPI}dpi)`);
} finally {
  await browser.close();
  server.close();
}
