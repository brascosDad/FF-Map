# FF-Map — read this first

The interactive map for **Candler Park Fall Fest, Sat–Sun Oct 3–4, 2026, 11 AM–7 PM**.
React + Vite, deployed by Vercel on push to `main`. Live at https://fall-fest-map.vercel.app
(URL is locked — every printed QR points at it).

Tier 2 scope: tap pins, filter, stage lineups, offline after first load. **No GPS / "you are
here"** — cut deliberately, don't reopen it.

This file is the handoff surface between the two agents working on this project. Keep it current;
if you learn something a future session would have to rediscover, write it here. **When a PR
resolves an item under "Open", update this file in the same PR.**

## Who does what

Two Claude sessions work on this repo, plus Ernest.

| | Owns |
|---|---|
| **Claude Code** (this session) | everything under `src/`, `scripts/`, `public/`, build config, tests, PRs |
| **Claude (Cowork)** | `CLAUDE.md`, `src/data/*` inputs, `design/` sources, the printed poster, committee email, research |
| **Ernest** | merges, Figma, account settings (Vercel, Squarespace), all committee decisions |

Cowork can read this repo but **cannot push**. It reaches the repo through Ernest, or by writing
into his local clone at `~/Projects/FF-Map` when that folder is connected to its session. So if a
data file changed underneath you, that's why.

**Don't restructure, rename, or refactor beyond the task asked.** We are weeks from a festival.

## Two standing requirements — every PR, not just the one that asks

**1. Build with components and reference the design system on every move.** Tokens live in
`src/styles/tokens.css`, documented in `design-system.html`. No ad-hoc colors, spacing, or type
sizes. If the value you need doesn't exist as a token, **add the token and document it** rather
than hardcoding past it — the design system is meant to grow alongside the build, in real time,
not be reverse-documented afterward.

**2. The data layer has to be clean and scalable, even though the dataset is small.** The test:
a volunteer picking this up next year opens the repo and can see immediately what to change. One
clearly named source of truth per kind of thing, a documented shape for each record, no duplicate
copies of the same fact in two files. Propose structural changes before making them.

## Data — where the truth actually lives

Upstream sources are other people's documents. They move. Re-read them rather than trusting a
snapshot, and record the read date when you do.

| Data | Source of truth | Owner |
|---|---|---|
| Artist booths + numbering | the `sheet_url` in `src/data/booth-numbering-2026.json` | Courtney Weil |
| Food vendors | `vendors.json`; 2026 names and descriptions are final, **stall assignments are not** | Todd Tharp |
| Stage schedule | `stages.json` — final, both stages both days | Thomas Helland / Hallie Meushaw |
| Site layout / amenity placement | 2026 site plan PDF (Operations) | Jess Richards / Van Jensen |

Artist numbering, **as of the 9/18 sheet read: 1–54 park, 55–81 McLendon, 82–139 Candler Park Dr,
K0–K10 Kidlandia.** The top number moves every time Courtney edits — it was 142 on 9/17 and 139
on 9/18, because she inserted 112–114 and renumbered everything after them down by three. Never
quote a top number from memory: `poster_endpoints` in `booth-numbering-2026.json` is the current
one, with `read_date` beside it. Not 164 in any case — every booth was resized to 15 ft on 9/16.

Courtney's answers, 9/17 evening (supersede anything earlier, including PR #7's description):
- **112–114 are real booths.** Their absence was her mistake; numbering runs continuously. They are
  *not* a speed-bump gap. (Done in the sheet by 9/18: 112 Jae Montano, 113 Salameh Ghaderi, 114
  Janet Gonzales.)
- 67–68 (Tarik Berbey) and 130–131 (Michael Taylor, was 132–133 before the renumber) are the two
  double booths.
- Some sponsor/open slots were filled 9/17. Anything still marked Sponsor/open prints as "Sponsor".
  As of 9/18 that is the last two, 138–139.
- 132–139 (was 135–142) is a real last run at the far end of Candler Park Dr, numbered last on
  purpose so booths can be added or dropped there. The build reads that run's endpoints from the
  sheet, so a booth added there needs no code change.
- AWARE Wildlife (on the grass) and Achieve with Steve (beside the Acoustic Stage) have spots but
  no booth numbers — pinned unnumbered, placed by description (see `UNNUMBERED_AT`).
- Public copy says **"over 130 artists"**. Never 164, never a booth count.
- Kidlandia grew to **K0–K10** on the sheet by 9/18 (K8 Clifton Sanctuary is new; Primavera and
  Faces Unlimited moved to K9 and K10).

