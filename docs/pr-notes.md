# PR notes: 9/24, analytics + tagged QR + booth 57

One commit per item, in the order below. Nothing here blocks the merge.

## 1. `?s=` source tag, and the QR carries `?s=qr`

- `FESTIVAL.mapUrl` is unchanged (locked). New `FESTIVAL.qrUrl = 'https://fall-fest-map.vercel.app/?s=qr'`,
  used by `MapQr()`; `data-url` matches.
- **The QR still scans.** The longer URL is still QR version 3, 29 modules, error correction M, so the
  module size on paper is unchanged. Decoded (OpenCV) from the 300 dpi render of `npm run print`,
  and again after shrinking the crop to 150, 100, 72 and 60 dpi: every one reads
  `https://fall-fest-map.vercel.app/?s=qr`. Nothing from `print/` is committed (it is gitignored).
- `?s=` is read once in `main.jsx` before the first render, kept for the visit, and removed with
  `history.replaceState`. `?print=1` and the hash are left alone (e2e checks `?print=1&s=qr#x` →
  `?print=1#x`).
- **Changed on your 9/24 message:** any short slug is recorded as written, so `?s=email` works with no
  code change. The rule: 1–20 characters, lowercase letters, digits or dashes (the value is lowercased
  first). Anything else is recorded as `other`, never as the raw text, because anyone can type into a URL.
- **Not in the brief:** the tag is also kept in `sessionStorage`, so reloading the same tab after the
  address is cleaned still counts as `qr`. If storage is blocked, the reload counts as `direct`.
- **Offline:** the service worker already answered every navigation (any query) with the cached
  shell, so `/?s=qr` needed no worker change. The comments now say so, and say that other origins
  (Umami) are never cached or intercepted. e2e opens `/?s=qr` in a fresh tab with no network.

## 2. Analytics module (Umami Cloud, Hobby)

