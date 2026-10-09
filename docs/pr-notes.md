# PR notes: the design system as something an agent can ask

The festival is over, so "don't restructure" is relaxed for this PR only, inside this scope: a
machine-readable manifest of the design system, a query layer over it (CLI and MCP), and a short
governance section. One commit per numbered item. **No visitor-facing change**: nothing under `src/` or
`public/` was touched, so no visual baseline should move. The demo is a separate session.

## Status by item

| Item | What | Commit subject |
|---|---|---|
| 1 | `design-system/manifest.json`: tokens, components, rules; `npm run manifest`; CI step **manifest is current** | `Item 1: the design-system manifest, generated where it can be` |
| 2 | `npm run ds -- …` (components, component, tokens, rules, check) and the MCP server `ff-design-system` (`.mcp.json`); `npm run test:ds`, also a CI step | `Item 2: a query layer, two doors with the same answers` |
| 3 | `design-system.html` §7 (propose → review → adopt, versioning, deprecation), `design-system/CHANGELOG.md` at 1.0.0, the CLAUDE.md heading | `Item 3: governance, short (design-system.html section 7)` |

## Where each thing comes from (so nothing is hand-copied)

| In the manifest | Source | How |
|---|---|---|
| `tokens` (148: 43 primitive, 74 semantic, 31 component) | `tokens.css`, `components.css` | generated. Tier = the file's own `===== 1. PRIMITIVES / 2. SEMANTIC` markers; component tier = declared in `components.css`. `note` = the trailing comment, else the comment above (a comment covers the declarations under it until a blank line). `pointsAt` and `resolved` follow `var()` chains. |
| `components[].name`, `description` | the Names table, `design-system.html` §3 | generated; a row with two names ("BoothRow · ArtistLine") is two components that share the row's description |
| `components[].states` | `docs/interaction-states.md` §1 | generated, from the ids in `inStates` |
| `components[].cssParts`, `cssVariants`, `tokens`, `knobs`, `shipped`, `setElsewhere` | scan of `components.css` and `src/` | generated. A rule belongs to a component by the **subject** of its selector, so `.ffc-panel__footer:has(.ffc-itempager)` is the Panel's, not the ItemPager's. |
| `components[].cssClass`, `file`, `inStates`, `rules`, `notCalled`, `doNot` | hand-written | **checked** by the generator: the class must be in `components.css`, the file must use it, every state id must be in the doc, every rule id must exist |
| `rules` (8) | hand-written, from `CLAUDE.md` | **checked**: every `enforcedBy` test name must be a substring of a check in `scripts/e2e.mjs` (or a step in `ci.yml`), every `source` phrase must be in `CLAUDE.md` |
| `version`, `updated` | hand-written | `updated` is not "now": a generated file that changes on every run could not be diffed by CI |

## Decisions I made (say if any is wrong)

