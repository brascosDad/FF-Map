import { TRACE_BASE } from '../assets/basemapTrace';
import { BLOBS } from '../assets/basemapBlobs';
import { BOOTHS } from '../data/booths';
import { PINS, PIN_COLOR, PIN_R, SLATE } from '../assets/pins';
import { IconAt } from './Icon';

// Side of one booth / food-truck square, in map units. The export draws its own
// ticks at 7.2-8.9 depending on the row; one size across all of them keeps the
// rows reading as a single system.
const TICK = 8;

// Street labels: dark, no halo, sitting in the street band. Deliberately not the
// category slate -- these are ground, not content.
const STREET_LABEL = '#5C6570';

function boxes(booths, color, { numbers = false, onTap } = {}) {
  return booths.map((b) => (
    <g key={b.id} className={onTap ? 'ff-tap' : undefined}
       onClick={onTap ? (e) => { e.stopPropagation(); onTap(b); } : undefined}>
      <rect x={b.x - TICK / 2} y={b.y - TICK / 2} width={TICK} height={TICK}
            rx={1.6} fill={color} fillOpacity={0.6} />
      {/* Generous invisible hit area -- an 8-unit square is an unhittable
          target on a phone even at the closest zoom. */}
      {onTap && <rect x={b.x - 9} y={b.y - 9} width={18} height={18} fill="transparent" />}
      {numbers && (
        <text x={b.x} y={b.y - 7} fontSize={7} fontWeight={700} fill="#3b4a63"
              textAnchor="middle" stroke="#fff" strokeWidth={2} paintOrder="stroke">{b.n}</text>
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

function Label({ x, y, text }) {
  return (
    <text x={x} y={y + PIN_R + 22} fontSize={17} fontWeight={700} fill="#33445f" stroke="#fff" strokeWidth={5} paintOrder="stroke" textAnchor="middle">
      {text}
    </text>
  );
}

export default function MapCanvas({ mapRef, wrapRef, viewBox, filter, showBlobs, showNames, showNumbers, detail, gps, onPinClick, onAreaClick, onBoothClick }) {
  const dim = (cat) => (filter && filter !== cat ? 0.28 : 1);
  const clusterDim = filter ? 0.28 : 1;

  return (
    <div className="mapwrap" ref={wrapRef}>
      <svg
        ref={mapRef}
        className="ff-map"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="ds" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx={0} dy={4} stdDeviation={4.3} floodColor="#23385B" floodOpacity={0.3} />
          </filter>
          {/* The two street markets are clipped to their own street band, taken
              from the export's stroke geometry: Candler Park Dr is centred on
              x 411.556 and McLendon on y 789.889, both 28 units wide. A blob
              physically cannot spill onto the grass or across a kerb. */}
          <clipPath id="clip-cpd"><rect x={397.556} y={-580} width={28} height={1354} /></clipPath>
          <clipPath id="clip-mcl"><rect x={-486} y={775.889} width={2308} height={28} /></clipPath>
        </defs>
        <g dangerouslySetInnerHTML={{ __html: TRACE_BASE }} />

        {/* Street and place names. These survive at every zoom -- they are
            wayfinding, not redundant with the pin icons or the panel key.
            Both streets are set the same way: dark, no white halo, sitting
            inside the street band itself. McLendon is placed east of the
            Acoustic stage so it clears the booth rows. */}
        <text x={758} y={194} fontSize={16} fontWeight={500} fill={STREET_LABEL} textAnchor="middle">Pool</text>
        <text x={411.5} y={130} fontSize={15} fill={STREET_LABEL} textAnchor="middle" transform="rotate(-90 411.5 130)">Candler Park Dr Northeast</text>
        <text x={995} y={795} fontSize={15} fill={STREET_LABEL} textAnchor="start">McLendon Ave Northeast</text>

        {/* Food court: blob at overview, individual stalls once you step in */}
        {showBlobs ? <Blobs paths={BLOBS.food} color="#C97636" />
          : boxes(BOOTHS.food, '#C97636', { numbers: showNumbers, onTap: onBoothClick })}
        {detail && (
          <text x={872} y={228} fontSize={11} fontWeight={800} fill="#a86f36" textAnchor="middle" stroke="#fff" strokeWidth={3} paintOrder="stroke">FOOD COURT</text>
        )}

        {CLUSTERS.map((cl) => (
          <g key={cl.id} className="ff-tap" data-area={cl.id} opacity={clusterDim} onClick={() => onAreaClick(cl)}>
            {showBlobs ? <Blobs paths={cl.blobs} color={SLATE} clip={cl.clip} />
              : boxes(cl.booths, SLATE, { numbers: showNumbers, onTap: onBoothClick })}
            <g filter="url(#ds)">
              <circle cx={cl.mk[0]} cy={cl.mk[1]} r={PIN_R - 2} fill={SLATE} />
              <IconAt name="art" x={cl.mk[0]} y={cl.mk[1]} size={24} />
            </g>
            {showNames && <Label x={cl.mk[0]} y={cl.mk[1]} text={cl.label || cl.shortName} />}
          </g>
        ))}

        {PINS.map((p, i) => {
          if (detail && p.c === 'food') return null;
          const color = PIN_COLOR[p.c] || '#23385B';
          const o = dim(p.c);
          return (
            <g key={i} className="ff-tap" opacity={o} onClick={() => onPinClick(p)}>
              <g filter="url(#ds)">
                <circle cx={p.x} cy={p.y} r={PIN_R} fill={color} />
                <IconAt name={p.c} x={p.x} y={p.y} size={26} />
              </g>
              {showNames && p.label && <Label x={p.x} y={p.y} text={p.label} />}
            </g>
          );
        })}

        {gps && (
          <g>
            <circle cx={725} cy={600} r={33} fill="#E89370" opacity={0.22} />
            <circle cx={725} cy={600} r={15} fill="#E89370" stroke="#fff" strokeWidth={5} />
          </g>
        )}
      </svg>
    </div>
  );
}

export { CLUSTERS };
