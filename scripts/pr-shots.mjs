// Before/after screenshots for a PR: the phone at open (390, 375 and 430px), the
// sheet in the states that changed, the desktop (1440px) and the print sheet
// (?print=1), from `main` and from the branch.
//
//     npm run pr-shots                 # main vs the checked-out branch
//     npm run pr-shots -- --base=xyz   # another base ref
//
// Writes docs/pr-shots/{before,after}-{phone,desktop,print}.png and prints the
// Markdown that goes in the PR description. The GitHub Action in
// .github/workflows/pr-shots.yml runs this on every pull request, commits the
// PNGs to the branch and writes that Markdown into the PR body itself, so
// nobody has to remember; run it by hand when you want to look before you
// push.
//
// "Before" is built in a throwaway git worktree of the base ref, sharing this
// checkout's node_modules -- the base never needs a dependency this branch
// dropped, and the seconds an install would cost are not worth it.
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { launch } from './lib/browser.mjs';

const OUT = resolve('docs/pr-shots');
const BASE = (process.argv.find((a) => a.startsWith('--base=')) || '--base=main').slice(7);

// Steps that put the phone in a state a reviewer wants to see. Both use only
// what exists on every version of the page (area markers, booth rows, chips,
// pins), so the same steps run on `main` and on the branch.
//   booth      an art-market list, then a booth opened from it (the sheet's
//              back row, title line and ItemPager on this branch)
//   chipSheet  Restrooms on, then one of its pins tapped (peek height on this
//              branch)
const booth = async (page) => {
  const n = await page.locator('svg.ff-map g.ff-area .ff-marker').count();
  for (let i = 0; i < n; i++) {
    await page.locator('svg.ff-map g.ff-area .ff-marker').nth(i).dispatchEvent('click');
    await page.waitForTimeout(500);
    if (await page.locator('button.boothrow').count()) break;
  }
  await page.locator('button.boothrow').nth(5).dispatchEvent('click');
};
const chipSheet = async (page) => {
  await page.locator('.ffc-chip', { hasText: 'Restrooms' }).click();
  await page.waitForTimeout(650);
  await page.locator('svg.ff-map g.ffc-pin--wc').nth(1).dispatchEvent('click');
};
const PHONE = { isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

// One capture each of what a reviewer wants to see: the phone as it opens (390,
// and the 375 and 430 widths the sheet is tuned at), the sheet in the two states
// that changed, the desktop with its panel, the paper.
const SHOTS = [
  { name: 'phone', path: '/', viewport: { width: 390, height: 844 }, ...PHONE },
  { name: 'phone-375', path: '/', viewport: { width: 375, height: 667 }, ...PHONE },
  { name: 'phone-430', path: '/', viewport: { width: 430, height: 932 }, ...PHONE },
  { name: 'booth-375', path: '/', viewport: { width: 375, height: 667 }, steps: booth, ...PHONE },
  { name: 'booth-430', path: '/', viewport: { width: 430, height: 932 }, steps: booth, ...PHONE },
  { name: 'chip-sheet-375', path: '/', viewport: { width: 375, height: 667 }, steps: chipSheet, ...PHONE },
  { name: 'chip-sheet-430', path: '/', viewport: { width: 430, height: 932 }, steps: chipSheet, ...PHONE },
  { name: 'desktop', path: '/', viewport: { width: 1440, height: 900 } },
  { name: 'print', path: '/?print=1', viewport: { width: 1632, height: 1056 }, fullPage: true },
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

function serve(dist) {
  const server = createServer((req, res) => {
    let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!existsSync(p) || statSync(p).isDirectory()) p = join(dist, 'index.html');
    res.setHeader('Content-Type', MIME[extname(p)] || 'application/octet-stream');
    createReadStream(p).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

async function capture(browser, dist, tag) {
  const server = await serve(dist);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const { name, path, fullPage, steps, ...ctx } of SHOTS) {
      const page = await browser.newPage(ctx);
      await page.goto(base + path, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      if (steps) { await steps(page); await page.waitForTimeout(1000); }
      await page.screenshot({ path: join(OUT, `${tag}-${name}.png`), fullPage });
      await page.close();
    }
  } finally {
    server.close();
  }
}

function build(cwd, outDir) {
  execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], { cwd, stdio: 'pipe' });
}

mkdirSync(OUT, { recursive: true });
const work = join(tmpdir(), `ff-map-base-${process.pid}`);
const browser = await launch();
try {
  // After: this checkout.
  const after = join(tmpdir(), `ff-map-after-${process.pid}`);
  build(process.cwd(), after);
  await capture(browser, after, 'after');
  rmSync(after, { recursive: true, force: true });

  // Before: the base ref, in a worktree that borrows our node_modules.
  execFileSync('git', ['fetch', '-q', 'origin', BASE], { stdio: 'pipe' });
  execFileSync('git', ['worktree', 'add', '-q', '--detach', work, `origin/${BASE}`], { stdio: 'pipe' });
  symlinkSync(resolve('node_modules'), join(work, 'node_modules'), 'dir');
  const before = join(tmpdir(), `ff-map-before-${process.pid}`);
  build(work, before);
  await capture(browser, before, 'before');
  rmSync(before, { recursive: true, force: true });
} finally {
  await browser.close();
  if (existsSync(work)) execFileSync('git', ['worktree', 'remove', '--force', work], { stdio: 'pipe' });
}

// The Markdown for the PR body. Images resolve from the branch's own tree on
// GitHub, so they track the latest push.
const repo = process.env.GITHUB_REPOSITORY || 'brascosDad/FF-Map';
const branch = process.env.PR_HEAD_REF || execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD']).toString().trim();
const raw = (f) => `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch)}/docs/pr-shots/${f}`;
const rows = SHOTS.map(({ name }) => `| ${name} | <img src="${raw(`before-${name}.png`)}" width="360"> | <img src="${raw(`after-${name}.png`)}" width="360"> |`);
const md = ['<!-- pr-shots:start -->', '## Screenshots', '', `Before (\`${BASE}\`) and after (this branch). Captured by \`npm run pr-shots\`.`, '',
  '| | before | after |', '|---|---|---|', ...rows, '<!-- pr-shots:end -->'].join('\n');
console.log(md);
