import { TRACE_BASE } from '../assets/basemapTrace';
import { BLOBS } from '../assets/basemapBlobs';
import { BOOTHS } from '../data/booths';
import { AREAS } from '../data/areas';
import { CREAM, NAVY, PINS, PIN_COLOR, SLATE } from '../assets/pins';
import { IconAt } from './Icon';

// Side of one booth / food-truck square, in map units. The export draws its own
// ticks at 7.2-8.9 depending on the row; one size across all of them keeps the
// rows reading as a single system.
const TICK = 8;

// Screen-constant sizes, in CSS pixels. These are multiplied by unitsPerPx at
// render so a pin is the same physical size at every zoom -- it is a control,
// not a piece of ground.
//
// The pin diameter is read from --pin-size rather than repeated here: it is a
// token, and a second copy of the number is how the two drift apart. Read once
// and cached -- the stylesheet is in the document well before first render, and
// getComputedStyle on every pan frame is a layout read we do not need.
let sizes = null;
function pinPx() {
  if (sizes) return sizes;
  const cs = getComputedStyle(document.documentElement);
  const px = (name, fallback) => {
    const n = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(n) ? n : fallback;
  };
  sizes = { pin: px('--pin-size', 40) };
  return sizes;
}

const PIN_ICON_PX = 22;
const STREET_PX = 13;
const NUMBER_PX = 9;

// Ink drawn on the map itself, all from the --map-* token layer. Street labels
// are dark, no halo, sitting in the street band -- deliberately not the category
// slate, since these are ground, not content. Size is shared so the two street
// names cannot drift apart.
const STREET_LABEL = 'var(--map-label)';
const MAP_NUMBER = 'var(--map-number)';
const MAP_HALO = 'var(--map-halo)';
const FOOD_LABEL = 'var(--map-food-label)';

function boxes(booths, color, { numbers = false, onTap, k = 1, selectedId } = {}) {
  return booths.map((b) => (
    <g key={b.id} className={onTap ? 'ff-tap ff-booth' : undefined}
       onClick={onTap ? (e) => { e.stopPropagation(); onTap(b); } : undefined}>
      {/* Selected is a navy FILL, per the system -- not a ring. A ring big
          enough to read was 22px across against a ~16px booth pitch, so it
          encircled the neighbour's number as often as its own booth. */}
      <rect x={b.x - TICK / 2} y={b.y - TICK / 2} width={TICK} height={TICK}
            rx={1.6}
            fill={b.id === selectedId ? NAVY : color}
            fillOpacity={b.id === selectedId ? 1 : 0.6} />
      {/* Hit area is one booth's own cell (pitch is ~9 units). Bigger would
          overlap the neighbours and make the wrong booth win the tap. */}
      {onTap && <rect x={b.x - 4.7} y={b.y - 4.7} width={9.4} height={9.4} fill="transparent" />}
      {numbers && (
        <text x={b.x} y={b.y - TICK * 0.9} fontSize={NUMBER_PX * k} fontWeight={700} fill={MAP_NUMBER}
              textAnchor="middle" stroke={MAP_HALO} strokeWidth={2 * k} paintOrder="stroke">{b.n}</text>
      )}
    </g>
  ));
}

// At the furthest-out level the individual squares are illegible, so each area
// collapses to a single blob: filled soft, stroked firm. Organic shape, ordered
// edge -- and tight enough to its own footprint that it never reads as spilling
// into the area next door.
function Blobs({ paths, color, clip }) {
  return paths.map((d, i) => (
    <path key={i} d={d} clipPath={clip ? `url(#${clip})` : undefined}
          fill={color} fillOpacity={0.26} stroke={color} strokeOpacity={0.5} strokeWidth={2} />
  ));
}


// What "selected" looks like on a marker. A booth turns navy, per the system --
// it has no colour of its own to lose. A pin cannot: its hue IS its category,
// so it keeps it and takes a navy ring instead. Selecting a category rings every
// pin in it, which is the honest answer to "where are the restrooms".
function SelectRing({ x, y, r, k }) {
  return (
    <>
      <circle cx={x} cy={y} r={r + 4.5 * k} fill="none" stroke={CREAM} strokeWidth={5 * k} />
      <circle cx={x} cy={y} r={r + 4.5 * k} fill="none" stroke={NAVY} strokeWidth={2.5 * k} />
    </>
  );
}

