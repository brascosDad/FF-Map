# Visual baselines

Three approved renders that CI compares the build against, pixel by pixel (`scripts/visual.mjs`,
run by `npm run test:e2e` and `npm run test:visual`):

| file | what |
|---|---|
| `phone-open.png` | the phone (390×844) as it opens |
| `sheet-open.png` | the phone with the Kidlandia bottom sheet open |
| `print.png` | the print sheet, `/?print=1`, full page |

Any change to what these show **fails CI** until Ernest accepts it on purpose. That is the point:
nothing people see changes by accident. Beside each PNG, `<case>.json` records where each named
element sits in it, which is how CI can say what moved.

## Whose renders these are

The CI runner's (GitHub Actions, `ubuntu-latest`, Playwright's Chromium). Every OS and Chromium
build rasterises text a little differently — a laptop's phone-open differed from the runner's by
0.4% of pixels, the print sheet by 3.8%, which is more than a moved pin — so one machine has to
own the baselines, and the machine that judges the PR is it. Run locally, the comparison still
shows you what differs (`diff` lines, with the images in `.e2e-out/visual/`) but does not fail:
a local diff cannot tell a real change from a different font engine. **CI has the verdict.**

## What Ernest looks at: the from → to comment

When a case changes, CI fails and posts a **from → to** comment on the PR
(`scripts/visual-comment.mjs`). For each changed view it has one plain line per change and one
picture, built from the new render:

- **moved:** the old position faded (a ghost, ~35%), the new one solid with a dashed black
  outline on a white halo, a few px outside the element so it never covers the edge you are
  judging. If the two don't overlap, a thin dashed line joins them. No arrowheads: faded = was,
  solid = is. If they overlap, the ghost peeking out shows the move.
- **appeared:** a dashed outline, nothing faded inside it.
- **vanished:** the ghost, with a dashed outline.
- **anything else** that changed (text, colour, the map itself — pixels no named element
  explains): a dashed outline round the area, and a line saying so.

No red or green and no colour coding. Distances are in **pin-widths** ("McLendon Ave art marker
moved about 4 pin-widths west"), never pixels or percentages. The share of changed pixels is only
what makes the check fail; nobody is asked to judge it.

The "named elements" are the ones `scripts/lib/from-to.mjs` records: pins, art-market markers,
area labels and booths on the phone map; the chips, buttons, header and sheet; on paper the pins,
booths, QR code, legend rows and index rows. Their positions in each baseline are in
`tests/visual/<case>.json`, written with the PNG and never hand-edited.

## Accepting a change

1. **Look at the from → to comment.** Check every line and every outline is a change you meant.
   (The raw renders are still in CI's `e2e-out` artifact: `<case>-actual.png`, `<case>-diff.png`,
   `<case>-from-to.png`.)
2. If they are, put the **`accept-visual-changes`** label on the PR. The label means **"I accept
   the changes I was shown."** The "Accept visual changes" Action re-renders on the runner and
   compares each changed view with the hash recorded in that comment:
   - **same render** → it commits `tests/visual/*.png` and `*.json` to the branch, says so on the
     PR, takes the label off and starts CI, which goes green on the new baselines;
   - **different render** (the branch changed what these views show since the comment, or there
     was no comment yet) → it updates **nothing**, posts a fresh from → to and takes the label
     off. Look again; label again if you still want it.
3. Say in the PR description which views changed and why.

A push that changes code but not what these views show keeps the same hashes, so a label after it
still accepts. The old label, `update-visual-baselines`, works the same way for one release, then
goes. There is no "Run workflow" route any more: accepting what nobody was shown is what this
replaced.

Locally, `npm run test:visual` writes the same from → to images to `.e2e-out/visual/`, but your
machine's text rendering differs from the runner's, so expect outlined areas round the text.
`node scripts/visual.mjs --update` writes your machine's renders as baselines, which CI will then
reject; it is for trying things out, not for a PR.

The runner's renders are deterministic: fixed viewports, device scale 1, motion reduced, bundled
fonts. A 0.1% pixel tolerance absorbs sub-pixel drift; a moved pin or a changed label moves far
more. If GitHub's runner image changes its font stack one day, all three will fail at once with
small diffs — that is the signal to re-render, not a bug in the map.
