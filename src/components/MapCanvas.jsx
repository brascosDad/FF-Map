import { TRACE_BASE } from '../assets/basemapTrace';
import { BLOBS } from '../assets/basemapBlobs';
import { BOOTHS } from '../data/booths';
import { NAVY, PINS, PIN_COLOR, SLATE } from '../assets/pins';
import { IconAt } from './Icon';

// Side of one booth / food-truck square, in map units. The export draws its own
// ticks at 7.2-8.9 depending on the row; one size across all of them keeps the
// rows reading as a single system.
const TICK = 8;

// Screen-constant sizes, in CSS pixels. These are multiplied by unitsPerPx at
// render so a pin is the same physical size at every zoom -- it is a control,
// not a piece of ground. 40px is the touch-target floor.
const PIN_PX = 40;      // pin diameter
const PIN_ICON_PX = 22;
const CLUSTER_PX = 40;  // area markers are tappable too -- same floor
const STREET_PX = 13;
const NUMBER_PX = 9;

// Street labels: dark, no halo, sitting in the street band. Deliberately not the
// category slate -- these are ground, not content. Size is shared so the two
// street names cannot drift apart.
const STREET_LABEL = '#5C6570';

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
        <text x={b.x} y={b.y - TICK * 0.9} fontSize={NUMBER_PX * k} fontWeight={700} fill="#3b4a63"
              textAnchor="middle" stroke="#fff" strokeWidth={2 * k} paintOrder="stroke">{b.n}</text>
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

const CLUSTERS = [
  { id: 'cpd', blobs: BLOBS.cpd, clip: 'clip-cpd', booths: BOOTHS.cpd, mk: [411.5, 541.5], label: null, shortName: 'Candler Park Dr', name: 'Candler Park Dr · Art Market', range: 'Booths 89–164 · 76 booths' },
  { id: 'mcl', blobs: BLOBS.mcl, clip: 'clip-mcl', booths: BOOTHS.mcl, mk: [666.4, 787.9], label: null, shortName: 'McLendon Ave', name: 'McLendon Ave · Art Market', range: 'Booths 62–88 · 27 booths' },
  { id: 'spine', blobs: BLOBS.spine, booths: BOOTHS.spine, mk: [774.9, 509.3], label: 'Art Market', shortName: 'Art Market', name: 'In the Park · Art Market', range: 'Booths 1–61 & K1–K8 · 69 booths' },
];

export default function MapCanvas({ mapRef, wrapRef, viewBox, filter, showBlobs, showNumbers, detail, unitsPerPx = 1, selectedBoothId, onPinClick, onAreaClick, onBoothClick }) {
  // k converts a CSS pixel into map units at the current zoom.
  const k = unitsPerPx;
  const pinR = (PIN_PX / 2) * k;
  const clusterR = (CLUSTER_PX / 2) * k;
  const dim = (cat) => (filter && filter !== cat ? 0.28 : 1);
  const clusterDim = filter ? 0.28 : 1;

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
            <feDropShadow dx={0} dy={2 * k} stdDeviation={2.2 * k} floodColor="#23385B" floodOpacity={0.3} />
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
        {showBlobs ? <Blobs paths={BLOBS.food} color="#C97636" />
          : boxes(BOOTHS.food, '#C97636', { numbers: showNumbers, onTap: onBoothClick, k, selectedId: selectedBoothId })}
        {detail && (
          <text x={872} y={228} fontSize={11 * k} fontWeight={800} fill="#a86f36" textAnchor="middle" stroke="#fff" strokeWidth={3 * k} paintOrder="stroke">FOOD COURT</text>
        )}

        {CLUSTERS.map((cl) => (
          <g key={cl.id} className="ff-tap ff-area" data-area={cl.id} opacity={clusterDim} onClick={() => onAreaClick(cl)}>
            {showBlobs ? <Blobs paths={cl.blobs} color={SLATE} clip={cl.clip} />
              : boxes(cl.booths, SLATE, { numbers: showNumbers, onTap: onBoothClick, k, selectedId: selectedBoothId })}
            <g filter="url(#ds)">
              <circle cx={cl.mk[0]} cy={cl.mk[1]} r={clusterR} fill={SLATE} />
              <IconAt name="art" x={cl.mk[0]} y={cl.mk[1]} size={PIN_ICON_PX * k} />
            </g>
          </g>
        ))}

        {PINS.map((p, i) => {
          if (detail && p.c === 'food') return null;
          const color = PIN_COLOR[p.c] || '#23385B';
          const o = dim(p.c);
          return (
            <g key={i} className="ff-tap ff-pin" opacity={o} onClick={() => onPinClick(p)}>
              <g filter="url(#ds)">
                <circle cx={p.x} cy={p.y} r={pinR} fill={color} />
                <IconAt name={p.c} x={p.x} y={p.y} size={PIN_ICON_PX * k} />
              </g>
            </g>
          );
        })}

      </svg>
    </div>
  );
}

export { CLUSTERS };
