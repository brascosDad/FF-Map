// Where this visit came from, and (below, once analytics is wired) the one
// module that talks to the analytics service.
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
