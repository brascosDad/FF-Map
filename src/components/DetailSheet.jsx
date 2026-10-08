import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { ACTIVE_PINS, PIN_COLOR, SLATE } from '../assets/pins';
import { BOOTHS, UNNUMBERED } from '../data/booths';
import { DIRECTORY, LEGEND } from '../data/directory';
import { FESTIVAL, featuredTitle } from '../data/festival';
import stagesData from '../data/stages.json';
import vendorsData from '../data/vendors.json';

const STAGE_MAP = { stageMain: 'main-stage', stageAcoustic: 'acoustic-stage' };

/**
 * The head of a detail: category badge, title, and the line under it.
 *
 * One component, because five bodies were each assembling the same three
 * elements by hand -- and a header that exists in five copies is a header that
 * drifts. The close button is NOT part of this: it belongs to the sheet, not to
 * what the sheet happens to be showing, and it lives in the sheet's own top row
 * so it can never land on the title.
 */
function SheetHeader({ icon, color, title, sub }) {
  return (
    <>
      <div className="ffc-panel__titleline">
        <span className="ffc-panel__badge" style={{ background: color }}>
          <Icon name={icon} size={17} color="var(--icon-on-color)" />
        </span>
        <h3 className="ffc-panel__title">{title}</h3>
      </div>
      {sub && <div className="ffc-panel__sub">{sub}</div>}
    </>
  );
}

// The card's location line: the tapped pin's own `where` (assets/pins.js).
// Every pin card carries one, because several pins share a card and the line
// is how someone confirms which one they tapped (Ernest, 9/22). A card opened
// with no one pin -- a category row in the directory -- has no line.
function Where({ pin }) {
  return pin?.where ? <div className="ffc-listrow ffc-listrow--where"><span className="ffc-listrow__bullet" />{pin.where}</div> : null;
}

// The sheet renders each thing it can show TWICE, once per half: the head (badge,
// title, subtitle; pinned, with the close ×, outside the scrolling body) and the
// body (what scrolls). One component per thing keeps the data that fills both
// halves in one place; `part` says which half this call draws.
const HEAD = 'head';
const BODY = 'body';

const POI_COPY = {
  kids: { title: 'Kidlandia', sub: 'Family activity zone', icon: 'kids', cat: 'kids',
    // Pumpkin smashing and Trees for Tuition are one stop, not two (9/17).
    lines: ['Flag football, dodgeball, and GaGa ball', 'Bounce houses — Frozen Castle, Basketball, Baseball, Slide, Millennium Falcon', 'Pumpkin smashing with Trees for Tuition'] },
  // The beer stand is its own pin: the main one, on the field, and the
  // landmark people navigate by. The other stations share the generic entry.
  // No line describes the interface ("zoom in to see them") or repeats the
  // subtitle (C4, 10/6): a card says what the place is and where it is, once.
  beer: { title: 'Beer Stand', sub: 'The main one', icon: 'drinks', cat: 'drinks',
    lines: ['21+ with ID — check with volunteers for wristband policy'] },
  // The mug is beer and only beer since the cup (beverages) arrived, 9/22.
  drinks: { title: 'Beer', sub: 'Beer stands around the grounds', icon: 'drinks', cat: 'drinks',
    lines: ['21+ with ID — check with volunteers for wristband policy'] },
  // Beverage stations are not beer: Jess's 2026 plan draws them apart from
  // the beer stands. TODO(Jess): what the stations serve -- Ernest has asked;
  // until then one neutral line that invents nothing (9/22).
  beverage: { title: 'Beverages', sub: 'Beverage station', icon: 'beverage', cat: 'beverage',
    lines: ['Beverage station — drinks for sale.'] },
  merch: { title: 'Merch Booth', sub: 'Fall Fest merchandise', icon: 'merch', cat: 'merch',
    lines: ['Official Fall Fest shirts and goods', 'At the park entrance off McLendon Ave, on the east side of the path — the same spot every year'] },
  // "Restroom (+ ADA)" is the print key's wording (Jess, 9/21); one symbol
  // for every toilet, ADA units included.
  // One ADA line, and the location line (`where`, from the pin) -- nothing that
  // describes the interface (C4).
  wc: { title: 'Restrooms', sub: 'Five-toilet banks', icon: 'wc', cat: 'wc',
    lines: ['Every bank includes ADA-accessible units'] },
  firstaid: { title: 'First Aid / EMS', sub: 'On-site medical support', icon: 'firstaid', cat: 'firstaid',
    lines: ['Staffed by EMS for the whole festival', 'Dial 911 for emergencies'] },
  water: { title: 'Water Station', sub: 'Free refill', icon: 'water', cat: 'water',
    lines: ['Bring a bottle to refill'] },
  info: { title: 'Info', sub: 'Volunteer / info booth', icon: 'info', cat: 'info',
    lines: ['At the park entrance off McLendon Ave, on the east side of the path just north of the merch tent', 'Programs and general festival information', 'Ask here about lost & found'] },
  // TODO(Jess): which PTA runs the booth -- Ernest has asked; one neutral
  // line until then (9/22).
  pta: { title: 'PTA booth', sub: 'In Kidlandia', icon: 'pta', cat: 'pta',
    lines: ['PTA booth.'] },
  bikevalet: { title: 'Bike Valet', sub: 'Free, attended bike parking', icon: 'bikevalet', cat: 'bikevalet',
    lines: ['Roll up and a volunteer tags and racks your bike'] },
};