- **`doNot` only where the docs already say it.** Five components have one: FilterChip (don't fade text),
  MapPin (no second glyph, no tinted glyph), ItemPager (the name; no back step from paging), ArtistLine
  (don't lead with the business), DayHeading (sentence case). The other eight have `[]`.
- **`inStates` is my reading of the state table** (hand-written, validated only for existence): FilterChip
  S1–S2, MapPin S1–S2, Panel S3–S7, ItemPager S6–S7, BoothRow S3, ArtistLine S3/S6/S7, ScheduleRow,
  DayHeading, ListRow S3. ZoomControl, IconButton, PoiRow, Legend have none because the doc has no state
  for them (PoiRow is the docked panel's directory, which the doc describes outside the S-table).
- **`rules` on a component** is a small addition to the spec: the rules a person touching it must read.
  `token-first` and `one-name` apply to everything and are not repeated. BoothRow gets only
  `step-in-step-out`; I did not claim a tap floor for list rows because I did not find a test for it.
- **Deprecation is built, not just described**, because §7 promises it: a component takes
  `deprecated` + `replacement` in the manifest, a token takes a `Deprecated: use --x` comment above it;
  `check` reports use of either as a **warning** and test:ds covers it. Nothing is deprecated in 1.0.0.
- **Reasons.** Quoted or close to CLAUDE.md / `tokens.css` / `design-system.html`: `no-overlap`,
  `tap-floor`, `token-first`, `coral-is-now`, and the first half of `close-top-right`. **Mine**, please
  correct: `one-name`, `step-in-step-out`, `paper-number-row`, and "the thumb always knows where it is".
- **MCP server uses the SDK's low-level `Server`** with plain JSON Schema, so `@modelcontextprotocol/sdk`
  (1.32.1, a dev dependency) is the only thing added to `package.json`. The SDK's own peer dependency
  `zod` is installed by npm but never imported by us. The lockfile grows by ~105 packages (the SDK brings
  express, hono and friends); none of it is in the app bundle.
- **`check` severities.** `error`: a raw hex/px that has a token, a token that doesn't exist, an `.ffc-`
  class that isn't a component, a word the docs say a thing is never called. `warning`: an `.ffc-` class
  that exists in `components.css` but is not in the Names table, any other class (the layout classes in
  `map.css`), a deprecated name. Exit code 1 only on an error.
  Px is only reported when the property's own family has a token of that exact value
  (`padding: 12px` → `--space-3`; `font-size` → `--text-*`; radius; width/height → the sizing tokens), so
  `1px` borders and `30px` are not noise. 44px in a width/height cites `tap-floor`.
- **CLAUDE.md is Cowork's file.** I changed only what was asked plus three additive lines: the heading
  ("Standing requirements"), one pointer under requirement 1, and two lines under Commands. Nothing under
  "Open" was resolved by this PR, so nothing there was touched.

## Findings the generator surfaced (data, not fixed: all outside this scope)

1. **Four `.ffc-` classes are not in the Names table:** `.ffc-brand`, `.ffc-scale`, `.ffc-boothlist`,
   `.ffc-dimmed` (manifest `unlistedClasses`; `check` warns on them). Adding rows is a naming decision.
2. **Four components' class is not `.ffc-<name>`,** which is what rule 6 and the Names table say:
   FilterChip → `.ffc-chip`, IconButton → `.ffc-iconbtn`, ZoomControl → `.ffc-zoom`, MapPin → `.ffc-pin`.
   `check` tells you the real class when you write `.ffc-filterchip`. Rename the CSS, or amend the sentence?
3. **IconButton ships nowhere:** `.ffc-iconbtn` is in `components.css` and the design-system page but no
   file in `src/` uses it (`shipped: false`). Its `--on` variant is the only reader of `--current`
   (coral) in the CSS, and `CORAL` in `src/assets/pins.js` is exported and unused. Both are consistent
   with `coral-is-now` (reserved, no live use), and both are candidates for deletion.
4. **`check` on `components.css` itself: 1 error, 12 warnings.** The error is real: `.ffc-poirow__go`
   has `font-size: 18px`, which is `--text-2xl`. The warnings are the four unlisted classes and the
   legacy layout classes (`.ff-screen`, `.docked`, `.sheetwrap`, `.dir-section`, `.dir-title`).
5. **Two rules are enforced by review only:** `paper-number-row` (the nearest e2e check asserts the
   stall half: "print: every art booth square carries its number, and no stall does") and `coral-is-now`.
   `token-first` and `one-name` have advisory `check` coverage on a snippet; nothing runs it over the
   whole repo in CI (it would fail on item 4's error today).
6. **Tier edge cases kept as the files have them:** `--ops-dumpster-fill`, `--ops-dumpster-ink`,
   `--ops-speed-bump` sit in the primitives section but point at other tokens; `--chip-height-sm` exists
   only inside a phone `@media` block (recorded with `when`); 33 of 148 tokens have no comment.
7. **`setElsewhere`:** `--sheet-accent` is read in CSS (ListRow's bullet) but set from JSX inline
   styles (`DetailSheet.jsx`), so it is in no token file; `--bullet` is a fallback in the same
   `var()` chain that nothing sets at all (dead). `check` treats both as known.

## Questions / open decisions (none blocks this PR)

- Add Names-table rows for Brand, Scale, BoothList and the dimmed state, or fold them into an existing row?
- Rename the four classes to `.ffc-<name>`, or change rule 6 to say "the Names table gives the class"?
- Keep `check` advisory, or add a repo-wide `check src/styles/components.css` to CI once item 4 is fixed?

No `BLOCKED:` question. Nothing skipped from the three items. No pins nudged (no map change).

## Evidence

`npm run test:ds`: 20 tests, 20 pass (manifest is current; reader; query layer; CLI; MCP over a real stdio
client; the two doors returning identical JSON for eight questions; one snippet that fails, one that
passes; deprecation; changelog/manifest version).

`npm run ds -- component ItemPager`:

```
ItemPager   .ffc-itempager   src/components/DetailSheet.jsx
  Previous / "11 of 139" / next, in the Panel's footer. Pages between items. Nothing else is
  called a pager, stepper or booth nav.

states     S6 List → booth (inside the sheet) · S7 Booth opened from the map
parts      .ffc-itempager__pos
variants   none
tokens     --border-control --focus-ring --font-ui --radius-sm --space-2 --surface-chrome-solid --surface-pressed --tap-min --text-md --text-strong --weight-bold
knobs      none
never      "pager", "stepper", "booth nav"

do not
  - Call it a pager, stepper or booth nav.
  - Let paging add a back step: the ItemPager pages sideways inside the sheet.

rules that apply
  tap-floor: --tap-min (44px) is the floor for every control (chips, close, zoom buttons,
  the ItemPager's buttons, the handle); --pin-hit (44px) is the hit area centred on every
  pin. The visible glyph may be smaller than its target; the target may not.
  step-in-step-out: The way you step in is the way you step out: one layer per back. A booth
  opened from a list pushes in from the right and ‹ back pops it to the right with the
  height held; the ItemPager pages sideways and never adds a step. The phone's back gesture
  closes the sheet first, then clears the chip, then leaves the page.
```

`npm run ds -- check` on a snippet that breaks the rules (`$ npm run ds -- check < snippet.css`, exit 1):

```css
/* a booth pager, written the way it should not be */
.pager-button {
  min-height: 44px;
  padding: 12px 16px;
  background: #23385B;
  color: #fff;
  border: 1px solid #D7D2C2;
  border-radius: 14px;
  font-size: 15px;
  box-shadow: var(--shadow-card);
}
.ffc-filterchip:hover { color: #ABCDEF; width: 30px; }
.ffc-brand { margin: 0; }
```

```
stdin: 12 errors, 1 warning
  line 2   one-name    error   .pager-button is not a name here: the component is ItemPager, class .ffc-itempager
  line 3   tap-floor   error   44px is the tap floor: use var(--tap-min) on a control, var(--pin-hit) on a pin
  line 4   token-first error   12px is a token: use var(--space-3)
  line 4   token-first error   16px is a token: use var(--space-4)
  line 5   token-first error   #23385B is a token: use whichever of var(--surface-base), var(--surface-selected), var(--text-strong), var(--focus-ring) names the job
  line 6   token-first error   #fff is a token: use whichever of var(--surface-chrome-solid), var(--map-halo), var(--icon-on-color) names the job
  line 7   token-first error   #D7D2C2 is a token: use var(--border-subtle)
  line 8   token-first error   14px is a token: use var(--radius-md)
  line 9   token-first error   15px is a token: use var(--text-lg)
  line 10  token-first error   --shadow-card is not a token. A new value is added to tokens.css and documented before it is used
  line 12  token-first error   #ABCDEF is not a token: add it to src/styles/tokens.css and document it in design-system.html before using it
  line 12  one-name    error   .ffc-filterchip is not a name here: the component is FilterChip, class .ffc-chip
  line 13  one-name    warning .ffc-brand is in components.css but the Names table does not name it: add a row to design-system.html §3 (and the manifest) before building on it
```