**Re-read the sheet before print files go out.** Courtney has edited it four times in four days.
Two commands, no hand edits:
`python3 scripts/pull-sheet.py && python3 scripts/build-booths.py` — the first rewrites the JSON
from the live sheet (or from a CSV path you give it) and stamps the read date; the second lays it
on the map and refuses to write if anything on the sheet is unplaced.

## Generated files — never hand-edit

- `src/assets/basemapBlobs.js`, `design/basemap.svg` — shape changes happen in **Figma**, then the
  "Sync from Figma" Action regenerates them. The frame is found by node id `5906:4939`; don't
  duplicate or replace it.
- `src/data/booth-numbering-2026.json` — generated by `scripts/pull-sheet.py` from Courtney's sheet.
  If the sheet is wrong, tell Courtney; the one deliberate correction (booth 39's columns are
  swapped on her sheet) lives in the script as `NAME_BUSINESS_SWAPPED`.
- `src/data/booths.js` — generated by `scripts/build-booths.py` from `basemapCoords.js` (where) and
  `booth-numbering-2026.json` (what). Edit the inputs and re-run. The two unnumbered artists'
  positions are the script's `UNNUMBERED_AT` table.

## Commands

```
npm run dev        # local
npm run lint       # oxlint
npm run test:e2e   # required green before any PR (builds first, service worker included)
npm run print      # writes the 11x17 print PDF + 300dpi PNG
npm run sync       # git pull --ff-only && npm install
python3 scripts/pull-sheet.py && python3 scripts/build-booths.py   # re-read Courtney's sheet
```

Every PR: lint and e2e pass, and reply with the PR link **and** the Vercel preview URL.

## Decided — don't reopen

- No GPS, no "you are here."
- Three zoom stops, not four.
- Tap a pin to open it; double-tap elsewhere to zoom. Booth sheets stay open on zoom-out. Dimmed
  pins stay tappable. Desktop directory rows fly the map in one level.
- Reset control is arrows-to-corners, not a locate button.
- No search bar.
- **Pins are touch targets. 44×44 CSS px is the floor.** The visible icon glyph may shrink inside
  that target; the tappable area may not. Resolve collisions by moving pins. Circles may touch;
  they may not overlap. The e2e suite now asserts this for the phone's opening view on a 375px
  screen — a pin flagged `overview: true` in `pins.js` has to clear every other one.
- Pinch zoom follows the fingers and settles on the nearest of the three stops when they lift.
  Still three stops; the pinch is just a nicer way between them.
- **Pins hold one on-screen size at every zoom, through a pinch and through the settle.** Only the
  map scales. The overview no longer draws pins a step smaller (the 34px `--pin-size-overview`
  token is gone): that step popped every pin to a new size the moment the fingers lifted
  (Ernest, iPhone, 9/19). e2e drives a real two-finger touch and measures a pin every frame.
- **Kidlandia booths are one vertical column inside the Kidlandia shape, lowest number at the
  south end**, in `--pin-kids` (Ernest 9/19, per Jess's 2026 site plan and the 2025 map). The
  count is the sheet's.
- **A spot with no booth number draws hollow**: `--ff-cream` inside a `--cat-booth` frame, on the
  map and on paper, keyed in both legends. Still a booth; plainly not one of the numbered run.
- **The printed handout is single-sided, map-dominant, no stage schedule** (decided 9/17, Erin
  agreed 9/17). The QR code is a prominent feature with its own callout pointing at the schedule,
  food menus, and artist list.
- Exact food-truck placement is not needed — trucks cluster and shift at load-in (Amy, 9/17).
- The map URL is locked once posters print (~9/22). No hosting or routing changes after that.

## Calendar

| Date | What |
|---|---|
| Fri 9/18 | Fall Ball — no map work tonight |
| Sun 9/20 | committee beta feedback closes; 7 PM call |
| **Tue 9/22** | print files to the printer — hard |
| Wed 9/23 | fix round 2 |
| Sat 9/26 | reveal the hidden Saturday Main Stage artist (one-line JSON change) |
| **Sun 9/27** | content lock |
| **Mon 9/28** | code freeze — show-stoppers only |
| Fri 10/2 | setup: check pins against the grounds, hang posters |
| Sat–Sun 10/3–4 | festival. Hot fixes straight to `main` |

## Open, as of 2026-09-18 evening

Shipped 9/18: PR #7 (2026 artist assignments + `/?print=1` 11×17 print sheet), PR #2 (Sync from
Figma workflow), and PR #8 (booth + beta fixes):
- Sheet re-pulled 9/18 via the new `scripts/pull-sheet.py`; 112–114 are booths, no park-side gap;
  Sponsor/open rows read "Sponsor". **The renumber moved the top number to 139 and Kidlandia to
  K0–K10 — the poster's endpoints must be re-read from the JSON before 9/22, not copied from
  this file's history.**
