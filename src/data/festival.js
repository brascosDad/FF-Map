// The festival's own facts, once. Every surface that prints the dates, links
// to the site, or points at the map reads them from here -- the phone header,
// the docked panel, the print sheet and its QR code -- so a date cannot be
// right in one place and stale in another.
//
// `mapUrl` is LOCKED: every printed QR code points at it (see CLAUDE.md), so it
// does not change after the posters print.
export const FESTIVAL = {
  name: 'Candler Park Fall Fest',
  dates: 'October 3–4, 2026',
  siteUrl: 'https://fallfest.candlerpark.org/',
  mapUrl: 'https://fall-fest-map.vercel.app',
  // Booths the festival singles out, by booth number as the market chair
  // speaks of them -- a committee decision, not a fact of the sheet, which
  // is why it lives here and not in booth-numbering-2026.json. A booth on
  // this list draws with a star in its square, on the phone and on paper,
  // and says `title` in its sheet, the area list, both legends and the print
  // index. One this year (Courtney, 9/20: "our featured artist, Madison
  // O'Brien, booth 11"); the list takes any number of them, and a Kidlandia
  // booth would be `booth: 'K3'`. Re-check the numbers after any re-pull:
  // the chair renumbers.
  featured: [
    { booth: 11, title: 'Featured artist' },
  ],
};

/** The featured title of a booth record ("Featured artist"), or undefined.
 *  Art-market booths only: food stalls are numbered 1-16 too, and stall 11
 *  is not booth 11. */
export const featuredTitle = (b) => (b.area === 'Food Court' ? undefined : FESTIVAL.featured.find((f) => f.booth === b.n)?.title);
