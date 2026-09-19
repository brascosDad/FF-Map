# Visual baselines

Three approved renders that `npm run test:e2e` compares the build against, pixel by pixel
(`scripts/visual.mjs`):

| file | what |
|---|---|
| `phone-open.png` | the phone (390×844) as it opens |
| `sheet-open.png` | the phone with the Kidlandia bottom sheet open |
| `print.png` | the print sheet, `/?print=1`, full page |

Any change to what these show **fails the suite** until the baseline is updated on purpose.
That is the point: nothing people see changes by accident.

## Updating a baseline

1. Run `npm run test:e2e`. A failing case writes `.e2e-out/visual/<case>-actual.png` and
   `<case>-diff.png` (the changed pixels, in red). Look at the diff and decide the change is
   the one you meant to make.
2. `node scripts/visual.mjs --update` (with the built app being served, or just run
   `npm run test:e2e -- --update`, which builds and serves first). It rewrites all three PNGs
   from what renders now.
3. Commit the changed PNGs **in the same PR as the change**, and say in the PR description
   which baselines changed and why.

Never update a baseline to make a red build green without looking at the diff first.

The renders are deterministic on one machine: fixed viewports, device scale 1, motion
reduced, bundled fonts. Across machines, anti-aliasing can move edge pixels, so up to 0.1%
of pixels may differ before a case fails; a moved pin or a changed label moves far more.
