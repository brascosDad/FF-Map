// `npm run test:e2e`: serve the built app, run the behaviour suite, then the
// visual comparisons, and exit non-zero if either failed.
//
// This replaces a shell one-liner that backgrounded `vite preview` and killed
// it afterwards -- whose exit status was the kill's, so a green run reported
// failure and a red one could report success. One static server, two child
// processes, one honest exit code.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const DIST = resolve('dist');
const PORT = 4310;
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('no dist/ -- run `npm run build` first');
  process.exit(1);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  let p = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(DIST, 'index.html');
  res.setHeader('Content-Type', MIME[extname(p)] || 'application/octet-stream');
  createReadStream(p).pipe(res);
});
// No host: bind every interface, so both http://localhost (which Node 22
// resolves to ::1 first) and http://127.0.0.1 reach it.
await new Promise((r) => server.listen(PORT, r));

// Asynchronous, not spawnSync: the server lives in this process, and a
// synchronous child would block the event loop that answers its requests.
const run = (script) => new Promise((resolve) => {
  spawn(process.execPath, [script, ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, E2E_BASE: `http://127.0.0.1:${PORT}` } })
    .on('exit', (code) => resolve(code ?? 1));
});
let status = 0;
console.log('\n=== e2e ===');
status |= await run('scripts/e2e.mjs');
console.log('\n=== visual ===');
status |= await run('scripts/visual.mjs');
server.close();
process.exit(status ? 1 : 0);
