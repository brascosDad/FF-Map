# Fall Fest Map — test pass

## Automated first

```
npm install        # one time — playwright was added as a dev dependency
npm run test:e2e
```

`scripts/e2e.mjs` runs 106 assertions across mobile / tablet / desktop: zoom-level
semantics, pan clamping at every level, tap targets, drag-vs-tap, filters, panel
geometry, and a check that nothing renders "undefined". It exits non-zero on
failure, and drops screenshots in `.e2e-out/`.

It cannot judge whether the map LOOKS right, and it deliberately does not assert
on the cases marked **?** below — those are design decisions, not bugs.

## Then by hand

Run in `npm run dev`. Where a case says **BUG**, it's a known open issue, not
something you need to find. Where it says **?**, I genuinely don't know what the
right behaviour is and want your call.

Resize by dragging the window edge rather than using device emulation where you
can — emulation reloads, and some of the interesting cases are about what
happens *without* a reload.

---

## 0. Setup

- [ ] `git log --oneline -1` shows the latest commit on `claude/fallfest-map-commit-0l2v4y`
- [ ] Zoom pill reads **`Overview · 1/3`** (if it says 1/4, you're on old code)
- [ ] A **Surround colour** panel sits bottom-left. It is dev-only and will not
      appear in a production build.

---

## 1. The three zoom levels

Mobile width (narrow window, under 768px).

- [ ] **1/3 Overview** — no individual squares anywhere. Art market and food
      court are smooth blobs.
- [ ] **2/3 Booths** — blobs vanish, individual squares appear. No numbers.
- [ ] **3/3 Detail** — squares plus booth numbers.
- [ ] `−` from 1/3 does nothing and the button looks disabled.
- [ ] `+` from 3/3 does nothing and the button looks disabled.
- [ ] Zoom in to 3/3, then press the **back arrow** (top left) — returns to 1/3
      *and* recentres on the whole festival.

### Zoom edge cases

- [ ] **Mash `+` five times fast.** There's a 420ms cooldown. You should land on
      3/3 and stay there, not skip a level or get stuck between two.
- [ ] **Double-click the map** — steps in one level.
- [ ] **Double-click at 3/3** — wraps back to Overview (deliberate).
- [ ] **Double-click directly on a pin, booth or area marker** — opens it,
      twice, and does *not* zoom. Decided 9/10: tapping a feature means open it,
      so the view mustn't jump out from under the sheet. Double-tap anywhere
      else on the map still steps the zoom in.
- [ ] **Scroll wheel / trackpad pinch** over the map steps the zoom.
- [ ] Zoom into a corner, then zoom out — you should not end up off in blank
      space; the view re-centres.

---

## 2. Blobs

The blobs are now **hand-drawn in Figma** (layers named `blob-*`), not generated
from the booth positions. `scripts/extract-blobs.py` pulls them out of
`design/basemap.svg` into `src/assets/basemapBlobs.js` — change the shape in
Figma, re-export, re-run the script. Don't hand-edit the JS.

- [ ] **Blobs are area, not outline** — no stroke, and each is its own marker's
      hue at 34%: the food court is the food orange, the three markets the booth
      slate.
- [ ] **Candler Park Dr is one bar**, sitting inside the street. It's still
      clipped to the 28-unit street band, so it can't touch grass, but eyeball it.
- [ ] **McLendon is one bar and runs across Mell Ave.** Deliberate: the market
      is continuous there, and the old two-piece version put a gap in it that
      isn't real.
- [ ] **The in-park market is one ribbon** down the car path, not three pieces.
      Also deliberate — the ~58-unit gap the generated version broke on is booth
      spacing, not an entrance.
- [ ] **Every blob contains every square.** Switch between 1/3 and 2/3 a few
      times and watch whether any square pops out beyond where the blob was.
      Stalls 2 and 3 used to sit past the north tip of the food blob; they were
      nudged ~9 units down the row (9/11) and every stall is now inside.
- [ ] Food court blob hugs the trucks and doesn't reach the pool or the path.

---

## 2b. Booths

- [ ] **Zoom to 3/3 on the car path.** The booth squares are turned 36° so they
      sit square to the path, the way a booth faces the aisle — not square to
      the screen. The numbers stay upright.
- [ ] **The two street markets are NOT turned.** Candler Park Dr and McLendon
      line straight streets, so their squares are already square to them.

---

## 3. Tapping things

- [ ] Tap **Main Stage** → sheet with the schedule.
- [ ] Tap **Acoustic** → sheet with that stage's schedule.
- [ ] Tap **Food Court** pin → list of 15 vendors.
- [ ] Tap **Kidlandia** → activity list.
- [ ] Tap any **restroom / water / drinks / first aid / info / bike valet** pin →
      generic detail.
- [ ] Tap the **art-market circle marker** → area sheet with the booth range.
- [ ] Zoom to 2/3 or 3/3 and tap **an individual booth square** → booth sheet.
- [ ] Tap **a food truck square** at 2/3 → shows a real 2025 vendor name.
- [ ] Tap the **16th food stall** → no vendor name (only 15 in last year's list).
      Should read "Stall 16", not blank or `undefined`.
- [ ] Tap empty map → any open sheet closes.
- [ ] **The sheet only ever moves up.** Tap a pin on a phone and watch the top of
      the screen: the map must stay put while the sheet slides up over it.
      *(Fixed 9/11 — the document could be a toolbar-height taller than the
      window on iOS, so the sheet taking focus scrolled the whole page down.
      Worth a real-device check: it does not reproduce in a desktop emulator.)*
- [ ] **Sheet bullets match what you opened** — Kidlandia's are Kidlandia pink,
      the food court's are food orange. Never one shared teal.
- [ ] **The booth stepper sits above the title**, not below it.

### Tap edge cases

- [ ] **Drag starting on a pin and release.** Should pan the map and *not* open
      the sheet. This is the one I'd most expect to be flaky.
- [ ] **Drag starting on a booth square** — same.
- [ ] **Tap a pin, then tap a different pin** — sheet swaps content, doesn't
      stack or flicker. *(Fixed 9/10: the second tap used to bubble to the map
      background and close the sheet instead of swapping it.)*
- [ ] **Landscape phone (844 × 390): tap Main Stage and Food Court.** They sit
      under the top bar's empty strip. Both should open. *(Fixed 9/10: the bar
      spans the full width and was swallowing taps on the pins beneath it. Only
      its actual controls catch taps now — a pin may be covered by a chip or the
      zoom stack, never by the bare bar around them.)*
- [ ] **Tap a booth square at 3/3, then zoom out to 1/3** while the sheet is
      open. The sheet **stays open**. Decided 9/10: zooming out to get your
      bearings shouldn't throw away what you were reading.
- [ ] Booth squares are tiny — check you can actually hit one with a **finger**
      (or narrow window + touch emulation), not just a mouse. There's an
      invisible 18-unit hit area around each.

---

## 4. Filter chips

- [ ] Tap **Restrooms** → restroom pins stay solid, everything else dims, and
      the map resets to Overview.
- [ ] Tap **Restrooms** again → everything returns to normal.
- [ ] Tap **Restrooms**, then **Water** → switches cleanly, only one active.
- [ ] With a filter on, tap a **dimmed** pin — it opens. Decided 9/10: dimmed
      means "not what you asked for", not "disabled".
- [ ] With a filter on, tap the map background → filter clears.
- [ ] With a filter on, do the **art market blobs dim too**? They should.

---

## 5. Layout breakpoints

Drag the window edge slowly through each threshold.

- [ ] **Under 768px (phone)** — bottom sheet, full width, app capped at 480px
      and centred.
- [ ] **768–1023px (tablet)** — still a bottom sheet, but capped at 560px and
      centred; map runs full width behind it.
- [ ] **1024px+ (desktop)** — 360px panel floating on the right, 20px inset.
- [ ] **Margins match.** The panel's gap to the screen edge should equal the gap
      the zoom buttons and the top-left controls use (20px).
- [ ] **Desktop shows squares at 1/3**, not blobs. Phone and tablet show blobs.
- [ ] **Cross 1024px while sitting at 1/3** and watch the blobs swap to squares
      live, without a reload.
- [ ] **No grey header band** on tablet/desktop. The brand pill and chips float
      directly on the map.
- [ ] **Nothing important hides behind the panel.** The map runs full-bleed under
      it, but the festival should be fitted into the visible part. Check the
      east edge of the park and the Acoustic stage are clear of the panel.
- [ ] **Resize with a sheet open** across 1024px — content should survive the
      switch from sheet to panel, not reset.
- [ ] **Panel at rest** (nothing selected) is a directory: five sections
      (Stages, Eat & drink, Art market, Family, Amenities) over a colour key
      pinned to the footer.
- [ ] **The key never scrolls away.** Scroll the directory to Amenities — the
      header and the key stay put; only the middle moves.
- [ ] **Every row goes somewhere.** Tap Main Stage → the panel swaps to its
      schedule and the pin picks up a navy ring on the map.
- [ ] **Back, not close.** The docked detail has a "‹ All locations" row instead
      of an ×; tapping it returns to the list, not to an empty panel.
- [ ] **A category row rings all of them.** Tap Restrooms → its chip lights up,
      the other pins dim, and both restroom pins are ringed. There is no single
      restroom to fly to, so the map should NOT jump.
- [ ] **Counts match the map.** "4 on the map" next to Beer & drinks should be
      four beer pins, not three.
- [ ] **A single-place row eases the map in a level and centres it** — Main
      Stage, Kidlandia, the info booth, an art-market run. Decided 9/10. The
      motion is a 320ms ease so the eye can follow where it went; grabbing the
      map or scrolling mid-flight cancels it, and reduced-motion snaps instead.
- [ ] **A category row (Restrooms, Beer & drinks, Water) does not move the map.**
      There are several of them, so there is no single point to fly to; it
      filters instead and rings all of them.
- [ ] **"‹ All locations" leaves the map where it is** — it returns you to the
      list, it doesn't undo your navigation.

### Layout edge cases

- [ ] **iPhone SE width (320px)** — chips shouldn't overflow or wrap badly.
- [ ] **Landscape phone (844 × 390)** — now stays a bottom sheet, since docking
      starts at 1024px. Check the 560px-capped sheet doesn't eat the whole
      screen at 390px tall.
- [ ] **Very wide desktop (2560px)** — map shouldn't look absurdly zoomed out,
      panel shouldn't stretch.
- [ ] **Browser zoom to 150%** then resize — layout should still switch cleanly.
- [ ] **Rotate a tablet** portrait → landscape with the map zoomed to 3/3. The
      view should keep roughly the same centre, not jump to a random corner.

---

## 6. Surround colour — resolved, nothing to test

The dev colour picker is gone. It became moot once the map's ground was
extended past every viewport: there is no longer a band to tint. `--ff-surround`
survives in `map.css` for first paint and for the narrow window below 768px
where the app is capped at 480px and centred.

`?dev` on the preview URL still works — it just does nothing at the moment. Keep
the bookmark; if we add another dev-only control it will hang off the same flag.

## 7. Data honesty check

The point here is that nothing invented is presented as real.

- [ ] Food court sheet still carries its "2025 list, placeholder" note.
- [ ] A booth sheet says booths are numbered **in map order**, not by the
      committee's numbers.
- [ ] A food-truck sheet makes clear the name is last year's list pinned to this
      year's stall.
- [ ] No artist names appear anywhere — we have none, and none were invented.

---

## 7b. The masthead

- [ ] **"Fall Fest" sits straight on the map**, no pill, at 56px, with the dates
      a small caption beside it.
- [ ] **It links out to the festival site.** ⚠️ The URL is unverified — this
      session had no outbound access to check it. It's one constant, `FEST_URL`
      at the top of `src/App.jsx`.
- [ ] Legible where it overlaps the map: it carries a soft light halo rather than
      a plate behind it.

---

## 8. Cut from scope

- **GPS / "you are here"** was cut for time. Coral is now unused in the app and
  reserved for "now" in the token file. The third zoom-stack button is a reset,
  not a locate — it wears arrows-out ("show me the whole thing") rather than the
  crosshair, which read as "find my location".

## 9. Known open items (don't file these, they're mine)

- Booth numbers at 3/3 overlap slightly on the tightest rows.
- "Main Stage" and "Food Court" labels collide at Overview on narrow screens.
- Zoom pill still says "Overview" on desktop even though that level now shows
  squares — the label and the behaviour have drifted apart.
- Booth counts: Candler Park Dr draws 74 squares against a stated 76, and the
  in-park market 62 against 69. McLendon matches exactly at 27.
