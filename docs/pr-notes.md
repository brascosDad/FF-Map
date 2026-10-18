# PR notes: pin placement rules (rank, true location, ties split, nudge cap)

Until now, overlapping pins were handled by hand: a `from: 'detail'` flag or a hand nudge, with the
reason in a comment in `src/assets/pins.js`. This PR turns that into rules the code computes and
an agent can query. One commit per item:

1. **Rank**: `PIN_RANK` and `rankOf` in `pins.js`. Water moves up to rank with the restrooms.
2. **Engine**: `src/pinPlacement.js`, one pure function per stop, with unit tests for every rule
   (`design-system/placement.test.mjs`, run by `npm run test:ds`).
3. **Phone map**: the eight `from: 'detail'` flags are gone. MapCanvas computes each stop for the
   screen's own scale. A nudged pin glides between its stop positions with the pinch.
4. **Paper**: the print sheet is one more stop.
5. **`npm run pin-layout`**: shows which stop each pin appears at, why it waits, every nudge and
   every paper flag, for a 375px phone, the docked desktop and paper (`--json` for data).
6. **e2e**: the cap, the rank invariant and the entrance cluster, on the phone, the docked desktop
   and paper; the docked desktop also gets the no-overlap check at every stop with each chip on.
7. **CLAUDE.md**: the rules in Decided, and this round under Open.
8. **Design system 1.4.0**: `no-overlap` restated with the new priority; two new rules,
   `true-location` and `nudge-cap` (the cap is the rule's `constant`, checked against the code);
   a Pin placement table in §6; changelog.
9. **Once shown, stays shown** (Ernest's answer to decision 1, option b): a pin on the map at a
   coarser stop stays at every closer stop and outranks whatever it would collide with there
   (`STAYS_RANK` in `src/pinPlacement.js`). Unit test, e2e check, and design-system rule
   `stays-shown`; CLAUDE.md rule 6b.
10. **Area labels carry the tap at Detail** (Ernest, 10/17), one rule in the manifest,
    `area-label-tap`: "At Detail, an area's pin gives way to its booths, and its name label
    carries the tap." Kidlandia now behaves like the Food Court. Its pin leaves at Detail, the K
    booths are the targets, and KIDLANDIA is drawn over the area in the FOOD COURT style. Every
    area's name at Detail opens its card: FOOD COURT, KIDLANDIA, and ART MARKET on each of the
    three art-market areas. The names are drawn by a new component, AreaLabel (`.ffc-arealabel`),
    over a hit rect at least 44px each way. e2e covers all five on a 375px phone and the docked
    desktop.

11. **Round 4 (Ernest, 10/18)**: a level 3 scale floor, a 2px `--pin-gap` at levels 2 and 3,
    five true locations moved apart, tests at six widths, and design system 1.5.0. This round has
    its own section below.

12. **Round 5 (Ernest, 10/18)**: a device test matrix on WebKit and Chromium, the booth tap
    exception written down as rule `booth-tap-equivalent` (WCAG 2.5.8) with an e2e walk to every
    booth, and two art-market markers moved along their runs so level 1 is whole on narrow
    phones. Design system 1.6.0. Its own section below.

13. **Round 6 (Ernest, 10/18): where the human is in the loop.** `docs/checks-and-review.md`
    gives every check's job and what it can't see, and says where Ernest looks on every PR. The
    visual diff's comment now says its job is layout, not colour. The **human-review** check reads
    the PR description's "For Ernest to look at" answers against the expected answers below.
    Design system 1.7.0 adds the governance rule `human-review`.

Rounds 1–3 changed no stored x/y; round 4 moved five, each by under a map unit; round 5 moved
none (only two markers, which are not pins). Since round 5, merch and the bike valet tie at
level 1 on phones under 375px and split the difference (see Pin nudges); otherwise nothing ties,
nothing is nudged and nothing is flagged, so the cap and the paper flag are tested on made-up pins.

## Round 5 (10/18): device matrix, the booth tap exception, level 1 on narrow phones

### 1. Device test matrix

`scripts/lib/devices.mjs` is the matrix, one line per phone class. A new phone is one more line:

| Profile (as the test output names it) | Laid out at (CSS px) | Pixel ratio |
|---|---|---|
| iPhone SE (1st gen) / Display Zoom | 320 × 568 | 2 |
| Galaxy A-series | 360 × 780 | 3 |
| iPhone SE | 375 × 667 | 2 |
| iPhone SE / big text | 300 × 534 (375 at 125%) | 2.5 |
| iPhone 15 | 393 × 852 | 3 |
| iPhone 15 / big text | 314 × 682 (393 at 125%) | 3.75 |
| Pixel | 412 × 915 | 2.625 |
| iPhone 15 Pro Max | 430 × 932 | 3 |
| Desktop (docked panel) | 1440 × 900 | 1 |

Every profile runs on **WebKit** (iPhone Safari, and iPhone Chrome, which is WebKit underneath on
iOS) and **Chromium** (Android Chrome). Every phone profile has touch on (`hasTouch`, `isMobile`).
The output names each run, e.g. "iPhone 15 / big text · WebKit: …". The checks per run:

- **Placement:** rank, nudge cap, stays-shown, the level 3 scale floor, level 1 showing the beer
  stand, the bike valet and the three markers, and no overlap with the 2px gap at levels 2 and 3,
  with no chip and with each chip on. The entrance cluster is checked on iPhone SE and the desktop.
- **Area labels:** at level 3 each of the five names is a 44px target and opens its card.
- **Tap sizes:** chips, zoom buttons, the sheet's close, a booth row, the back row and the
  ItemPager's buttons are each at least `--tap-min` both ways. A phone chip is measured with its
  `::after`, which carries its target.
- **Every booth reachable** (item 2).

**How 125% text was emulated.** Playwright has no text-size setting. A phone with its text
zoomed lays the page out on fewer, bigger CSS pixels, so the profile uses a viewport of width ÷
1.25 with the pixel ratio × 1.25. The 375 phone becomes 300 CSS px and the 393 phone becomes 314.
314 is what Ernest's iPhone reported. This is page zoom: everything scales together, the map
included. It is not iOS Dynamic Type, which can grow some text more than others.

**WebKit on CI (10/18): every check passes on both engines, 1387 of 1387.** Getting there took
four test fixes and no app change; each is its own commit:

- Each booth-walk run now starts on a fresh page, so no run depends on closing the last one's sheet.
- A row is tapped only once it holds still, and only if the tap point hits that very row. On the
  iPhone SE in WebKit, booth 137's row once opened booth 136 while the list was still settling
  after back.
- A row whose tap point is still settling is scrolled to and tried again.
- The test no longer keeps dragging a map that cannot pan. On the docked desktop in WebKit, the
  Candler Park Dr marker tap opened nothing. A pointer-event log showed why: the second of two
  identical drags never delivered its pointerup, so the tap's press was swallowed as part of a
  drag. That comes from Playwright's synthetic mouse drags on WebKit; a person's tap is not
  affected. The log stays in the suite for any future miss.

**WebKit runs on CI, not in this container.** The remote Claude Code container ships Chromium only
and asks not to download browsers, so here the WebKit half is skipped with a printed notice. On CI,
`ci.yml` now installs WebKit, and a missing WebKit fails the run. **The WebKit results are CI's.**
Locally, all 9 Chromium profiles pass.

**What emulation does not cover.** This is the case study's "next step: real devices":

- **It is not a real phone.** Playwright's WebKit is a desktop build of the engine, not iOS Safari.
  iPhone Chrome is a WebKit view inside Google's app. Neither is emulated with its own chrome.
- **Browser chrome and the viewport:** Safari's collapsing address bar and bottom toolbar,
  `100vh` vs. the visible height as the bars move, the home-indicator safe area, and the notch or
  Dynamic Island. The emulated viewport is fixed.
- **Real touch:** finger size and contact area, palm rejection, the system back-swipe from the
  screen edge, iOS's double-tap and long-press behaviours, scroll momentum and rubber-banding.
  Tests send synthetic pointer and touch events at exact points.
- **OS settings beyond text size:** Dynamic Type by category, Bold Text, Reduce Transparency,
  Increase Contrast, Smart Invert and Dark Mode, Android font and display size set separately,
  VoiceOver and TalkBack, Zoom, Switch Control. The test runs set reduced motion so a zoom lands
  at once, so real animation timing is not covered either.
- **Hardware and network:** slow CPUs and thermal throttling, memory pressure evicting the
  tab, real fonts per OS, colour rendering, sunlight on the screen, and flaky festival cellular
  (offline behaviour is tested separately, once, on Chromium).
- **Other browsers:** Samsung Internet, Firefox, in-app browsers (Instagram, Facebook, Gmail),
  where the QR or a social link may open the map.

### 2. The booth tap exception, made explicit (WCAG 2.5.8)

The new rule **`booth-tap-equivalent`** is in the manifest, CLAUDE.md, design-system.html (Target
spacing and the level 3 row) and the changelog. A booth's own cell keeps its size, and booths are
exempt from `--pin-hit` and `--tap-min`. The reason is WCAG 2.2 SC 2.5.8's **Equivalent**
exception: every booth's card is also reached by targets that meet the floor. That path is the
art market's marker (44px), or its name label at level 3, then the run's list (BoothRow,
`--tap-min` high), then the card. The ItemPager (44px buttons) steps booth to booth. `tap-floor`
now names the exception and points at the rule. BoothRow and ItemPager list it. Enforced by:
`opens its card from level 1 by 44px taps: marker, its row, back`, `marker is a 44px target that
opens its booth list`, `a booth cell keeps its own size at level 3`, `the Food Court pin is a
44px target that opens the Food Court card`, and the existing ItemPager size check.

**The e2e walk.** For every booth in the data, on every profile, the test does this:

1. Start at level 1 and tap the run's marker, after checking that the marker is what is found at
   that point.
2. Tap the booth's row, check that the card's title is that booth's, then tap back.

Every target tapped is measured. A failure names the booth id. That covers 152 booths: Candler
Park Dr 58, McLendon 27, In the Park 54, the 11 Kidlandia booths (rows in the In the Park list)
and the two unnumbered spots (rows in their run's list). All 152 pass on every Chromium profile.

**Booth cell at level 3** (the 9.4-unit hit cell, measured in the browser):

| Profile | CSS width | Cell |
|---|---|---|
| iPhone SE / big text | 300 | 16.2px |
| iPhone 15 / big text | 314 | 16.2px |
| iPhone SE (1st gen) / Display Zoom | 320 | 16.2px |
| Galaxy A-series | 360 | 16.2px |
| iPhone SE | 375 | 16.2px |
| iPhone 15 | 393 | 17.0px |
| Pixel | 412 | 17.8px |
| iPhone 15 Pro Max | 430 | 18.6px |
| Desktop (docked panel) | 1440 | 33.2px |

At 375 and narrower the level 3 scale floor holds the cell at 16.2px. A wider phone shows level 3
at its own ratio, so its cell is bigger.

### 3. Level 1 on narrow phones

Two art-market markers moved **along their own runs**. Markers are not pins, so no true location
changed:

| Marker | Was | Now | Why |
|---|---|---|---|
| McLendon | (775, 787.9), east box | **(492, 787.9)**, west half, over booths 76–78 | Its level 1 target crossed the bike valet's under 375px. Anywhere west of x 538 on the run's line clears the valet, merch and the entrance water at levels 1 and 2 down to 300px; 492 is the middle of that stretch. |
| In the Park | (801, 433) | **(813.3, 415.9)**, 21 units further up the path's axis | Its target crossed the beer stand's under 375px. Still between the two rows, in the run's north half. |
| Candler Park Dr | (411.5, 541.5) | unchanged | |

**Result:** on every profile, from 300px up, level 1 shows the beer stand, the bike valet and all
three markers (new e2e check). Level 2 holds back as many pins as before at every width (300: 10,
314/320/360: 9, 375: 8, 393 and wider: 7, desktop: 0). On phones under 375px it is now the **lawn
water** that waits at level 2, not the beer stand: the beer stand shows from level 1, so stays-shown
lets it outrank the water, the same as on the 375 phone.

**One new tie: merch and the bike valet at level 1, under 375px.** With nothing holding the bike
valet back any more, its level 1 target meets merch's (both rank 4, 83 units apart). By rule 4
they split the difference: each moves half the overlap apart along the line between them. That
is 0.73 units at 360px, 6.01 at 320, 6.92 at 314 and 9.18 at 300, all within the 12.75 cap. At
level 2 both are back at their true locations, and they glide between the two. This is the
first real tie the rules have split. At 375 and wider there is no tie.

**What else the moves touch:**

- At level 3 the McLendon ART MARKET label stays where it was (772.9, 780.2). Markers fade out
  there, so nothing new can collide.
- On the desktop, the directory's McLendon row now flies the map to the west half of the run. It
  showed the east end before. At that zoom the whole run does not fit either way.
- The e2e "markers leave at level 3" check now reads which booths are under the McLendon marker
  from the data (76–78), instead of the old 60–62.

### Questions (round 5)

9. **Food stalls have no list path.** The 16 food stalls are booths in the data, but no list
   leads to a stall's card. The equivalent path the test checks for them is the Food Court pin,
   then the Food Court card, which lists the trucks. A stall's own card says only "Stall N · Food
   Court", since no truck is assigned to a stall. I think that meets the exception in substance,
   because the card adds nothing beyond "this is the Food Court". If you want it to hold to the
   letter, the fix is a stall list in the Food Court card, like the art lists. Say which you want.
10. **The ItemPager is still hidden at peek** (open since 10/6). The equivalent path does not need
    it, because the list rows are the path. But on a phone on its side, which is capped at peek,
    the only way between booths is back to the list.

## Round 4 (10/18): narrow phones, the level 3 floor and the 2px gap

Levels are named as Ernest asked: **level 1** is the opening view, **level 2** the middle step,
**level 3** all the way in (Detail).

### What Ernest saw on his iPhone, and why

His Chrome reports a narrow CSS width (about 314px with the text zoomed). At that width the map
draws more map units per pixel at every level. At level 3 that put true locations closer
together than they were spaced for: at 314px, five pairs overlapped at level 3, on `main` too.

- **The Acoustic water missing at level 2:** reproduced at 314 and 320px. It waits for the
  Acoustic Stage pin, which outranks it, and that is correct by the rules. At 375px and wider it
  shows at level 2 as before.
- **The Kidlandia pin "gone" at level 2: I could not reproduce it.** At 314 and 320px the pin is
  on the map at level 2. Kidlandia ranks 1, so only an art-market marker could hold it back, and
  none is near. But the + button zooms about the screen's centre, and on a 314px screen that
  leaves Kidlandia half off the left edge (it sits about 20px in from the edge, and the pin is 40px
  wide). That is most likely what looked like "gone"; a pan brings it back. It gives way to its
  booths only at level 3, as before. If Ernest sees it vanish after a pan, a screen recording would
  show which level the map was at.

### 1. Level 3 scale floor

`LEVEL3_MAX_UNITS_PER_PX` = **0.5804** (in `src/hooks/useMapView.js`), the 375px reference phone's
own level 3. Level 3 never shows more map units per CSS px than that; a narrower screen zooms
level 3 further in to hold it. Levels 1 and 2 keep their ratios, and the reference phone and
anything wider are unchanged. It's the manifest rule `level3-scale-floor`, with Ernest's reason as
its reason: "true locations are spaced once, for the reference phone; no screen may show them
closer together than that." `npm run manifest` checks the value against the code.

| Screen | Level 3 width (map units), before → after | Units per px at level 3 |
|---|---|---|
| 314px phone | 217.6 → **182.2** | 0.693 → **0.5804** |
| 320px phone | 217.6 → **185.7** | 0.680 → **0.5804** |
| 375 / 390 / 430px phones, docked desktop | unchanged | 0.5804 / 0.558 / 0.506 / 0.284 |

### 2. The 2px gap, and the five moves

`--pin-gap` (2px, a new token in `tokens.css`) applies at levels 2 and 3 only. The placement
counts it in every collision, and e2e checks it between every two pins, markers and area labels.
Booth cells, which are packed edge to edge, are only held to not crossing (question 7 below).

At level 3 on the 375px reference, the five pairs Ernest listed missed the gap by under a map unit
(two targets plus the gap need 26.70 units there). In each pair I moved the pin that isn't on the
opening view (otherwise the lower-ranked one), straight away from the other, by the smallest step
that clears. Coordinates are rounded to a tenth of a unit. Each move is also in the pin's comment
in `pins.js`.

| Pin | Before (x, y) | After (x, y) | Moved | Clears | New distance |
|---|---|---|---|---|---|
| Water, lawn beside Kidlandia | (707.5, 455.5) | (707.2, 455.2) | 0.42 | the beer stand | 26.74 |
| Beer, Acoustic Stage | (862, 750) | (861.2, 750) | 0.80 | the Acoustic water | 26.80 |
| King of Pops C1 | (692.5, 377.5) | (692.0, 377.3) | 0.54 | first aid | 26.71 |
| Water, McLendon entrance | (645, 762) | (645.0, 762.1) | 0.10 | merch | 26.71 |
| Info booth | (637, 714.5) | (637.0, 714.2) | 0.30 | merch | 26.73 |

Merch and the beer stand did not move. Both are on the opening view, and moving them would change
level 1. No other pair of pins is short of the gap at level 3, and no move brings a pin closer to
a booth or a label.

### What shows at each level: 320px phone vs 375px phone

Built with the floor and the gap. `npm run pin-layout` prints this for both phones and the docked
desktop. "Shown at" lists levels.

| Pin | Rank | 320px: shown at | 375px: shown at | Why it waits |
|---|---|---|---|---|
| food (859.7, 292.3) | 1 | 1, 2 | 1, 2 |  |
| stageMain (741.1, 288.5) | 1 | 1, 2, 3 | 1, 2, 3 |  |
| stageAcoustic (885, 797.9) | 1 | 1, 2, 3 | 1, 2, 3 |  |
| kids (550.9, 422.3) | 1 | 1, 2 | 1, 2 |  |
| beer (728, 472) | 4 | 3 | 1, 2, 3 | 320 L1: gives way to an art-market marker; 320 L2: gives way to water (707.2, 455.2) |
| drinks (802.5, 308.9) | 4 | 2, 3 | 2, 3 |  |
| drinks (522.3, 735.3) | 4 | 2, 3 | 2, 3 |  |
| drinks (861.2, 750) | 4 | 3 | 3 | 320 L2: gives way to stage (885, 797.9); 375 L2: gives way to water (888, 750) |
| kingofpops C1 (692, 377.3) | 5 | 3 | 3 | 320 L2: gives way to firstaid (712, 395); 375 L2: gives way to firstaid (712, 395) |
| kingofpops C2 (583, 735) | 5 | 3 | 3 | 320 L2: gives way to merch (630, 740); 375 L2: gives way to merch (630, 740) |
| mrsoftee C3 (678, 476) | 5 | 3 | 3 | 320 L2: gives way to water (707.2, 455.2); 375 L2: gives way to water (707.2, 455.2) |
| merch (630, 740) | 4 | 1, 2, 3 | 1, 2, 3 |  |
| wc (934.3, 138.3) | 3 | 2, 3 | 2, 3 |  |
| wc (610.8, 661.2) | 3 | 2, 3 | 2, 3 |  |
| wc (672.5, 550) | 3 | 2, 3 | 2, 3 |  |
| wc (422, 217) | 3 | 2, 3 | 2, 3 |  |
| firstaid (712, 395) | 2 | 2, 3 | 2, 3 |  |
| water (707.2, 455.2) | 3 | 2, 3 | 3 | 375 L2: gives way to drinks (728, 472) |
| water (888, 750) | 3 | 3 | 2, 3 | 320 L2: gives way to stage (885, 797.9) |
| water (645, 762.1) | 3 | 3 | 3 | 320 L2: gives way to merch (630, 740); 375 L2: gives way to merch (630, 740) |
| water (552, 461) | 3 | 3 | 3 | 320 L2: gives way to kids (550.9, 422.3); 375 L2: gives way to kids (550.9, 422.3) |
| water (421, 360) | 3 | 2, 3 | 2, 3 |  |
| info (637, 714.2) | 4 | 3 | 3 | 320 L2: gives way to merch (630, 740); 375 L2: gives way to merch (630, 740) |
| bikevalet (712.4, 730.1) | 4 | 2, 3 | 1, 2, 3 | 320 L1: gives way to an art-market marker |

What changed at each level compared with before this round:
- **Level 1: unchanged on every width.** The 314, 320, 375, 390 and 430px phones and the docked
  desktop are pixel-for-pixel the same as before round 4. I compared every pin's drawn position
  and the view at level 1. Against `main`, 375px and wider are also identical. At 314 and 320px,
  the beer stand and the bike valet don't show at level 1. That comes from the placement rules
  earlier in this PR, not this round: at those widths their targets overlap the art-market
  markers, and on `main` they were drawn overlapping (question 8).
- **Level 2:** at 375px the entrance King of Pops cart (C2) now waits for merch, because the gap
  makes their targets collide (47.3 units apart, 47.9 needed). At 314 and 320px the only change is
  the lawn water's 0.42-unit move. At 390 and 430px nothing changes.
- **Level 3:** at 314 and 320px the view goes further in (the floor). On every width the five
  moved pins sit at their new spots.

## Which pins changed (375px phone)

On the phone's **first zoom step** only three pins move (table). At **Detail**, on the phone and
the docked desktop, the Kidlandia pin gives way to its booths and the five area labels appear (next
section). The overview and paper are pixel-identical to `main` (I checked the screenshots below byte
for byte).

| Pin | Rank | Before: shown at | After: shown at | Why |
|---|---|---|---|---|
| Water, Acoustic Stage (888, 750) | 3 | Detail | **first step**, Detail | Was held back by hand; water now outranks the Acoustic beer |
| Beer, Acoustic Stage (862, 750) | 4 | first step, Detail | Detail | Gives way to the Acoustic water (26 units off). Not on the opening view, so stays-shown doesn't apply |
| Mr Softee, C3 (678, 476) | 5 | first step, Detail | Detail | Sits on the lawn water's spot (36 units off). The water is itself waiting for the beer stand, but a waiting pin still holds its spot against lower ranks |
| Beer stand (728, 472) | 4 | overview, first step, Detail | same | On the opening view, so it stays (stays-shown) |
| Merch (630, 740) | 4 | overview, first step, Detail | same | On the opening view, so it stays (stays-shown) |
| Water, lawn beside Kidlandia (707.5, 455.5) | 3 | Detail | Detail | Now waits by rule (the beer stand stays) rather than by hand |
| Water, McLendon entrance (645, 762) | 3 | Detail | Detail | Now waits by rule (merch stays) |
| Info booth (637, 714.5) | 4 | Detail | Detail | Now waits by rule (merch stays) |
| Water, Kidlandia (552, 461) | 3 | Detail | Detail | Gives way to Kidlandia (rank 1) |
| **Kidlandia** (550.9, 422.3) | 1 | overview, first step, Detail | overview, first step | Gives way to its K booths at Detail; its name label takes the tap (area-label-tap) |
| King of Pops, C1 (692.5, 377.5) | 5 | Detail | Detail | Gives way to first aid |

Every other pin shows at the same stops as before. Docked desktop: every pin from the first step,
before and after.

**Largest nudge at each stop:** 0 at all three stops on the 375px phone, 0 at all three on the
docked desktop, 0 on paper. No two pins of the same rank collide at any stop, so the
split-the-difference rule never fires with today's pins.

## Area labels at Detail (area-label-tap)

Each label's hit rect is at least 44px each way (`--pin-hit`), sized to the word, and placed at the
nearest spot to the area's old pin or marker where the target clears every booth cell and every
pin target at Detail on a 375px phone. **All five fit; none needed a smaller target.** The e2e
no-overlap check now measures the label rects against pins, booth cells and each other, at every
stop and with each chip on, on the phone and the docked desktop.

| Area | Label | Where (`labelAt`) | Target on a 375px phone | Opens |
|---|---|---|---|---|
| Food Court | FOOD COURT | (872, 224), where it was drawn, centred 4 units up on its target | 79 × 44px | Food Court card |
| Kidlandia | KIDLANDIA | (550.9, 422.3), the pin's own spot, west of the K column | 71 × 44px | Kidlandia card |
| Candler Park Dr | ART MARKET | (447.5, 541.5), 36 units east of the old marker, on the path beside the park-side column (112–117) | 79 × 44px | Candler Park Dr · Art Market list |
| McLendon Ave | ART MARKET | (772.9, 780.2), 8 units from the old marker, on McLendon east of the booth runs | 79 × 44px | McLendon Ave · Art Market list |
| In the Park | ART MARKET | (785.4, 466.5), 37 units from the old marker, on the path between the two rows (37 / 10–11) | 79 × 44px | In the Park · Art Market list |

Close-ups at Detail: `docs/pr-shots/arealabel-{food,kids,cpd,mcl,spine}-375.png`.

Choices I made:
- **The three art-market labels all say ART MARKET**, the spine's existing `label`. Their streets
  are already named on the map, and the card that opens names the run ("McLendon Ave · Art
  Market"). If you'd rather the label name the run (e.g. CANDLER PARK DR), it's one field per area
  in `areas.js`, but those words are longer and would need their spots re-checked.
- **Label colours**: FOOD COURT keeps `--map-food-label`. KIDLANDIA uses a new `--map-kids-label`,
  which points at a new primitive, `--kids-ink` (the Kidlandia rose darkened for text, 5.3:1 on
  white). ART MARKET uses `--map-art-label`, the booth slate.
- **With a chip on** the labels dim and take no tap, like the booth squares.
- Two existing e2e walks tapped or measured the Kidlandia pin after zooming in to Detail, where it
  is now gone. The pinch size check measures the Main Stage pin instead, and the Close-position
  walk opens the merch card. Neither check is any weaker.

## Entrance cluster (water, info, merch), 375px phone

| Stop | Before | After |
|---|---|---|
| Overview | merch | merch |
| First step | merch | merch (water and info wait: merch stays from the opening view) |
| Detail | merch + info + water | merch + info + water |

The entrance now behaves exactly as on `main`, but by rule instead of by hand. Docked desktop,
before and after: merch / all three / all three. e2e asserts both.

Screenshots of the entrance (wheel-zoomed on merch's spot, so the entrance stays in frame):

| Stop | Before | After |
|---|---|---|
| Overview | `docs/pr-shots/entrance-phone-before-0.png` | `docs/pr-shots/entrance-phone-after-0.png` (identical) |
| First step | `docs/pr-shots/entrance-phone-before-1.png` | `docs/pr-shots/entrance-phone-after-1.png` (only the Mr Softee square on the lawn and the Acoustic beer/water at the right edge differ) |
| Detail | `docs/pr-shots/entrance-phone-before-2.png` | `docs/pr-shots/entrance-phone-after-2.png` (the entrance is identical; at the top left the Kidlandia pin is gone and its label shows) |
| Docked desktop, each stop | identical to after | `docs/pr-shots/entrance-desktop-{0,1,2}.png` |
| Print sheet | identical to after | `docs/pr-shots/placement-print.png` |

The `PR screenshots` Action adds the usual phone / desktop / print before-and-after table to the
PR description.

## Paper flags (rule 7)

**None.** Every disc and cart square sits at its true location on paper. If a future pin can't be
placed within the cap, `npm run pin-layout` lists it under "paper" as FLAGGED, the sheet draws it at
its true location with `data-flagged`, and e2e's "nothing covers anything else" goes red until
someone places it by hand.

## Visual baselines

**Round 5: I expect `phone-open` to go red, and maybe `sheet-open`.** Both are level 1 at 390px,
and the McLendon and in-park markers moved: the McLendon marker is now at the west end of the
run, and the in-park one is 21 units further up the path. `print` doesn't draw the markers, so it
should stay green. If CI shows the change, look at the diff images, then add the
`update-visual-baselines` label. The diff should be the two markers and nothing else, since at 390
nothing ties.

**Round 4: no baseline changes.** I expected `print` to go red, because the five moved pins are
drawn on paper at their new spots. CI passed it within the visual check's tolerance (121 pixels
differ, all from moves under a point). `phone-open` and `sheet-open` passed unchanged, since they
are level 1 at 390px. The `update-visual-baselines` label isn't needed.

**Earlier rounds: no baseline changes.** I expected `sheet-open` to go red, but CI passed all three visual checks
(`phone-open`, `sheet-open`, `print`) against the existing baselines. The Kidlandia sheet opens at a
view where nothing in frame changed. Once shown, stays shown keeps that true: it only changes the
first step. The local diffs (0.3–3.6%) were only this machine's text rendering. The area-label
change only draws at Detail, and none of the three baselines is a Detail view, so I expect them to
stay green; CI decides. If one does change, look at its diff before adding the
`update-visual-baselines` label.

## Decisions and questions for Ernest

1. **Beer stand and merch one step in — decided (Ernest, 10/17): option (b), once shown, stays
   shown.** A pin on the map at a coarser stop stays at every closer stop and outranks anything
   it would collide with there. The exception is an area's pin (Food Court, Kidlandia), which
   gives way to its booths at Detail by rule `area-label-tap` (your 10/17 follow-up).
2. **Art-market markers** are not pins and have no rank. I treat them as fixed targets that never
   move or wait: any pin that would overlap one waits. That is how they were handled by hand
   before. Since round 5 no pin waits for a marker at level 1 on any profile (question 8).
3. **Paper-only ops marks** (generators, dumpsters, the ice truck, the musicians' tent) aren't in
   the priority list. I ranked them 5, the bottom tier. On paper nothing waits, so the rank only
   decides which of two moves. Barricades and speed bumps are street marks, not discs, so they
   aren't placed; e2e still checks them for covering anything.
4. **The layout is computed for each screen's actual scale**, not only for 375px. A wider phone
   has more room per level, so it can show a pin a level earlier than a 375px phone does. Since
   round 4, the e2e checks run at 314, 320, 375, 390 and 430px and on the docked desktop.
5. **Three-way ties**: if a pin collides with two equal-rank pins, or with one that has already been
   nudged, it waits instead of trying a second split. Rule 4 only describes pairs. This doesn't
   come up today.
6. **Chip pins**: with a chip on, the chip's pins are drawn where the rules placed them at that
   stop, and a pin the rules hold back is drawn at its true location. That's the same as before,
   since nothing is nudged.

7. **(Round 4) The gap and booth cells.** If the 2px gap also applied between pins and booth
   cells, three pins would be short of it at level 3: the south restroom (0.4 units, against booth
   54's cell and AWARE's square), and the water at the top of Candler Park Dr (0.03 units, against
   booth 131). All three ART MARKET labels sit next to booth cells, as close as the floor allows.
   Booth cells are packed edge to edge by design, so I applied the gap between pin targets,
   markers and labels only. Say if the gap should reach booth cells too; that would move those
   three pins and the labels.
8. **(Round 4) Level 1 on narrow phones.** At 314 and 320px the beer stand and the bike valet
   don't show at level 1, because their targets would overlap the art-market markers there. The
   beer stand also waits at level 2 for the lawn water, so on those phones it first appears at
   level 3. On `main` they were drawn overlapping. **Done in round 5: the markers moved along
   their runs.** Both show at level 1 from 300px up (see Round 5, item 3).

## Skipped / not done

- Tapping a pin pans to its **true location**, not its drawn spot. The drawn spot is at most 12.75
  units away, and with nothing nudged today they are the same point.
- No e2e drives a pinch through a nudged pin, because no real pin is nudged. The glide is
  `drawAt` in `MapCanvas.jsx`, which interpolates between the two stops' positions by `levelPos`.
- `MOBILE_OVERVIEW_ZOOM` moved from `App.jsx` to `useMapView.js`, and `fitOverview` is now
  exported, so `npm run pin-layout` can size a phone's stops without restating them.

## Pin nudges

**Phone, level 1, under 375px wide only (round 5):** merch (630, 740) and the bike valet
(712.4, 730.1) tie at rank 4 and split the difference along the line between them. Each moves
0.73 units at 360px, 6.01 at 320, 6.92 at 314 (iPhone 15 / big text) and 9.18 at 300 (iPhone SE /
big text), all under the 12.75 cap. Both are at their true locations at levels 2 and 3, and at
level 1 on 375px and wider. `npm run pin-layout` shows the 320 case.

None on the desktop, and none on paper.

## Round 6 (10/18): checks and review

- **Visual diff** (`scripts/visual.mjs`): THRESHOLD 0.1 and MAX_DIFF 0.001 stay, as decided. The
  comment no longer says 0.1 "catches any real colour change"; PR #18's merch change passed
  under it. The check's job is layout in its three snapshots. Colour is checked at the token.
- **`docs/checks-and-review.md`**: one row per check (job, what it can't see, where it runs),
  "Where Ernest looks (every PR)" with the two 10/18 examples, and the human review gate. It is
  linked from CLAUDE.md (standing requirement 7) and design-system.html §7.
- **The human-review check**: `.github/workflows/human-review.yml` runs
  `scripts/human-review.mjs` on open, push, reopen and every description edit. Its parser has
  unit tests (`npm run test:review`, a CI step). **It stays red on this PR until Ernest answers
  the six items in the description.** That is the gate working, not a failure to fix.
- **Checkbox format**: each item has its Yes and No boxes on two lines (`- [ ] Yes` / `- [ ] No`),
  not one line, because GitHub only makes a box tappable at the start of a list item. That way he
  can tick them in the GitHub app. The check also reads the one-line form `[ ] Yes  [ ] No`.
- **Design system 1.7.0**: governance rule `human-review`, enforced by the human-review check.

## Expected answers (human-review)

The answers expected for the items in the PR description's "For Ernest to look at", checked by
the human-review check. They are true on every phone profile in the matrix (300 to 430px), so
big text does not change them.

1. Yes — the McLendon marker moved west to (492, 787.9), over booths 76–78, west of the merch
   tent at (630, 740).
2. No — the Acoustic beer (861.2, 750) waits for level 3 on every phone: under 375px for the
   stage, from 375px for the water station.
3. Yes — the bike valet shows at level 1 on every profile since round 5. Under 375px it and merch
   split a tie, up to 9.2 units apart.
4. No — the Food Court card lists the trucks, not the 16 stalls (question 9).
5. Yes — the 2px `--pin-gap` at level 3 (round 4). The visible discs are smaller than their
   44px targets, so the visible gap is wider than 2px.
6. No — at level 2 the info booth waits for merch (merch is on from level 1 and stays shown). It
   arrives at level 3.

## For Ernest to look at

**Judgment calls to accept for this PR** (each one is yours; a green check means only that it
held):

1. **The level 3 scale floor** (round 4): narrow and text-zoomed phones zoom level 3 further in,
   instead of the true locations being spaced again for them.
2. **The 2px gap leaves booth cells out** (question 7): with it, three pins and the ART MARKET
   labels would have to move.
3. **The booth tap exception** (`booth-tap-equivalent`): a booth cell stays about 16px because
   the list is the full-size way in. **The food stalls have no list** (question 9): accept the
   Food Court card as their way in, or ask for a stall list.
4. **The two marker moves** (round 5): the McLendon marker is now at the west end of its run, and
   the desktop directory's McLendon row flies there.
5. **The first real tie**: under 375px, merch and the bike valet split up to 9.2 units at level 1.
   On those phones the lawn water now waits at level 2 instead of the beer stand.
6. **What the matrix stands for**: 125% text is emulated as page zoom, and the WebKit results are
   CI's (this container has no WebKit). Real-device testing is the next step (Round 5, "What
   emulation does not cover").
7. **The human-review gate itself**: the questions, the expected answers above, and that on a
   private repo on the free plan it reminds rather than locks.

**Which "Where Ernest looks" items apply** (`docs/checks-and-review.md`):

- **1. Your phone, levels 1–3:** yes. Look at the McLendon entrance (merch, the bike valet, info),
  the Acoustic Stage, the lawn by the beer stand, and the McLendon and in-park markers.
- **2. Real-world truth:** barely. Round 4 moved five pins by under a map unit, and round 5 moved
  only markers, which stand for a whole run, not a spot on the ground.
- **3. Judgment calls:** yes, the seven above.
- **4. A red visual check:** probably. `phone-open` (level 1 at 390px) should show the two markers
  moved. Open the diff, and confirm it is only the markers, before adding the label.
- **5. Print:** yes. Round 4's five moved pins are drawn on paper.

