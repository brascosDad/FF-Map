# Visual baselines

Three approved renders that CI compares the build against, pixel by pixel (`scripts/visual.mjs`,
run by `npm run test:e2e` and `npm run test:visual`):

| file | what |
|---|---|
| `phone-open.png` | the phone (390×844) as it opens |
| `sheet-open.png` | the phone with the Kidlandia bottom sheet open |
| `print.png` | the print sheet, `/?print=1`, full page |

Any change to what these show **fails CI** until the baseline is updated on purpose. That is the
point: nothing people see changes by accident.

## Whose renders these are

The CI runner's (GitHub Actions, `ubuntu-latest`, Playwright's Chromium). Every OS and Chromium
build rasterises text a little differently — a laptop's phone-open differed from the runner's by
0.4% of pixels, the print sheet by 3.8%, which is more than a moved pin — so one machine has to
own the baselines, and the machine that judges the PR is it. Run locally, the comparison still
shows you what differs (`diff` lines, with the images in `.e2e-out/visual/`) but does not fail:
a local diff cannot tell a real change from a different font engine. **CI has the verdict.**

## Updating a baseline

1. Look at the diff. Locally, `npm run test:visual` writes `.e2e-out/visual/<case>-actual.png`
   and `<case>-diff.png` (changed pixels in red). On a failed CI run, the same files are in
   the run's `e2e-out` artifact. Decide the change is the one you meant to make.
2. Put the **`update-visual-baselines`** label on the PR. The "Update visual baselines"
   Action re-renders all three on the runner, commits `tests/visual/*.png` to the branch, takes
   the label off, and starts CI on the branch so the PR gets its verdict on the new baselines.
   (Or: Actions tab → "Update visual baselines" → Run workflow, on the branch.)
3. Say in the PR description which baselines changed and why.

Never update a baseline to make a red build green without looking at the diff first.

`node scripts/visual.mjs --update` still works, but off the runner it writes *your* machine's
renders, which CI will then reject; it is there for the Action.

The runner's renders are deterministic: fixed viewports, device scale 1, motion reduced, bundled
fonts. A 0.1% pixel tolerance absorbs sub-pixel drift; a moved pin or a changed label moves far
more. If GitHub's runner image changes its font stack one day, all three will fail at once with
small diffs — that is the signal to re-render, not a bug in the map.
