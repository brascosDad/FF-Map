import { useCallback, useEffect, useRef } from 'react';

/**
 * Browser / Android back, one layer at a time (round 2, item 4.1).
 *
 * The map has two dismissible layers: a filter chip that is on, and an open
 * sheet. Back follows the same rule as a tap on empty map: it closes the sheet
 * first, then clears the chip, and only then leaves the page. To get that, each
 * layer that comes on pushes ONE history entry, and a layer that goes off any
 * other way (a tap on empty map, ×, a swipe) takes its entry off again, so the
 * stack of entries is always exactly as deep as the stack of layers.
 *
 * `layers` is how many layers are on screen now. `onBack(n)` is called when the
 * visitor goes back n entries and must remove n layers, top first.
 *
 * Entries are same-URL (pushState with no URL), so the locked map address, the
 * `?s=` handling and the service worker are untouched.
 */
export function useLayerHistory(layers, onBack) {
  // pushed: entries this hook has on the stack above the page's own.
  // pending: a history.go() this hook started and has not heard back from yet;
  // its popstate is ours, not the visitor's, and nothing may be pushed until it
  // lands (a push before it would put the new entry under the traversal).
  const st = useRef({ pushed: 0, pending: false });
  const latest = useRef({ layers, onBack });
  latest.current = { layers, onBack };

  const sync = useCallback(() => {
    const s = st.current;
    if (s.pending) return;
    const want = latest.current.layers;
    if (want > s.pushed) {
      for (let i = s.pushed; i < want; i++) window.history.pushState({ ffLayer: i + 1 }, '');
      s.pushed = want;
    } else if (want < s.pushed) {
      const n = s.pushed - want;
      s.pending = true;
      s.pushed = want;
      window.history.go(-n);
    }
  }, []);

  useEffect(() => { sync(); }, [layers, sync]);

  useEffect(() => {
    // A reload keeps the entry's state: forget it, so a reloaded page starts at
    // depth 0 like a fresh one.
    if (window.history.state?.ffLayer) window.history.replaceState(null, '');
    const onPop = (e) => {
      const s = st.current;
      if (s.pending) { s.pending = false; sync(); return; }       // our own traversal
      const depth = e.state?.ffLayer ?? 0;
      if (depth < s.pushed) {                                      // the visitor went back
        const n = s.pushed - depth;
        s.pushed = depth;
        latest.current.onBack(n);
      } else if (depth > s.pushed) {                               // forward onto a stale entry: step back off it
        s.pending = true;
        window.history.go(-(depth - s.pushed));
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [sync]);
}
