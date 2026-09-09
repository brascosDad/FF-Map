import { useEffect, useState } from 'react';
import { useMapView } from './hooks/useMapView';
import MapCanvas from './components/MapCanvas';
import FilterChips from './components/FilterChips';
import ZoomControls from './components/ZoomControls';
import DetailSheet from './components/DetailSheet';
import Icon from './components/Icon';
import './styles/map.css';

// Three breakpoints. Mobile keeps the bottom sheet; tablet and desktop dock the
// same content into a persistent side panel, which is what the desktop
// wireframe's right panel is for.
const PANEL_AT = '(min-width: 768px)';
const DESKTOP_AT = '(min-width: 1180px)';
const PANEL_W = { tablet: 300, desktop: 380 };
const GAP = 16; // matches --ff-gap in map.css
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
  const isDesktop = useMedia(DESKTOP_AT);
  // The panel floats over a full-bleed map, so tell the map how much of its
  // right edge is covered and it will fit the festival into what is left.
  const insetRight = docked ? (isDesktop ? PANEL_W.desktop : PANEL_W.tablet) + GAP * 2 : 0;
  const { mapRef, wrapRef, suppressClickRef, viewBox, levelIdx, overview, detail, stepLevel, resetToOverview } =
    useMapView({ insetRight, overviewZoom: docked ? 1 : MOBILE_OVERVIEW_ZOOM });
  const [filter, setFilter] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [openArea, setOpenArea] = useState(null);
  const [openBooth, setOpenBooth] = useState(null);
  const [gps, setGps] = useState(false);

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

  function handleBoothClick(booth) {
    if (suppressClickRef.current) return;
    setFilter(null);
    setOpenId(null);
    setOpenArea(null);
    setOpenBooth(booth);
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
          showBlobs={overview && !isDesktop}
          showNames={!overview}
          showNumbers={detail}
          detail={detail}
          gps={gps}
          onPinClick={handlePinClick}
          onAreaClick={handleAreaClick}
          onBoothClick={handleBoothClick}
        />

        <div className="topbar" onClick={(e) => e.stopPropagation()}>
          <div className="tbrow">
            <button className="navbtn" title="Reset to overview" onClick={handleBack}>
              <Icon name="caretright" size={15} className="ci" />
            </button>
            <div className="brandline"><b>Fall Fest</b> <span>· Oct 4–5, 2026</span></div>
          </div>
          <FilterChips active={filter} onToggle={handleChipToggle} />
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <ZoomControls levelIdx={levelIdx} onStep={stepLevel} />
        </div>

        <button
          className={`float locate${gps ? ' on' : ''}`}
          title="You are here"
          onClick={(e) => { e.stopPropagation(); setGps((v) => !v); }}
        >
          <Icon name="locate" size={22} />
        </button>

        </div>

        <div className="sheetwrap" onClick={(e) => e.stopPropagation()}>
          <DetailSheet docked={docked} openId={openId} openArea={openArea} openBooth={openBooth} onClose={closeAll} />
        </div>
      </div>
    </div>
  );
}
