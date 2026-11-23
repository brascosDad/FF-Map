# PR notes: ship WhatsOnNow, add ArtistGallery, and a `?demo` link (for the case-study Loom)

Ernest asked (11/13) for the live map to match the case-study Loom. Search is **not** in this PR: it
is the next feature, and "No search bar" in CLAUDE.md stands until he changes it.

1. **WhatsOnNow ships** (`FESTIVAL.showNow: true`). It was built and tested in #17, behind the flag.
   It shows only during set times on the festival days, so **on the live map today nothing
   changes**: open a stage and the sheet looks the same as before. The name stays **WhatsOnNow**
   (the request said "Now Playing card"; the Names table lists "now playing" as what it is *not*
   called, so it was not renamed).
2. **`?demo` link** (`src/demo.js`, new). `https://fall-fest-map.vercel.app/?demo` treats now as
   **Saturday 10/3, 2:20 PM** festival time: Run Katie Run is on the Main Stage, Veronika Jackson on
   the Acoustic. `?demo=2026-10-04T13:00` picks any festival-local time. The clock runs forward
   from there. Regular visitors never see any of this.
3. **ArtistGallery** (new component; Ernest approved the name 11/13). Photos of an artist's work
   under the artist's name in a booth sheet, three square tiles across, scrolling sideways when there
   are more. Photos come only from `src/data/artist-photos.json` (each with `src`, `alt` and
   `permission`), files in `public/artist-photos/`. **The file has no photos yet**: no artist has
   given permission. A booth with no photos draws **nothing**, so every sheet looks complete.
   Placeholder tiles (sand fill, art glyph) appear **only on a `?demo` link**.
4. **Data fix, `stages.json`:** Saturday's 3:00 Main Stage act still read "Mystery artist — revealed
   9/26"; the file's own note said to swap in **Asydequest** on 9/26 and drop the note. Done. This
   is the "Up next" line in the demo.

**Design system 1.9.0:** Names rows for WhatsOnNow (now shipped) and ArtistGallery; WhatsOnNow moved
from §4 ("defined but not shipped") to a §3 card; new ArtistGallery card; manifest entry
(`notCalled`: photo strip, booth photos, carousel); CHANGELOG. **No new token:** the gallery uses
`--space-2`, `--space-3`, `--radius-sm`, `--surface-pressed`, `--border-subtle`, `--text-muted`.

Checked by Claude (not asked of Ernest, per rule 8):

- `npm run manifest` is current; `npm run test:ds` 44/44; `npm run lint` clean;
  `npm run ds -- check` on the new CSS: no raw values, no unknown tokens.
- e2e: new checks. During a set the stage sheet shows the card; on 11/13 it shows none; `?demo`
  shows it; a booth with no photos draws no gallery; `?demo` shows three placeholder tiles; every
  photo in the data file has `src`, `alt` and `permission`. Result is below, under "e2e".
- The standard visual baselines (the phone at open, the phone with a sheet open, print) render on
  CI's real date, outside the festival, so they should not change.

## Questions, skipped items, nudges

- **Not done: the Nov 9 naming-approval rule change.** It isn't on GitHub (no branch, no PR, `main`
  unchanged since 10/21), so it is probably uncommitted on Ernest's Mac, which this session couldn't
  reach. It goes in its own PR as soon as the Mac is connected.
- **Skipped: tap to enlarge a photo.** The gallery shows tiles only. Worth adding once real photos
  exist.
- **Analytics:** a `?demo` visit counts as a visit in Umami like any other. A Loom recording adds a
  handful of visits; not filtered.
- No pin nudges. No print changes.

## e2e

`npm run test:e2e` locally: **956/956 passed**, the visual diffs included (no baseline changed).

Pictures at 390px from this branch, the clock set to 11/13 (the demo link supplies festival time):
`docs/demo/loom-stage-demo-390.png` (Main Stage, `?demo`), `docs/demo/loom-booth-demo-390.png`
(Booth 1, `?demo`, placeholders), `docs/demo/loom-booth-plain-390.png` (Booth 1, plain link: no
gallery, same as `main`).

## For Ernest to look at

Tick one box per item (click the box on GitHub; the human-review check re-runs).

1. **The demo on your phone:** open the Vercel preview with `?demo` on the end, tap the Main Stage
   pin. Does the card at the top read right ("Now · Run Katie Run", "Up next · Asydequest")?
2. **The gallery on your phone:** on the same `?demo` link, open any art booth (an art-market marker,
   then a row). Do the three placeholder tiles under the artist's name look like they belong in the
   sheet?
3. **Without `?demo`:** open the same booth on the plain preview link. Does the sheet look complete,
   with no gap where the gallery would be?

## Expected answers (human-review)

1. Yes
2. Yes
3. Yes