- `src/data/analytics.js`: `websiteId` (Ernest's, committed), `src`, and `domains`, which is taken from
  `FESTIVAL.mapUrl`'s host rather than typed a second time. **Empty `websiteId` = off.**
- `src/analytics.js` is the only file that touches `window.umami`. It injects the script after the
  first render (a `setTimeout` inside App's mount effect). Attributes: `data-website-id`,
  `data-domains="fall-fest-map.vercel.app"`, `data-auto-track="false"`, and
  **`data-exclude-search="true"` (not in the brief; a privacy belt, since `?s=` is already gone by
  the time anything is sent).** It sends the pageview (`umami.track()` with no arguments) and then
  `map_open` when the script loads.
- **Attribute names:** checked against Umami's docs through web search, because this container
  can't reach umami.is, docs.umami.is or the CDNs (egress blocked). `data-auto-track="false"`
  turns off every automatic feature (pageviews, clicks, path changes, performance), which is what
  we want. Umami's docs point out `data-auto-pageview="false"` as the lighter switch that keeps
  performance tracking; we don't want performance tracking, so it's `auto-track`.
- **`visit_summary` on unload:** Umami's tracker sends with `fetch(…, { keepalive: true })` to
  `/api/send` (it moved off `sendBeacon` to get past ad blockers, Umami PR #1163). A keepalive request
  outlives the page the same way a beacon does, so `umami.track` is used and there is no separate
  `sendBeacon` path. **Not seen live**, because the container can't reach Umami. Check it after the
  merge: in Umami's realtime view, open the live map on a phone, tap a pin, switch apps, and look
  for `visit_summary`.
- `visit_summary` fires **once**: on `pagehide` or on the first `visibilitychange` to hidden, whichever
  comes first. iOS rarely fires `pagehide` after an app switch, so the first hide is the reliable
  moment. If the visitor comes back, what they do after that is in the other events but not in
  the summary.
- The service worker returns early for every other origin, so it never touches Umami.
- `scripts/lib/browser.mjs` resolves `cloud.umami.is` to nowhere for every Playwright script (e2e,
  visual, print, pr-shots). No test or render ever reaches Umami; the whole suite runs the way a
  visitor with a content blocker would see it.

## 3. Events, as wired

| Event | Fired from | Notes |
|---|---|---|
| `map_open` | script `onload` | `viewport`: `desktop` when the side panel is docked (≥1024px), otherwise `phone`, **so tablets count as phone** |
| `pin_open` | pin tap, booth tap, area-marker tap, booth row in an area list, directory row | categories are the map's `c` keys; booths are `art`/`food`; area markers are `art` |
| `chip_on` | chip turned **on** only | |
| `zoom_stop` | `levelIdx` changes | level 1–3. Not sent for the opening stop. A pin tap that zooms in (`revealAt`) counts |
| `schedule_open` | **the Main Stage and Acoustic Stage sheets.** Each stage's sheet is its lineup; there's no separate schedule screen | `stage`: `stageMain` / `stageAcoustic` (the sheet ids). Sent alongside that tap's `pin_open` |
| `visit_summary` | see above | `categories` is sorted, comma-separated |

- **`pin_id`, a proposal and not done:** pins in `pins.js` have no id of their own. For now the id is
  worked out from the pin: the sheet id `d`, plus the cart number (`kingofpops-C1`), or for
  pins that share a sheet, the pin's position among them in file order (`wc-1` … `wc-4`). That
  position shifts if someone reorders or inserts pins in `pins.js`. The fix is an `id` field on
  every pin. That's a data-structure change, so I'm proposing it rather than making it.
- Stepping through booths with ‹ › in a booth sheet isn't a `pin_open`; it's browsing inside one open sheet.

## 4. Booth 57 → Sponsor (your 9/24 message)

- Read the sheet **9/24 through the Google Drive connector** (CSV export, same file the script fetches),
  then ran `pull-sheet.py <csv>` and `build-booths.py`. No hand edits.
- **Diff against the 9/21 read: one row changed.** 57 (McLendon) was Ashley Flack / Flack Injury Law and
  now reads `Sponsor, Sponsor`. The top number is still 139 and Kidlandia is still K0–K10.
- Courtney put "Sponsor" in **both** columns. The parser only recognised a sponsor booth when the
  business column was blank, so it would have listed an artist named "Sponsor". It now treats
  "Sponsor" in the business column the same way.
- Phone: the McLendon list shows `57 Sponsor`, and the booth sheet says "Sponsor booth."
  Print index: sponsor booths used to be left out. They are now listed as **"Sponsor"** with their
  number, so 57 on the map points at a row. Still 155 index rows (one artist out, one sponsor in),
  so the index fits as before.
- **Skipped:** a sponsor booth's card footer still says "Artist from the 2026 list; position from the
  official map". That was already true for any sponsor booth before today. It's a wording question,
  so I left it alone.

## 5. Tests

`npm run test:e2e`: **342/342 pass** locally. New checks: `?s=qr` online, and from the offline cache in a
fresh tab, with the address bar clean both times; the website ID emptied inside the built bundle
(the same code with the one value a volunteer would clear), with **no request to cloud.umami.is**,
no script tag, and the map working; Umami blocked, with the map drawing, a pin opening, a chip
turning on and no page errors; every event and property checked against a stand-in tracker; a
visit that only pans reports `direct` and not engaged. The offline "nothing failed to load" check
now skips `cloud.umami.is`, which is supposed to fail there.

## Visual baselines: **print will go red, as expected**

- **print:** the QR changed (new URL) and the index moved rows around (Flack Injury Law left the F's,
  Sponsor joined the S's). Compared to `main` 542dc9b rendered on this same machine, the diff sits only
  in the QR box and the index columns. **Needs the `update-visual-baselines` label.**
- **phone-open, sheet-open:** **0 pixels differ from `main`** on this machine. Analytics draws nothing.
  CI's local diff against the runner's baselines is only how this machine draws text.

## For Ernest

1. After merging, **rebuild the handout PDF (`npm run print`) and re-send it to Jess.** The old QR still
   works but counts as `direct`, not `qr`.
2. In Umami's site settings, the site's domain should be `fall-fest-map.vercel.app` (the same host as
   `data-domains`).
3. The Squarespace band link: add `?s=web` when you're ready. The CPNO newsletter: `?s=email`.
   Social posts: `?s=social`.
4. Proposal above: an explicit `id` on each pin in `pins.js`, so `pin_id` stays stable next year.
