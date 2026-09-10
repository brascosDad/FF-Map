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
- [ ] **Double-click directly on a pin** — does it open the sheet *and* zoom? **?**
      I think zoom-only is right, but it currently may do both.
- [ ] **Scroll wheel / trackpad pinch** over the map steps the zoom.
- [ ] Zoom into a corner, then zoom out — you should not end up off in blank
      space; the view re-centres.

---

## 2. Blobs (the part you flagged)

- [ ] **Candler Park Dr blob sits inside the street.** It should not touch grass
      on either side. It's clipped to the 28-unit street band, so this is
      enforced, but eyeball it.
- [ ] **McLendon is two blobs**, with a gap where Mell Ave meets it. It should
      not draw across the intersection.
- [ ] **Art market (in the park) is three pieces, not one.** Two long ribbons
      flanking the car path, plus a short one at the north end of the west row.
      That break is real — there's a genuine ~58-unit gap in the booth row
      there. **?** If that gap is an entrance, three shapes is right. If the
      booths are actually continuous, the source map is wrong and I should
      bridge it.
- [ ] **Every blob contains every square.** Switch between 1/3 and 2/3 a few
      times and watch whether any square pops out beyond where the blob was.
- [ ] Food court blob hugs the trucks and doesn't reach the pool or the path.

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

### Tap edge cases

- [ ] **Drag starting on a pin and release.** Should pan the map and *not* open
      the sheet. This is the one I'd most expect to be flaky.
- [ ] **Drag starting on a booth square** — same.
- [ ] **Tap a pin, then tap a different pin** — sheet swaps content, doesn't
      stack or flicker.
- [ ] **Tap a booth square at 3/3, then zoom out to 1/3** while the sheet is
      open. The square no longer exists at that level. **?** Right now the sheet
      stays open. Should it close?
- [ ] Booth squares are tiny — check you can actually hit one with a **finger**
      (or narrow window + touch emulation), not just a mouse. There's an
      invisible 18-unit hit area around each.

---

## 4. Filter chips

- [ ] Tap **Restrooms** → restroom pins stay solid, everything else dims, and
      the map resets to Overview.
- [ ] Tap **Restrooms** again → everything returns to normal.
- [ ] Tap **Restrooms**, then **Water** → switches cleanly, only one active.
- [ ] With a filter on, tap a **dimmed** pin. **?** It currently still opens.
      Should dimmed pins be tappable at all?
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
- [ ] **Panel at rest** (nothing selected) shows the festival summary, not a
      blank card.
- [ ] Tap the panel's **×** → returns to that resting summary, doesn't leave an
      empty panel.

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

## 8. Cut from scope

- **GPS / "you are here"** was cut for time. The locate button is gone; coral is
  now unused in the app and reserved for "now" in the token file.

## 9. Known open items (don't file these, they're mine)

- Booth numbers at 3/3 overlap slightly on the tightest rows.
- "Main Stage" and "Food Court" labels collide at Overview on narrow screens.
- Zoom pill still says "Overview" on desktop even though that level now shows
  squares — the label and the behaviour have drifted apart.
- Booth counts: Candler Park Dr draws 74 squares against a stated 76, and the
  in-park market 62 against 69. McLendon matches exactly at 27.
