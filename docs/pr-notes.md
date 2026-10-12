# PR notes: a lightness band the system can check

The category pins were described as sharing "one band of lightness". Measured as the eye sees it
(OKLCH L, not HSL), eight sat between 57.7 and 66.3 and two sat well below: merch 52.7, beverage
53.2. This PR lifts those two into the band and turns the band into a rule the manifest states and
`npm run test:ds` enforces. Design system 1.1.0 → **1.2.0**.

## Measured (`npm run ds -- check-palette`, this branch)

Contrast is under the white glyph. Darkest first.

| Token | Value | OKLCH L | C | H | Contrast |
|---|---|---|---|---|---|
| `--pin-info` | #407EB5 | 57.7 | 0.107 | 247.6 | 4.31:1 |
| `--pin-merch` | **#AF4FA5** (was #9E3F94: L 52.7, C 0.163, H 331.9, 5.85:1) | **57.9** | 0.164 | 331.6 | 4.68:1 |
| `--pin-beverage` | **#997332** (was #8A6521: L 53.2, C 0.095, H 78.8, 5.30:1) | **58.0** | 0.095 | 78.3 | 4.33:1 |
| `--pin-firstaid` | #C84B46 | 58.1 | 0.161 | 25.7 | 4.61:1 |
| `--pin-stage` | #8F71B7 | 60.5 | 0.108 | 303.0 | 4.03:1 |
| `--pin-kids` | #C25B7E | 60.7 | 0.137 | 0.6 | 4.12:1 |
| `--pin-water` | #3D8FA4 | 60.8 | 0.085 | 217.4 | 3.71:1 |
| `--pin-restroom` | #3D9E6E | 62.9 | 0.117 | 158.6 | 3.33:1 |
| `--pin-food` | #C97636 | 64.5 | 0.130 | 55.2 | 3.43:1 |
| `--pin-drinks` | #B78B34 | 66.3 | 0.115 | 81.1 | 3.11:1 |
| `--ff-coral` (`--current`) | #E89370 | 74.3 | 0.114 | 43.0 | 2.38:1 |
| `--cat-booth` (exempt) | #47597A | 46.3 | 0.059 | 262.2 | 7.05:1 |
| `--cat-utility` (exempt) | #6E7C93 | 58.3 | 0.039 | 260.3 | 4.23:1 |

Before: pins spanned L 52.7–66.3 (13.6). After: 57.7–66.3 (8.6), all inside 57–67. Beverage (58.0)
is still 8.3 below drinks (66.3), so a cup beside a mug reads as two things.

## Commits (one per item)

