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
import { CREAM, PINS, PIN_COLOR, SLATE } from '../assets/pins';
import { LEGEND, PRINT_SITE_LEGEND } from '../data/directory';
import Icon, { IconAt } from '../components/Icon';
import { FESTIVAL, featuredTitle } from '../data/festival';
// The QR generator's core only: it returns the module matrix and we draw it
// as vector rects, so the code prints as crisp as the booth squares.
import QRCode from 'qrcode/lib/core/qrcode';
import '../styles/print.css';

// The festival footprint with breathing room, in map units -- the same box
// useMapView fits the overview to, so the paper shows exactly what the phone
// does at its widest.
const VIEW = { x: 340, y: 65, w: 760, h: 810 };

// Print sizes, all in map units. At the sheet's scale one unit is ~0.9pt.
const TICK = 8;          // booth square, same as the screen
// The map draws 810 units to 10.2in, so 8pt -- the sheet's type floor -- is
// 8.8 units. Every label on the map clears it. Booth numbers are the one
// exception: the rows are pitched 8-13 units apart, so a number at the floor
// would overrun its neighbours; they stay at 6 (about 5.5pt), the largest
// size the geometry allows.
const NUMBER = 6;        // booth number
// A booth number set BESIDE its square (Candler Park Dr) sits this far off the
// square's edge, in map units -- the sheet's own spacing step at this scale,
// like TICK and NUMBER above. Above-the-square numbers keep TICK * 0.85.
const NUMBER_GAP = 2;
const FEATURED_STAR = TICK * 0.85;   // the star in a featured booth's square, as on the screen
const PIN_R = 10;        // a pin is a symbol here, not a 44px tap target
const PIN_ICON = 13;
const LABEL = 8.9;       // named-place labels and run ranges: 8pt
const STREET = 11;

const NUMBER_FILL = 'var(--map-number)';
const HALO = 'var(--map-halo)';

// The QR code: about 1.5in square on the sheet, in map units. The map draws at
// 810 units to 10.2in, so an inch is ~79.4 units. `QR_BOX` is the white quiet-
// zone box; the code inside leaves the standard four modules of quiet zone on
// every side. It sits on the empty park green east of the festival, at the
// map's vertical centre, 12 units in from the map's right edge, where it
// covers no pin, booth, path or label (Callan Circle's road band starts at
// x ~1119, the festival's east edge at this height is x ~915).
const QR_BOX = 119;                                  // ~1.5in
const QR_QUIET = 4;                                  // modules, per the spec
const QR_EDGE = 12;                                  // clearance from the map's right edge
const QR_AT = { x: VIEW.x + VIEW.w - QR_EDGE - QR_BOX, y: VIEW.y + VIEW.h / 2 - QR_BOX / 2 };
const QR_CAPTION = ['Scan for the music', 'schedule, food trucks', 'and every artist —', 'always up to date.'];

/**
 * The map's own URL as a scannable, vector QR code with a caption.
 *
 * Error correction M: the URL is short (version 3, 29 modules), so each module
 * is ~1mm at this size, and M survives the smudges a poster collects. The
 * modules are one path so the PDF carries one object, not 500.
 */
