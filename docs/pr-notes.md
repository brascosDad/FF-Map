# PR notes: CLAUDE.md, rule 8 (ask Ernest only what needs a human) and #22's visual wording

Docs only (Cowork's file).

1. **Standing requirement 8, new** (Ernest, 10/19): "For Ernest to look at" is for judgment only
   (does it look right, is it true on the ground, is this his call). Anything a script, test or CI
   can verify, the agent checks itself and reports here. Each item says where to look, with a
   direct link when it's a file.
2. **Requirement 4, rewritten** in PR #22's words: the from → to comment, and the
   `accept-visual-changes` label accepting only what was shown.
3. **Commands:** the `test:visual` line, plus `test:from-to` (it exists in `package.json`).
4. **"Who does what":** Cowork can push now and opens its own small PRs.

Checked by Cowork (not asked of Ernest, per rule 8): no paragraph in `CLAUDE.md` appears twice;
requirements run 1–8 once each; `update-visual-baselines` no longer appears in `CLAUDE.md`;
`test:from-to` is a real script.

## Questions, skipped items, nudges

None. No code, data or rendering changes.

## Expected answers (human-review)

1. Yes — rule 8 says what Ernest wants.

## For Ernest to look at

1. **Rule 8 in `CLAUDE.md`:** does it say what you want?
