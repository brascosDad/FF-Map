import { useEffect, useRef } from 'react';
import Icon from './Icon';
import { PIN_COLOR, SLATE } from '../assets/pins';
import { BOOTH_CAVEAT, BOOTHS } from '../data/booths';
import { DIRECTORY, LEGEND } from '../data/directory';
import stagesData from '../data/stages.json';
import vendorsData from '../data/vendors.json';

const STAGE_MAP = { stageMain: 'main-stage', stageAcoustic: 'acoustic-stage' };

const POI_COPY = {
  kids: { title: 'Kidlandia', sub: 'Family activity zone', icon: 'kids', cat: 'kids',
    lines: ['Flag football, dodgeball, and GaGa ball', 'Bounce houses — Frozen Castle, Basketball, Baseball, Slide, Millennium Falcon', 'Pumpkin smashing', 'Trees for Tuition'] },
  drinks: { title: 'Beer & Drinks', sub: 'Beer stations, kiosks, and draft trailers', icon: 'drinks', cat: 'drinks',
    lines: ['Multiple beer stations and beverage tents throughout the grounds', '21+ with ID — check with volunteers for wristband policy'] },
  wc: { title: 'Restrooms', sub: 'Five-toilet banks + ADA units', icon: 'wc', cat: 'wc',
    lines: ['Multiple five-toilet banks plus ADA-accessible toilets', 'Selecting restrooms rings every one of them on the map'] },
  firstaid: { title: 'First Aid / EMS', sub: 'On-site medical support', icon: 'firstaid', cat: 'firstaid',
    lines: ['EMS staffed on-site for the duration of the festival', 'Dial 911 for emergencies'] },
  water: { title: 'Water Station', sub: 'Free refill', icon: 'water', cat: 'water',
    lines: ['Free water stations — bring a bottle to refill'] },
  info: { title: 'Info', sub: 'Volunteer / info booth', icon: 'info', cat: 'info',
    lines: ['Programs and general festival information', 'Ask here about lost & found'] },
  bikevalet: { title: 'Bike Valet', sub: 'Free, attended bike parking', icon: 'bikevalet', cat: 'bikevalet',
    lines: ['Free valet bike parking — roll up, a volunteer tags and racks it for you', 'Look for it just off McLendon, by the info booth'] },
};

function StageSchedule({ stageKey }) {
  const stageId = STAGE_MAP[stageKey];
  const stage = stagesData.stages.find((s) => s.id === stageId);
  if (!stage) return null;
  return (
    <>
      <div className="hd"><span className="dot" style={{ background: PIN_COLOR.stage }}><Icon name="stage" size={17} color="var(--icon-on-color)" /></span><h3>{stage.name}</h3></div>
      <div className="sub">{stage.sponsor ? `${stage.sponsor} · ` : ''}Confirmed 2026 schedule</div>
      {['saturday', 'sunday'].map((day) => (
        <div key={day}>
          <div className="day">{day === 'saturday' ? 'Saturday' : 'Sunday'}</div>
          {stage.lineup[day].map((slot, i) => (
            <div className="evt" key={i}>
              <span className="t">{slot.time}</span>
              <span className="a">
                {slot.act || <em>Open — to be confirmed</em>}
                {slot.note && <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{slot.note}</span>}
              </span>
            </div>
          ))}
        </div>
      ))}
      <div className="foot">Source: {stagesData.source}</div>
    </>
  );
}

function FoodCourt() {
  return (
    <>
      <div className="hd"><span className="dot" style={{ background: PIN_COLOR.food }}><Icon name="food" size={17} color="var(--icon-on-color)" /></span><h3>Food Court</h3></div>
      <div className="sub">{vendorsData.vendors.length} vendors listed</div>
      {vendorsData.vendors.map((v) => (
        <div className="li" key={v.id}><span className="b" />{v.name}{v.note ? ` (${v.note})` : ''}</div>
      ))}
      <div className="foot">{vendorsData.note}</div>
    </>
  );
}

function ArtMarketArea({ area }) {
  return (
    <>
      <div className="hd"><span className="dot" style={{ background: SLATE }}><Icon name="art" size={17} color="var(--icon-on-color)" /></span><h3>{area.name}</h3></div>
      <div className="sub">{area.range}</div>
      <div className="li"><span className="b" />Individual booth assignments load here once the 2026 vendor list is confirmed.</div>
    </>
  );
}

function GenericPoi({ id }) {
  const d = POI_COPY[id];
  if (!d) return null;
  return (
    <>
      <div className="hd"><span className="dot" style={{ background: PIN_COLOR[d.cat] }}><Icon name={d.icon} size={17} color="var(--icon-on-color)" /></span><h3>{d.title}</h3></div>
      <div className="sub">{d.sub}</div>
      {d.lines.map((line, i) => <div className="li" key={i}><span className="b" />{line}</div>)}
    </>
  );
}


// Resting state of the docked side panel -- and, on desktop, the primary way
// into everything on the map. A 40px circle in a park full of 40px circles is
// not a browsing surface; this list is. Every row centres the map on what it
// names and opens its detail.
//
// The bottom sheet does not show this. On a phone the map itself is the list:
// there is no room for a directory that would cover the thing it describes.

// 'art' is not a pin category -- the three market runs share the booth slate.
const dotColor = (cat) => (cat === 'art' ? SLATE : PIN_COLOR[cat] || SLATE);

