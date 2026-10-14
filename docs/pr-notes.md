# PR notes: hue spacing the system can check

PR #18 locked every category pin into one lightness band (OKLCH L 57–67), which leaves hue as the
only cue that tells pins apart. This PR measures how far apart they actually are, proposes three
sets, applies the recommended one (A), and turns a minimum distance into a rule that a test
enforces. Design system 1.2.0 → **1.3.0**.

**Ernest chooses the colours.** Set A is built in, and B and C are one comment away ("use B" /
"use C"; see *Switching sets* below). The strips to compare are `docs/pr-shots/hue-set-{a,b,c}.png`,
with today's palette in `hue-set-now.png`.

## How distance is measured

ΔE is Euclidean distance in OKLab, ×100, so it reads on the same scale as OKLCH lightness. A ΔE of 1
equals one point of L; side by side, the smallest difference most people notice is about 2. The
hue gap is the plain angle between two OKLCH hues. Both live in `design-system/lib/color.mjs`
(`deltaE`, `hueGap`), and `npm run ds -- palette-distances` prints every pair.

## Today (main before this PR), the closest pairs

| Pair | ΔE | Hue gap | |
|---|---|---|---|
| food / drinks | **5.9** | 25.9° | |
| water / info | **6.3** | 30.2° | the pair Ernest noticed |
| kids / first aid | **7.3** | 25.1° | |
| kids / merch | **8.4** | 29.0° | the other pair Ernest noticed |
| drinks / beverage | 8.5 | 2.8° | exempt: declared family |
| food / beverage | 8.6 | 23.1° | beverage exempt (hidden today) |
| stage / merch | **9.0** | 28.6° | |
| food / first aid | 10.3 | 29.5° | |
| info / stage | 10.4 | 55.4° | |
| restroom / water | 10.5 | 58.8° | |

Food/drinks is in fact the closest pair, closer than the two Ernest noticed. All 45 pairs are in
`npm run ds -- palette-distances` (run it on `main`).

How the reserved colours fall today: `--cat-utility` is ΔE **6.7** from water and 6.9 from info.
`--ff-teal` is **7.3** from restroom. `--ff-coral` is 10.2 from food. `--cat-booth` is 12.5 from info.

## The three sets

Every set keeps each pin in L 57–67 and ≥3:1 under its white glyph, and keeps the meaning anchors:
first aid red (22–30°), food warm orange (45–62°), restroom green, water blue, stage purple.
Beverage stays the darker step of drinks at the same hue, about 8 L darker as today. Every pin stays
**≥ΔE 10 from `--ff-teal`, `--ff-coral` and both `--cat-*` slates**, which is better than today on
every count.

I found the sets with a constrained search over OKLCH (L, chroma, hue per pin), then judged each by
eye on the swatch strips. The record is `docs/hue-sets.json`, and `node scripts/hue-sets.mjs --render`
redraws the strips. The smallest ΔE below is the rule's view (beverage exempt). Beverage's own
nearest neighbour is listed as well, so no set collides with it when a beverage station is unhidden.

### Set A: least change (recommended)

Every pin moves only as far as it must: the fewest visible changes from today's map, every pin still recognisably itself. Drinks does not move at all, so beverage stays its clear darker step (8.2 L apart, as today). Water goes a clearer cerulean and info a truer blue, kids lightens to rose, food brightens to orange. Chroma 0.11-0.17.

| Pin | Old | New | L | Hue | Contrast |
|---|---|---|---|---|---|
| firstaid | #C84B46 (L 58.1, 25.7°) | **#C6484C** | 57.5 | 21.9° | 4.74:1 |
| food | #C97636 (L 64.5, 55.2°) | **#E36826** | 65.8 | 44.8° | 3.35:1 |
| drinks | #B78B34 (L 66.3, 81.1°) | **#B78B34** | 66.3 | 81.1° | 3.11:1 |
| beverage | #997332 (L 58.0, 78.3°) | **#9E7200** | 58.1 | 81.6° | 4.32:1 |
| restroom | #3D9E6E (L 62.9, 158.6°) | **#1F9C5E** | 61.3 | 155.5° | 3.51:1 |
| water | #3D8FA4 (L 60.8, 217.4°) | **#0397BD** | 62.9 | 224.0° | 3.41:1 |
| info | #407EB5 (L 57.7, 247.6°) | **#4A75CE** | 57.6 | 263.2° | 4.44:1 |
| stage | #8F71B7 (L 60.5, 303.0°) | **#987BC3** | 63.8 | 301.9° | 3.53:1 |
| merch | #AF4FA5 (L 57.9, 331.6°) | **#AE4EA4** | 57.6 | 331.6° | 4.75:1 |
| kids | #C25B7E (L 60.7, 0.6°) | **#CB6F92** | 65.5 | 356.8° | 3.37:1 |

