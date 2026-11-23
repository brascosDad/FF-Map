// The demo link: `?demo`, for showing the map when the festival isn't on
// (a walkthrough, a recording, a review). Regular visitors never see it.
//
//   ?demo                      festival clock set to Saturday 2:20 PM, when both
//                              stages have an act on
//   ?demo=2026-10-04T13:00     festival clock set to that festival-local time
//
// In demo mode:
//   - the clock the WhatsOnNow card reads starts at that time and runs forward
//     from there, so the card shows what it showed on festival day
//   - an art booth with no permitted photos shows ArtistGallery's placeholder
//     tiles, so the gallery can be seen before any artist has sent photos
//
// Without `?demo` nothing changes: the card reads the real clock (nothing
// outside festival hours) and a booth with no photos shows no gallery.
import { FESTIVAL } from './data/festival.js';
import { festivalClock } from './whatsOnNow.js';

/** Saturday 2:20 PM: Run Katie Run on the Main Stage, Veronika Jackson on the Acoustic. */
export const DEMO_DEFAULT = `${FESTIVAL.days.saturday}T14:20`;

/** "2026-10-03T14:20" read as festival-local time -> a Date, or null if it doesn't parse. */
export function festivalTime(local, timeZone = FESTIVAL.timeZone) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local || '');
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  // Read the guess on the festival's clock and correct by the difference
  // (the zone's offset, daylight saving included). Twice covers a guess that
  // lands across a change.
  let t = wanted;
  for (let i = 0; i < 2; i++) {
    const { day, minute } = festivalClock(new Date(t), timeZone);
    const [yy, mm, dd] = day.split('-').map(Number);
    t += wanted - Date.UTC(yy, mm - 1, dd, Math.floor(minute / 60), minute % 60);
  }
  return new Date(t);
}

function readDemo() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('demo')) return null;
  const at = festivalTime(params.get('demo')) || festivalTime(DEMO_DEFAULT);
  return { startedAt: at.getTime(), loadedAt: Date.now() };
}

const DEMO = readDemo();

/** True on a `?demo` link. */
export const isDemo = () => DEMO !== null;

/** The time the app should treat as now: the real clock, or the demo clock running from its start. */
export const appNow = () => (DEMO ? new Date(DEMO.startedAt + (Date.now() - DEMO.loadedAt)) : new Date());
