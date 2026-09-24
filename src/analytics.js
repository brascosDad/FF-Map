import { ANALYTICS } from './data/analytics.js';

// Where this visit came from, and (below) the one module that talks to the
// analytics service.
//
// `?s=` tags a link with where it was posted, so a count can say how people
// found the map. The printed QR is `?s=qr` (FESTIVAL.qrUrl); CLAUDE.md,
// "Analytics", has the table. The tag is read once, kept for the rest of the
// visit, and taken out of the address bar -- so a link someone copies and
// shares does not carry `qr` on to the next person.

// The tags we hand out (CLAUDE.md, "Analytics", has what each means). Any
// other short tag is recorded as written too -- `?s=email` for the CPNO
// newsletter needs no code change -- as long as it is a slug: 1-20 lowercase
// letters, digits or dashes. Anything else is reported as `other`, never as the
// raw text: the value comes from a URL anyone can type, and nothing free-form
// is sent anywhere.
const SLUG = /^[a-z0-9-]{1,20}$/;

const KEY = 'ff-source';

let source = null;

/**
 * Read `?s=` off the address, keep it for the visit, and strip it from the
 * address bar. Call once, before the first render. Every other parameter
 * (`?print=1`) and the hash are left exactly as they were.
 *
 * The tag is also kept in sessionStorage, so a reload of the same tab -- after
 * the address has been cleaned -- is still the visit that came from the QR.
 * Storage can be missing or throw (private mode, blocked site data); then a
 * reload simply counts as `direct`.
 */
export function captureSource() {
  if (source) return source;
  const url = new URL(window.location.href);
  const raw = url.searchParams.get('s');
  if (raw !== null) {
    const tag = raw.trim().toLowerCase();
    source = SLUG.test(tag) && tag !== 'direct' ? tag : 'other';
    try { sessionStorage.setItem(KEY, source); } catch { /* the visit still knows */ }
    url.searchParams.delete('s');
    try { history.replaceState(history.state, '', url.pathname + url.search + url.hash); } catch { /* leave the address */ }
  } else {
    let kept = null;
    try { kept = sessionStorage.getItem(KEY); } catch { /* no storage: direct */ }
    source = kept || 'direct';
  }
  return source;
}

/** This visit's source: the `?s=` slug (qr, social, web, email, ...), `other`
 *  for a tag that is not a slug, or `direct` for none. */
export const visitSource = () => source || captureSource();

// ---------------------------------------------------------------------------
// Analytics: Umami Cloud (settings in src/data/analytics.js). This is the only
// file that touches `window.umami`; everything else calls track(name, props).
//
// The rules it keeps:
//   - The tracker script is injected after the map's first render, so it can
//     never delay the map, and never by index.html.
//   - With no website ID nothing loads and track() does nothing.
//   - track() never throws. Until the script has loaded -- offline, blocked by
//     a content blocker, still on its way -- an event is dropped: no queue, no
//     retry. The map behaves the same either way.
//   - `data-auto-track="false"`: the tracker sends nothing on its own. We send
//     the pageview and `map_open` ourselves once it loads, which is after
//     captureSource() has cleaned the address, so the pageview never records
//     `?s=qr` and the order cannot race the replaceState.
//   - Event data is flat: strings, numbers, one boolean. No location, no free
//     text, nothing about the person.

let started = false;
let ready = false;

// What this visit did, for `visit_summary`. Kept whether or not the script
// loaded, so the summary is right even if the first taps beat the script.
const visit = { pins: 0, categories: new Set(), maxZoom: 1, engaged: false, t0: 0, summarised: false };

/**
 * Send one event. `name` is one of the events in CLAUDE.md, "Analytics";
 * `props` is a flat object of strings and numbers. Also keeps the visit's
 * running totals, which is why the event names matter here.
 */
export function track(name, props = {}) {
  note(name, props);
  if (!ready) return;
  try { window.umami?.track?.(name, props); } catch { /* never the map's problem */ }
}

// "Went past the first screen": a pin opened, a chip turned on, a zoom past the
// opening stop, or a schedule opened. A pan alone does not count.
function note(name, props) {
  if (name === 'pin_open') {
    visit.pins += 1;
    if (props.category) visit.categories.add(props.category);
    visit.engaged = true;
  } else if (name === 'chip_on') {
    if (props.category) visit.categories.add(props.category);
    visit.engaged = true;
  } else if (name === 'zoom_stop') {
    visit.maxZoom = Math.max(visit.maxZoom, props.level || 1);
    if (props.level > 1) visit.engaged = true;
  } else if (name === 'schedule_open') {
    visit.engaged = true;
  }
}

/**
 * Load the tracker and send the visit's opening events. Call once, after the
 * map's first render. `viewport` is 'phone' or 'desktop' (the docked panel).
 */
export function startAnalytics({ viewport }) {
  if (started || !ANALYTICS.websiteId) return;
  started = true;
  visit.t0 = performance.now();

  const s = document.createElement('script');
  s.async = true;
  s.src = ANALYTICS.src;
  s.setAttribute('data-website-id', ANALYTICS.websiteId);
  s.setAttribute('data-domains', ANALYTICS.domains);
  s.setAttribute('data-auto-track', 'false');
  s.setAttribute('data-exclude-search', 'true');
  s.onload = () => {
    ready = typeof window.umami?.track === 'function';
    if (!ready) return;
    try { window.umami.track(); } catch { /* the pageview */ }
    track('map_open', { source: visitSource(), viewport });
  };
  s.onerror = () => { /* offline or blocked: every event is dropped */ };
  document.head.appendChild(s);

  // Once per load, when the visitor leaves: closing the tab, switching app on
  // a phone (which is often the last thing that happens -- iOS rarely fires
  // pagehide after that), or navigating away. The tracker sends with
  // fetch(..., { keepalive: true }), the same guarantee as sendBeacon, so the
  // request outlives the page.
  const summarise = () => {
    if (visit.summarised) return;
    visit.summarised = true;
    const categories = [...visit.categories].sort();
    track('visit_summary', {
      source: visitSource(),
      pins_opened: visit.pins,
      categories_touched: categories.length,
      categories: categories.join(','),
      max_zoom: visit.maxZoom,
      engaged: visit.engaged,
      seconds: Math.round((performance.now() - visit.t0) / 1000),
    });
  };
  window.addEventListener('pagehide', summarise);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') summarise(); });
}