Smallest pairwise ΔE (beverage exempt): **10.3**, food / drinks (hue gap 36.3°). Next: firstaid/food 10.6, water/info 10.6, stage/merch 10.7.
Beverage's nearest pin other than drinks: food 12.9. Reserved colours, nearest pin: --ff-teal → restroom 10.1, --ff-coral → food 10.2, --cat-booth → info 14.2, --cat-utility → water 10.0.

### Set B: vivid

The same anchors at higher chroma (up to 0.20): the widest spacing of the three, and the loudest. Info is an electric blue, kids a hot pink, food a bright orange. Drinks stays as today.

| Pin | Old | New | L | Hue | Contrast |
|---|---|---|---|---|---|
| firstaid | #C84B46 (L 58.1, 25.7°) | **#C24D50** | 57.6 | 21.6° | 4.70:1 |
| food | #C97636 (L 64.5, 55.2°) | **#ED6300** | 66.5 | 45.1° | 3.29:1 |
| drinks | #B78B34 (L 66.3, 81.1°) | **#B78B34** | 66.3 | 81.1° | 3.11:1 |
| beverage | #997332 (L 58.0, 78.3°) | **#9F7201** | 58.2 | 81.0° | 4.30:1 |
| restroom | #3D9E6E (L 62.9, 158.6°) | **#409C50** | 61.9 | 147.0° | 3.45:1 |
| water | #3D8FA4 (L 60.8, 217.4°) | **#159DD1** | 65.4 | 231.8° | 3.10:1 |
| info | #407EB5 (L 57.7, 247.6°) | **#4D6EF1** | 58.7 | 268.8° | 4.36:1 |
| stage | #8F71B7 (L 60.5, 303.0°) | **#A083C0** | 65.9 | 305.7° | 3.23:1 |
| merch | #AF4FA5 (L 57.9, 331.6°) | **#AC4DAB** | 57.6 | 327.9° | 4.77:1 |
| kids | #C25B7E (L 60.7, 0.6°) | **#E952A0** | 66.4 | 352.0° | 3.40:1 |

Smallest pairwise ΔE (beverage exempt): **11.8**, food / drinks (hue gap 36.0°). Next: firstaid/food 11.9, merch/kids 12.1, stage/merch 12.3.
Beverage's nearest pin other than drinks: firstaid 13.7. Reserved colours, nearest pin: --ff-teal → restroom 10.6, --ff-coral → food 10.9, --cat-booth → info 18.8, --cat-utility → stage 10.5.

### Set C: muted

Chroma capped at 0.15, nearest the printed poster's tone. Clears the rule, with the least margin of the three.

| Pin | Old | New | L | Hue | Contrast |
|---|---|---|---|---|---|
| firstaid | #C84B46 (L 58.1, 25.7°) | **#C24D4F** | 57.6 | 22.1° | 4.70:1 |
| food | #C97636 (L 64.5, 55.2°) | **#D66E32** | 64.9 | 47.7° | 3.42:1 |
| drinks | #B78B34 (L 66.3, 81.1°) | **#B18F30** | 66.5 | 88.5° | 3.07:1 |
| beverage | #997332 (L 58.0, 78.3°) | **#987607** | 58.3 | 88.1° | 4.26:1 |
| restroom | #3D9E6E (L 62.9, 158.6°) | **#4D945A** | 60.5 | 148.2° | 3.68:1 |
| water | #3D8FA4 (L 60.8, 217.4°) | **#0498BF** | 63.2 | 224.5° | 3.36:1 |
| info | #407EB5 (L 57.7, 247.6°) | **#4577CC** | 57.6 | 260.3° | 4.41:1 |
| stage | #8F71B7 (L 60.5, 303.0°) | **#947AC6** | 63.4 | 298.9° | 3.58:1 |
| merch | #AF4FA5 (L 57.9, 331.6°) | **#AB529F** | 57.5 | 332.7° | 4.73:1 |
| kids | #C25B7E (L 60.7, 0.6°) | **#D66591** | 65.5 | 357.5° | 3.43:1 |