function MapQr() {
  const qr = QRCode.create(FESTIVAL.mapUrl, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const cell = QR_BOX / (n + QR_QUIET * 2);
  const x0 = QR_AT.x + QR_QUIET * cell, y0 = QR_AT.y + QR_QUIET * cell;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (qr.modules.get(r, c)) d += `M${(x0 + c * cell).toFixed(2)} ${(y0 + r * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
  }
  return (
    <g className="print-qr" data-url={FESTIVAL.mapUrl}>
      <rect x={QR_AT.x} y={QR_AT.y} width={QR_BOX} height={QR_BOX} rx={3} fill="var(--ff-white)" />
      <path d={d} fill="var(--ff-navy)" shapeRendering="crispEdges" />
      <text x={QR_AT.x + QR_BOX / 2} y={QR_AT.y + QR_BOX + LABEL * 1.6} fontSize={LABEL} fontWeight={800}
            fill="var(--text-strong)" textAnchor="middle" stroke={HALO} strokeWidth={2.4} paintOrder="stroke">
        {QR_CAPTION.map((line, i) => <tspan key={i} x={QR_AT.x + QR_BOX / 2} dy={i ? LABEL * 1.25 : 0}>{line}</tspan>)}
      </text>
    </g>
  );
}

// A booth with no number (the two unnumbered artists) is drawn hollow -- cream
// inside a slate frame, as on the phone map -- and gets no text element at
// all, not an empty one.
// `numberSide(b)` -> 'left' | 'right' puts a booth's number beside its square,
// level with it, NUMBER_GAP off the edge, instead of centred above it. On
// Candler Park Dr the rows are pitched too tightly for a number above: it
// landed on the grey of the square (Ernest, 9/20). Each column's numbers go
// to the far side from the street -- west column left into the green, east
// column right into the park -- so nothing is printed over a booth.
function Squares({ booths, color, angle = 0, hollow = false, numberSide }) {
  return booths.map((b) => {
    const featured = featuredTitle(b);
    const side = numberSide?.(b);
    const nx = side === 'left' ? b.x - TICK / 2 - NUMBER_GAP : side === 'right' ? b.x + TICK / 2 + NUMBER_GAP : b.x;
    // Level with the square: the baseline sits a third of the cap height below centre.
    const ny = side ? b.y + NUMBER * 0.36 : b.y - TICK * 0.85;
    return (
    <g key={b.id} className={`print-booth${b.n == null ? ' print-booth--unnumbered' : ''}${featured ? ' print-booth--featured' : ''}`}>
      <rect x={b.x - TICK / 2} y={b.y - TICK / 2} width={TICK} height={TICK} rx={1.4}
            transform={angle ? `rotate(${angle} ${b.x} ${b.y})` : undefined}
            fill={hollow ? CREAM : color} fillOpacity={hollow || featured ? 1 : 0.75}
            stroke={hollow ? color : undefined} strokeWidth={hollow ? 1.4 : undefined} />
      {/* A featured booth (festival.js): the star in its own square, full
          opacity, as on the screen -- a mark that reads at 5.5pt without
          leaning on colour. */}
      {featured && <IconAt name="star" x={b.x} y={b.y} size={FEATURED_STAR} />}
      {b.n != null && (
        <text x={nx} y={ny} fontSize={NUMBER} fontWeight={700} fill={NUMBER_FILL}
              textAnchor={side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle'} stroke={HALO} strokeWidth={1.6} paintOrder="stroke">{b.n}</text>
      )}
    </g>
    );
  });
}

// Where each named place's label sits relative to its pin. Chosen by eye so
// none lands on a booth row: the food court's goes above, the stages' beside.
// The Acoustic Stage's runs above and to the LEFT of its pin (anchored just
// past the pin's centre): centred, it reached the barricade across McLendon
// at Mell Ave, 27 units east of the pin since the 9/22 repack.
const LABEL_AT = {
  food: { dx: 0, dy: -PIN_R - 5, anchor: 'middle' },
  stageMain: { dx: -PIN_R - 4, dy: 3, anchor: 'end' },
  stageAcoustic: { dx: PIN_R, dy: -PIN_R - 5, anchor: 'end' },
  kids: { dx: 0, dy: PIN_R + 10, anchor: 'middle' },
};
const LABEL_TEXT = { food: 'Food Court', stageMain: 'Main Stage', stageAcoustic: 'Acoustic Stage', kids: 'Kidlandia' };

// Paper-only marks that are not discs: keyed by category, each takes the pin
// record and returns what to draw at its x/y. A category not listed here is a
// disc with its glyph, like every visitor pin. The legend draws the same
// shapes at swatch size (see SiteSwatch).
const PRINT_SHAPES = {
  // Three traffic cones in a row across the street, the way Jess's site plan
  // draws a barricade: 6-unit triangles at CONE_PITCH along `axis`, all
  // pointing north, spanning most of a 28-unit street. A thin white halo, so
  // the orange holds its edge on the street grey.
  barricade: ({ x, y, axis = 'x' }) => [-1, 0, 1].map((i) => {
    const cx = axis === 'x' ? x + i * CONE_PITCH : x;
    const cy = axis === 'x' ? y : y + i * CONE_PITCH;
    return <path key={i} d={`M${cx - CONE / 2} ${cy + CONE / 2}L${cx + CONE / 2} ${cy + CONE / 2}L${cx} ${cy - CONE / 2}Z`}
                 fill={PIN_COLOR.barricade} stroke={HALO} strokeWidth={0.8} strokeLinejoin="round" paintOrder="stroke" />;
  }),
};
const CONE = 6;          // one barricade cone, base and height, in map units
const CONE_PITCH = 9;    // cone centre to cone centre
const STREET_W = 28;     // the street band, from the basemap trace
const BUMP_H = 2.5;      // a speed bump's bar
// A speed bump: a thin white bar the width of the street. In the legend the
// bar is drawn on a patch of street grey, since white on white is nothing.
PRINT_SHAPES.speedbump = ({ x, y, swatch }) => (
  <>
    {swatch && <rect x={-12} y={-8} width={24} height={16} rx={1} fill="var(--map-street)" />}
    <rect x={x - (swatch ? 10 : STREET_W / 2)} y={y - BUMP_H / 2} width={swatch ? 20 : STREET_W} height={BUMP_H} fill={PIN_COLOR.speedbump} />
  </>
);

// Candler Park Dr's two columns: the west (street-side) column's numbers go
// left, the east (park-side) column's go right -- decided by which side of
// the run's midline a square sits, so a re-pull that moves a column still
// numbers it outward.
const cpdMid = (Math.min(...BOOTHS.cpd.map((b) => b.x)) + Math.max(...BOOTHS.cpd.map((b) => b.x))) / 2;
const cpdNumberSide = (b) => (b.x < cpdMid ? 'left' : 'right');

function PrintMap() {
  return (
    <svg className="print-map" viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
         xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fall Fest 2026 site map">
      <g dangerouslySetInnerHTML={{ __html: TRACE_BASE }} />

      <text x={411.5} y={130} fontSize={STREET} fill="var(--map-label)" textAnchor="middle" transform="rotate(-90 411.5 130)">Candler Park Dr</text>
      <text x={1015} y={795} fontSize={STREET} fill="var(--map-label)" textAnchor="start">McLendon Ave</text>

      <Squares booths={BOOTHS.food} color={PIN_COLOR.food} angle={BOOTH_ANGLE.food} />
      {AREAS.map((a) => <Squares key={a.id} booths={a.booths} color={SLATE} angle={BOOTH_ANGLE[a.id]}
                                 numberSide={a.id === 'cpd' ? cpdNumberSide : undefined} />)}
      <Squares booths={BOOTHS.kid} color={PIN_COLOR.kids} angle={BOOTH_ANGLE.kid} />
      <Squares booths={UNNUMBERED} color={SLATE} hollow />

      {/* One plain "Art Market" on the car-path run, which has no street name
          to say what it is; the two street runs are named by their streets
          and the index carries every number. The ranges came off the map on
          9/20: 55-81 sat too high, 82-139 in the middle of the street north
          of its run, 1-54 crowded the park rows. The label sits in the west
          row's own break at the path bend (between 37 and 38), along the
          row, so it touches no number. */}
      <g fontSize={LABEL} fontWeight={800} fill="var(--text-strong)" stroke={HALO} strokeWidth={2.4} paintOrder="stroke">
        <text x={769.5} y={480} textAnchor="middle" transform="rotate(-63 769.5 480)">Art Market</text>
        {/* Just below the south end of the Kidlandia column -- the highest
            K number, wherever the sheet's count puts it. */}
        <text x={BOOTHS.kid[0].x} y={Math.max(...BOOTHS.kid.map((b) => b.y)) + 15} textAnchor="middle">{span(BOOTHS.kid)}</text>
      </g>

      {/* Every pin, the paper-only ones included (print: true in pins.js --
          the EMS / fire-inspector layer the phone skips). A category in
          PRINT_SHAPES is drawn as its own mark rather than a disc. */}
      {PINS.map((p, i) => (
        <g key={i} className={`print-pin print-pin--${p.c}${p.print ? ' print-pin--print-only' : ''}`}>
          {PRINT_SHAPES[p.c]
            ? PRINT_SHAPES[p.c](p)
            : <>
                <circle cx={p.x} cy={p.y} r={PIN_R} fill={PIN_COLOR[p.c]} stroke={HALO} strokeWidth={1.2} />
                <IconAt name={p.c} x={p.x} y={p.y} size={PIN_ICON} />
              </>}
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

      <MapQr />
    </svg>
  );
}

const dotColor = (cat) => (cat === 'art' ? SLATE : PIN_COLOR[cat] || SLATE);

// A site/safety key swatch: the category's own PRINT_SHAPES mark drawn at
// swatch size in a small SVG, or -- for a category drawn as a disc -- the
// disc with its glyph, like the visitor rows.
function SiteSwatch({ cat }) {
  const shape = PRINT_SHAPES[cat];
  if (!shape) {
    return (
      <span className="print-legend__dot" style={{ background: dotColor(cat) }}>
        <Icon name={cat} size={9} color="var(--icon-on-color)" />
      </span>
    );
  }
  // The mark drawn in map units, boxed to the swatch: one unit is one px here.
  return (
    <svg className="print-legend__mark" viewBox="-12 -8 24 16" aria-hidden="true">
      {shape({ x: 0, y: 0, swatch: true })}
    </svg>
  );
}

// Every named booth, alphabetical by what the sign will say -- the business,
// which is what a visitor is looking for; the artist behind it is on the phone
// map. Sponsor booths have no name to list; the two unnumbered artists list
// with a dash and where to find them.
function artistIndex() {
  const rows = [];
  for (const key of ['spine', 'mcl', 'cpd', 'kid']) {
    for (const b of BOOTHS[key]) if (b.biz) rows.push({ label: b.biz, n: String(b.n), featured: featuredTitle(b) });
  }
  for (const u of UNNUMBERED) rows.push({ label: `${u.biz} (${u.where})`, n: '—' });
  return rows.sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
}

export default function PrintSheet() {
  const index = artistIndex();
  return (
    <div className="print-page">
      <div className="print-mapcol"><PrintMap /></div>

      <aside className="print-side">
        <header className="print-head">
          <div className="print-brand">Fall Fest</div>
          <div className="print-sub">Candler Park · {FESTIVAL.dates}</div>
        </header>

        <section className="print-legend">
          {/* No area markers on paper -- the runs are labelled on the map --
              so the 'art' row would key a symbol that is not there. */}
          {LEGEND.filter((l) => l.cat !== 'art').map((l) => (
            <span className="print-legend__row" key={l.cat}>
              <span className="print-legend__dot" style={{ background: dotColor(l.cat) }}>
                <Icon name={l.cat} size={9} color="var(--icon-on-color)" />
              </span>
              {l.printLabel || l.label}
            </span>
          ))}
          <span className="print-legend__row">
            <span className="print-legend__sq" style={{ background: SLATE }} />Art market booth
          </span>
          <span className="print-legend__row">
            <span className="print-legend__sq" style={{ background: PIN_COLOR.kids }} />Kidlandia booth
          </span>
          <span className="print-legend__row">
            <span className="print-legend__sq" style={{ background: PIN_COLOR.food }} />Food stall
          </span>
          {FESTIVAL.featured.length > 0 && (
            <span className="print-legend__row">
              <span className="print-legend__sq print-legend__sq--featured" style={{ background: SLATE }}>
                <Icon name="star" size={8} color="var(--icon-on-color)" />
              </span>{FESTIVAL.featured[0].title}
            </span>
          )}
        </section>

        {/* The paper-only layer: what EMS and the fire inspector read the
            sheet for (pins flagged print: true in pins.js). Its own compact
            key, under the visitor key, on the same four-column grid. */}
        {PRINT_SITE_LEGEND.length > 0 && (
          <section className="print-legend print-legend--site" aria-label="Site and safety key">
            <span className="print-legend__title">Site / safety</span>
            {PRINT_SITE_LEGEND.map((l) => (
              <span className="print-legend__row" key={l.cat}>
                <SiteSwatch cat={l.cat} />
                {l.label}
              </span>
            ))}
          </section>
        )}

        {/* The alphabetical list, every artist with their booth number. No
            count under the heading: a sheet that lists every artist needs
            neither the public "over 130" nor a booth total -- and a booth
            total is never printed anywhere, since it moves every time the
            chair edits her sheet. */}
        <section className="print-index">
          <h2>Art Market</h2>
          <ul>
            {index.map((r, i) => (
              /* A featured booth's star sits in the number cell, not before
                 the name: in the name it wrapped the entry onto a second
                 line, and the column has no line to spare. The lead box
                 takes a star and two digits; a three-digit featured booth
                 would need --print-lead one step wider. */
              <li key={i} className={r.featured ? 'print-index__row--featured' : undefined}>
                <span className="print-index__n">{r.featured && <Icon name="star" size={8} color="var(--text-strong)" className="print-index__star" />}{r.n}</span>
                <span className="print-index__who">{r.label}</span>
              </li>
            ))}
          </ul>
        </section>

      </aside>
    </div>
  );
}
