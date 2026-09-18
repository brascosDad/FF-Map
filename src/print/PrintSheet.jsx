// The printed map: one 11x17 landscape sheet, drawn from the same data the
// phone map draws. Reached at /?print=1; scripts/print.mjs opens that URL in a
// headless browser and writes the PDF and PNG the printer gets.
//
// It is NOT MapCanvas in a print stylesheet. MapCanvas sizes pins and numbers
// in screen pixels so they hold one physical size at every zoom, which is the
// right rule for a control on a phone and the wrong one for ink: on paper a
// pin wants to be a small symbol and a booth number wants to be as large as its
// row allows. So the map here is its own SVG, sized in map units, built from
// the same pieces -- the basemap trace, BOOTHS, AREAS, PINS, the icon paths --
// so it cannot disagree with the phone map about where anything is.
import { TRACE_BASE } from '../assets/basemapTrace';
import { BOOTHS, UNNUMBERED } from '../data/booths';
import { AREAS, BOOTH_ANGLE, span } from '../data/areas';
import { PINS, PIN_COLOR, SLATE } from '../assets/pins';
import { LEGEND } from '../data/directory';
import Icon, { IconAt } from '../components/Icon';
import vendorsData from '../data/vendors.json';
// The phone map ships Manrope's Latin subset only. One vendor name needs
// Vietnamese glyphs, and on paper a fallback face in the middle of the list
// shows; the subset is unicode-range scoped, so it only fetches for that name,
// and only on this route.
import '@fontsource/manrope/vietnamese-400.css';
import '../styles/print.css';

// The festival footprint with breathing room, in map units -- the same box
// useMapView fits the overview to, so the paper shows exactly what the phone
// does at its widest.
const VIEW = { x: 340, y: 65, w: 760, h: 810 };

// Print sizes, all in map units. At the sheet's scale one unit is ~0.9pt.
const TICK = 8;          // booth square, same as the screen
const NUMBER = 6;        // booth number: ~5.5pt, the row pitch is 8-13 units
const PIN_R = 10;        // a pin is a symbol here, not a 44px tap target
const PIN_ICON = 13;
const LABEL = 8.5;       // named-place labels
const STREET = 11;

const NUMBER_FILL = 'var(--map-number)';
const HALO = 'var(--map-halo)';

function Squares({ booths, color, angle = 0 }) {
  return booths.map((b) => (
    <g key={b.id}>
      <rect x={b.x - TICK / 2} y={b.y - TICK / 2} width={TICK} height={TICK} rx={1.4}
            transform={angle ? `rotate(${angle} ${b.x} ${b.y})` : undefined}
            fill={color} fillOpacity={0.75} />
      <text x={b.x} y={b.y - TICK * 0.85} fontSize={NUMBER} fontWeight={700} fill={NUMBER_FILL}
            textAnchor="middle" stroke={HALO} strokeWidth={1.6} paintOrder="stroke">{b.n}</text>
    </g>
  ));
}

// Where each named place's label sits relative to its pin. Chosen by eye so
// none lands on a booth row: the food court's goes above, the stages' beside.
const LABEL_AT = {
  food: { dx: 0, dy: -PIN_R - 5, anchor: 'middle' },
  stageMain: { dx: -PIN_R - 4, dy: 3, anchor: 'end' },
  stageAcoustic: { dx: 0, dy: -PIN_R - 5, anchor: 'middle' },
  kids: { dx: 0, dy: PIN_R + 10, anchor: 'middle' },
};
const LABEL_TEXT = { food: 'Food Court', stageMain: 'Main Stage', stageAcoustic: 'Acoustic Stage', kids: 'Kidlandia' };