Smallest pairwise ΔE (beverage exempt): **9.9**, firstaid / food (hue gap 25.6°). Next: food/drinks 9.9, water/info 10.0, firstaid/kids 10.2.
Beverage's nearest pin other than drinks: food 11.7. Reserved colours, nearest pin: --ff-teal → restroom 10.0, --ff-coral → food 10.0, --cat-booth → info 14.1, --cat-utility → stage 10.1.

### Rejected: drinks into the yellow gap

The empty 81°→159° stretch was the obvious place to spread into. Moving drinks to hue 100 measures
ΔE 11.9 under the rule, which is no better than set B. And at L 65 that yellow is olive: drinks
#A2900E and beverage #8C7C04 read as mustard and khaki, not as amber beer
(`docs/pr-shots/hue-set-yellow.png`). Moving info into the gap instead gave #748307, an olive
"info". The gap stays empty because nothing that has to look like a colour fits there at this
lightness.

### Why the warm end limits every set

First aid (red, about 22°), food (orange, about 45°) and drinks (amber, 81°) are three anchors
within 60°, with coral reserved at 43°. Every set's tightest pairs are among those three
(food/drinks, first aid/food). The cool end has room to spare. More chroma buys more distance
(set B), at the cost of a louder map.

## The rule: `category-hue-spacing`, threshold ΔE 9.5

No two category pins closer than **ΔE 9.5**. `--pin-beverage` is exempt as the declared darker step
of `--pin-drinks` (`HUE_FAMILY` in `lib/query.mjs`, said in the rule and in CLAUDE.md).

