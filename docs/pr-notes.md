# PR notes: remove two passages duplicated in CLAUDE.md

Docs only. Cowork's merge of `main` into PR #20 (10/19) pasted two passages into `CLAUDE.md`
twice: standing requirement **4** (visual baselines) appeared again after requirement 7, and the
**Pinch zoom** rule appeared again after the area-label rule. This removes the second copy of
each; the first copies are unchanged. 11 lines removed, nothing else touched.

How it slipped through: the check after the merge looked for lines that went missing, not lines
that appeared twice. The check now run is "no paragraph appears twice": it passes.

## Questions, skipped items, nudges

None. No code, data or rendering changes.

## Expected answers (human-review)

1. Yes — `CLAUDE.md`'s standing requirements run 1 to 7, each once, with no second "4." after 7.

## For Ernest to look at

1. **`CLAUDE.md`, standing requirements:** do they run 1 to 7, each once?
