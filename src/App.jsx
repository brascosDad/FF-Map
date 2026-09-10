import { useEffect, useState } from 'react';
import { useMapView } from './hooks/useMapView';
import MapCanvas from './components/MapCanvas';
import FilterChips from './components/FilterChips';
import ZoomControls from './components/ZoomControls';
import DetailSheet from './components/DetailSheet';
import { BOOTHS } from './data/booths';
import './styles/map.css';

// Three breakpoints. Mobile keeps the bottom sheet; tablet and desktop dock the
// same content into a persistent side panel, which is what the desktop
// wireframe's right panel is for.
// One breakpoint, not two. Below it the detail arrives as a bottom sheet (full
// width on a phone, 560 max and centred on a tablet); at and above it the panel
// docks to the right. Tablet portrait is too narrow to give up 360px.
const PANEL_AT = '(min-width: 1024px)';
const PANEL_W = 360;  // --panel-width
const GAP = 20;       // --ff-gap / --space-5
// Phone screens get the map drawn ~10% larger at the overview. The festival
// still fits, but only just -- about 10 map units (~6px) of margin either side.
const MOBILE_OVERVIEW_ZOOM = 1.1;

function useMedia(query) {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = (e) => setOn(e.matches);
    mq.addEventListener('change', h);
    setOn(mq.matches);
    return () => mq.removeEventListener('change', h);
  }, [query]);
  return on;
}

export default function App() {
  const docked = useMedia(PANEL_AT);
  // The panel floats over a full-bleed map, so tell the map how much of its
  // right edge is covered and it will fit the festival into what is left.
  const insetRight = docked ? PANEL_W + GAP * 2 : 0;
  const { mapRef, wrapRef, suppressClickRef, viewBox, levelIdx, overview, detail, unitsPerPx, stepLevel, centerOn, resetToOverview } =
    useMapView({ insetRight, overviewZoom: docked ? 1 : MOBILE_OVERVIEW_ZOOM });
  const [filter, setFilter] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [openArea, setOpenArea] = useState(null);
  const [openBooth, setOpenBooth] = useState(null);

  function closeAll() {
    setOpenId(null);
    setOpenArea(null);
    setOpenBooth(null);
  }

  function handlePinClick(pin) {
    if (suppressClickRef.current) return;
    setFilter(null);
    setOpenArea(null);
    setOpenBooth(null);
    setOpenId(pin.d);
  }

  function handleAreaClick(cluster) {
    if (suppressClickRef.current) return;
    setFilter(null);
    setOpenId(null);
    setOpenBooth(null);
    setOpenArea(cluster);
  }

  /**
   * Step to the next/previous booth, wrapping WITHIN the booth's own area.
   * Stepping off the end of the art market on the car path returns you to its
   * start -- it does not spill into the food trucks, which are a different
   * errand. The area is read off the booth id ('spine-04' -> 'spine').
   */
  function stepBooth(dir) {
    if (!openBooth) return;
    const group = BOOTHS[openBooth.id.split('-')[0]];
    if (!group) return;
    const i = group.findIndex((b) => b.id === openBooth.id);
    const next = group[(i + dir + group.length) % group.length];
    setOpenBooth(next);
    centerOn(next.x, next.y);
  }

  function handleBoothClick(booth) {
    if (suppressClickRef.current) return;
    setFilter(null);
    setOpenId(null);
    setOpenArea(null);
    setOpenBooth(booth);
  }

  /**
   * A row in the docked directory. Three shapes, because three things are being
   * pointed at:
   *   poi   one pin -- fly to it and open its detail
   *   cat   several pins of one category (restrooms, beer) -- there is no single
   *         point to fly to, so filter the map to them and open the shared
   *         detail; the map stays where it is rather than picking a favourite
   *   area  an art-market run -- fly to its marker and open the area
   */
  function handleDirectorySelect(row) {
    setOpenBooth(null);
    if (row.kind === 'area') {
      setFilter(null);
      setOpenId(null);
      setOpenArea(row.area);
      centerOn(row.at[0], row.at[1]);
      return;
    }
    setOpenArea(null);
    setOpenId(row.d);
    if (row.kind === 'cat') {
      setFilter(row.filter);
    } else {
      setFilter(null);
      centerOn(row.at[0], row.at[1]);
    }
  }

  function handleChipToggle(catId) {
    setFilter((cur) => (cur === catId ? null : catId));
    closeAll();
    resetToOverview();
  }

  function handleBack() {
    setFilter(null);
    closeAll();
    resetToOverview();
  }

  function handleBackgroundClick() {
    if (filter || openId || openArea || openBooth) {
      setFilter(null);
      closeAll();
    }
  }

  return (
    <div className="ff-app">
      <div className={`ff-screen${docked ? ' docked' : ''}`} onClick={handleBackgroundClick}>
        <div className="mapstage">
        <MapCanvas
          mapRef={mapRef}
          wrapRef={wrapRef}
          viewBox={viewBox}
          filter={filter}
          showBlobs={overview && !docked}
          unitsPerPx={unitsPerPx}
          showNumbers={detail}
          detail={detail}
          onPinClick={handlePinClick}
          onAreaClick={handleAreaClick}
          onBoothClick={handleBoothClick}
          selectedBoothId={openBooth?.id}
          selectedPoiId={openId}
          selectedAreaId={openArea?.id}
        />

        <div className="topbar" onClick={(e) => e.stopPropagation()}>
          <div className="tbrow">
            <span className="ffc-brand">
              <span className="ffc-brand__name">Fall Fest</span>
              <span className="ffc-brand__dates">Oct 4–5, 2026</span>
            </span>
          </div>
          <FilterChips active={filter} onToggle={handleChipToggle} />
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <ZoomControls levelIdx={levelIdx} onStep={stepLevel} onReset={handleBack} />
        </div>

        </div>

        <div className="sheetwrap" onClick={(e) => e.stopPropagation()}>
          <DetailSheet
            docked={docked}
            openId={openId}
            openArea={openArea}
            openBooth={openBooth}
            onStepBooth={stepBooth}
            onSelect={handleDirectorySelect}
            onClose={closeAll}
            onFocusReturn={() => mapRef.current?.focus()}
          />
        </div>
      </div>
    </div>
  );
}
