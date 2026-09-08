import { useEffect, useState } from 'react';

/**
 * TEMPORARY dev-only control for dialling in the surround colour.
 *
 * Shown when running `npm run dev`, OR on any build when the URL carries ?dev
 * -- that second route is what makes it usable on the Vercel preview link,
 * including on a phone, where there is no dev server. A normal visitor never
 * sees it. To remove it for good: delete this file and its two lines in App.jsx.
 *
 * The choice is kept in localStorage so it survives reloads while you compare.
 */
const PRESETS = [
  ['#E8EDF2', 'A · blue-grey (street)'],
  ['#DCE4EC', 'B · deeper'],
  ['#F2F5F8', 'C · palest'],
  ['#ECEAE1', 'D · original warm'],
  ['#ADD29E', 'E · park green'],
  ['#C7DCBC', 'F · green, lighter'],
  ['#FFFFFF', 'G · white'],
];
const KEY = 'ff-surround';

export function devToolsRequested() {
  if (import.meta.env.DEV) return true;
  try {
    return new URLSearchParams(window.location.search).has('dev');
  } catch {
    return false;
  }
}

// Safari private mode throws on localStorage access rather than returning null,
// which would take the whole app down on first paint.
const store = {
  get() { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, v); } catch { /* not available */ } },
};

export default function DevSurround() {
  const [hex, setHex] = useState(() => store.get() || '#E8EDF2');
  const [open, setOpen] = useState(true);

  useEffect(() => {
    document.documentElement.style.setProperty('--ff-surround', hex);
    store.set(hex);
  }, [hex]);

  if (!open) {
    return <button className="devsurround-tab" onClick={() => setOpen(true)}>🎨</button>;
  }
  return (
    <div className="devsurround" onClick={(e) => e.stopPropagation()}>
      <div className="ds-hd">
        <b>Surround colour</b>
        <button onClick={() => setOpen(false)} aria-label="Hide">×</button>
      </div>
      <div className="ds-row">
        <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} />
        <input
          className="ds-hex"
          value={hex}
          onChange={(e) => {
            const v = e.target.value.trim();
            setHex(v.startsWith('#') ? v : '#' + v);
          }}
          spellCheck={false}
        />
      </div>
      <div className="ds-swatches">
        {PRESETS.map(([c, label]) => (
          <button
            key={c}
            title={label}
            className={`ds-sw${c.toLowerCase() === hex.toLowerCase() ? ' on' : ''}`}
            style={{ background: c }}
            onClick={() => setHex(c)}
          />
        ))}
      </div>
      <div className="ds-note">
        {PRESETS.find(([c]) => c.toLowerCase() === hex.toLowerCase())?.[1] || 'custom'}
        <br />
        Tell me the hex and I'll bake it in.
      </div>
    </div>
  );
}
