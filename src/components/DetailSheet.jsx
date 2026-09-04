import Icon from './Icon';
import { PIN_COLOR, SLATE } from '../assets/pins';
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
    lines: ['Free valet bike parking — roll up, a volunteer tags and racks it for you', 'Marked location is approximate pending the finalized basemap'] },
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

export default function DetailSheet({ openId, openArea, onClose }) {
  const isOpen = !!(openId || openArea);
  let body = null;
  if (openId === 'stageMain' || openId === 'stageAcoustic') body = <StageSchedule stageKey={openId} />;
  else if (openId === 'food') body = <FoodCourt />;
  else if (openId) body = <GenericPoi id={openId} />;
  else if (openArea) body = <ArtMarketArea area={openArea} />;

  return (
    <div className={`sheet${isOpen ? ' open' : ''}`}>
      <div className="grip" />
      {isOpen && <button className="close" onClick={onClose}><Icon name="close" size={20} /></button>}
      {body}
    </div>
  );
}
