# Design system changelog

The version is `version` in `design-system/manifest.json`. What bumps it is in
`design-system.html`, section 7. Newest first. A change lands here in the same
PR as the manifest, the Names table and the docs.

## 1.6.0 — 2026-10-18

Minor: a rule is added and `tap-floor` names its one exception. Nothing on
screen changes.

- **Rule `booth-tap-equivalent`** (new): a booth's own cell on the map keeps
  its size (9.4 map units, about 16px at level 3 on a phone) and is exempt
  from `--pin-hit` / `--tap-min` under WCAG 2.2 SC 2.5.8's Equivalent
  exception, because every booth's card is also reached by targets that
  meet the floor: the art market's marker (or its name label at level 3) →
  the run's list (BoothRow, `--tap-min` high) → the card, the ItemPager
  stepping booth to booth. The food stalls have no list; the Food Court
  card is their way in.
- **`tap-floor`** says so and points at the new rule.
- **BoothRow** and **ItemPager** list the rule.
- Enforced by e2e on the device matrix (`scripts/lib/devices.mjs`: WebKit
  and Chromium, 320–430px phones, two with their text at 125%, and the
  docked desktop), which walks the path for every booth in the data.

## 1.5.0 — 2026-10-18

Minor: a rule and a token are added, and `no-overlap` asks for a gap. On a
phone narrower than 375px (or with its text zoomed) level 3 zooms further
in; on every phone some pins arrive at level 2 or 3 a level later than
before, and five pins moved by under a map unit. Level 1 is unchanged.

