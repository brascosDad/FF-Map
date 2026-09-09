import { LEVEL_RATIOS } from '../hooks/useMapView';

/**
 * Segmented zoom control. There is deliberately no zoom-level readout: a
 * "level 2 of 3" indicator is not a pattern real maps use, and the buttons
 * already say where you are by going dim at each end of the range.
 */
export default function ZoomControls({ levelIdx, onStep }) {
  return (
    <div className="float zoomctl">
      <button
        className={`zbtn${levelIdx >= LEVEL_RATIOS.length - 1 ? ' disabled' : ''}`}
        onClick={() => onStep(1)}
        aria-label="Zoom in"
      >+</button>
      <button
        className={`zbtn${levelIdx <= 0 ? ' disabled' : ''}`}
        onClick={() => onStep(-1)}
        aria-label="Zoom out"
      >&minus;</button>
    </div>
  );
}
