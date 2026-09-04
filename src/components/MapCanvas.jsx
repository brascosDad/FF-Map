import { TRACE_BASE } from '../assets/basemapTrace';
import { CPD, MCL, SPN, FOOD } from '../assets/basemapCoords';
import { PINS, PIN_COLOR, SLATE } from '../assets/pins';
import { IconAt } from './Icon';

// Faint background context blocks + roads surrounding the traced park footprint,
// so the map doesn't float in empty space when zoomed/panned. Ported directly
// from the prototype's buildContext().
function ContextLayer() {
  const blocks = [
    [-120, -360, 110, 300], [-120, -40, 110, 260], [-120, 260, 105, 240], [-120, 520, 120, 180],
    [352, -360, 150, 320], [352, -20, 110, 300], [352, 340, 110, 220], [352, 580, 140, 120],
    [-20, 472, 132, 150], [132, 472, 116, 150], [262, 472, 150, 150],
    [30, -210, 150, 130], [196, -230, 175, 130],
  ];
  const roads = [
    ['M25,-360 L25,470', 16], ['M-260,420 L600,420', 18],
    ['M-260,150 L25,150', 12], ['M25,58 L600,58', 12], ['M250,-360 L250,420', 12],
    ['M-260,300 L25,300', 11], ['M250,420 L250,700', 12], ['M25,-160 L600,-160', 12],
  ];
  return (
    <>
      <rect x={-260} y={-360} width={860} height={1180} fill="#ECEAE1" />
      {blocks.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill="#E4E1D7" />)}
      {roads.map(([d, w], i) => <path key={i} d={d} stroke="#D9D6CC" strokeWidth={w} fill="none" strokeLinecap="square" />)}
    </>
  );
}

function boxes(coords, color) {
  return coords.map(([cx, cy], i) => (
    <rect key={i} x={cx - 2.5} y={cy - 2.5} width={5} height={5} rx={0.8} fill={color} fillOpacity={0.6} />
  ));
}

const CLUSTERS = [
  { id: 'cpd', coords: CPD, mk: [25, 284], label: null, name: 'Candler Park Dr · Art Market', range: 'Booths 89–164 · 76 booths' },
  { id: 'mcl', coords: MCL, mk: [83, 426], label: null, name: 'McLendon Ave · Art Market', range: 'Booths 62–88 · 27 booths' },
  { id: 'spine', coords: SPN, mk: [211, 289], label: 'Art Market', name: 'In the Park · Art Market', range: 'Booths 1–61 & K1–K8 · 69 booths' },
];

function Label({ x, y, text }) {
  return (
    <text x={x} y={y + 24} fontSize={8.5} fontWeight={700} fill="#33445f" stroke="#fff" strokeWidth={2.6} paintOrder="stroke" textAnchor="middle">
      {text}
    </text>
  );
}

export default function MapCanvas({ mapRef, wrapRef, viewBox, filter, detail, gps, onPinClick, onAreaClick }) {
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
            <feDropShadow dx={0} dy={2} stdDeviation={2.2} floodColor="#23385B" floodOpacity={0.3} />
          </filter>
        </defs>
        <ContextLayer />
        <g dangerouslySetInnerHTML={{ __html: TRACE_BASE }} />
        <text x={223} y={82} fontSize={8} fontWeight={500} fill="#9aa08f" textAnchor="middle" stroke="#fff" strokeWidth={1.8} paintOrder="stroke">Pool</text>
        <text x={24} y={74} fontSize={7.5} fill="#8b91a1" textAnchor="middle" transform="rotate(-90 24 74)">Candler Park Dr NE</text>
        <text x={165} y={418} fontSize={7.5} fill="#8b91a1" textAnchor="middle">McLendon Ave NE</text>

        {/* Food court: dot-cluster at overview/zone levels, real list once you're zoomed to Detail+ */}
        {detail ? (
          <>
            <text x={305} y={76} fontSize={5} fontWeight={800} fill="#b07a3f" textAnchor="end" stroke="#fff" strokeWidth={1.4} paintOrder="stroke">FOOD COURT</text>
          </>
        ) : (
          boxes(FOOD, '#C97636')
        )}

        {CLUSTERS.map((cl) => (
          <g key={cl.id} className="ff-tap" data-area={cl.id} opacity={clusterDim} onClick={() => onAreaClick(cl)}>
            {boxes(cl.coords, SLATE)}
            <g filter="url(#ds)">
              <circle cx={cl.mk[0]} cy={cl.mk[1]} r={11} fill={SLATE} />
              <IconAt name="art" x={cl.mk[0]} y={cl.mk[1]} size={13} />
            </g>
            {cl.label && <Label x={cl.mk[0]} y={cl.mk[1]} text={cl.label} />}
          </g>
        ))}

        {PINS.map((p, i) => {
          if (detail && p.c === 'food') return null;
          const color = PIN_COLOR[p.c] || '#23385B';
          const o = dim(p.c);
          return (
            <g key={i} className="ff-tap" opacity={o} onClick={() => onPinClick(p)}>
              <g filter="url(#ds)">
                <circle cx={p.x} cy={p.y} r={12} fill={color} />
                <IconAt name={p.c} x={p.x} y={p.y} size={14} />
              </g>
              {p.label && <Label x={p.x} y={p.y} text={p.label} />}
            </g>
          );
        })}

        {gps && (
          <g>
            <circle cx={150} cy={316} r={17} fill="#E89370" opacity={0.22} />
            <circle cx={150} cy={316} r={8} fill="#E89370" stroke="#fff" strokeWidth={2.5} />
          </g>
        )}
      </svg>
    </div>
  );
}

export { CLUSTERS };