- **Rule `level3-scale-floor`** (new): level 3 never shows more map units
  per CSS px than the 375px reference phone (`LEVEL3_MAX_UNITS_PER_PX` =
  0.5804, the rule's `constant`). "True locations are spaced once, for the
  reference phone; no screen may show them closer together than that."
- **Token `--pin-gap`** (2px), and **`no-overlap`** asks for it: at levels 2
  and 3 every two targets (pins, markers, area labels) stand that far apart.
  Not at level 1. Booth cells are held only to not crossing.
- **Five true locations** moved apart on the reference phone so level 3
  clears the gap: lawn water, Acoustic beer, King of Pops C1, entrance water
  and info, 0.10 to 0.80 units each (pins.js).
- **Names**: zoom levels are LEVEL 1, 2, 3 in docs and notes (the code keeps
  overview / first step / Detail). No component names change.
- Enforced by e2e on phones 314, 320, 375, 390 and 430 px wide and the docked
  desktop, and `npm run test:ds`.

## 1.4.0 — 2026-10-17

Minor: four rules, a component and three tokens are added, and `no-overlap`
changes who gives way. At Detail the Kidlandia pin gives way to its booths,
and every area's name is drawn there and takes a tap. On a
375px phone's first zoom step the Acoustic Stage's water station arrives a
stop earlier and the Acoustic beer and Mr Softee wait for Detail. Paper and
the docked desktop draw the same as before.

- **Rule `no-overlap`: placement is computed, not hand-set.** Every pin has a
  rank (`PIN_RANK` in `src/assets/pins.js`); at a coarser stop the higher
  rank keeps its true location and the lower waits for a closer stop (a
  waiting pin still holds its spot against lower ranks); two of a rank split
  the difference; rank, then listed order, so the same pins give the same
  map. The `from: 'detail'` flags are gone. **Priority**: water moves up from
  the bottom tier to rank with the restrooms — "restrooms and water".
- **Rule `true-location`** (new): a pin's stored x/y is where it sits at
  Detail, where every pin shows; nothing writes to it. Paper is one more stop
  where nothing waits: a pin nudges within the cap or is flagged (drawn at
  its true location, listed for a person to place).
- **Rule `nudge-cap`** (new): no pin more than `NUDGE_CAP` = 12.75 map units
  (half of `--pin-hit` at Detail on a 375px phone) from its true location, at
  any stop. A rule may now carry a `constant` ({ name, value, unit, file,
  derivation }); `npm run manifest` fails if the file disagrees with it.
- **Rule `stays-shown`** (new, Ernest's call): a pin shown at a coarser stop
  stays at every closer stop and outranks anything it would collide with
  there (`STAYS_RANK`), so zooming in never takes a landmark away. The beer
  stand and merch stay from the opening view on; the water stations beside
  them wait for Detail. The Food Court pin still gives way to its stalls.
- **Rule `area-label-tap`** (new): "At Detail, an area's pin gives way to
  its booths, and its name label carries the tap." Kidlandia's pin now
  leaves at Detail like the Food Court's; FOOD COURT, KIDLANDIA and the three
  ART MARKET names are drawn there and open their cards, each over a hit rect
  at least `--pin-hit` each way that covers no booth or pin target.
- **Component `AreaLabel`** (`.ffc-arealabel`, part `__text`, variants
  `--food`, `--kids`, `--art`; knob `--arealabel-ink`): in the Names table.
- **Tokens**: `--kids-ink` (primitive, Kidlandia rose darkened for text,
  5.3:1 on white), `--map-kids-label`, `--map-art-label` (semantic).
- **Enforced by** e2e on a 375px phone, the docked desktop (new: every stop,
  each chip) and paper, and `design-system/placement.test.mjs` in
  `npm run test:ds`. `npm run pin-layout` shows what the rules do with
  today's pins. The Names table's MapPin row and §6 (new: Pin placement)
  describe it; no component names change.

## 1.3.0 — 2026-10-12

Minor: nine pin colours change and a rule is added. Every category pin but
drinks, and the food stalls and Kidlandia booths drawn in their colours,
change on both maps and on paper.

- **Tokens: hue set A ("least change") on every `--pin-*`.** With lightness
  held in one band (1.2.0), hue was the only cue, and five pairs sat too close:
  food/drinks ΔE 5.9, water/info 6.3, kids/first aid 7.3, kids/merch 8.4,
  stage/merch 9.0 (ΔE in OKLab ×100). Set A moves each pin only as far as it
  must, and drinks not at all, so beverage stays its 8-point darker step; the
  smallest pair is now 10.3 (food/drinks). Every pin stays in OKLCH L 57–67
  and ≥3:1 under white, the meaning anchors hold (first aid red, food
  orange, restroom green, water blue, stage purple), and every pin is ≥ΔE 10
  from `--ff-teal`, `--ff-coral` and both `--cat-*` slates. Old → new in
  `docs/hue-sets.json`, with sets B (vivid) and C (muted) as alternatives.
- **Rule `category-hue-spacing`**: no two category pins closer than ΔE 9.5;
  `--pin-beverage` is exempt as the declared darker step of `--pin-drinks`.
  Enforced by `npm run test:ds`.
- **Query layer: `palette-distances`** (`npm run ds -- palette-distances`),
  every pair of pins closest first with ΔE and hue gap, and where the reserved
  colours fall. `check-palette` and the MCP tool `check_palette` now fail on
  the new rule and name the pair. `design-system/lib/color.mjs` gains
  `oklab`, `deltaE` and `hueGap`.

## 1.2.0 — 2026-10-12

Minor: two token values change and a rule is added. Merch pins (and the
hidden beverage pins) draw lighter.

- **Tokens: `--pin-merch` #9E3F94 → #AF4FA5, `--pin-beverage` #8A6521 →
  #997332.** Same hue and chroma, lightness lifted into the band the other
  eight pins already sit in. Measured in OKLCH (as the eye sees it, not HSL):
  merch L 52.7 → 57.9 (5.85:1 → 4.68:1 under the white glyph), beverage
  L 53.2 → 58.0 (5.30:1 → 4.33:1). Beverage stays a clear step darker than
  drinks (L 66.3). The print sheet reads the same tokens; it has no values of
  its own.
- **Rule `category-lightness-band`**: category pins sit between OKLCH L 57 and
  67, coral (`--current`) above 70, every pin at least 3:1 under white; the
  `--cat-*` neutrals are exempt. Enforced by `npm run test:ds`.
- **Query layer: `check-palette`** (`npm run ds -- check-palette`) and the MCP
  tool `check_palette`, which measure every pin and coral and answer the rule.
  The measurement is `design-system/lib/color.mjs` (hex → OKLCH, contrast
  against white; no dependency).

## 1.1.0 — 2026-10-09

Minor: one component added, defined but not shipped. Nothing the visitor sees
changes.

- **Component: WhatsOnNow** (`.ffc-whatsonnow`, `src/components/WhatsOnNow.jsx`):
  the act playing now on one stage and the next one, at the top of the stage
  sheet, read from `stages.json` on festival time. Behind
  `FESTIVAL.showNow: false`; listed in design-system.html §4.
- **Tokens: +2 component knobs**, `--now-accent` (→ `--current`) and `--now-bar`
  (→ `--space-1`). No new semantic or primitive values.
- **Rule `coral-is-now`** names WhatsOnNow as coral's one defined use.
- **Manifest:** a component can carry a hand-written `flag`, the switch it
  waits behind; `shipped` is then false, and `ds component` says so.

## 1.0.0 — 2026-10-09

The system, written down as data an agent can ask questions of. Nothing the
visitor sees changes; this is a description of what already ships.

- **Tokens: 148**, generated from `src/styles/tokens.css` and
  `src/styles/components.css`: 43 primitive, 74 semantic, 31 component. Each has
  its value, its tier, what it points at, and the comment that explains it.
- **Components: 13**, one per row of the Names table (FilterChip, IconButton,
  ZoomControl, MapPin, Panel, ItemPager, BoothRow, ArtistLine, ScheduleRow,
  DayHeading, ListRow, PoiRow, Legend). IconButton is defined in CSS but not used
  in the app.
- **Rules: 8**, from CLAUDE.md: `no-overlap`, `tap-floor`, `token-first`,
  `one-name`, `close-top-right`, `step-in-step-out`, `paper-number-row`,
  `coral-is-now`.
- **Query layer**: `npm run ds -- components | component | tokens | rules | check`
  and the same five answers as an MCP server, `ff-design-system` (`.mcp.json`).
- **Governance**: propose → review → adopt, semantic versioning, one-version
  deprecation (design-system.html §7). CI fails if the committed manifest is not
  what a fresh generation produces (`manifest is current`).
- **Known gaps carried into 1.0.0**: four `.ffc-` classes exist in
  `components.css` that the Names table does not name (`.ffc-brand`,
  `.ffc-scale`, `.ffc-dimmed`, `.ffc-boothlist`; listed under `unlistedClasses`),
  and four components' CSS class is not `.ffc-<name>` (FilterChip is `.ffc-chip`,
  IconButton `.ffc-iconbtn`, ZoomControl `.ffc-zoom`, MapPin `.ffc-pin`).
