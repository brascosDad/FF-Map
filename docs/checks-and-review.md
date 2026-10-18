# Checks and review: what each check does, and where a person has to look

**Green checks mean the rules held. They do not mean the map is right.** Each automated check
below has one job, written down, along with what it cannot see. Whatever a check cannot see is a
person's job, and the human review points are listed explicitly. Nobody's job is "look for green
and merge".

## The checks

| Check | Its job | What it can't see | Where it runs |
|---|---|---|---|
| **Palette rules**: `npm run ds -- check-palette`, rules `category-lightness-band` and `category-hue-spacing` | Every `--pin-*` colour sits in the OKLCH lightness band, has at least 3:1 under its white glyph, and is at least ΔE 9.5 from every other pin colour. Colour is checked here, at the token. | Whether a colour is the *right* one: on-brand, readable in sunlight, or one the committee likes. A hex used outside the tokens, which is what `npm run ds -- check` and review are for. Any colour that isn't a `--pin-*` token (the `--cat-*` neutrals are exempt). | CI, through `npm run test:ds` |
| **Manifest drift**: `npm run manifest -- --check` | The committed `design-system/manifest.json` is what a fresh generation produces. Every rule's `enforcedBy` names a real check, its `source` names a real CLAUDE.md phrase, and its `constant` matches the code. | Whether a rule is the right rule, or whether its statement matches what the code really does beyond the one constant. An `enforcedBy` string proves that a check *exists*, not that it tests the rule well. | CI step "manifest is current" |
| **Placement unit tests**: `design-system/placement.test.mjs` | The placement engine obeys each rule (rank, ties split, nudge cap, a nudge creating no new overlap, paper flags, stays-shown, the 2px gap, the level 3 floor), on made-up pins built to make each rule fire. | The real pins. Whether the ranks put the right things first. Anything drawn: these tests never open a browser. | CI, through `npm run test:ds` |
| **e2e, with the device matrix**: `npm run test:e2e`, `scripts/lib/devices.mjs` | Behaviour in a real browser engine. Per profile: no two targets overlap (and the gap), the cap, rank, stays-shown, the level 3 floor, level 1 landmarks, the area labels, control tap sizes, and every booth's card reached by 44px taps. It runs on nine screens on WebKit and Chromium. Elsewhere it checks sheets, chips, back, offline, print layout and analytics. | It is **emulated, not a real phone**: no Safari address bar, no real fingers, no OS settings beyond page zoom, no Dynamic Type, no VoiceOver (see pr-notes, "What emulation does not cover"). It measures geometry, so two pins 2px apart pass even if they look like one blob. It cannot tell whether a pin is in the right real-world spot, whether copy is true, or whether something reads well. In this container the WebKit half is skipped; CI runs it. | CI step `npm run test:e2e`, plus locally before a push |
| **Visual diff**: `scripts/visual.mjs` | **Layout** in three snapshots: something moved, appeared or vanished. A case fails when more than 0.1% of pixels differ by more than pixelmatch's 0.1 threshold. | Anything outside its three snapshots: **the phone at level 1 at 390px, the Kidlandia sheet open, and the print sheet**. Not levels 2 or 3, not any other width or the desktop, not any other sheet. It also misses **colour changes under the threshold**: PR #18's merch #9E3F94 → #AF4FA5 passed. That is by design, since colour is the palette rules' job. A pass on CI does not mean the change looks good, only that the pixels match. | CI, inside `npm run test:e2e`; the baselines are the CI runner's renders |
| **PR screenshots**: `npm run pr-shots`, the "PR screenshots" Action | **Evidence for a person, not a gate.** Before/after shots of the phone at open, the desktop and `?print=1`, from `main` and the branch, in the PR description. | It never fails, so it judges nothing. It shows only those three views; levels 2 and 3, other widths and every sheet are not in it. | Every pull request |
| **Lint**: `npm run lint` (oxlint) | Code-level mistakes: unused names, suspicious patterns. | Anything about the map. | CI |
| **Human review gate**: the "human-review" check, `scripts/human-review.mjs` | **That Ernest looked at specific things** on the preview, and that what he saw matches what the PR expected. See "The human review gate" below. | **His judgment.** It cannot tell whether he looked carefully, and it cannot judge anything he wasn't asked about. On a private repo on GitHub's free plan a required check can't block the merge button, so there it is a hard reminder, not a lock. | Every pull request, again whenever the description is edited |

