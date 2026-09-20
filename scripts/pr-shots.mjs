// Before/after screenshots for a PR: the phone at open (390px), the desktop
// (1440px) and the print sheet (?print=1), from `main` and from the branch.
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

// One capture each of what a reviewer wants to see: the phone as it opens, the
// desktop with its panel, the paper.
const SHOTS = [
  { name: 'phone', path: '/', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
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
    for (const { name, path, fullPage, ...ctx } of SHOTS) {
      const page = await browser.newPage(ctx);
      await page.goto(base + path, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
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
