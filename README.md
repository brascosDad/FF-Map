# Fall Fest Map

Interactive, phone-first "you are here" map for Candler Park Fall Fest (Oct 3–4, 2026).
This is Tier 2 of the build plan (`buildplan.pdf` in the FF map project) — the real
React + Vite foundation on the canonical Figma basemap, with a formal design system
(`design-system.html`) behind it and real data where it exists. No GPS: live location
was cut for time, so the map is "find it", not "you are here".

Live site: https://fall-fest-map-ernest-sons-projects.vercel.app

## Getting started

```bash
npm install
npm run dev       # local dev server
npm run build     # production build -> dist/
npm run preview   # serve the production build locally
```

## What's real vs. placeholder

- **Stage schedule** (`src/data/stages.json`) — the confirmed 2026 Main Stage +
  Acoustic Stage lineup, pulled from the committee's "Schedule is Complete!" thread.
  Real data, ready to ship, except Saturday's 10:30–11:30 Main Stage opener (still
  unconfirmed — flagged in the JSON).
- **Vendor / food-truck list** (`src/data/vendors.json`) — the 2026 list hasn't
  arrived yet, so this is last year's (2025) roster as a structural placeholder.
  Swap the `vendors` array once the real list comes in; the UI needs no other changes.
- **Pin positions & basemap** (`src/assets/pins.js`, `src/assets/basemapTrace.js`,
  `src/assets/basemapCoords.js`) — real, extracted from the canonical Figma export
  `fall-fest-desktop-map-wireframe.svg`. The basemap is that file's
  "static map elements" group; the pins and booth ticks are the marker positions
  from its "festival elements (z=2)" group, so the coordinate space is the export's
  own **1440×900** canvas (it was 340×460 while the map came from the mobile
  prototype). The Bike Valet pin is no longer a cross-referenced guess — it is the
  export's own circle, recolored from its placeholder red to the utility neutral.
  What is *not* yet settled is the illustrated art that will sit under these
  coordinates; the pin/zoom system doesn't care what the art looks like, only that
  it stays on this viewBox.
- **Brice font** — not included (proprietary .otf files aren't in this session).
  See `src/assets/fonts/README.md` for the two-step drop-in.
- **Discrete zoom levels** (`src/hooks/useMapView.js`) — 3 stops, not 4:
  Overview / Market / Booths, as the `LEVEL_RATIOS` array. Four made two of the
  levels near-indistinguishable. Edit that array to try a different count.
- **Area blobs** (`src/assets/basemapBlobs.js`) — the shapes that stand in for
  individual booths at the furthest-out zoom. Hand-drawn in Figma as layers named
  `blob-*` and extracted by `python3 scripts/extract-blobs.py`, which reads
  `design/basemap.svg` and rewrites the JS. Don't hand-edit the JS: change the
  shape in Figma, re-export, re-run the script, commit both.
  (`scripts/build-blobs.py`, the old distance-field generator, is kept for
  reference only.)
- **GPS / live location** — cut. The third zoom-stack button is a reset-to-overview,
  not a locate. The geolocation layer is a later tier if it ever happens; the
  permission-prompt copy is drafted in `geolocation-privacy-copy.md` in the project.

## Still open

- **Squarespace integration.** If the answer comes back as "embed," point an Embed
  Block / code injection at the Vercel URL. If it comes back as "replace," that's a
  different path — worth a fresh look once the tier is known.
- **Booth counts.** Candler Park Dr draws 74 squares against a stated 76, and the
  in-park market 62 against 69. McLendon matches exactly at 27.
- **Scale bar.** Defined in the design system, not shipped: the artboard is a
  stylised trace with no surveyed dimension on it, so there's nothing honest to
  derive a distance from yet.

## Structure

```
src/
  data/          JSON: stages, vendors, zones — the content layer
  assets/        basemap SVG trace, pin coordinates, icon paths, brand colors
  hooks/         useMapView.js — discrete zoom + pan state machine
  components/    MapCanvas, DetailSheet, FilterChips, ZoomControls, Icon
  styles/        tokens.css (primitives -> semantic -> component), components.css,
                 map.css, fonts.css
scripts/         e2e.mjs (157 assertions), shot.mjs (screenshots),
                 extract-blobs.py
design-system.html   the style guide, built from the real token/component files
TESTING.md           the manual protocol
```

## Updating the map from Figma

Edit the frame `fall-fest-desktop-map-trace-090526` in Figma, then GitHub →
Actions → **Sync from Figma** → Run workflow (pick this branch). It pulls the
frame via the Figma API (`scripts/pull-figma.mjs`, secret `FIGMA_TOKEN`), re-runs
`extract-blobs.py`, and opens a PR with a Vercel preview.

`design/basemap.svg` is now a generated snapshot — don't export it by hand or
edit it. Keep the `blob-*` layer names, keep `UI-elements` hidden, and don't
duplicate or replace the frame (it's found by node id `5906:4939`).

## Offline

The map works with no signal. Candler Park in October puts ten thousand people
on a few cell towers, so the map has to open for someone standing at the gate
with one bar and keep working once they are inside.

A service worker (`dist/sw.js`, generated by `scripts/build-sw.mjs` after every
build) precaches the whole map — shell, fonts, icons, basemap — about 345KB. The
page itself is network-first with a 2.5s timeout so a new deploy is still picked
up; everything else is content-hashed, so it is served straight from the cache.

`public/manifest.webmanifest` makes it installable, so it can live on a home
screen like an app.

Two things worth knowing if you touch this:

- **The precache list is generated, never hand-written.** Vite hashes filenames;
  a hand-kept list goes stale silently, and a stale precache is worse than none.
- **`ignoreVary: true` on the cache lookups is load-bearing.** The server sends
  `Vary: Origin` on everything, and Vite marks module scripts `crossorigin`, so
  without it every JS and CSS file misses the cache — the shell loads offline and
  the app never boots. A blank green screen with nothing in the console but
  "failed to fetch". The e2e suite opens the map offline in a fresh tab
  specifically to catch that.

## Checks

```bash
npm run lint       # oxlint
npm run test:e2e   # builds, serves, runs the Playwright pass
npm run shots      # four viewports to shots/ — the map is a visual thing
```

The suite includes a real offline pass: it warms the service worker, cuts the
network, opens a fresh tab, and checks the map draws and still responds.

```bash
python3 scripts/build-icon.py && node scripts/build-icon.mjs   # rebuild the icons
```
