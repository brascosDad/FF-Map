// The from → to comment on a pull request: what Ernest looks at before he
// accepts a visual change (tests/visual/README.md).
//
//     node scripts/visual-comment.mjs post [--reask]   # CI, after a visual case failed
//     node scripts/visual-comment.mjs expected <out>   # the accept Action, before it renders
//     node scripts/visual-comment.mjs accepted         # the accept Action, after it committed
//
// `post` reads .e2e-out/visual/from-to.json (written by scripts/visual.mjs),
// publishes the from → to images, and comments on the PR: one plain line per
// change, the image, and a hash of each new render in an HTML comment. It
// skips the post when the PR's latest from → to already shows the same
// renders, so a push that changes nothing visible doesn't repeat it.
//
// The images go to the `visual-from-to` branch, one commit per post with only
// that post's files, each commit's parent the one before (so every older
// comment's images stay reachable). They never touch the PR branch, its diff
// or its CI. The comment links them by commit, so an image can't change under
// a comment after it was posted.
//
// `expected` finds the PR's latest from → to (posted by the Actions bot, so
// nobody can paste one) and writes {"hashes": {case: sha256}, "url": …}: what
// the accept run must render to be allowed to write the baselines.
//
// Environment: GH_TOKEN, REPO (owner/name), PR (number), HEAD_SHA, and for
// `accepted` SENDER (who put the label on) and COMMIT (the baseline commit).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

export const MARKER = '<!-- visual-from-to -->';
export const BOT = 'github-actions[bot]';
export const LABEL = 'accept-visual-changes';
const BRANCH = 'visual-from-to';
const REPORT = '.e2e-out/visual/from-to.json';
// Display width in the comment; the image links to its full size.
const WIDTH = { print: 816 };

/** The hashes a from → to comment showed, by case. */
export function parseShown(body = '') {
  const hashes = {};
  for (const m of body.matchAll(/<!-- visual-hash:([a-z0-9-]+):([0-9a-f]{64}) -->/g)) hashes[m[1]] = m[2];
  return hashes;
}

/** The PR's latest from → to: the last bot comment carrying the marker. */
export function latestFromTo(comments) {
  return comments.filter((c) => c.user?.login === BOT && c.body?.includes(MARKER)).at(-1) || null;
}

/** True when a comment already shows exactly these renders. */
export function sameRenders(comment, report) {
  if (!comment) return false;
  const shown = parseShown(comment.body);
  return Object.keys(shown).length === report.cases.length && report.cases.every((c) => shown[c.name] === c.hash);
}

/** The comment's Markdown. `imageUrl(case)` gives each image's address. */
export function formatComment(report, imageUrl, { reask = false, head = '' } = {}) {
  const n = report.cases.length;
  const out = [MARKER, '## Visual changes: from → to', ''];
  if (reask) {
    out.push('**Not accepted, nothing was updated.** The label went on, but the branch no longer renders what the last from → to showed. This is what it renders now. If these are the changes you want, put the label on again.', '');
  }
  out.push(`${n === 1 ? 'One' : n === 2 ? 'Two' : 'All three'} of the three checked views ${n === 1 ? 'changes' : 'change'}. In each picture **faded is where a thing was; solid with a dashed outline is where it is now.** A dashed line joins the two when they don't overlap. An outline with nothing faded in it is new; something faded inside an outline is gone.`, '');
  for (const c of report.cases) {
    out.push(`### ${c.title}`, '');
    for (const l of c.lines) out.push(`- ${l}`);
    const url = imageUrl(c.name);
    out.push('', `<a href="${url}"><img src="${url}" width="${WIDTH[c.name] || 390}" alt="${c.title}: from → to"></a>`, '');
    out.push(`<sub>render \`${c.hash.slice(0, 12)}\`</sub>`, `<!-- visual-hash:${c.name}:${c.hash} -->`, '');
  }
  out.push('---', `**If these are the changes you meant, put the \`${LABEL}\` label on the PR.** That accepts exactly what is shown here: if the branch renders anything different by the time the label goes on, nothing is updated and a fresh from → to is posted instead.`);
  if (head) out.push(`<!-- visual-head:${head} -->`);
  return out.join('\n') + '\n';
}

