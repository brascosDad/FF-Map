# PR notes: CLAUDE.md standing requirements reworded to match the case-study deck (slide 8)

Docs only (Cowork's file). Ernest's 10/20 review of the deck changed what four requirements say,
so the contract the deck shows has to be the contract in the repo.

1. **Rule 1, behaviour change:** use only the design system's tokens and components; a new token,
   component or variant means **stop and ask Ernest first** (what, why the existing ones don't
   cover it, where it would be documented). Previously: add the token and document it.
2. **Rule 2:** "clean and scalable" defined — one source per kind of thing, a documented shape for
   every record, no fact in two places, plus the next-year-volunteer test.
3. **Rule 4:** leads with the plain meaning — visual changes need Ernest's sign-off. Mechanics unchanged.
4. **Rule 5:** every chat reply ends with a status line, **`BLOCKED:`** or **`READY:`**, so a quiet
   reply is never ambiguous.
5. **Rule 6:** the Names table is a lexicon; names are chosen for what a thing does; a new name is a
   new component (ask first), and gets a row: name, what it is, what it is not called.
6. **Rule 7:** "a green check *on a PR*".
7. **Rule 8:** reframed as keeping a person in the loop for judgment calls, pointing at "Where Ernest
   looks" in `docs/checks-and-review.md`. Same substance.

Rule 3 unchanged (the repo stays public, decided 10/20, so no private-repo exception).

**Design system 1.8.0** (same PR, because the manifest's rules cite CLAUDE.md and CI checks every
cited phrase): `token-first` and `one-name` statements follow the new rules 1 and 6, and three rule
`source` pointers follow the reworded lines. Changelog entry added. `npm run manifest` is current and
`npm run test:ds` passes (44 of 44).

Checked by Cowork (not asked of Ernest, per rule 8): requirements run 1–8 once each; no paragraph
appears twice; "Where Ernest looks" exists in `docs/checks-and-review.md`; no other file in the repo
quotes the old rule-1 or rule-5 wording.

## Questions, skipped items, nudges

None. No code, data or rendering changes.

## Expected answers (human-review)

1. Yes — "stop and ask first" is the behaviour Ernest wants for new tokens and components.
2. Yes — `READY:` is the done signal.

## For Ernest to look at

Judgment calls to accept for this PR:

1. **Rule 1 in `CLAUDE.md`:** "stop and ask first" for new tokens and components. It slows small
   additions down on purpose.
2. **Rule 5:** `READY:` as the done signal.