- Merch booth: own pin, category, glyph (Phosphor t-shirt) and token `--pin-merch`, at the McLendon
  entrance; in the directory, legend and design system.
- Pinch zoom is continuous and snaps to a stop on release.
- Phone opening state shows bike valet (Phosphor bicycle on `--cat-utility`), the beer stand and
  merch alongside the four destinations. The McLendon art-market marker moved east and the beer
  stand pin 25 units WNW to keep every 44px target clear; nothing shrank.
- `<title>` is "Fall Fest – October 3rd and 4th 2026".
- Pumpkin smashing + Trees for Tuition is one line. AWARE Wildlife and Achieve with Steve are
  unnumbered squares with their own sheets; Achieve with Steve is named under the Acoustic Stage.
- Print/poster copy says "over 130 artists"; every run endpoint on the print sheet is read from
  the data.
- 9/19 review round (each its own commit): pins hold one on-screen size through a pinch and its
  settle; Kidlandia booths are one column inside the area, south to north, in the Kidlandia
  colour; merch and the info booth sit on the east side of the entrance path per Jess's 2026 site
  plan, info stacked directly north of merch; AWARE Wildlife and Achieve with Steve draw as
  hollow squares. The info booth has always drawn as a pin in `--pin-info`; e2e now asserts it on
  phone, desktop and paper.

**Placed by description in that PR — confirm before print / at setup, don't leave to chance:**
- The **beer stand** pin is the Figma export's main-lawn beverage marker, chosen because Todd puts
  Mr Softee "to the right of the beer stand" on the field. Confirm that is the main stand (Jess).
- **Merch and the info booth** are now from Jess's 2026 site plan (the CPNO Merch Tent): east side
  of the entrance path where it meets McLendon, info stacked directly north of merch (Ernest,
  9/19). Their 44px targets touch at the first zoom step and merch's clears the bike valet's at
  the overview by under 2 units, so neither can move closer to the corner without moving the
  bike valet.
- The **southern water station** pin is 5 units off the export's spot (4 west, 1 south) so its
  target clears the info booth's. Falls under the water-station question below.
- The **Kidlandia column** sits along the east side of the Kidlandia shape, K0 at the south end.
  Verify at setup.
- **AWARE Wildlife** square: on the grass off the south end of the park's west row. **Achieve with
  Steve** square: one McLendon pitch east of booth 55. Both approximate.

**Not in this repo:** the **Food & Friendship tent** (Jess 9/17: remove it) does not exist in the
app's data or basemap — nothing to delete here. It is on the printed poster / Figma artwork, which
is Cowork's and Ernest's to fix.

**Waiting on people (don't guess):**
- Park west row split (29–37 north / 38–54 south of the path bend) — unverified, asking Courtney.
- Kidlandia booth count — the sheet says K0–K10 (11) as of 9/18; Ernest is asking Courtney whether
  it is 10 or 11. The column is built from the sheet, so no code change either way.
- Hours for Kidlandia bounce houses, bike valet, artist market (Amy asked for them on the map).
- Restrooms on Candler Park Dr (end of booths) and on the field; more water stations; Callaway
  Blue water and some sponsor locations moved in the 2026 site plan — confirming with Jess / Andy.
- King of Pops — Todd has asked them; answer before Mon 9/21.

**Before the 9/28 freeze:**
- **Analytics.** Ernest wants to know how many people use the map and how deep they go: sessions,
  which categories get tapped, which pins get opened, how many reach the stage schedule.
  Lightweight and privacy-respecting — no personal data, no cookie banner — and it has to survive
  the offline service worker. Vercel Web Analytics is already on the deployment and is the obvious
  first candidate. Propose the event list before wiring it; keep event names readable for next
  year's volunteer. Analytics added after the festival measures nothing.

**Outside this repo:** iPhone header bug on the Squarespace site (nav unreachable on a phone),
reported to Will 9/13, no reply. Until fixed, the homepage band is the only phone route to the map.

## After the festival

Write the "how to update this next year" guide. If it's hard to write, the data structure is wrong —
design the two together.