function PrintMap() {
  return (
    <svg className="print-map" viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
         xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fall Fest 2026 site map">
      <g dangerouslySetInnerHTML={{ __html: TRACE_BASE }} />

      <text x={411.5} y={130} fontSize={STREET} fill="var(--map-label)" textAnchor="middle" transform="rotate(-90 411.5 130)">Candler Park Dr</text>
      <text x={1015} y={795} fontSize={STREET} fill="var(--map-label)" textAnchor="start">McLendon Ave</text>

      <Squares booths={BOOTHS.food} color={PIN_COLOR.food} angle={BOOTH_ANGLE.food} />
      {AREAS.map((a) => <Squares key={a.id} booths={a.booths} color={SLATE} angle={BOOTH_ANGLE[a.id]} />)}
      <Squares booths={BOOTHS.kid} color={SLATE} angle={BOOTH_ANGLE.kid} />

      {/* The three runs carry their ranges on the map itself, where the 2025
          sheet had them, so a reader with a booth number knows which street
          to walk to before they find the key. The ranges are read off the
          data, so this sheet cannot print an endpoint the app does not draw. */}
      <g fontSize={LABEL} fontWeight={800} fill="var(--text-strong)" stroke={HALO} strokeWidth={2.4} paintOrder="stroke">
        <text x={411.5} y={290} textAnchor="middle" transform="rotate(-90 411.5 290)">Art Market {span(BOOTHS.cpd)}</text>
        <text x={640} y={812} textAnchor="middle">Art Market {span(BOOTHS.mcl)}</text>
        {/* In the west row's own break at the path bend (between 37 and 38),
            along the row's direction, so it touches no number. */}
        <text x={769.5} y={480} textAnchor="middle" fontSize={LABEL - 1} transform="rotate(-63 769.5 480)">Art Market {span(BOOTHS.spine)}</text>
        {/* Below the K stack: eleven booths at 9 units end at y ~490. */}
        <text x={645} y={505} textAnchor="middle" fontSize={LABEL - 1.5}>{span(BOOTHS.kid)}</text>
      </g>

      {PINS.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={PIN_R} fill={PIN_COLOR[p.c]} stroke={HALO} strokeWidth={1.2} />
          <IconAt name={p.c} x={p.x} y={p.y} size={PIN_ICON} />
          {LABEL_AT[p.d] && LABEL_TEXT[p.d] && (
            <text x={p.x + LABEL_AT[p.d].dx} y={p.y + LABEL_AT[p.d].dy} fontSize={LABEL} fontWeight={800}
                  fill="var(--text-strong)" textAnchor={LABEL_AT[p.d].anchor}
                  stroke={HALO} strokeWidth={2.4} paintOrder="stroke">{LABEL_TEXT[p.d]}</text>
          )}
        </g>
      ))}

      {/* North. The basemap is drawn north-up (Candler Park Dr runs down the
          west edge, McLendon along the south), as the 2025 sheet's arrow had it. */}
      <g transform={`translate(${VIEW.x + VIEW.w - 34} ${VIEW.y + 30})`} fill="var(--text-strong)">
        <path d="M0 -14 L7 8 L0 3 L-7 8 Z" />
        <text y={20} fontSize={9} fontWeight={800} textAnchor="middle">N</text>
      </g>
    </svg>
  );
}

const dotColor = (cat) => (cat === 'art' ? SLATE : PIN_COLOR[cat] || SLATE);

// Every named booth, alphabetical by what the sign will say -- the business,
// which is what a visitor is looking for; the artist behind it is on the phone
// map. Sponsor booths have no name to list; the two unnumbered artists list
// with a dash and where to find them.
function artistIndex() {
  const rows = [];
  for (const key of ['spine', 'mcl', 'cpd', 'kid']) {
    for (const b of BOOTHS[key]) if (b.biz) rows.push({ label: b.biz, n: String(b.n) });
  }
  for (const u of UNNUMBERED) rows.push({ label: u.where ? `${u.biz} (at the ${u.where})` : `${u.biz} (no number)`, n: '—' });
  return rows.sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
}

export default function PrintSheet() {
  const index = artistIndex();
  const counts = { park: BOOTHS.spine.length, kid: BOOTHS.kid.length, mcl: BOOTHS.mcl.length, cpd: BOOTHS.cpd.length };
  return (
    <div className="print-page">
      <div className="print-mapcol"><PrintMap /></div>

      <aside className="print-side">
        <header className="print-head">
          <div className="print-brand">Fall Fest</div>
          <div className="print-sub">Candler Park · October 3–4, 2026</div>
          <div className="print-kicker">Site map</div>
        </header>

        <section className="print-legend">
          {/* No area markers on paper -- the runs are labelled on the map --
              so the 'art' row would key a symbol that is not there. */}
          {LEGEND.filter((l) => l.cat !== 'art').map((l) => (
            <span className="print-legend__row" key={l.cat}>
              <span className="print-legend__dot" style={{ background: dotColor(l.cat) }}>
                <Icon name={l.cat} size={9} color="var(--icon-on-color)" />
              </span>
              {l.label}
            </span>
          ))}
          <span className="print-legend__row">
            <span className="print-legend__sq" style={{ background: SLATE }} />Art market booth, numbered
          </span>
          <span className="print-legend__row">
            <span className="print-legend__sq" style={{ background: PIN_COLOR.food }} />Food stall
          </span>
        </section>

        <section className="print-key">
          <h2>Art market · {counts.park + counts.mcl + counts.cpd} booths</h2>
          <div className="print-key__rows">
            <span><b>{span(BOOTHS.spine)}</b> in the park</span>
            <span><b>{span(BOOTHS.kid)}</b> Kidlandia, on the field</span>
            <span><b>{span(BOOTHS.mcl)}</b> McLendon Ave</span>
            <span><b>{span(BOOTHS.cpd)}</b> Candler Park Dr</span>
          </div>
        </section>

        <section className="print-food">
          <h2>Food court · {vendorsData.vendors.length} vendors</h2>
          <ul>{vendorsData.vendors.map((v) => <li key={v.id}>{v.name}</li>)}</ul>
        </section>

        <section className="print-index">
          <h2>Find an artist</h2>
          <ul>
            {index.map((r, i) => (
              <li key={i}><span className="print-index__n">{r.n}</span><span className="print-index__who">{r.label}</span></li>
            ))}
          </ul>
        </section>

        <footer className="print-foot">
          Booth numbers and artists from the artist market chair's 2026 assignments; positions from the official site plan.
          The phone map at fallfest.candlerpark.org stays current after this sheet prints.
        </footer>
      </aside>
    </div>
  );
}
