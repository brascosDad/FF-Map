# PR notes: visual changes are judged by eye, and the label accepts what was shown

Two changes to the visual check (`scripts/visual.mjs`), nothing on the map itself:

1. **From → to.** When a case fails, CI posts a comment on the PR with one picture per changed
   view, built from the new render: the old position of each element that moved as a ghost
   (35%), the new one solid with a dashed black outline on a white halo a few px outside it, and a
   thin dashed line between them when they don't overlap. Appeared = dashed outline only;
   vanished = ghost with dashed outline; anything no named element explains = a dashed outline
   round the area. No red/green. Each change gets one plain line in **pin-widths**
   ("McLendon Ave art marker moved about 2 pin-widths north-east"). The pixel percentage is
   still the pass/fail trigger and appears nowhere a person reads.
2. **The label accepts what was shown.** `update-visual-baselines` → **`accept-visual-changes`**
   (the old name still works, the same way, for one release). The comment records a sha256 of
   each new render; the accept Action re-renders the same way CI did (the PR's merge commit) and
   commits the baselines only if every changed view hashes to what the comment showed. Otherwise
   it updates nothing, posts a fresh from → to and asks again.

## How it works

- `scripts/lib/from-to.mjs`: records where each named element sits in a render (pins,
  art-market markers, area labels, booths, chips, buttons, header, sheet; on paper pins, booths,
  QR, legend and index rows), compares two records, names each element from the app's own data
  (`pins.js`, `directory.js`, `areas.js`), words the line, and draws the picture in the browser's
  canvas.
- `tests/visual/<case>.json` (**new**): the element record for each baseline PNG, written with it.
  This is how CI knows what moved. The three in this PR were generated in this container from the
  same code the baselines were rendered from; element positions are SVG geometry and don't depend
  on the font engine (checked: against this container's own renders, no element is reported as
  moved). The first accept run on any PR re-reads them on the runner.
- `scripts/visual-comment.mjs` (**new**): posts the comment, finds the latest one for the accept
  run, and says "Accepted by @who" afterwards. It only trusts comments posted by
  `github-actions[bot]`, so a pasted comment can't carry forged hashes. It skips posting when the
  latest from → to already shows the same renders.
- Images live on a branch of their own, **`visual-from-to`** (created by the first post), one
  commit per post, linked by commit sha, so an image can't change under a comment and the PR
  branch's diff never carries them.
- `ci.yml` gets `contents: write` + `pull-requests: write` for that one step.
  `visual-baselines.yml` is now "Accept visual changes"; its "Run workflow" button is gone
  (it accepted without anyone being shown anything).
- Tests: `npm run test:from-to` (wording in pin-widths, compass moves, grow-from-one-edge is a
  size change not a move, unexplained areas, hash round trip, only the bot's latest comment
  counts, no re-post for the same renders). CI runs it.
- Checked in this container: the accept step with a stale hash (writes nothing, asks again), a
  matching one (writes), and none to accept; the render hash is identical across three runs.

## Proof: a real from → to

On the PR: a scratch commit moved the McLendon Ave art marker, CI failed and posted its from → to
comment, then the scratch commit was reverted. Links in the PR description.

## CLAUDE.md wording for Cowork to apply

I haven't edited `CLAUDE.md` (Cowork's file). Note: `main`'s log shows **PR #20 already merged**
(8bace47, "Merge pull request #20 … trim-context-file"), so the trim is in. `CLAUDE.md` on `main`
also has **standing requirement 4 twice** (once after 6/7). Replace both with the one below.

**Standing requirement 4:**

> **4. Visual changes are judged by eye, and accepted as shown.** CI diffs three renders (the phone
> at open, the phone with a bottom sheet open, the print sheet) against `tests/visual/*.png`. A
> change fails CI, and CI posts a **from → to** comment on the PR: each change drawn on the new
> render (faded = was, solid with a dashed outline = is) and one plain line per change in
> pin-widths. That comment is what Ernest judges. The **`accept-visual-changes`** label means "I
> accept the changes I was shown": the Action commits the new baselines only if the branch still
> renders exactly what the comment showed (a hash of each render is in it); if the branch changed
> since, nothing is updated and a fresh from → to is posted. The baselines are the **CI runner's**
> renders, so `npm run test:visual` locally is advisory. `tests/visual/README.md` has the steps.

**Commands block**, the `test:visual` line:

```
npm run test:visual   # just the visual diffs, with from → to images in .e2e-out/visual/; advisory off CI. To accept a change: Ernest labels the PR accept-visual-changes after reading CI's from → to comment
npm run test:from-to  # unit tests for the from → to wording and the accept check
```

## Questions, skipped items, nudges

- **Who may accept?** Anyone who can label the PR can put `accept-visual-changes` on. The Action
  records who did (commit message and the "Accepted by @…" comment) but doesn't restrict it.
  Restricting to Ernest's account is one line; say if you want it.
- **When to drop `update-visual-baselines`:** "one release" — I'd take it out in the first PR of
  next year's build. Nothing reminds anyone; it's listed here.
- The `accept-visual-changes` label didn't exist before this PR; it was created on the repo.
- No pin nudges; no map, data or rendering change, so the three baselines stay as they are.

## Expected answers (human-review)

1. Yes — the from → to comment shows the McLendon Ave art marker faded at its old spot and solid
   with a dashed outline at the new one.
2. No — there is no red or green anywhere in the from → to picture.
3. Yes — the comment's line measures the move in pin-widths.
4. No — the CI check on the PR's final commit (after the revert) posted no new from → to comment.

## For Ernest to look at

1. **The demo from → to comment on this PR:** is it readable to you without explanation? That's
   the whole point of this change; if the picture or the wording needs a legend, say what.
2. **Judgment calls to accept:** the label now refuses a stale accept and asks again (instead of
   accepting whatever renders); images go to a separate `visual-from-to` branch; CI gets write
   access for the comment step; the "Run workflow" button is gone.
3. **The CLAUDE.md wording above** — for Cowork to apply, if you agree with it.
4. Applies from "Where Ernest looks": item 3 (judgment calls) and item 4 (it now describes this
   comment). Items 1, 2 and 5 don't apply: nothing on the map changed.
