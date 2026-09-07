import { TRACE_BASE } from '../assets/basemapTrace';
import { CPD, MCL, SPN, FOOD } from '../assets/basemapCoords';
import { BLOBS } from '../assets/basemapBlobs';
import { PINS, PIN_COLOR, PIN_R, SLATE } from '../assets/pins';
import { IconAt } from './Icon';

// Side of one booth / food-truck square, in map units. The export draws its own
// ticks at 7.2-8.9 depending on the row; one size across all of them keeps the
// rows reading as a single system.
const TICK = 8;

function boxes(coords, color) {
  return coords.map(([cx, cy], i) => (
    <rect
      key={i}
      x={cx - TICK / 2}
      y={cy - TICK / 2}
      width={TICK}
      height={TICK}
      rx={1.6}
      fill={color}
      fillOpacity={0.6}
    />
  ));
}

// At the furthest-out level the individual squares are illegible, so each area
// collapses to a single blob: filled soft, stroked firm. Organic shape, ordered
// edge -- and tight enough to its own footprint that it never reads as spilling
// into the area next door.
function Blobs({ paths, color }) {
  return paths.map((d, i) => (
    <path key={i} d={d} fill={color} fillOpacity={0.28} stroke={color} strokeOpacity={0.55} strokeWidth={2} />
  ));
}

const CLUSTERS = [
  { id: 'cpd', blobs: BLOBS.cpd, coords: CPD, mk: [411.5, 541.5], label: null, shortName: 'Candler Park Dr', name: 'Candler Park Dr · Art Market', range: 'Booths 89–164 · 76 booths' },
  { id: 'mcl', blobs: BLOBS.mcl, coords: MCL, mk: [666.4, 787.9], label: null, shortName: 'McLendon Ave', name: 'McLendon Ave · Art Market', range: 'Booths 62–88 · 27 booths' },
  { id: 'spine', blobs: BLOBS.spine, coords: SPN, mk: [774.9, 509.3], label: 'Art Market', shortName: 'Art Market', name: 'In the Park · Art Market', range: 'Booths 1–61 & K1–K8 · 69 booths' },
];

function Label({ x, y, text }) {
  return (
    <text x={x} y={y + PIN_R + 22} fontSize={17} fontWeight={700} fill="#33445f" stroke="#fff" strokeWidth={5} paintOrder="stroke" textAnchor="middle">
      {text}
    </text>
  );
}

export default function MapCanvas({ mapRef, wrapRef, viewBox, filter, overview, detail, gps, onPinClick, onAreaClick }) {
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
        </defs>
        <g dangerouslySetInnerHTML={{ __html: TRACE_BASE }} />

        {/* Street / feature names. The export carries these as outlined text; they
            are re-set as live <text> here so they stay crisp and restyleable. */}
        <text x={758} y={194} fontSize={16} fontWeight={500} fill="#7f8b78" textAnchor="middle" stroke="#fff" strokeWidth={3.6} paintOrder="stroke">Pool</text>
        <text x={411} y={130} fontSize={15} fill="#8b91a1" textAnchor="middle" stroke="#fff" strokeWidth={3.4} paintOrder="stroke" transform="rotate(-90 411 130)">Candler Park Dr NE</text>
        <text x={610} y={818} fontSize={15} fill="#8b91a1" textAnchor="middle" stroke="#fff" strokeWidth={3.4} paintOrder="stroke">McLendon Ave NE</text>

        {/* Food court: blob at overview, individual stalls once you step in */}
        {overview ? <Blobs paths={BLOBS.food} color="#C97636" /> : boxes(FOOD, '#C97636')}
        {detail && (
          <text x={872} y={228} fontSize={11} fontWeight={800} fill="#a86f36" textAnchor="middle" stroke="#fff" strokeWidth={3} paintOrder="stroke">FOOD COURT</text>
        )}

        {CLUSTERS.map((cl) => (
          <g key={cl.id} className="ff-tap" data-area={cl.id} opacity={clusterDim} onClick={() => onAreaClick(cl)}>
            {overview ? <Blobs paths={cl.blobs} color={SLATE} /> : boxes(cl.coords, SLATE)}
            <g filter="url(#ds)">
              <circle cx={cl.mk[0]} cy={cl.mk[1]} r={PIN_R - 2} fill={SLATE} />
              <IconAt name="art" x={cl.mk[0]} y={cl.mk[1]} size={24} />
            </g>
            {(cl.label || detail) && <Label x={cl.mk[0]} y={cl.mk[1]} text={cl.label || cl.shortName} />}
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
              {p.label && <Label x={p.x} y={p.y} text={p.label} />}
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
