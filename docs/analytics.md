# Analytics

For Ernest's case study: how many visitors, what share went past the first screen, how many
categories the average visitor explored. **Umami Cloud, free Hobby plan** (decided 9/24): no
cookies, no personal data, no banner, 100k events a month.

- **The key:** `websiteId` in `src/data/analytics.js` (Umami's public site ID — fine to commit).
  **To turn analytics off, set it to `''`**: nothing loads, nothing is sent, the map is the same.
- **The code:** `src/analytics.js` is the only file that touches `window.umami`; components call
  `track(name, props)`. The tracker is injected after the map's first render with
  `data-auto-track="false"` (we send the pageview ourselves) and `data-domains` = the locked
  map URL's host, so Vercel previews and `npm run dev` never count. `track()` never throws; until
  the script has loaded (offline, blocked) events are dropped — no queue, no retry. The service
  worker never caches or intercepts it. Every Playwright script resolves `cloud.umami.is` to
  nowhere (`scripts/lib/browser.mjs`), so CI never talks to Umami.
- **Where visitors came from: `?s=`.** Read once on load, kept for the visit (and a reload of that
  tab), then removed from the address bar so a shared link doesn't carry it. Any short slug
  (1–20 lowercase letters, digits, dashes) is recorded as written; anything else is `other`.

  | `s=` | Where the link is |
  |---|---|
  | `qr` | the printed handout's QR code (`FESTIVAL.qrUrl`) |
  | `social` | social posts |
  | `email` | the CPNO newsletter / email |
  | `web` | the Squarespace homepage band (Ernest changes that link) |
  | *(none)* | `direct` — typed, bookmarked, or a poster printed before 9/24 |

- **The events.** Categories are the map's own keys (`c` in `pins.js`, the chips' ids); booths
  are `art` or `food`. Nothing personal, no location, no free text; data is flat.

  | Event | When | Properties |
  |---|---|---|
  | `map_open` | once per load, when the tracker loads | `source`, `viewport` (`phone` / `desktop` = docked panel) |
  | `pin_open` | a detail sheet opens: pin, booth, area marker or directory row | `category`, `pin_id` (`d`, `d-2` where pins share a card, `kingofpops-C1`, booth id `mcl-057`, area id) |
  | `chip_on` | a filter chip turns on | `category` |
  | `zoom_stop` | the view settles on a new stop | `level` 1–3 |
  | `schedule_open` | a stage sheet (the lineup) opens | `stage` (`stageMain` / `stageAcoustic`) |
  | `visit_summary` | once: `pagehide`, or the first switch away from the tab | `source`, `pins_opened`, `categories_touched`, `categories` (comma list), `max_zoom`, `engaged`, `seconds` |

  `engaged` is "went past the first screen": a pin opened, a chip on, a zoom past the opening
  stop, or a schedule opened — a pan alone doesn't count. `visit_summary` goes with the tracker's
  own keepalive `fetch`, which outlives the page the way `sendBeacon` does. On a phone the
  first switch away usually ends the visit, so that is when it is sent; anything after it is
  in the other events but not in the summary.