export default function MapCanvas({ mapRef, wrapRef, viewBox, filter, showBlobs, showNumbers, detail, unitsPerPx = 1, selectedBoothId, selectedPoiId, selectedAreaId, onPinClick, onAreaClick, onBoothClick }) {
  // k converts a CSS pixel into map units at the current zoom.
  const k = unitsPerPx;
  // Area markers are tappable too, so they take the same floor as a pin.
  const pinR = (pinPx().pin / 2) * k;
  const clusterR = pinR;
  // Dimming is a class, not an inline opacity: --opacity-dimmed is the token
  // that says how far "not what you asked for" fades, and it lives in one file.
  const dim = (cat) => (filter && filter !== cat ? ' ffc-dimmed' : '');
  const clusterDim = filter ? ' ffc-dimmed' : '';

  return (
    <div className="mapwrap" ref={wrapRef}>
      <svg
        ref={mapRef}
        className="ff-map"
        viewBox={viewBox}
        tabIndex={-1}   /* focus target when a dialog closes */
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="ds" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx={0} dy={2 * k} stdDeviation={2.2 * k} floodColor={NAVY} floodOpacity={0.3} />
          </filter>
          {/* The two street markets are clipped to their own street band, taken
              from the export's stroke geometry: Candler Park Dr is centred on
              x 411.556 and McLendon on y 789.889, both 28 units wide. A blob
              physically cannot spill onto the grass or across a kerb. */}
          <clipPath id="clip-cpd"><rect x={397.556} y={-580} width={28} height={1354} /></clipPath>
          <clipPath id="clip-mcl"><rect x={-486} y={775.889} width={2308} height={28} /></clipPath>
        </defs>
        <g dangerouslySetInnerHTML={{ __html: TRACE_BASE }} />

        {/* Street names. These survive at every zoom -- they are wayfinding,
            not redundant with the pin icons or the panel key. Streets only:
            the pool reads clearly enough from its own blue shape.
            Both streets are set the same way: dark, no white halo, sitting
            inside the street band itself, at STREET_SIZE.

            McLendon starts 55 units clear of the Acoustic pin rather than
            butting against it -- an icon sitting on a street name reads as a
            mistake. The cost is that the tail clips at the mobile overview;
            that is a deliberate trade, since panning or one zoom step brings
            it back and nobody mistakes which street it is. */}
        <text x={411.5} y={130} fontSize={STREET_PX * k} fill={STREET_LABEL} textAnchor="middle" transform="rotate(-90 411.5 130)">Candler Park Dr</text>
        <text x={1015} y={795} fontSize={STREET_PX * k} fill={STREET_LABEL} textAnchor="start">McLendon Ave</text>

        {/* Food court: blob at overview, individual stalls once you step in */}
        {showBlobs ? <Blobs paths={BLOBS.food} color={PIN_COLOR.food} />
          : boxes(BOOTHS.food, PIN_COLOR.food, { numbers: showNumbers, onTap: onBoothClick, k, selectedId: selectedBoothId })}
        {detail && (
          <text x={872} y={228} fontSize={11 * k} fontWeight={800} fill={FOOD_LABEL} textAnchor="middle" stroke={MAP_HALO} strokeWidth={3 * k} paintOrder="stroke">FOOD COURT</text>
        )}

        {AREAS.map((cl) => (
          <g key={cl.id} className={`ff-tap ff-area${clusterDim}`} data-area={cl.id} onClick={(e) => { e.stopPropagation(); onAreaClick(cl); }}>
            {showBlobs ? <Blobs paths={cl.blobs} color={SLATE} clip={cl.clip} />
              : boxes(cl.booths, SLATE, { numbers: showNumbers, onTap: onBoothClick, k, selectedId: selectedBoothId })}
            <g className="ff-marker" filter="url(#ds)">
              <circle cx={cl.mk[0]} cy={cl.mk[1]} r={clusterR} fill={SLATE} />
              <IconAt name="art" x={cl.mk[0]} y={cl.mk[1]} size={PIN_ICON_PX * k} />
            </g>
            {cl.id === selectedAreaId && <SelectRing x={cl.mk[0]} y={cl.mk[1]} r={clusterR} k={k} />}
          </g>
        ))}

        {PINS.map((p, i) => {
          if (detail && p.c === 'food') return null;
          // The class carries the category and the category carries the colour:
          // .ffc-pin--wc sets --pin-fill, the circle reads it. No hex, and no
          // lookup table in JS either.
          return (
            <g key={i} className={`ff-tap ff-pin ffc-pin ffc-pin--${p.c}${dim(p.c)}`} onClick={(e) => { e.stopPropagation(); onPinClick(p); }}>
              <g filter="url(#ds)">
                <circle cx={p.x} cy={p.y} r={pinR} fill="var(--pin-fill)" />
                <IconAt name={p.c} x={p.x} y={p.y} size={PIN_ICON_PX * k} />
              </g>
              {p.d === selectedPoiId && <SelectRing x={p.x} y={p.y} r={pinR} k={k} />}
            </g>
          );
        })}

      </svg>
    </div>
  );
}

