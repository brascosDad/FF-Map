# Fall Fest Map

Interactive, phone-first "you are here" map for Candler Park Fall Fest (Oct 4–5, 2026).
This is Phase 1 of the build plan (`buildplan.pdf` in the FF map project) — the real
React + Vite foundation, with the mobile prototype's map/zoom logic ported into
production components and wired to real data where it exists.

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
  `src/assets/basemapCoords.js`) — carried over exactly from the locked mobile
  prototype (`fall-fest-mobile-wireframe.html` / `fall-fest-zoom-level-test.html` in
  the project), which traces the 2025 official site map. Replace with the real
  illustrated basemap SVG (Phase 2, in Figma) when it's ready — the pin/zoom system
  doesn't care what the underlying art looks like, only the viewBox coordinate space.
  One exception: the **Bike Valet** pin (`src/assets/pins.js`) is a rough
  cross-reference from the red placeholder circle in
  `fall-fest-desktop-map-wireframe.svg`, not a locked-prototype coordinate — nudge it
  once the real basemap lands.
- **Brice font** — not included (proprietary .otf files aren't in this session).
  See `src/assets/fonts/README.md` for the two-step drop-in.
- **Discrete zoom levels** (`src/hooks/useMapView.js`) — currently 4 stops
  (Overview/Zone/Detail/Booth level). This came out of hands-on testing in
  `fall-fest-zoom-level-test.html`; edit the `LEVELS` array to try a different count.
- **GPS / live location** — the locate button toggles a demo dot only. The real
  geolocation layer is Phase 4 of the build plan (not started); the permission-prompt
  copy for it is already drafted in `geolocation-privacy-copy.md` in the project.

## Not done yet (needs your GitHub/Vercel accounts)

This was built without push access to a repo or a deploy target. To go live:

1. `git init && git add -A && git commit -m "Phase 1: React + Vite foundation"`
2. Create a GitHub repo (ideally under CPNO's account per the build plan) and push:
   `git remote add origin <repo-url> && git push -u origin main`
3. Import the repo at vercel.com → New Project → it auto-detects Vite, no config
   needed → Deploy. Every push to `main` auto-deploys after that.
4. If the Squarespace answer comes back as "embed," point an Embed Block / code
   injection at the Vercel URL. If it comes back as "replace," that's a different
   integration path — worth a fresh look once the tier is known.

## Structure

```
src/
  data/          JSON: stages, vendors, zones — the content layer
  assets/        basemap SVG trace, pin coordinates, icon paths, brand colors
  hooks/         useMapView.js — discrete zoom + pan state machine
  components/    MapCanvas, DetailSheet, FilterChips, ZoomControls, Icon
  styles/        tokens.css (color-tokens.md, mirrored), map.css, fonts.css
```