1. **Tokens.** `--pin-merch` and `--pin-beverage` changed. Their comments keep the original reasons
   (merch's hue gap; beverage as a darker step of the drinks family) and now give the measured OKLCH
   L and contrast. **Print has no values of its own.** The print sheet draws pins through `pins.js`
   → `var(--pin-*)`, the same tokens, so it changes with them. A grep for the old hexes outside
   `tokens.css` finds nothing.
2. **`design-system/lib/color.mjs`**: `oklch(hex)` → `{ l, c, h }` (Ottosson's OKLab), plus
   `luminance`, `contrast` and `contrastOnWhite` (WCAG 2.2). No new dependency.
3. **Rule `category-lightness-band`** in the manifest, using the statement and reason from the brief.
   `enforcedBy` names the test from item 4 word for word, plus the CLI/MCP door. Source:
   `CLAUDE.md › Decided — don't reopen › Category pins sit in one lightness band`. The rule-count
   tests went from eight to nine.
4. **The check.** `checkPalette()` in `lib/query.mjs` is one implementation behind three doors:
   - the test `category-lightness-band: every --pin-* hue sits in OKLCH L 57–67, coral above 70,
     each pin 3:1 under white`. It reads `tokens.css` directly, so a stale manifest can't hide a bad
     value, and its failure message lists every measured value.
   - `npm run ds -- check-palette`, which exits 1 outside the band.
   - the MCP tool `check_palette`.

   Other tests cover OKLCH and contrast against known values, a failing palette (each of the three
   failure messages), and the CLI and MCP returning identical answers. Checked by hand that the test
   fails on the old merch value: `--pin-merch #9E3F94 is OKLCH L 52.7, outside the category band
   57–67`, followed by the full measured table.
5. **1.2.0.** Manifest regenerated and version bumped (`updated` 2026-10-12). CHANGELOG entry added.
   In `design-system.html` §1, Category pins gained one sentence on the band.
6. **Baselines.** Re-rendered on the runner via the label: `phone-open` and `print` changed (merch only), `sheet-open` did not. See below. The close-ups are committed under `docs/pr-shots/`:
   `pin-merch-{before,after}.png` (the merch pin on the phone at open, 3×) and
   `pin-family-{before,after}.png` (every pin glyph on its token from the design-system page, with
   beverage beside drinks).

## Findings, questions, skipped

- **Baselines: `phone-open` and `print` changed, `sheet-open` did not.** The Action re-rendered on
  the runner and committed two (62302b0). Diffed pixel by pixel against the previous baselines,
  every changed pixel is merch's:
  - `phone-open`: 1,277 px inside one 41×41 box around the merch pin, almost all #9E4094 → #AF4FA5.
  - `print`: 666 px, the merch pin on the map and its legend swatch, #9E3F94 → #AF4FA5.
  - `sheet-open`: byte-identical, because the Kidlandia sheet covers the merch pin.
- **The visual gate itself would not have caught this.** `scripts/visual.mjs` runs pixelmatch at
  `THRESHOLD = 0.1`, which lets through a per-pixel YIQ delta of about 352. Merch's step is about
  133. Against the old baselines the merch pin raised no diff locally. The comment at
  `visual.mjs:41` says 0.1 "catches any real colour change", which isn't true for a lightness step
  this size. The baselines are right now because they were re-rendered on purpose, not because the
  diff flagged them. Whether to tighten the threshold is Ernest's call. **Not changed here**: it
  would move every baseline's tolerance.
- **Beverage pins are not on either map.** Both beverage stations are `hidden: true` (round 5,
  9/23), so the new beverage colour shows only on the design-system page until one is unhidden.
- **Merch is 57.9, not 58.0.** #AF4FA5 measures L 57.948, so the token comment says 57.9. Hue and
  chroma match to within hex rounding (merch H 331.9 → 331.6, C 0.163 → 0.164; beverage H 78.8 →
  78.3, C unchanged).
- **The old comments' contrast figures were wrong.** They said 5.4:1 (merch) and 6.4:1 (beverage).
  Measured, the old values were 5.85:1 and 5.30:1. Replaced with the new measured values.
- **Where the CLAUDE.md line went.** The brief said "the standing requirements, next to the coral
  rule". The coral line ("coral is "now"") is under **Decided — don't reopen**, in the featured-booth
  entry, so the new line went there, directly after it. If Ernest wants it as a numbered standing
  requirement instead, move the line and change the rule's `source` to match. The manifest build
  checks that the source phrase exists.
- **Close to the edges:** info sits at 57.7 (0.7 above the floor). Drinks is at 3.11:1, just over
  the 3:1 floor. A future tweak to either will trip the test, which is the point.
- **`--cat-utility` happens to be inside the band (58.3).** It is exempt as a structural neutral and
  is reported as exempt, not as a pin.
- **For Cowork:** the header of `tokens.css` names `claude/color-tokens.md` as the source of truth
  for pin hues ("Keep in sync"). That file isn't in this repo. Its merch and beverage values need
  the two new hexes.
- **Skipped on purpose (brief):** the drift `npm run manifest` reported in PR #16 is untouched. That
  covers four classes missing from the Names table, four off-pattern class names, the raw 18px, and
  the unused IconButton.

## Results

- `npm run test:ds`: 24/24. `npm run manifest -- --check`: current. `npm run lint`: clean.
- `npm run test:e2e`: 491/491. Visual is advisory here: 3 diffs, all text anti-aliasing. CI has the
  verdict, against the runner's re-rendered baselines.
