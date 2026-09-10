import { LEVEL_RATIOS } from '../hooks/useMapView';
import Icon from './Icon';

/**
 * Segmented zoom control: in, out, and reset-to-overview.
 *
 * Reset used to be a lone caret in the topbar. It is a map control, so it lives
 * with the map controls. There is deliberately no zoom-level readout -- real
 * maps don't use one, and the buttons already say where you are by dimming.
 *
 * At a limit a button is aria-disabled and dimmed but stays focusable, so a
 * keyboard user can still reach it and hear why it is unavailable.
 */
export default function ZoomControls({ levelIdx, onStep, onReset }) {
  const atMax = levelIdx >= LEVEL_RATIOS.length - 1;
  const atMin = levelIdx <= 0;
  return (
    <div className="float ffc-zoom zoomctl">
      <button aria-label="Zoom in" aria-disabled={atMax} onClick={() => !atMax && onStep(1)}>+</button>
      <button aria-label="Zoom out" aria-disabled={atMin} onClick={() => !atMin && onStep(-1)}>&minus;</button>
      {/* Crosshair rather than the map-trifold the spec names: that glyph is not
          in the bundled Phosphor subset, and the crosshair was freed up when GPS
          was cut. It reads as "recentre", which is what this does.

          Never disabled, even at the overview: it also clears any active filter
          and recentres after a pan, so it is not a no-op just because the zoom
          is already out. */}
      <button aria-label="Reset to overview" onClick={onReset}>
        <Icon name="locate" size={19} color="currentColor" />
      </button>
    </div>
  );
}
