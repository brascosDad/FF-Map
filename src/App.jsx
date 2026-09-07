import { useState } from 'react';
import { useMapView } from './hooks/useMapView';
import MapCanvas from './components/MapCanvas';
import FilterChips from './components/FilterChips';
import ZoomControls from './components/ZoomControls';
import DetailSheet from './components/DetailSheet';
import Icon from './components/Icon';
import './styles/map.css';

export default function App() {
  const { mapRef, wrapRef, suppressClickRef, viewBox, levelIdx, overview, detail, stepLevel, resetToOverview } = useMapView();
  const [filter, setFilter] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [openArea, setOpenArea] = useState(null);
  const [gps, setGps] = useState(false);

  function closeAll() {
    setOpenId(null);
    setOpenArea(null);
  }

  function handlePinClick(pin) {
    if (suppressClickRef.current) return;
    setFilter(null);
    setOpenArea(null);
    setOpenId(pin.d);
  }

  function handleAreaClick(cluster) {
    if (suppressClickRef.current) return;
    setFilter(null);
    setOpenId(null);
    setOpenArea(cluster);
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
    if (filter || openId || openArea) {
      setFilter(null);
      closeAll();
    }
  }

  return (
    <div className="ff-app">
      <div className="ff-screen" onClick={handleBackgroundClick}>
        <MapCanvas
          mapRef={mapRef}
          wrapRef={wrapRef}
          viewBox={viewBox}
          filter={filter}
          overview={overview}
          detail={detail}
          gps={gps}
          onPinClick={handlePinClick}
          onAreaClick={handleAreaClick}
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

        <div onClick={(e) => e.stopPropagation()}>
          <DetailSheet openId={openId} openArea={openArea} onClose={closeAll} />
        </div>
      </div>
    </div>
  );
}
