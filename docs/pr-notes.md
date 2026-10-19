# PR notes: trim CLAUDE.md now the festival is over (PR #20)

Docs only. `CLAUDE.md` keeps standing rules and decisions; the dated 2026 build log moves to
`docs/history-2026.md` and the analytics reference to `docs/analytics.md`. Nothing is deleted.
The PR description has the full list of what moved.

## Merge with PR #21 (10/19)

This branch was opened 10/13; PR #21 (pin placement) merged 10/19 and also edited `CLAUDE.md`,
so the two conflicted. Resolved by keeping this PR's trim and folding in everything #21 added:

- Standing requirement **7** (green checks mean the rules held, not that the map is right).
- Under Decided: the **booth tap exception**, **zoom levels named 1, 2, 3**, the **level 3 scale
  floor**, the **pin placement rules** (rank, true location, ties split, 2px gap, nudge cap, once
  shown stays shown, paper), the **area-label** rule, and the merch/info spacing update.
- #21's "Shipped since" log → the end of `docs/history-2026.md`, like the rest of the history.

Checked by script: every line #21 added to `CLAUDE.md` is either in the new `CLAUDE.md` or in
`docs/history-2026.md`; nothing this PR trimmed came back.

## Questions, skipped items, nudges

None. No code, data or rendering changes; the visual baselines should stay green.

## Expected answers (human-review)

1. Yes — the Pin placement rules (8 numbered rules, from "Every pin has a rank") are under
   "Decided — don't reopen" in `CLAUDE.md`.
2. Yes — `docs/history-2026.md` ends with "After the festival: pin placement rules (PR #21)".

## For Ernest to look at

1. **`CLAUDE.md`, Decided:** are the Pin placement rules still there (they came from PR #21)?
2. **`docs/history-2026.md`, the end:** does it finish with the pin placement PR's log?
