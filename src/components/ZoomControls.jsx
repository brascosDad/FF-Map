import { LEVEL_RATIOS, LEVEL_LABELS } from '../hooks/useMapView';

export default function ZoomControls({ levelIdx, onStep }) {
  return (
    <>
      <div className="float zlevel">
        <span>{LEVEL_LABELS[levelIdx] || `Level ${levelIdx + 1}`} · {levelIdx + 1}/{LEVEL_RATIOS.length}</span>
        <span className="zdots">
          {LEVEL_RATIOS.map((_, i) => <span key={i} className={`zdot${i === levelIdx ? ' on' : ''}`} />)}
        </span>
      </div>
      <div className="float zoomctl">
        <button className={`zbtn${levelIdx >= LEVEL_RATIOS.length - 1 ? ' disabled' : ''}`} onClick={() => onStep(1)} aria-label="Zoom in">+</button>
        <button className={`zbtn${levelIdx <= 0 ? ' disabled' : ''}`} onClick={() => onStep(-1)} aria-label="Zoom out">&minus;</button>
      </div>
    </>
  );
}
