// What the docked panel lists.
//
// The panel is a directory, not a summary: on desktop it is the way to reach
// every location without hunting for a 40px circle. Rows are derived from the
// same PINS/AREAS/BOOTHS the map draws, so a count here cannot drift away from
// what is on the ground.
//
// Each row carries how it should be opened:
//   kind 'poi'    one pin -- centre on it and open its detail
//   kind 'cat'    several pins of one category -- filter the map to them and
//                 open the shared detail; there is no single point to fly to
//   kind 'area'   an art-market run -- centre on its marker, open the area
import { ACTIVE_PINS, hasPins } from '../assets/pins';
import { AREAS } from './areas';
import { BOOTHS } from './booths';

// Hidden pins (pins.js) are not on any map, so they are not in the directory:
// a row whose pin is hidden, or whose category has no pin left, is dropped.
const pin = (d) => ACTIVE_PINS.find((p) => p.d === d);
const count = (c) => ACTIVE_PINS.filter((p) => p.c === c).length;

const poi = (d, name, sub) => {
  const p = pin(d);
  return p ? { id: d, kind: 'poi', cat: p.c, name, sub, at: [p.x, p.y], d } : null;
};

const cat = (c, d, name) => (hasPins(c) ? {
  id: c, kind: 'cat', cat: c, name,
  sub: `${count(c)} on the map`,
  filter: c, d,
} : null);

const SECTIONS = [
  {
    title: 'Stages',
    rows: [
      poi('stageMain', 'Main Stage', 'Music both days'),
      poi('stageAcoustic', 'Acoustic Stage', 'Music both days'),
    ],
  },
  {
    title: 'Eat & drink',
    rows: [
      poi('food', 'Food Court', `${BOOTHS.food.length} stalls on the car path`),
      poi('kingofpops', 'King of Pops', 'Frozen pops · two carts, Main Stage and the entrance'),
      poi('mrsoftee', 'Mr Softee', 'Soft serve · on the lawn beside Kidlandia'),
      poi('beer', 'Beer Stand', 'The main one, on the field'),
      cat('drinks', 'drinks', 'Beer stands'),
      // TODO(Jess): what the beverage stations serve (Ernest asked, 9/22);
      // the card's line in DetailSheet.jsx is a placeholder until then.
      cat('beverage', 'beverage', 'Beverages'),
      cat('water', 'water', 'Water refill'),
    ],
  },
  {
    // Biggest run first, then the two street rows. The map draws them in its own
    // order; this is reading order, and the one in the park is the one people
    // mean when they say the art market.
    title: 'Art market',
    rows: ['spine', 'mcl', 'cpd'].map((id) => {
      const a = AREAS.find((x) => x.id === id);
      return { id: a.id, kind: 'area', cat: 'art', name: a.shortName, sub: a.range, at: a.mk, area: a };
    }),
  },
  {
    title: 'Family',
    rows: [
      poi('kids', 'Kidlandia', 'Games, bounce houses, pumpkin smashing with Trees for Tuition'),
      // TODO(Jess): which PTA runs the booth (Ernest asked, 9/22); the card's
      // line in DetailSheet.jsx is a placeholder until then.
      poi('pta', 'PTA booth', 'In Kidlandia'),
    ],
  },
  {
    title: 'Amenities',
    rows: [
      poi('merch', 'Merch Booth', 'Fall Fest goods, at the park entrance'),
      cat('wc', 'wc', 'Restrooms'),
      poi('firstaid', 'First Aid', 'EMS on site'),
      poi('info', 'Info booth', 'At the park entrance · programs, lost & found'),
      poi('bikevalet', 'Bike valet', 'Free, attended'),
    ],
  },
];
export const DIRECTORY = SECTIONS.map((s) => ({ ...s, rows: s.rows.filter(Boolean) })).filter((s) => s.rows.length);

// The panel footer. Colour is the only thing carrying category on the map once
// the labels came off, so the key has to be visible without opening anything.
//
// The print sheet keys from the same list, so the two legends cannot disagree
// about what a colour means. Two optional fields are for paper: `printLabel`
// is the wording the print sheet uses when it differs from the phone's, and
// `printOnly: true` keeps a row off the phone footer (a category that is drawn
// on the phone in a shared neutral and needs no row of its own there, but
// carries its own glyph on paper).
export const LEGEND = ([
  { cat: 'stage', label: 'Stage' },
  { cat: 'food', label: 'Food' },
  // The mug is beer; the cup is everything else (Jess's plan draws the two
  // apart, 9/21).
  { cat: 'drinks', label: 'Beer' },
  { cat: 'beverage', label: 'Beverages' },
  { cat: 'kids', label: 'Kids' },
  // One symbol for every toilet, ADA units included; the print sheet says
  // so, since EMS reads it for the ADA banks (Jess, 9/21), and the phone
  // card repeats the wording.
  { cat: 'wc', label: 'Restroom', printLabel: 'Restroom (+ ADA)' },
  { cat: 'water', label: 'Water' },
  { cat: 'firstaid', label: 'First aid' },
  { cat: 'info', label: 'Info' },
  { cat: 'merch', label: 'Merch' },
  { cat: 'art', label: 'Art booth' },
  { cat: 'bikevalet', label: 'Services' },
  // Drawn on the phone in the same services neutral as the bike valet, so
  // the phone footer's "Services" dot already covers it; on paper the rocket
  // glyph is what keys it, and it gets its own row.
  { cat: 'pta', label: 'PTA booth', printOnly: true },
// A category with no pin on any map (every pin hidden) has no row.
]).filter((l) => l.cat === 'art' || hasPins(l.cat));

// The print sheet's second key, "Site / safety": the paper-only layer that
// EMS and the fire inspector read the map for (pins flagged `print: true` in
// assets/pins.js). Nothing here is drawn on the phone, so nothing here is in
// LEGEND. Each `cat` is drawn by PrintSheet's own shape for it and coloured
// by PIN_COLOR.
export const PRINT_SITE_LEGEND = ([
  { cat: 'barricade', label: 'Barricade' },
  { cat: 'speedbump', label: 'Speed bump' },
  { cat: 'generator', label: 'Generator' },
  { cat: 'dumpster', label: 'Dumpster' },
  { cat: 'iceTruck', label: 'Ice truck' },
  { cat: 'musicianTent', label: "Musicians' tent" },
]).filter((l) => hasPins(l.cat));
