// The device matrix the e2e suite runs the map's checks on: one line per
// phone class, run on both engines. A new phone is one more line.
//
//   name      what the test output calls it -- a real phone class
//   w, h      the CSS viewport the phone reports (portrait)
//   dpr       its device pixel ratio
//   textZoom  page zoom, as a phone's large-text / Display Zoom setting
//             produces it: the page is laid out at w/textZoom CSS px (the
//             screen is the same, the CSS px are bigger), so 125% on a 375px
//             iPhone is a 300px-wide page and on a 393px one 314px -- which
//             is what Ernest's iPhone reported. Playwright has no text-zoom
//             switch; this is the equivalent it can emulate (see pr-notes).
//   docked    the desktop, where the panel docks beside the map
//
// Every phone profile runs with touch on (hasTouch, isMobile).
export const DEVICES = [
  { name: 'iPhone SE (1st gen) / Display Zoom', w: 320, h: 568, dpr: 2 },
  { name: 'Galaxy A-series', w: 360, h: 780, dpr: 3 },
  { name: 'iPhone SE', w: 375, h: 667, dpr: 2 },
  { name: 'iPhone SE / big text', w: 375, h: 667, dpr: 2, textZoom: 1.25 },
  { name: 'iPhone 15', w: 393, h: 852, dpr: 3 },
  { name: 'iPhone 15 / big text', w: 393, h: 852, dpr: 3, textZoom: 1.25 },
  { name: 'Pixel', w: 412, h: 915, dpr: 2.625 },
  { name: 'iPhone 15 Pro Max', w: 430, h: 932, dpr: 3 },
  { name: 'Desktop (docked panel)', w: 1440, h: 900, dpr: 1, docked: true },
];

// The two engines every profile runs on: WebKit is iPhone Safari AND iPhone
// Chrome (every iOS browser is WebKit underneath); Chromium is Android Chrome.
export const ENGINES = ['webkit', 'chromium'];

/** The Playwright context options for a profile. */
export function contextFor(d) {
  const z = d.textZoom || 1;
  return {
    viewport: { width: Math.round(d.w / z), height: Math.round(d.h / z) },
    deviceScaleFactor: d.dpr * z,
    isMobile: !d.docked,
    hasTouch: !d.docked,
    reducedMotion: 'reduce',
  };
}

/** The CSS width a profile lays the page out at. */
export const cssWidth = (d) => Math.round(d.w / (d.textZoom || 1));