**No check judges** whether something reads well, whether a pin is in the right real-world spot,
whether copy is true, or whether the ranks put the right things first. That is what the next
section is for.

## Where Ernest looks (every PR)

Each item is something to do, with a place to look and what to look for. The PR's "For Ernest to
look at" section (the gate below) turns the ones this PR touches into specific questions. This
list is the standing part.

1. **On your own phone, at levels 1, 2 and 3, in the areas the PR touched.** Open the Vercel
   preview with your phone set the way you use it (big text included). At each level, pan to each
   area the PR names. Look for crowding, pins that nearly touch, a pin that comes and goes as you
   zoom, a label over something, anything that reads wrong *even if the rules allow it*. The rules
   only say what may not happen. Whether it looks right is your call.
2. **Real-world truth.** For any moved pin, new name or new copy, check it against the
   committee's own sources: Jess's 2026 site plan for where things are, Courtney's sheet for booths
   and names, `stages.json`'s thread for the lineup. No check knows where the beer stand really
   is.
3. **Judgment calls.** Every new rank, rule, exception or trade-off is yours to accept. The PR
   lists them under "For Ernest to look at" in `docs/pr-notes.md`. A green check on a rule only
   shows the rule held, not that it was the right rule.
4. **Any red visual check.** Open the diff image (CI's `e2e-out` artifact, `.e2e-out/visual/`) and
   confirm it shows **only the intended change** *before* adding the `update-visual-baselines`
   label. The label accepts whatever rendered, so a mistake in the diff goes into the baseline.
5. **Print.** Open the print PDF (`npm run print`, or `?print=1` on the preview) from the PR
   before it goes to anyone: the printer, Jess, the committee.

### What only a person caught (10/18)

- **Beer and water at the Acoustic Stage, nearly touching, with every check green.** At level 3
  the Acoustic beer stand and the water station beside the stage were edge to edge. The no-overlap
  rule allows that (circles may touch), so e2e, the unit tests and the visual diff all passed.
  Ernest saw two pins reading as one blob on his phone. Result: the 2px `--pin-gap` at levels 2
  and 3, and the beer moved 0.8 units (round 4).
- **His phone was not the test phone.** The suite measured a 375px phone. Ernest's iPhone, with
  its text zoomed, reports about 314 CSS px. There, more map units fit in every pixel: five pairs
  of pins overlapped at level 3 (on `main` too), the Acoustic water waited at level 2, and at
  level 1 the beer stand and the bike valet waited for the art-market markers. All of it was
  green, because no check ran at 314. Result: the level 3 scale floor (round 4), the device
  matrix with two big-text profiles, and the markers moved (round 5).

## The human review gate

Every PR description has a section **"For Ernest to look at"**: 3–6 questions about *this* PR,
each one answerable by looking at the preview on his phone. Each item gives the level, the place
and what to look at, then two boxes:

```
1. **Level 2, Acoustic Stage (south-east corner):** is a beer pin showing beside the stage?
   - [ ] Yes
   - [ ] No
```

- Each question asks what he **sees**, never "is this correct?".
- The expected answers are mixed, so they are not all Yes. They are recorded in
  `docs/pr-notes.md` under "Expected answers (human-review)", not in the description, so the
  description doesn't give them away.
- `docs/pr-notes.md` ends with its own "For Ernest to look at" section. It lists the judgment
  calls he has to accept for this PR, and which of the five "Where Ernest looks" items apply.

The **human-review** check (`.github/workflows/human-review.yml`, `scripts/human-review.mjs`)
reads both:

| What it finds | Result |
|---|---|
| Either "For Ernest to look at" section is missing, or the expected answers are missing | fail |
| An item with no box ticked, or both | fail: "unanswered" |
| An answer that differs from the expected one | fail, naming the item and asking: is the map wrong, or the expectation? It passes once the map is fixed and the answer changes, or once Ernest adds a line under that item starting `Expected was wrong:` |
| Every item answered and matching | pass |

It runs again whenever the description is edited, so ticking a box re-runs it.

**What it verifies, and what it doesn't.** It verifies that he looked at specific things and saw
what the PR expected. It does **not** verify his judgment, and it can't tell how carefully he
looked. A wrong expectation is a finding too: the PR's author misread the map. On a **private
repo on GitHub's free plan**, a required check can't block the merge button, so there it is a
hard reminder, not a lock.