function DirectoryRow({ row, onSelect }) {
  return (
    <button className="ffc-poirow" onClick={() => onSelect(row)}>
      <span className="dot" style={{ background: dotColor(row.cat) }}>
        <Icon name={row.cat === 'art' ? 'art' : row.cat} size={15} color="var(--icon-on-color)" />
      </span>
      <span className="ffc-poirow__text">
        <b>{row.name}</b>
        <em>{row.sub}</em>
      </span>
      <span className="ffc-poirow__go" aria-hidden="true">›</span>
    </button>
  );
}

function PanelDirectory({ onSelect }) {
  return (
    <>
      {DIRECTORY.map((section) => (
        <div className="dir-section" key={section.title}>
          <h4 className="dir-title">{section.title}</h4>
          {section.rows.map((row) => (
            <DirectoryRow key={`${section.title}-${row.id}`} row={row} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </>
  );
}

// Colour is the only thing carrying category on the map now that the labels
// came off, so the key lives in the panel footer rather than behind a control.
function Legend() {
  return (
    <div className="ffc-legend ffc-legend--inline">
      {LEGEND.map((l) => (
        <span className="ffc-legend__row" key={l.cat}>
          <span className="ffc-legend__dot" style={{ background: dotColor(l.cat) }} />
          {l.label}
        </span>
      ))}
    </div>
  );
}

function BoothDetail({ booth, onStep }) {
  const isFood = booth.area === 'Food Court';
  const group = BOOTHS[booth.id.split('-')[0]] || [];
  const pos = group.findIndex((b) => b.id === booth.id) + 1;
  return (
    <>
      <div className="hd">
        <span className="dot" style={{ background: isFood ? PIN_COLOR.food : SLATE }}>
          <Icon name={isFood ? 'food' : 'art'} size={17} color="var(--icon-on-color)" />
        </span>
        <h3>{booth.vendor || `${isFood ? 'Stall' : 'Booth'} ${booth.n}`}</h3>
      </div>
      <div className="sub">{booth.area}{booth.vendor ? ` · stall ${booth.n}` : ' · numbered in map order'}</div>

      {/* The map is too dense to tap a specific booth reliably, so these are the
          real way through a row. They wrap inside this area only -- running off
          the end of the car-path market returns you to its start rather than
          dumping you into the food trucks. */}
      <div className="boothnav ffc-step">
        <button onClick={() => onStep(-1)} aria-label="Previous booth">‹</button>
        <span className="ffc-step__pos">{pos} of {group.length} · {booth.area}</span>
        <button onClick={() => onStep(1)} aria-label="Next booth">›</button>
      </div>

      {booth.vendor
        ? <div className="li"><span className="b" />Food truck — menu and hours to come.</div>
        : <div className="li"><span className="b" />Artist assignment arrives with the 2026 vendor list.</div>}
      <div className="li"><span className="b" />Photos go here once we have them.</div>
      <div className="foot">{BOOTH_CAVEAT}</div>
    </>
  );
}

export default function DetailSheet({ openId, openArea, openBooth, onStepBooth, onSelect, onClose, docked = false, onFocusReturn }) {
  const isOpen = !!(openId || openArea || openBooth);
  const closeRef = useRef(null);
  const wasOpen = useRef(false);

  let body = null;
  if (openBooth) body = <BoothDetail booth={openBooth} onStep={onStepBooth} />;
  else if (openId === 'stageMain' || openId === 'stageAcoustic') body = <StageSchedule stageKey={openId} />;
  else if (openId === 'food') body = <FoodCourt />;
  else if (openId) body = <GenericPoi id={openId} />;
  else if (openArea) body = <ArtMarketArea area={openArea} />;
  else if (docked) body = <PanelDirectory onSelect={onSelect} />;

  // Focus moves into the sheet when it opens and goes back to the map when it
  // closes, so a keyboard user is never dropped on <body> with no landmark.
  // Only the bottom variant does this: the docked panel is always present and
  // stealing focus on every map tap would be hostile.
  useEffect(() => {
    if (docked) return;
    if (isOpen && !wasOpen.current) closeRef.current?.focus();
    if (!isOpen && wasOpen.current) onFocusReturn?.();
    wasOpen.current = isOpen;
  }, [isOpen, docked, onFocusReturn]);

  useEffect(() => {
    if (!isOpen || docked) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, docked, onClose]);

  return (
    <div
      className={`sheet ffc-panel${isOpen ? ' open' : ''}${docked ? ' docked ffc-panel--right' : ' ffc-panel--bottom'}`}
      // The bottom variant is a dialog. The docked panel is not -- it is
      // persistent page furniture, not something you dismiss.
      role={docked ? undefined : 'dialog'}
      aria-modal={docked ? undefined : 'false'}
      aria-label={docked ? undefined : 'Location detail'}
      data-open={isOpen ? 'true' : 'false'}
    >
      {!docked && <div className="grip" />}

      {/* Docked, the panel keeps its own header and a back row instead of an X:
          closing a detail here does not dismiss anything, it returns you to the
          list. The bottom sheet still gets a close button -- it really does go
          away. */}
      {docked && !isOpen && (
        <div className="panel-head">
          <h3>Candler Park Fall Fest</h3>
          <p>October 4–5, 2026</p>
        </div>
      )}
      {docked && isOpen && (
        <button className="panel-back" onClick={onClose}>
          <span aria-hidden="true">‹</span> All locations
        </button>
      )}
      {!docked && isOpen && (
        <button className="close" ref={closeRef} onClick={onClose} aria-label="Close detail">
          <Icon name="close" size={20} />
        </button>
      )}

      <div className="panel-scroll">{body}</div>

      {docked && !isOpen && <div className="panel-foot"><Legend /></div>}
    </div>
  );
}