function StageSchedule({ stageKey, pin, part }) {
  const stageId = STAGE_MAP[stageKey];
  const stage = stagesData.stages.find((s) => s.id === stageId);
  if (!stage) return null;
  if (part === HEAD) {
    return <SheetHeader icon="stage" color={PIN_COLOR.stage} title={stage.name}
                        sub={`${stage.sponsor ? `${stage.sponsor} · ` : ''}Confirmed 2026 schedule`} />;
  }
  return (
    <>
      <Where pin={pin} />
      {['saturday', 'sunday'].map((day) => (
        <div key={day}>
          <div className="ffc-dayheading">{day === 'saturday' ? 'Saturday' : 'Sunday'}</div>
          {stage.lineup[day].map((slot, i) => (
            <div className="ffc-schedulerow" key={i}>
              <span className="ffc-schedulerow__time">{slot.time}</span>
              <span className="ffc-schedulerow__act">
                {slot.act || <em>Open — to be confirmed</em>}
                {slot.note && <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{slot.note}</span>}
              </span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

// The 2026 list, in the food chair's own words. `offering` is his description
// verbatim -- that is what makes it defensible, so it is printed, not
// paraphrased. `location` is null for every truck but one until his placements
// arrive: a truck with no spot still lists, it just has no second line and
// nothing on the map points at it.
function FoodCourt({ pin, part }) {
  if (part === HEAD) {
    return <SheetHeader icon="food" color={PIN_COLOR.food} title="Food Court"
                        sub={`${vendorsData.vendors.length} food vendors · 2026`} />;
  }
  return (
    <>
      <Where pin={pin} />
      {vendorsData.vendors.map((v) => (
        <div className="ffc-listrow" key={v.id}>
          <span className="ffc-listrow__bullet" />
          <span>
            {v.name}{v.offering ? ` — ${v.offering}` : ''}
            {v.location && <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{v.location}</span>}
          </span>
        </div>
      ))}
    </>
  );
}

/**
 * ArtistLine: the name hierarchy (C1, round 2 item 8). The ARTIST leads; the
 * business or title is the quiet line under it, and when the two are the same
 * there is one line. One component for the area list's rows AND a booth's own
 * detail, so the two never disagree about who comes first. `quiet` drops the
 * second line where the title above already is the business.
 */
function ArtistLine({ booth, quiet = false }) {
  const primary = booth.name || booth.biz;
  if (!primary) return null;
  const secondary = !quiet && booth.biz && booth.biz !== primary ? booth.biz : null;
  return (
    <span className="ffc-artistline">
      <span className="ffc-artistline__name">{primary}</span>
      {secondary && <em className="ffc-artistline__sub">{secondary}</em>}
    </span>
  );
}

// One row of the area's booth list: the number, then who is in it. Tapping it
// opens that booth and flies the map to it -- on a phone the squares are too
// dense to pick one by finger, so this list is how you find a specific artist.
function BoothRow({ booth, onOpen }) {
  const featured = featuredTitle(booth);
  return (
    <button className="ffc-boothrow" onClick={() => onOpen(booth)}>
      <span className="ffc-boothrow__number">{booth.n ?? '—'}</span>
      {featured && <Icon name="star" size={12} color="var(--text-strong)" className="ffc-boothrow__star" />}
      <span className="ffc-boothrow__who">
        {booth.name || booth.biz ? <ArtistLine booth={booth} /> : <em>Sponsor</em>}
      </span>
    </button>
  );
}

// The run's booths in number order, each one a row. Kidlandia's K stack counts
// toward the in-park run (the range says so), so it lists at the end of that
// one. The two artists the sheet names but gives no number sit last, under the
// run they belong to, with a dash for a number; they have a square on the map
// like any other booth, so tapping the row flies to it.
function ArtMarketArea({ area, onOpenBooth, part }) {
  const booths = area.id === 'spine' ? [...area.booths, ...BOOTHS.kid] : area.booths;
  const unnumbered = UNNUMBERED.filter((u) => u.group === area.id);
  if (part === HEAD) return <SheetHeader icon="art" color={SLATE} title={area.name} sub={area.range} />;
  return (
    <>
      <div className="ffc-boothlist">
        {[...booths, ...unnumbered].map((b) => <BoothRow key={b.id} booth={b} onOpen={onOpenBooth} />)}
      </div>
    </>
  );
}

// A food cart with its own square on the map: the card is the vendor's own
// record in vendors.json (named by the pin's `vendor`), so the list and the
// pins cannot say different things; the cart's number (C1-C3, on the pin)
// leads the subtitle the way a booth card is titled by its number.
function FoodCart({ name, pin, part }) {
  const v = vendorsData.vendors.find((x) => x.name === name);
  if (!v) return null;
  if (part === HEAD) return <SheetHeader icon="food" color={PIN_COLOR.food} title={v.name} sub={`${pin?.n ? `Cart ${pin.n} · ` : ''}${v.offering}`} />;
  return (
    <>
      <Where pin={pin} />
      {v.location && <div className="ffc-listrow"><span className="ffc-listrow__bullet" />{v.location}</div>}
    </>
  );
}

// A card id that belongs to a food-cart square: the vendor is on the pin.
const cartVendor = (id, pin) => pin?.vendor || ACTIVE_PINS.find((p) => p.d === id && p.vendor)?.vendor;

function GenericPoi({ id, pin, part }) {
  const vendor = cartVendor(id, pin);
  if (vendor) return <FoodCart name={vendor} pin={pin} part={part} />;
  const d = POI_COPY[id];
  if (!d) return null;
  if (part === HEAD) return <SheetHeader icon={d.icon} color={PIN_COLOR[d.cat]} title={d.title} sub={d.sub} />;
  return (
    <>
      <Where pin={pin} />
      {d.lines.map((line, i) => <div className="ffc-listrow" key={i}><span className="ffc-listrow__bullet" />{line}</div>)}
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
      <span className="ffc-poirow__badge" style={{ background: dotColor(row.cat) }}>
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
      {LEGEND.filter((l) => !l.printOnly).map((l) => (
        <span className="ffc-legend__row" key={l.cat}>
          <span className="ffc-legend__dot" style={{ background: dotColor(l.cat) }} />
          {l.label}
        </span>
      ))}
      {/* The two artists with a spot but no number draw hollow on the map. */}
      <span className="ffc-legend__row">
        <span className="ffc-legend__dot ffc-legend__dot--hollow" />
        Artist, no number
      </span>
      {/* A featured booth: a star in its own slate square (festival.js). */}
      {FESTIVAL.featured.length > 0 && (
        <span className="ffc-legend__row">
          <span className="ffc-legend__dot ffc-legend__dot--featured"><Icon name="star" size={8} color="var(--icon-on-color)" /></span>
          {FESTIVAL.featured[0].title}
        </span>
      )}
    </div>
  );
}

/**
 * Where a booth is in its run, for the ItemPager: "11 of 139". Null for the
 * unnumbered spots (no row to page through).
 */
function boothPosition(booth) {
  if (booth.n == null) return null;
  const group = BOOTHS[booth.id.split('-')[0]] || [];
  return { pos: group.findIndex((b) => b.id === booth.id) + 1, total: group.length };
}

/**
 * ItemPager: previous / "11 of 139" / next. It pages between items (booths in
 * a run); it is not a -/+ value control. It lives in the sheet's FOOTER, pinned to the
 * bottom, so it never moves while you tap it: a control you tap repeatedly
 * never moves (B2). The map is too dense to tap a booth reliably, so this is
 * the real way through a row; it wraps inside this area only, so running off
 * the end of the car-path market returns you to its start rather than dumping
 * you into the food trucks.
 */
function ItemPager({ pos, total, onStep }) {
  return (
    <div className="ffc-itempager" role="group" aria-label="Page through booths">
      <button onClick={() => onStep(-1)} aria-label="Previous booth">‹</button>
      <span className="ffc-itempager__pos" aria-live="polite">{pos} of {total}</span>
      <button onClick={() => onStep(1)} aria-label="Next booth">›</button>
    </div>
  );
}

function BoothDetail({ booth, part }) {
  const isFood = booth.area === 'Food Court';
  const isKid = booth.area === 'Kidlandia';
  // A spot with no number is not in any row, so there is nothing to page
  // through: the sheet is titled by the business instead of "Booth —".
  const unnumbered = booth.n == null;
  const featured = featuredTitle(booth);
  // A Kidlandia booth wears the Kidlandia colour, like its square on the map;
  // every other art booth wears the market slate.
  if (part === HEAD) {
    return (
      <SheetHeader
        icon={isFood ? 'food' : isKid ? 'kids' : 'art'}
        color={isFood ? PIN_COLOR.food : isKid ? PIN_COLOR.kids : SLATE}
        title={unnumbered ? booth.biz : `${isFood ? 'Stall' : 'Booth'} ${booth.n}`}
        sub={`${booth.area}${isFood ? '' : ' · Art Market'}${unnumbered ? ' · no booth number' : ''}${featured ? ` · ★ ${featured}` : ''}`} />
    );
  }
  return (
    <>

      {/* One line at most, and it is the honest one: who is in the booth. The
          sheet carries no source line, and a food stall says nothing about which
          truck parks there -- none is assigned, and a line saying so went stale. */}
      {isFood
        ? null   /* no truck is assigned to a stall, and a line saying so goes stale: the Food Court card lists the trucks */
        : booth.name || booth.biz
          ? <div className="ffc-listrow"><span className="ffc-listrow__bullet" /><ArtistLine booth={booth} quiet={unnumbered} /></div>
          : <div className="ffc-listrow"><span className="ffc-listrow__bullet" />Sponsor booth.</div>}
      {/* No provenance line on any sheet (C3): where a booth's name and position
          came from is a data-section fact (README, CLAUDE.md), not something to
          tell a visitor. The one thing worth keeping is WHERE the two unnumbered
          spots are, which is location, so it is a body line. */}
      {unnumbered && booth.where && <div className="ffc-listrow"><span className="ffc-listrow__bullet" />{booth.where[0].toUpperCase() + booth.where.slice(1)}</div>}
    </>
  );
}

/**
 * The colour of the thing you opened. Drives the list bullets, so a Kidlandia
 * sheet's bullets are Kidlandia pink rather than a generic teal -- the badge at
 * the top and the bullets below it are then obviously about the same place.
 */
function accentFor(openId, openArea, openBooth) {
  if (openBooth) return openBooth.area === 'Food Court' ? PIN_COLOR.food : openBooth.area === 'Kidlandia' ? PIN_COLOR.kids : SLATE;
  if (openId === 'stageMain' || openId === 'stageAcoustic') return PIN_COLOR.stage;
  if (cartVendor(openId, null)) return PIN_COLOR.food;
  if (openId) return PIN_COLOR[POI_COPY[openId]?.cat] || PIN_COLOR[openId] || SLATE;
  if (openArea) return SLATE;
  return SLATE;
}

/** What the sheet is showing, as one comparable value. */
const keyOf = (openId, openArea, openBooth) => openBooth?.id || openId || openArea?.id || null;

// How long the sheet takes to drop out of the way before the new content
// arrives. The way back up is --motion-panel, so a swap costs OUT + up.
const SWAP_OUT_MS = 140;
// How long the slide down on close takes -- must match --motion-panel, since it
// is what decides when the content can safely go.
const CLOSE_MS = 250;
// Drag the sheet down past this share of its own height and it closes; let go
// short of it and it springs back. A flick beats the distance either way.
// How long a push or pop takes -- --motion-panel (250ms) plus a frame, so the
// leaving layer is only removed once its animation has finished.
const TRANSITION_MS = 270;
const DISMISS_FRACTION = 0.3;
const FLICK_VELOCITY = 0.5;   // px per ms
const FLICK_MIN_PX = 40;      // ...and it has to actually travel
const PULL_UP_PX = 30;        // a pull up this far from peek opens to full
const TAP_SLOP_PX = 8;        // a press that moves less than this, quickly, is a tap
const TAP_MS = 400;

export default function DetailSheet({ openId, openArea, openBooth, selectedPin = null, onStepBooth, onSelect, onOpenBooth, onBack, onClose, docked = false, chipOn = false, capPeek = false, onDetentChange, onFocusReturn }) {
  const isOpen = !!(openId || openArea || openBooth);
  const closeRef = useRef(null);

  // Two detents (B3): 'full', as the sheet has always opened, and 'peek', the
  // title row plus a line or two, so the map stays visible. A sheet that opens
  // while a filter chip is on opens at peek -- the chip's pins are what you
  // are looking at, and the sheet should not bury them. Dragging the handle up,
  // or tapping it, goes to full; tapping again comes back down. With no chip on
  // the sheet has the one detent and the handle only drags down to close.
  // Chips cannot change while a sheet is open (a chip tap closes it), so
  // `peekable` is fixed for the sheet's life.
  const [detentState, setDetent] = useState('full');
  const wasOpenDetent = useRef(false);
  // capPeek: a phone on its side. The header plus a 72% sheet leave no map, so
  // the sheet is held at peek and cannot be expanded (round 2, item 4.2).
  const peekable = !docked && (chipOn || capPeek);
  const detent = capPeek ? 'peek' : detentState;
  useEffect(() => {
    if (docked) return;
    if (isOpen && !wasOpenDetent.current) setDetent(chipOn || capPeek ? 'peek' : 'full');
    wasOpenDetent.current = isOpen;
  }, [isOpen, docked, chipOn, capPeek]);
  const setDetentTo = (d) => { setDetent(d); onDetentChange?.(d); };

  // Swapping one open sheet for another is a move, not a cut: the sheet drops
  // away, the content changes while it is off screen, and the new one rises.
  // Cutting the content under a stationary sheet read as a glitch -- there was
  // no moment that said "that one went, this one came".
  //
  // So the sheet renders `shown`, which lags the props by the drop. Opening from
  // closed and closing entirely are not swaps: those already animate, and
  // holding the content back would just delay them.
  const [shown, setShown] = useState({ openId, openArea, openBooth, selectedPin });
  const [swapping, setSwapping] = useState(false);
  const sheetEl = useRef(null);
  const drag = useRef(null);
  // The sheet is a small navigation stack, one level deep (B1): an area's booth
  // list, and a booth opened from it. 'detail' with a list under it has a way
  // back. Where the list is, and how far it was scrolled, is remembered so
  // back lands exactly where you left.
  const scrollEl = useRef(null);
  const outScrollEl = useRef(null);
  const stageEl = useRef(null);
  const listScroll = useRef(0);
  const prevKind = useRef(null);
  const lastLayers = useRef(null);
  const headerH = useRef(0);
  const [transition, setTransition] = useState(null);
  const kind = shown.openBooth ? 'detail' : shown.openArea ? 'list' : 'other';
  const canGoBack = kind === 'detail' && !!shown.openArea;
  const openFromList = (booth) => {
    listScroll.current = scrollEl.current?.scrollTop || 0;
    onOpenBooth(booth);
  };
  const nextKey = keyOf(openId, openArea, openBooth);
  const shownKey = keyOf(shown.openId, shown.openArea, shown.openBooth);

  useEffect(() => {
    if (nextKey === shownKey) return;
    // Stepping from one booth to the next is navigating INSIDE what is already
    // open, not opening something else, so the content changes in place. The
    // sheet dropping and rising on every press of the caret made a walk down a
    // row feel like fifteen separate openings.
    // The same goes for a list and the booth opened from it (B1): ONE sheet, its
    // content changes in place -- a short slide, not a close and a new sheet.
    const sameArea = !!shown.openArea && !!openArea && shown.openArea.id === openArea.id;
    const steppingTheSameRow = (!!shown.openBooth && !!openBooth) || sameArea;
    // The docked panel never slides, and opening from closed should be
    // immediate -- there is nothing on screen to wait for.
    if (docked || !shownKey || steppingTheSameRow) {
      setShown({ openId, openArea, openBooth, selectedPin });
      setSwapping(false);
      return;
    }
    // Closing: hold the content until the sheet has finished sliding down.
    // Dropping it at once collapsed the sheet to nothing, and a zero-height
    // sheet has no height to translate -- which is why closing read as the
    // sheet vanishing rather than leaving.
    const wait = nextKey ? SWAP_OUT_MS : CLOSE_MS;
    if (nextKey) setSwapping(true);
    const t = setTimeout(() => {
      setShown({ openId, openArea, openBooth, selectedPin });
      setSwapping(false);
    }, wait);
    return () => clearTimeout(t);
  }, [nextKey, shownKey, docked, openId, openArea, openBooth, selectedPin, shown.openBooth]);

  // The head stays while the sheet slides away on close (`shown` holds the
  // content until it has gone), not only while `isOpen`.
  const shownOpen = !!(shown.openId || shown.openArea || shown.openBooth);
  // The back row names the screen you came from, SHORT, the way an iOS back
  // button does (round 3, item 1): the area's `shortName` ("‹ In the Park"),
  // never its full title -- the title's "· Art Market" would be said again a
  // row below. The docked panel has its own back row above the header; the
  // bottom sheet carries it in the head.
  const backBtn = canGoBack && !docked ? (
    <button className="ffc-panel__back" onClick={onBack}>
      <span aria-hidden="true">‹</span> {shown.openArea.shortName}
    </button>
  ) : null;
  const itemPager = shown.openBooth ? boothPosition(shown.openBooth) : null;
  // At peek there is no room for the footer: the ItemPager shows at full height.
  const showItemPager = itemPager && !(peekable && detent === 'peek');
  const renderThing = (part) => {
    if (shown.openBooth) return <BoothDetail booth={shown.openBooth} part={part} />;
    if (shown.openId === 'stageMain' || shown.openId === 'stageAcoustic') return <StageSchedule stageKey={shown.openId} pin={shown.selectedPin} part={part} />;
    if (shown.openId === 'food') return <FoodCourt pin={shown.selectedPin} part={part} />;
    if (shown.openId) return <GenericPoi id={shown.openId} pin={shown.selectedPin} part={part} />;
    if (shown.openArea) return <ArtMarketArea area={shown.openArea} onOpenBooth={openFromList} part={part} />;
    if (docked && part === BODY) return <PanelDirectory onSelect={onSelect} />;
    return null;
  };

  // The two layers of what is on screen: the header (back row, title line) and
  // the body. Kept so that crossing between a list and a booth can show the
  // layer that is LEAVING while the one that is arriving slides in.
  const headerLayer = <>{backBtn}{renderThing(HEAD)}</>;
  const bodyLayer = renderThing(BODY);
  const accent = accentFor(shown.openId, shown.openArea, shown.openBooth);

  // Push and pop (round 2, item 2): a standard navigation transition inside ONE
  // sheet. Push (list -> booth): the booth slides in from the right while the
  // list shifts slightly left underneath it. Pop (back): the booth slides out to
  // the right and the list returns at its previous scroll position. The sheet's
  // height does not change (CSS holds it while there is a stack), the close does
  // not move (it is not in either layer), and the header's own height eases
  // between its two lengths. Reduced motion: a crossfade, no slide.
  useLayoutEffect(() => {
    const was = prevKind.current;
    prevKind.current = kind;
    const crossing = was && was !== kind && (was === 'list' || was === 'detail') && (kind === 'list' || kind === 'detail');
    if (!crossing) { setTransition(null); return; }
    const dir = kind === 'detail' ? 'forward' : 'back';
    const last = lastLayers.current;
    if (!last) return;
    setTransition({ dir, header: last.header, body: last.body, accent: last.accent, itemPager: last.itemPager, listScroll: listScroll.current });
    // The header changes length between the two levels (a back row appears or
    // goes): ease its height instead of snapping the body down by a row.
    const stage = stageEl.current;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (stage && !reduce) {
      const h1 = stage.offsetHeight, h0 = headerH.current;
      if (h0 && h0 !== h1) {
        stage.style.height = `${h0}px`;
        void stage.offsetHeight;
        stage.style.transition = 'height var(--panel-motion) var(--ease)';
        stage.style.height = `${h1}px`;
      }
    }
    const t = setTimeout(() => {
      setTransition(null);
      if (stage) { stage.style.height = ''; stage.style.transition = ''; }
    }, TRANSITION_MS);
    return () => clearTimeout(t);
  }, [kind]);
  // Scroll positions: a booth opens at the top; a list returns where you left it.
  useLayoutEffect(() => {
    const el = scrollEl.current;
    if (el) {
      if (kind === 'detail' && transition?.dir === 'forward') el.scrollTop = 0;
      else if (kind === 'list' && transition?.dir === 'back') el.scrollTop = listScroll.current;
    }
    if (outScrollEl.current && transition?.dir === 'forward') outScrollEl.current.scrollTop = transition.listScroll;
  }, [kind, transition]);
  // Remember what was drawn, for the next crossing.
  useLayoutEffect(() => {
    lastLayers.current = { header: headerLayer, body: bodyLayer, accent, itemPager: showItemPager ? itemPager : null };
    headerH.current = stageEl.current ? stageEl.current.offsetHeight : 0;
  });

  // Focus moves into the sheet when it opens and goes back to the map when it
  // closes, so a keyboard user is never dropped on <body> with no landmark.
  // Only the bottom variant does this: the docked panel is always present and
  // stealing focus on every map tap would be hostile. The close button exists
  // once `shown` has caught up with the props (it renders the head), so the
  // focus move waits for that, not just for `isOpen`.
  const focusedIn = useRef(false);
  useEffect(() => {
    if (docked) return;
    // preventScroll: focusing a control inside a fixed sheet must not ask the
    // browser to scroll it into view -- on iOS that drags the whole page down.
    if (isOpen && shownOpen && !focusedIn.current) {
      focusedIn.current = true;
      closeRef.current?.focus({ preventScroll: true });
    }
    if (!isOpen && focusedIn.current) {
      focusedIn.current = false;
      onFocusReturn?.();
    }
  }, [isOpen, shownOpen, docked, onFocusReturn]);

  useEffect(() => {
    if (!isOpen || docked) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, docked, onClose]);

  // The handle is a real handle. Pull it down past a third of the sheet's
  // height, or flick it, and the sheet closes (from full with a chip on: steps
  // down to peek first); let go short of that and it springs back. Pull it UP from peek and the sheet opens to full. A press that
  // barely moves is a tap: it cycles peek <-> full where a peek exists. Keyboard
  // and screen-reader activation arrive as a click with no pointer (detail 0).
  function onHandleDown(e) {
    if (docked) return;
    // The ×, the back row and the handle's own button take their taps; a drag
    // that starts on the title row or the handle pulls the sheet.
    if (e.target.closest?.('.ffc-panel__close, .ffc-panel__back')) return;
    const el = sheetEl.current;
    if (!el) return;
    // Capture on the handle itself, not the sheet: capturing on an ancestor
    // retargets the move events to that ancestor, and they never reach this
    // handler at all.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { y0: e.clientY, y: e.clientY, t0: performance.now(), t: performance.now(), h: el.getBoundingClientRect().height, dy: 0, raw: 0 };
    el.style.transition = 'none';
  }

  function onHandleMove(e) {
    const d = drag.current, el = sheetEl.current;
    if (!d || !el) return;
    d.raw = e.clientY - d.y0;
    d.dy = Math.max(0, d.raw);                // the sheet only follows a pull DOWN
    d.v = (e.clientY - d.y) / Math.max(1, performance.now() - d.t);
    d.y = e.clientY; d.t = performance.now();
    el.style.transform = `translateY(${d.dy}px)`;
  }

  function onHandleUp(e) {
    const d = drag.current, el = sheetEl.current;
    drag.current = null;
    if (!d || !el) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    el.style.transition = '';
    el.style.transform = '';
    // A flick still has to travel: an abrupt 15px twitch is a fast pointer, not
    // an intent to dismiss, and treating it as one made the sheet feel jumpy.
    const dy = d.dy || 0;
    if (dy > d.h * DISMISS_FRACTION || ((d.v || 0) > FLICK_VELOCITY && dy > FLICK_MIN_PX)) {
      // One layer at a time, like everything else: from FULL with a chip on the
      // first swipe steps down to peek; a swipe from peek (or from a sheet with
      // no peek) closes.
      if (peekable && !capPeek && detent === 'full') setDetentTo('peek');
      else onClose();
      return;
    }
    if (peekable && !capPeek && detent === 'peek' && d.raw < -PULL_UP_PX) { setDetentTo('full'); return; }
    if (e.currentTarget.classList.contains('ffc-panel__handle') && Math.abs(d.raw) < TAP_SLOP_PX && performance.now() - d.t0 < TAP_MS) toggleDetent();
  }

  function toggleDetent() {
    if (peekable && !capPeek) setDetentTo(detent === 'peek' ? 'full' : 'peek');
  }

  const dragHandlers = docked ? {} : {
    onPointerDown: onHandleDown, onPointerMove: onHandleMove,
    onPointerUp: onHandleUp, onPointerCancel: onHandleUp,
  };
  const handleProps = docked ? {} : { ...dragHandlers, onClick: (e) => { if (e.detail === 0) toggleDetent(); } };

  const handleLabel = peekable && !capPeek
    ? (detent === 'peek' ? 'Expand the sheet' : 'Collapse the sheet')
    : 'Sheet handle: drag down to close';

  return (
    <div
      ref={sheetEl}
      className={`sheet ffc-panel${isOpen ? ' open' : ''}${docked ? ' docked ffc-panel--right' : ' ffc-panel--bottom'}`}
      // The bottom variant is a dialog. The docked panel is not -- it is
      // persistent page furniture, not something you dismiss.
      role={docked ? undefined : 'dialog'}
      aria-modal={docked ? undefined : 'false'}
      aria-label={docked ? undefined : 'Location detail'}
      data-open={isOpen ? 'true' : 'false'}
      data-phase={swapping ? 'out' : undefined}
      data-view={kind}
      data-detent={detent}
      data-peekable={peekable ? 'true' : undefined}
      data-footer={showItemPager ? 'true' : undefined}
      data-stack={shown.openArea ? 'true' : undefined}
    >
      {/* The handle: a thin strip at the top, kept for resizing and for screen
          readers (Apple's HIG and Material both keep a grabber). It is a 44px
          band with a 4px bar in it. The close does NOT live here any more: it is
          on the title line, below (B4). */}
      {!docked && (
        <button type="button" className="ffc-panel__handle" {...handleProps} aria-label={handleLabel}
                aria-expanded={peekable && !capPeek ? detent === 'full' : undefined}>
          <span className="ffc-panel__handle-bar" />
        </button>
      )}

      {/* Docked, the panel keeps its own header and a back row instead of an X:
          closing a detail here does not dismiss anything, it returns you to the
          list. The bottom sheet gets a close button -- it really does go away. */}
      {docked && !isOpen && (
        <div className="ffc-panel__masthead">
          <h3>{FESTIVAL.name}</h3>
          <p>{FESTIVAL.dates}</p>
        </div>
      )}
      {docked && shownOpen && (
        <button className="ffc-panel__back" onClick={canGoBack ? onBack : onClose}>
          <span aria-hidden="true">‹</span> {canGoBack ? shown.openArea.shortName : 'All locations'}
        </button>
      )}

      {/* The header: ONE fixed layout for every state. The close is always
          top-right on its first row and is NOT part of either layer, so it never
          moves or animates while the content crosses between a list and a
          booth. The layers inside the stage are the back row (when there is a
          list to go back to) and the title line; the leaving layer, if any, is
          drawn over/under the arriving one for the length of the transition. A
          drag that starts on the header pulls the sheet, like the handle. */}
      {shownOpen && (
        <div className="ffc-panel__header" {...dragHandlers}>
          <div className="ffc-panel__stage" ref={stageEl}>
            <div className="ffc-panel__layer" key={kind} data-dir={transition?.dir}>{headerLayer}</div>
            {transition && <div className="ffc-panel__layer ffc-panel__layer--out" data-dir={transition.dir} aria-hidden="true" inert>{transition.header}</div>}
          </div>
          {!docked && (
            <button className="ffc-panel__close" ref={closeRef} onClick={onClose} aria-label="Close detail">
              <Icon name="close" size={20} />
            </button>
          )}
        </div>
      )}
      {/* The body: the arriving layer scrolls; the leaving one is a still copy
          at the scroll position it had. Keyed by what the sheet is showing (list
          or detail), so crossing between the two plays the push or pop and
          nothing else does -- paging booth to booth swaps in place, no motion. */}
      <div className="ffc-panel__bodystage">
        <div className="ffc-panel__body ffc-panel__layer" ref={scrollEl} key={kind} data-dir={transition?.dir}
             onScroll={(e) => { if (kind === 'list') listScroll.current = e.currentTarget.scrollTop; }}
             style={{ '--sheet-accent': accent }}>{bodyLayer}</div>
        {transition && (
          <div className="ffc-panel__body ffc-panel__layer ffc-panel__layer--out" ref={outScrollEl} data-dir={transition.dir}
               aria-hidden="true" inert style={{ '--sheet-accent': transition.accent }}>{transition.body}</div>
        )}
      </div>

      {/* The ItemPager's footer: pinned to the bottom of the sheet, above the
          home bar, so the buttons are where the thumb left them whatever the
          booth's text does to the body above. It fades with the push and pop. */}
      {(showItemPager || transition?.itemPager) && (
        <div className="ffc-panel__footer" data-leaving={!showItemPager ? 'true' : undefined}>
          <ItemPager pos={(itemPager || transition.itemPager).pos} total={(itemPager || transition.itemPager).total} onStep={onStepBooth} />
        </div>
      )}

      {docked && !isOpen && <div className="ffc-panel__footer"><Legend /></div>}
    </div>
  );
}
