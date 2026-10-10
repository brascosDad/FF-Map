# PR notes: WhatsOnNow, defined but not shipped

A "What's on now" card for the stage sheet: the act on one stage now and the one after it, from
`stages.json`, read on festival time. Built, tested and documented, **behind `FESTIVAL.showNow:
false`**. Nothing a visitor sees changes, and no visual baseline should move.

This was the demo of asking the design system before building. The session record is
`docs/demo/whats-on-now.json` (ask → answer → build → check, with the answers trimmed to what was
used), and the picture at 390px is `docs/demo/whats-on-now-390.png`.

## What changed

| Where | What |
|---|---|
| `src/whatsOnNow.js` | `whatsOnNow(stage, date, { days, timeZone })` returns `playing`, `between` or `before` (each with `now` / `next`), or `null` when it isn't a festival day or the music is over. It parses the lineup's own strings and keeps no second copy of the schedule. |
| `src/data/festival.js` | `days` (`saturday: '2026-10-03'`, `sunday: '2026-10-04'`), `timeZone: 'America/New_York'`, `showNow: false` |
| `src/components/WhatsOnNow.jsx`, `.ffc-whatsonnow` in `components.css` | The card. Coral (`--current`) is the left bar and the dot beside "Now" while an act is on. The text stays navy and slate, because coral on white is under 4.5:1. Two component knobs: `--now-accent`, `--now-bar`. |
| `DetailSheet.jsx` | `StageSchedule` renders the card above the lineup only when `FESTIVAL.showNow` is on. |
| `design-system.html` | A Names row, plus a §4 "defined but not shipped" row. |
| `design-system/manifest.json` 1.1.0, `CHANGELOG.md` | The WhatsOnNow entry. A component can now carry a hand-written `flag`; `shipped` is then false and `ds component` prints "not shipped: behind FESTIVAL.showNow". `coral-is-now` names it as coral's one defined use. |
| `scripts/e2e.mjs` | 9 checks: the logic against the real lineup on a fixed clock (playing, Noon, between sets, before, last set, after hours / day off, UTC vs Atlanta), the flag is false, and no card in the built app. |
| `scripts/demo-whats-on-now.mjs` | Renders the 390px picture. Runs Vite dev, flips the flag for that one page in flight and holds the clock at Sat 1:45 PM. Nothing on disk changes. |

## Results

- `npm run ds -- check` on the new CSS: no findings (before the Names row: 7 one-name errors for the
  new class, 0 token errors).
- `npm run test:ds`: 20/20. `npm run manifest -- --check`: current.
- `npm run lint`: clean.
- `npm run test:e2e`: 491/491. Visual: 3 advisory diffs, all text anti-aliasing (this container vs the
  runner). CI has the verdict.

## Questions and open decisions

1. **The Saturday 3:00 Main Stage slot still reads "Mystery artist — revealed 9/26"** in
   `stages.json`. The 9/26 reveal (Asydequest, kept under `_reveal`) was never moved into `act`, so
   the live lineup shows the placeholder as well. That's Cowork's file and a committee fact, so I
   haven't touched it. It also shows in the demo picture.
2. **To ship the card:** set `showNow: true` in `src/data/festival.js`. Two things should be decided
   first:
   - `between` and `before` show "Between sets" / "First up". Ernest decides whether those states
     show at all, or only `playing`.
   - The festival is over, so the card would render nothing until next year's dates go into
     `FESTIVAL.days`.
3. **The time rule:** 10 and 11 are morning, and 1–9 are afternoon. It holds for a 10:30 AM–7 PM
   lineup; an earlier or later set would need the rule changed (comment in `src/whatsOnNow.js`).
4. **The `ff-design-system` MCP server** didn't connect in this cloud session because
   `@modelcontextprotocol/sdk` wasn't in `node_modules` until `npm install`. The CLI gives the same
   answers, so it was used for every query.

## Skipped

- Local `npm run pr-shots`: the `PR screenshots` Action writes the table on the PR.
- CLAUDE.md: Cowork's file, and no "Open" item is resolved. Proposed line for Cowork: under
  *Decided*, "WhatsOnNow is the one defined use of coral; it ships only by flipping
  `FESTIVAL.showNow`."