Why 9.5: today's five failing pairs sit at 5.9–9.0, and the three sets' minimums sit at 9.9–11.8.
9.5 falls between the two groups, so every one of today's close pairs fails and every set Ernest
might choose passes. If he picks A or B, the floor could rise to 10 for more margin; with C it
cannot (C's minimum is 9.9).

The test `category-hue-spacing: no two category pins closer than ΔE 9.5 in OKLab, beverage exempt
as drinks' darker step` reads `tokens.css` directly. Run on the actual pre-PR `tokens.css`, it fails
and lists all five pairs ("--pin-food #C97636 and --pin-drinks #B78B34 are ΔE 5.9 apart (hue gap
25.9°), closer than 9.5 …"). A second test feeds it the pre-PR palette and asserts exactly those
five pairs.

## Commits (one per item)

1. `color.mjs`: `oklab`, `deltaE`, `hueGap`. `npm run ds -- palette-distances`: every pair, closest
   first, plus the reserved colours.
2. `docs/hue-sets.json` (the three sets and the rejected one) and `scripts/hue-sets.mjs` (tables and
   strips, measured with the design system's own `paletteDistances()`). The strips are
   `docs/pr-shots/hue-set-{now,a,b,c,yellow}.png`.
3. Set A in `tokens.css`. Every reason is kept, and each comment adds the measured L, hue and
   contrast. **Print has no colour values of its own**: `PrintSheet.jsx` colours every pin, food
   stall and Kidlandia square through `PIN_COLOR` in `pins.js` → `var(--pin-*)`. In the same
   commit, **three e2e checks** that compared a pin with a fixed RGB (`rgb(64, 126, 181)` for info,
   `rgb(194, 91, 126)` for the kids bullet) now read the token from `tokens.css`. They follow the
   palette and still fail on a wrong fill. This was needed for any palette change, and it means
   switching to B or C touches no test.
4. The rule, in the manifest and in CLAUDE.md under *Decided*, next to the lightness band.
5. `check-palette` (test, CLI, MCP `check_palette`) fails on the rule, naming the pair and its
   distance, and reports the closest pair.
6. 1.3.0, the CHANGELOG entry, one sentence in design-system.html §1, and the baselines.

## Baselines: all three changed, pin colours only

The `update-visual-baselines` label made the runner re-render, and it committed all three
(a34e14b). I diffed every pixel against the previous baselines. For each changed pixel, the check
was whether its change equals some fraction of one pin's old → new shift, which is what a pin fill,
or a translucent tint of one over the map, does:

| Baseline | Changed px | A pin colour, solid or as a tint | ≤3/255 rounding at edges | Unexplained |
|---|---|---|---|---|
| `phone-open` | 6,835 | 5,368 (stage, food, kids) | 1,465 | 2 |
| `sheet-open` | 5,352 | 5,067 (food, kids, stage) | 282 | 3 |
| `print` | 12,616 | 11,039 (food, water, restroom, kids, stage, info, first aid) | 1,575 | 2 |

- The tints are the food-court area tint, the food-stall squares and the Kidlandia booth squares,
  all drawn from `--pin-food` / `--pin-kids`.
- The 2–3 unexplained pixels per image sit where two re-coloured things meet (a pin's edge over the
  food tint), so they are a blend of two pin colours.
- Merch shows up only as rounding: its own change is 1/255 per channel.
- Drinks does not change. Nothing outside the pin colours moved.

**The diff gate cannot see this change either.** Locally, pixelmatch at threshold 0.1 marks none of
the re-coloured pins: the diff images show only this container's text anti-aliasing, the same
1,148 / 6,854 / 68,595 px as on `main`. A whole-palette change passes the gate unnoticed, which is
stronger evidence for the threshold question still open from PR #18. **Not changed here**, as the
brief says.

## Questions, decisions, things to know

- **Drinks does not change in A or B.** The first search put drinks at L 64, which shrank the
  drinks→beverage step to 5.9 L. Today's #B78B34 keeps the step at 8.2 L (today: 8.3) and costs A
  only 10.6 → 10.3. In C, drinks moves to #B18F30, still 8.2 L above beverage.
- **Food sits next to coral in hue** (44.8° vs coral's 43.0°; today 55°). They stay ΔE 10.2 apart
  (the same as today) because coral is far lighter (L 74 vs 66) and paler. Food reads as orange and
  coral as salmon on the strips, but if Ernest wants food further from "now" in hue, set C's food
  (47.7°) is the next step and costs margin elsewhere.
- **Reserved colours are reported, not enforced.** The rule covers pin-to-pin distance, as asked.
  Every set keeps ≥ΔE 10 from teal, coral and the slates (today 6.7 and 7.3 fail that). Making it a
  second clause of the rule is a one-line follow-up if wanted.
- **`--food-ink` (#A86F36, the food label colour on the map) is unchanged.** It is "food orange
  darkened for text", derived from the old food (hue 63°; the new food is 44.8°). It is a text
  token, not a pin, so it is outside this rule. Re-derive it if the label should follow the new
  orange.
- **Kids and food colour more than pins.** `--pin-kids` also fills the Kidlandia booth squares and
  the PTA pin, and `--pin-food` fills the food-stall squares, on both maps and on paper. They change
  with the set.
- **Figma still has the old pin hexes.** `design/basemap.svg` (generated from Figma, never
  hand-edited) and the reference wireframe SVG carry the old values. The pin styles in Figma are
  Ernest's to update once he has chosen a set.
- **Beverage is hidden**, so its new colour shows only on the strips and on the design-system page.
- **Skipped on purpose (brief):** the lightness band, the ops colours, the PR #16 drift and the
  visual-diff threshold are untouched.

## Switching sets (for "use B" / "use C")

Copy that set's nine hexes from `docs/hue-sets.json` into `tokens.css` (and update each comment's
measured L, hue and contrast). Then run `npm run manifest`, update the CHANGELOG line, and re-label
for baselines. The rule, the threshold and the tests stay as they are; every set passes 9.5.

## Results

- `npm run test:ds`: 28/28. `npm run manifest -- --check`: current. `npm run lint`: clean.
- `npm run test:e2e`: 491/491. The visual diffs are advisory here (text anti-aliasing only); CI
  has the verdict, against the runner's re-rendered baselines.