// ---------------------------------------------------------------- GitHub

const env = (k) => {
  if (!process.env[k]) throw new Error(`${k} is not set`);
  return process.env[k];
};
async function gh(path, { method = 'GET', body } = {}) {
  const init = { method, headers: { authorization: `Bearer ${env('GH_TOKEN')}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' } };
  if (body) init.body = JSON.stringify(body);
  const res = await fetch(`https://api.github.com/repos/${env('REPO')}${path}`, init);
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}
async function comments() {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`/issues/${env('PR')}/comments?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

// Publish the images as one commit on the visual-from-to branch, built with
// plumbing so the checkout's working tree and branch are never touched.
// Returns the commit sha. Retries when another run moved the branch.
function publish(files) {
  const git = (args, input) => execFileSync('git', args, { input, encoding: 'utf8' }).trim();
  const who = { GIT_AUTHOR_NAME: 'github-actions[bot]', GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com' };
  Object.assign(process.env, who, { GIT_COMMITTER_NAME: who.GIT_AUTHOR_NAME, GIT_COMMITTER_EMAIL: who.GIT_AUTHOR_EMAIL });
  const tree = git(['mktree'], files.map(({ name, path }) => `100644 blob ${git(['hash-object', '-w', path])}\t${name}\n`).join(''));
  for (let attempt = 1; ; attempt++) {
    let parent = null;
    try { git(['fetch', '--quiet', 'origin', `+refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}`]); parent = git(['rev-parse', `refs/remotes/origin/${BRANCH}`]); } catch { /* first post ever */ }
    const commit = git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', `From → to for PR #${env('PR')} at ${env('HEAD_SHA').slice(0, 7)}`]);
    try {
      git(['push', '--quiet', 'origin', `${commit}:refs/heads/${BRANCH}`]);
      return commit;
    } catch (e) {
      if (attempt >= 4) throw e;
    }
  }
}

async function post({ reask }) {
  if (!existsSync(REPORT)) return console.log('no visual changes: nothing to post');
  const report = JSON.parse(readFileSync(REPORT, 'utf8'));
  if (!reask && sameRenders(latestFromTo(await comments()), report)) return console.log('the latest from → to already shows these renders');
  const pr = env('PR'), head = env('HEAD_SHA');
  const files = report.cases.map((c) => ({ case: c.name, path: c.image, name: `pr${pr}-${head.slice(0, 7)}-${basename(c.image)}` }));
  const commit = publish(files);
  const url = (name) => `https://github.com/${env('REPO')}/blob/${commit}/${files.find((f) => f.case === name).name}?raw=true`;
  const { html_url } = await gh(`/issues/${pr}/comments`, { method: 'POST', body: { body: formatComment(report, url, { reask, head }) } });
  console.log(`posted ${html_url}`);
}

async function expected(out) {
  const c = latestFromTo(await comments());
  writeFileSync(out, JSON.stringify({ hashes: c ? parseShown(c.body) : {}, url: c?.html_url || null }) + '\n');
  console.log(c ? `accepting against ${c.html_url}` : 'no from → to on this PR yet');
}

async function accepted() {
  const { accepted: names } = JSON.parse(readFileSync('.e2e-out/visual/accept.json', 'utf8'));
  const c = latestFromTo(await comments());
  await gh(`/issues/${env('PR')}/comments`, { method: 'POST', body: { body:
    `Accepted by @${env('SENDER')}: ${names.map((n) => `\`${n}\``).join(', ')}, exactly as shown in ${c ? `[the from → to](${c.html_url})` : 'the from → to'}. New baselines in ${env('COMMIT')}.` } });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'post') await post({ reask: process.argv.includes('--reask') });
  else if (cmd === 'expected') await expected(arg);
  else if (cmd === 'accepted') await accepted();
  else { console.error('usage: visual-comment.mjs post [--reask] | expected <out> | accepted'); process.exit(2); }
}
