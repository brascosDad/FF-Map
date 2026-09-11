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
import { PINS } from '../assets/pins';
import { AREAS } from './areas';
import { BOOTHS } from './booths';

const pin = (d) => PINS.find((p) => p.d === d);
const count = (c) => PINS.filter((p) => p.c === c).length;

const poi = (d, name, sub) => {
  const p = pin(d);
  return { id: d, kind: 'poi', cat: p.c, name, sub, at: [p.x, p.y], d };
};

const cat = (c, d, name) => ({
  id: c, kind: 'cat', cat: c, name,
  sub: `${count(c)} on the map`,
  filter: c, d,
});

export const DIRECTORY = [
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
      cat('drinks', 'drinks', 'Beer & drinks'),
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
    rows: [poi('kids', 'Kidlandia', 'Games, bounce houses, pumpkin smashing')],
  },
  {
    title: 'Amenities',
    rows: [
      cat('wc', 'wc', 'Restrooms'),
      poi('firstaid', 'First Aid', 'EMS on site'),
      poi('info', 'Info booth', 'Programs, lost & found'),
      poi('bikevalet', 'Bike valet', 'Free, attended'),
    ],
  },
];

// The panel footer. Colour is the only thing carrying category on the map once
// the labels came off, so the key has to be visible without opening anything.
export const LEGEND = [
  { cat: 'stage', label: 'Stage' },
  { cat: 'food', label: 'Food' },
  { cat: 'drinks', label: 'Drinks' },
  { cat: 'kids', label: 'Kids' },
  { cat: 'wc', label: 'Restroom' },
  { cat: 'water', label: 'Water' },
  { cat: 'firstaid', label: 'First aid' },
  { cat: 'info', label: 'Info' },
  { cat: 'art', label: 'Art booth' },
  { cat: 'bikevalet', label: 'Services' },
];
