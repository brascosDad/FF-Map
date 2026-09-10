import Icon from './Icon';
import { PIN_COLOR, PINS, SLATE } from '../assets/pins';
import { BOOTH_CAVEAT, BOOTHS } from '../data/booths';
import stagesData from '../data/stages.json';
import vendorsData from '../data/vendors.json';

const STAGE_MAP = { stageMain: 'main-stage', stageAcoustic: 'acoustic-stage' };

const POI_COPY = {
  kids: { title: 'Kidlandia', sub: 'Family activity zone', icon: 'kids', cat: 'kids',
    lines: ['Flag football, dodgeball, and GaGa ball', 'Bounce houses — Frozen Castle, Basketball, Baseball, Slide, Millennium Falcon', 'Pumpkin smashing', 'Trees for Tuition'] },
  drinks: { title: 'Beer & Drinks', sub: 'Beer stations, kiosks, and draft trailers', icon: 'drinks', cat: 'drinks',
    lines: ['Multiple beer stations and beverage tents throughout the grounds', '21+ with ID — check with volunteers for wristband policy'] },
  wc: { title: 'Restrooms', sub: 'Five-toilet banks + ADA units', icon: 'wc', cat: 'wc',
    lines: ['Multiple five-toilet banks plus ADA-accessible toilets', 'Positioned near major zones — nearest one highlighted on the map'] },
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
      <div className="hd"><span className="dot" style={{ background: PIN_COLOR.stage }}><Icon name="stage" size={17} color="#fff" /></span><h3>{stage.name}</h3></div>
      <div className="sub">{stage.sponsor ? `${stage.sponsor} · ` : ''}Confirmed 2026 schedule</div>
      {['saturday', 'sunday'].map((day) => (
        <div key={day}>
          <div className="day">{day === 'saturday' ? 'Saturday' : 'Sunday'}</div>
          {stage.lineup[day].map((slot, i) => (
            <div className="evt" key={i}>
              <span className="t">{slot.time}</span>
              <span className="a">
                {slot.act || <em>Open — to be confirmed</em>}
                {slot.note && <span style={{ display: 'block', fontSize: 11, color: '#9aa0ac' }}>{slot.note}</span>}
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
      <div className="hd"><span className="dot" style={{ background: PIN_COLOR.food }}><Icon name="food" size={17} color="#fff" /></span><h3>Food Court</h3></div>
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
      <div className="hd"><span className="dot" style={{ background: SLATE }}><Icon name="art" size={17} color="#fff" /></span><h3>{area.name}</h3></div>
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
      <div className="hd"><span className="dot" style={{ background: PIN_COLOR[d.cat] }}><Icon name={d.icon} size={17} color="#fff" /></span><h3>{d.title}</h3></div>
      <div className="sub">{d.sub}</div>
      {d.lines.map((line, i) => <div className="li" key={i}><span className="b" />{line}</div>)}
    </>
  );
}


// Resting state of the docked side panel. On mobile the sheet simply stays
// down when nothing is selected; on tablet/desktop the panel is always on
// screen, so it needs something to say.
const PANEL_AREAS = [
  { key: 'stage', title: 'Two stages', sub: 'Main Stage + Acoustic Stage' },
  { key: 'food', title: 'Food court', sub: '16 trucks along the car path' },
  { key: 'art', title: 'Art market', sub: 'Three runs: in the park, McLendon, Candler Park Dr', color: SLATE },
  { key: 'kids', title: 'Kidlandia', sub: 'Family activity zone' },
];

function PanelHome() {
  const counts = PINS.reduce((a, p) => ({ ...a, [p.c]: (a[p.c] || 0) + 1 }), {});
  return (
    <>
      <div className="hd">
        <h3>Candler Park Fall Fest</h3>
      </div>
      <div className="sub" style={{ paddingLeft: 0 }}>October 4–5, 2026</div>
      <div className="panel-list">
        {PANEL_AREAS.map((a) => (
          <div className="panel-row" key={a.key}>
            <span className="dot" style={{ background: a.color || PIN_COLOR[a.key] || SLATE }}>
              <Icon name={a.key === 'art' ? 'art' : a.key} size={15} color="#fff" />
            </span>
            <span>
              <b>{a.title}</b>
              <em>{a.sub}</em>
            </span>
          </div>
        ))}
      </div>
      <div className="panel-list">
        {[['wc', 'Restrooms'], ['water', 'Water'], ['drinks', 'Beer & drinks'],
          ['firstaid', 'First aid'], ['info', 'Info'], ['bikevalet', 'Bike valet']].map(([k, label]) => (
          counts[k] ? (
            <div className="panel-row compact" key={k}>
              <span className="dot sm" style={{ background: PIN_COLOR[k] }}>
                <Icon name={k} size={12} color="#fff" />
              </span>
              <span><b>{label}</b><em>{counts[k]} on the map</em></span>
            </div>
          ) : null
        ))}
      </div>
      <div className="foot">Tap anything on the map for details.</div>
    </>
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
          <Icon name={isFood ? 'food' : 'art'} size={17} color="#fff" />
        </span>
        <h3>{booth.vendor || `${isFood ? 'Stall' : 'Booth'} ${booth.n}`}</h3>
      </div>
      <div className="sub">{booth.area}{booth.vendor ? ` · stall ${booth.n}` : ' · numbered in map order'}</div>

      {/* The map is too dense to tap a specific booth reliably, so these are the
          real way through a row. They wrap inside this area only -- running off
          the end of the car-path market returns you to its start rather than
          dumping you into the food trucks. */}
      <div className="boothnav">
        <button className="bn" onClick={() => onStep(-1)} aria-label="Previous booth">‹</button>
        <span className="bnpos">{pos} of {group.length} · {booth.area}</span>
        <button className="bn" onClick={() => onStep(1)} aria-label="Next booth">›</button>
      </div>

      {booth.vendor
        ? <div className="li"><span className="b" />Food truck — menu and hours to come.</div>
        : <div className="li"><span className="b" />Artist assignment arrives with the 2026 vendor list.</div>}
      <div className="li"><span className="b" />Photos go here once we have them.</div>
      <div className="foot">{BOOTH_CAVEAT}</div>
    </>
  );
}

export default function DetailSheet({ openId, openArea, openBooth, onStepBooth, onClose, docked = false }) {
  const isOpen = !!(openId || openArea || openBooth);
  let body = null;
  if (openBooth) body = <BoothDetail booth={openBooth} onStep={onStepBooth} />;
  else if (openId === 'stageMain' || openId === 'stageAcoustic') body = <StageSchedule stageKey={openId} />;
  else if (openId === 'food') body = <FoodCourt />;
  else if (openId) body = <GenericPoi id={openId} />;
  else if (openArea) body = <ArtMarketArea area={openArea} />;
  else if (docked) body = <PanelHome />;

  return (
    <div className={`sheet${isOpen ? ' open' : ''}${docked ? ' docked' : ''}`}>
      <div className="grip" />
      {isOpen && <button className="close" onClick={onClose}><Icon name="close" size={20} /></button>}
      {body}
    </div>
  );
}
