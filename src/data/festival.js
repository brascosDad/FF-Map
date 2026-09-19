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
};
