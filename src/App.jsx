import { useEffect, useState } from 'react';
import { useMapView } from './hooks/useMapView';
import MapCanvas from './components/MapCanvas';
import FilterChips from './components/FilterChips';
import ZoomControls from './components/ZoomControls';
import DetailSheet from './components/DetailSheet';
import { BOOTHS } from './data/booths';
import { PINS } from './assets/pins';
import { FESTIVAL } from './data/festival';
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

// The brand lockup links back to the festival site (confirmed by Ernest 9/11);
// the address lives with the festival's other facts in data/festival.js.

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
  const { mapRef, wrapRef, suppressClickRef, viewBox, levelIdx, overview, detail, unitsPerPx, areaMarkerFade, stepLevel, ensureVisible, focusOn, revealAt, resetToOverview } =
    useMapView({ insetRight, overviewZoom: docked ? 1 : MOBILE_OVERVIEW_ZOOM });
  const [filter, setFilter] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [openArea, setOpenArea] = useState(null);
  const [openBooth, setOpenBooth] = useState(null);
  // The one pin that was tapped (or chosen from the directory): it wears the
  // selected ring and is the point the map is brought to. `openId` alone is
  // the card -- several pins share one card (every restroom is 'wc'), and a
  // category row opens the card with no pin, ringing all of them.
  const [selectedPin, setSelectedPin] = useState(null);
  // A pin to bring into view once its sheet has rendered (see the effect below).
  const [reveal, setReveal] = useState(null);

  function closeAll() {
    setOpenId(null);
    setOpenArea(null);
    setOpenBooth(null);
    setSelectedPin(null);
  }

  // The interaction model (CLAUDE.md, "Chips, pin taps and the sheet"). A tap
  // on a pin never touches the chip: with a chip on, the pin you tapped is one
  // of its own (dimmed pins take no taps), and clearing the chip here is what
  // made the tapped pin vanish -- it was only on the map because the chip
  // asked for it (Ernest, iPhone, 9/22). The map then pans so the pin sits in
  // the visible area above the sheet.
  function handlePinClick(pin) {
    if (suppressClickRef.current) return;
    setOpenArea(null);
    setOpenBooth(null);
    setOpenId(pin.d);
    setSelectedPin(pin);
    setReveal({ x: pin.x, y: pin.y, n: (reveal?.n || 0) + 1 });
  }

  // Bring the selected pin into the band above the open sheet. Measured after
  // the sheet has rendered its content, and once more after a swap (the sheet
  // holds the old content for --motion-sheet-out before the new card rises),
  // since the band's bottom is the sheet's own height.
  useEffect(() => {
    if (!reveal) return;
    const go = () => {
      const bar = wrapRef.current?.querySelector('.topbar');
      const sheet = document.querySelector('.sheet:not(.docked)');
      const top = (bar ? Math.round(bar.getBoundingClientRect().bottom) : 96) + 24;
      const bottom = (sheet ? Math.round(sheet.getBoundingClientRect().height) : 0) + 24;
      revealAt(reveal.x, reveal.y, { top, bottom });
    };
    const a = requestAnimationFrame(() => requestAnimationFrame(go));
    const b = setTimeout(go, 220);
    return () => { cancelAnimationFrame(a); clearTimeout(b); };
  }, [reveal, revealAt, wrapRef]);

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
   * errand. The area is read off the booth id ('spine-004' -> 'spine').
   */
  function stepBooth(dir) {
    if (!openBooth) return;
    const group = BOOTHS[openBooth.id.split('-')[0]];
    if (!group) return;
    const i = group.findIndex((b) => b.id === openBooth.id);
    const next = group[(i + dir + group.length) % group.length];
    setOpenBooth(next);
    // Hold the map still while the next booth is already on screen -- it just
    // lights up. Only when the row walks off the edge does the view move, and
    // then it moves once.
    ensureVisible(next.x, next.y, coveredEdges());
  }

  /**
   * How much room a booth needs around it to count as "in view", in CSS pixels.
   *
   * Deliberately NOT the sheet. Counting the open sheet as cover meant the
   * visible band on a 844px phone was 327px, so a row stepping diagonally left
   * it after two or three presses and the map lurched -- which is exactly the
   * lurch the stepper is supposed to avoid. A booth under the sheet is still on
   * screen: the sheet is a few hundred ms of drag away, and the selection ring
   * is waiting there when you dismiss it.
   *
   * The top bar is the one exception, because it is fixed and you cannot get it
   * out of the way. Measure it rather than guess -- it has three different
   * heights across the breakpoints. The 24px on the other three sides is one
   * pin radius, so the marker is whole rather than half off the edge.
   */
  function coveredEdges() {
    const bar = wrapRef.current?.querySelector('.topbar');
    const top = bar ? Math.round(bar.getBoundingClientRect().bottom) + 12 : 96;
    return { top, right: 24, bottom: 24, left: 24 };
  }

  function handleBoothClick(booth) {
    if (suppressClickRef.current) return;
    setFilter(null);
    setOpenId(null);
    setOpenArea(null);
    setOpenBooth(booth);
  }

  /**
   * A row in an area's booth list. Opens that booth and flies to it at the
   * booth zoom, so the number you just tapped is the one lit up on the map.
   */
  function handleBoothFromList(booth) {
    setFilter(null);
    setOpenId(null);
    setOpenArea(null);
    setOpenBooth(booth);
    focusOn(booth.x, booth.y, 2);
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
      focusOn(row.at[0], row.at[1]);
      return;
    }
    setOpenArea(null);
    setOpenId(row.d);
    if (row.kind === 'cat') {
      setFilter(row.filter);
      setSelectedPin(null);              // no one pin: every pin in the category rings
    } else {
      setFilter(null);
      setSelectedPin(PINS.find((p) => p.d === row.d) || null);
      focusOn(row.at[0], row.at[1]);
    }
  }

  // A chip going ON shows its whole category, so the map goes to the overview
  // where all of it fits. A chip going OFF (tapping it again) leaves the map
  // where it is and returns to the normal per-stop visibility.
  function handleChipToggle(catId) {
    const turningOff = filter === catId;
    setFilter(turningOff ? null : catId);
    closeAll();
    if (!turningOff) resetToOverview();
  }

  function handleBack() {
    setFilter(null);
    closeAll();
    resetToOverview();
  }

  // A tap on empty map clears one layer at a time: an open sheet closes (the
  // chip stays on, its pins stay, the map stays); with nothing open, the chip
  // goes off. A pan or pinch is never a tap (suppressClickRef), so the layers
  // survive a drag that happens to start on bare map.
  function handleBackgroundClick() {
    if (suppressClickRef.current) return;
    if (openId || openArea || openBooth) closeAll();
    else if (filter) setFilter(null);
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
          overview={overview}
          docked={docked}
          showBlobs={overview && !docked}
          unitsPerPx={unitsPerPx}
          areaMarkerFade={areaMarkerFade}
          showNumbers={detail}
          detail={detail}
          onPinClick={handlePinClick}
          onAreaClick={handleAreaClick}
          onBoothClick={handleBoothClick}
          selectedBoothId={openBooth?.id}
          selectedPoiId={openId}
          selectedPin={selectedPin}
          selectedAreaId={openArea?.id}
        />

        <div className="topbar" onClick={(e) => e.stopPropagation()}>
          <div className="tbrow">
            {/* No pill, no dates: the title sits directly on the map. The dates
                are already in the panel header, and once is enough. */}
            <a className="ffc-brand" href={FESTIVAL.siteUrl} target="_blank" rel="noreferrer">
              <span className="ffc-brand__name">Fall Fest</span>
            </a>
            {/* The dates, small, beside the wordmark -- on the same row so the
                chips do not move down. The docked panel already carries them,
                so this hides at the desktop breakpoint (see .ffc-brand__date). */}
            <span className="ffc-brand__date">{FESTIVAL.dates}</span>
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
            selectedPin={selectedPin}
            onSelect={handleDirectorySelect}
            onOpenBooth={handleBoothFromList}
            onClose={closeAll}
            onFocusReturn={() => mapRef.current?.focus({ preventScroll: true })}
          />
        </div>
      </div>
    </div>
  );
}
