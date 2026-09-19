#!/usr/bin/env python3
"""Regenerate src/data/booths.js -- the per-booth records the app draws and steps.

    python3 scripts/build-booths.py        (from the repo root)

Two inputs, and this script hand-edits neither:

  src/assets/basemapCoords.js
      WHERE the rows are. The booth-tick centres from the canonical Figma
      export (1440x900 space), one list per run.

  src/data/booth-numbering-2026.json
      WHAT each booth is called, and WHO is in it. The artist market chair's
      2026 assignment sheet, one record per booth: number, zone, artist,
      business. Rebuilt from her live sheet by scripts/pull-sheet.py -- run
      that first when the sheet has moved. Every artist booth is 15 ft, so
      there are fewer than in 2025 and every number after the park moved.
      The run endpoints (1-54 park, 55-81 McLendon, 82-N Candler Park Dr,
      K0-Kn Kidlandia) are read from the JSON's zone_ranges, not typed here,
      so a booth added or dropped at the far end of Candler Park Dr -- the
      end she numbers last on purpose -- needs no edit to this script.

The sheet says which zone a booth is in but not where the zone sits on the
ground. That comes from the 2025 official site map (the previous numbering
file, in git history), which the chair confirmed keeps the same configuration:
the rows, their direction, and the breaks are unchanged, only the counts are.
LAYOUT below is that reading. Each export row lists its segments in map order,
north to south (or west to east), and each segment names the run of numbers
that fills it. The counts come from the JSON, never from here.

The export draws each run where it is, at the old 12-13 ft counts, so the
official count is laid out ALONG the export's rows rather than the ticks
being numbered one-for-one:

  In the park       each row's ticks form a polyline; each numbered segment is
                    resampled along it at even spacing to the official count,
                    both ends staying where the export put them. Numbers run
                    north to south, 1-28 on the southeast side of the path
                    (with the 20 ft bike/emergency gap after 24), 29-54 on the
                    northwest side. The northwest row has one break in the
                    export where the path bends; the sheet does not say how
                    many of its 26 fall either side, so they are split in the
                    export's own proportion (9 north of the bend, 17 south).
  McLendon Ave      13 + 14 ticks match 81-69 and 68-55 exactly. Kept as is.
                    Booths here were 15 ft already, so the count is unchanged
                    from 2025 and every number is simply the old one minus 7.
  Candler Park Dr   both columns are laid out afresh on the export's two column
                    x's at the 15 ft pitch. Numbers run north to south
                    DECREASING: the highest number at the top of the street
                    side, 82 at the bottom. The street side is the sheet's two
                    "west side" zones (the second run north of the barricade,
                    82-100 south of it) with the speed bump between 95 and 94;
                    the park side is one continuous run, "field" (north) then
                    "West Lawn" (south). The chair confirmed 9/17 that 112-114
                    are real booths, so there is no gap on the park side.
                    See lay_cpd().
  Kidlandia         K0-Kn are not on the export at all. One vertical column
                    INSIDE the Kidlandia area (the basemap's kidlandia-area
                    shape), numbered south to north: K0 at the south end, the
                    highest at the north, as the 2026 site plan and the 2025
                    map have it (Ernest, 9/19). How many there are comes from
                    the sheet. See KID_STACK.
  Unnumbered        two artists have a spot and no number: AWARE Wildlife on
                    the grass by the park's west row, Achieve with Steve
                    beside the Acoustic Stage. They get a square each, with
                    no number, at UNNUMBERED_AT -- placed by the chair's
                    description, so check them against the grounds on setup.
  Food court        the 16 stalls, verbatim from the export apart from the two
                    documented nudges. No truck names: the 2026 placements
                    are not assigned yet (vendors.json carries the list and
                    the one committed spot), so a stall is a position only.

The script refuses to write unless every numbered booth on the sheet lands
exactly once, the totals match the sheet's own header, and nothing in the
sheet is left unplaced except the two records it marks as unnumbered.
"""
import json
import math
import re
import statistics

COORDS = 'src/assets/basemapCoords.js'
NUMBERING = 'src/data/booth-numbering-2026.json'
OUT = 'src/data/booths.js'

# The app's own short labels for each run (areas.js shortName / the stepper).
# Group keys are also the id prefix the app reads the stepper group off
# ('cpd-142' -> BOOTHS.cpd), so keep them stable.
AREA = {'cpd': 'Candler Park Dr', 'mcl': 'McLendon Ave', 'spine': 'In the Park', 'kid': 'Kidlandia'}

# JSON zone -> app group. The sheet's seven artist zones fold into the three
# runs the map draws plus the Kidlandia stack.
GROUP = {'east-park': 'spine', 'west-park': 'spine', 'mclendon-south': 'mcl',
         'cpd-west': 'cpd', 'cpd-west-lawn': 'cpd', 'cpd-field': 'cpd', 'cpd-west-b': 'cpd',
         'kidlandia': 'kid'}

# ---- Where each run of numbers sits on the export's rows ---------------------
# One entry per export row, segments in map order. `(lo, hi)` is an inclusive
# range of sheet numbers; the row's `dir` says which end comes first along the
# row. A string is a break. The endpoints come from the sheet's zone_ranges
# (`zr`); the only numbers typed here are the two breaks the sheet does not
# know about -- where the park's west row bends, and where the speed bump
# splits Candler Park Dr's street side. Counts are checked against the sheet.
def layout(zr, gaps):
    z = {k: (v['first'], v['last']) for k, v in zr.items()}
    # The sheet marks one gap, the 20 ft bike/emergency gap in the east row.
    gap = next(g for g in gaps if g['zone'] == 'east-park')
    return {
        # In the park: two rows flanking the diagonal path, numbers increasing
        # north to south. The export's southeast row splits at the 20 ft gap;
        # the northwest row splits where the path bends. How many of the west
        # row's 26 fall either side of the bend is unverified (asking the
        # chair); 9 north / 17 south is the export's own proportion.
        'park-east': {'dir': 'asc', 'segments': [(z['east-park'][0], gap['after_booth']), 'gap',
                                                  (gap['before_booth'], z['east-park'][1])]},
        'park-west': {'dir': 'asc', 'segments': [(z['west-park'][0], 37), 'bend', (38, z['west-park'][1])]},
        # McLendon: one run in two boxes either side of the park entrance,
        # numbers DECREASING west to east -- 81 at the west end, 55 by the
        # Acoustic Stage. 13 ticks west, 14 east.
        'mclendon-west': {'dir': 'desc', 'segments': [(z['mclendon-south'][1], z['mclendon-south'][1] - 12)]},
        'mclendon-east': {'dir': 'desc', 'segments': [(z['mclendon-south'][1] - 13, z['mclendon-south'][0])]},
        # Candler Park Dr: numbers DECREASING north to south on both columns.
        # Street (outer) side: the sheet's second west-side run sits north of
        # the barricade; the first fills the rest, with the speed bump between
        # 95 and 94 (the sheet's old-number column skips three 2025 numbers,
        # 105-107, there -- the crosswalk).
        'cpd-street': {'dir': 'desc', 'segments': [(z['cpd-west-b'][1], z['cpd-west-b'][0]), 'barricade',
                                                    (z['cpd-west'][1], 95), 'speed bump', (94, z['cpd-west'][0])]},
        # Park (inner) side: "field" then "West Lawn", one continuous run. The
        # chair confirmed 9/17 that 112-114 are real booths, not a gap.
        'cpd-park': {'dir': 'desc', 'segments': [(z['cpd-field'][1], z['cpd-west-lawn'][0])]},
        'kidlandia-stack': {'dir': 'asc', 'segments': [z['kidlandia']]},
    }

# ---- Candler Park Dr layout -------------------------------------------------
# Booth pitch, in map units. The 2025 layout fit 12 ft booths at 8.1 units,
# the tightest the 8-unit squares can go without touching; 15 ft booths are
# that times 15/12. The road itself did not get longer, so the breaks below
# are kept at the same clear length they had at the 12 ft pitch.
CPD_PITCH = 8.1 * 15 / 12
# Clear road across the mid-run speed bump: 17.9 units (the old 26-unit
# centre-to-centre less one old booth). Centre to centre at the new pitch:
CPD_BUMP = 17.9 + CPD_PITCH
# The barricade is on the street side only. Both columns start level with the
# top speed bump and the mid-run speed bump is one physical bump, so the
# street side's 8 + barricade + 6 has to span the park side's 20:
#     13 * pitch + barricade = 20 * pitch   ->   barricade = 7 * pitch
# which is 70.9 units, within two units of the 72.9 the 2025 layout used --
# the same closed-off cross street, just measured in bigger booths.
CPD_BARRICADE = 7 * CPD_PITCH
CPD_GAP = {'speed bump': CPD_BUMP, 'barricade': CPD_BARRICADE}

# ---- Kidlandia column -------------------------------------------------------
# One vertical column inside the Kidlandia area, along its east side: the
# basemap's kidlandia-area shape spans x ~470-627, y ~297-538, and its east
# edge at these latitudes is x ~610-615, so a column at x 592 sits inside it
# with a booth's width to spare, clear of the Kidlandia pin (550.9, 422.3) at
# every zoom and of the court to the south. `y_south` is the centre of the
# LOWEST number; the column grows northward from there at `pitch`, so K0 is at
# the south end and the highest number at the north, as the 2026 site plan and
# the 2025 map have it. Eleven booths run y 472 up to 382; ten would stop at
# 391 -- the count is the sheet's, not this table's. Nothing in the export
# marks these, so verify the column against the grounds at setup.
KID_STACK = {'x': 592.0, 'y_south': 472.0, 'pitch': 9.0}

# ---- Artists with a spot but no number --------------------------------------
# Keyed by business, as the sheet names them. Positions are by the chair's
# description (9/17): AWARE Wildlife "on the grass" -- the lawn just off the
# south end of the park's west row, clear of the restroom pin; Achieve with
# Steve "beside the Acoustic Stage" -- one McLendon pitch east of booth 55,
# short of the stage pin. `group` is the run whose sheet lists them. Check
# both against the grounds at setup (10/2).
UNNUMBERED_AT = {
    'AWARE Wildlife': {'group': 'spine', 'x': 606.0, 'y': 632.0, 'where': 'on the grass by the west row'},
    'Achieve with Steve': {'group': 'mcl', 'x': 897.0, 'y': 797.7, 'where': 'beside the Acoustic Stage'},
}

# ---- Food court -------------------------------------------------------------
# Two stalls sat past the north tip of the hand-drawn food blob, so they read
# as trucks parked outside their own area. Nudged ~9 units down the row's own
# axis to sit inside it; spacing to their neighbours still matches the row.
FOOD_NUDGE = {(872.0, 244.3): (868.0, 252.1), (885.6, 250.4): (881.3, 258.9)}


def read_coords(name, src):
    m = re.search(r'export const %s = (\[.*?\]);' % name, src, re.S)
    return [tuple(p) for p in json.loads(m.group(1))]


def numbers(seg):
    """The numbers of one segment, first to last along the row."""
    a, b = seg
    if isinstance(a, str):                       # 'K0'..'K9'
        return ['K%d' % i for i in range(int(a[1:]), int(b[1:]) + 1)]
    step = 1 if b >= a else -1
    return list(range(a, b + step, step))


def numbered(row):
    return [s for s in row['segments'] if not isinstance(s, str)]


def split_on_gaps(pts, ratio=1.6):
    """Cut a sorted run of points wherever a step is much longer than usual."""
    steps = [math.dist(a, b) for a, b in zip(pts, pts[1:])]
    typical = statistics.median(steps)
    segs, cur = [], [pts[0]]
    for p, d in zip(pts[1:], steps):
        if d > ratio * typical:
            segs.append(cur)
            cur = []
        cur.append(p)
    segs.append(cur)
    return segs


def resample(pts, n):
    """n points evenly spaced by arc length along the polyline through pts."""
    if len(pts) == n:
        return list(pts)
    cum = [0.0]
    for a, b in zip(pts, pts[1:]):
        cum.append(cum[-1] + math.dist(a, b))
    out = []
    for i in range(n):
        t = cum[-1] * i / (n - 1)
        j = min(max(k for k in range(len(cum)) if cum[k] <= t), len(pts) - 2)
        u = (t - cum[j]) / (cum[j + 1] - cum[j])
        out.append((pts[j][0] + u * (pts[j + 1][0] - pts[j][0]),
                    pts[j][1] + u * (pts[j + 1][1] - pts[j][1])))
    return out


def two_rows(pts):
    """Split a twin-row run into its two rows.

    The path bends, so no single axis separates the rows cleanly; but the
    export lists each row as one contiguous run, end to end, so the one long
    jump in listed order is the seam between them. Returns (southeast row,
    northwest row) -- for the park, the treed-lawn side first.
    """
    jumps = [(math.dist(a, b), i) for i, (a, b) in enumerate(zip(pts, pts[1:]))]
    _, cut = max(jumps)
    a, b = list(pts[:cut + 1]), list(pts[cut + 1:])
    # Southeast is +x +y: the row whose centroid sits further that way.
    se_first = statistics.mean(p[0] + p[1] for p in a) > statistics.mean(p[0] + p[1] for p in b)
    return (a, b) if se_first else (b, a)


def lay_park(spn, LAYOUT):
    se, nw = two_rows(spn)
    side = {'park-east': se, 'park-west': nw}
    out = []
    for rid, pts in side.items():
        pts = sorted(pts, key=lambda p: p[1])                  # north to south
        found = split_on_gaps(pts)
        want = numbered(LAYOUT[rid])
        assert len(found) == len(want), (rid, [len(s) for s in found], want)
        for seg, exp in zip(want, found):
            ns = numbers(seg)
            for n, (x, y) in zip(ns, resample(exp, len(ns))):
                out.append((n, x, y))
    return out


def lay_mclendon(mcl, LAYOUT):
    boxes = split_on_gaps(sorted(mcl))                          # west to east
    want = [numbered(LAYOUT[r])[0] for r in ('mclendon-west', 'mclendon-east')]
    assert [len(b) for b in boxes] == [len(numbers(s)) for s in want], [len(b) for b in boxes]
    out = []
    for seg, pts in zip(want, boxes):
        out.extend((n, x, y) for n, (x, y) in zip(numbers(seg), pts))
    return out


def lay_cpd(cpd, LAYOUT):
    xs = sorted({p[0] for p in cpd})
    street_x, park_x = xs[0], xs[-1]                            # outer, inner
    y0 = min(p[1] for p in cpd)                                 # the top tick
    col = {'cpd-street': street_x, 'cpd-park': park_x}
    out = []
    for rid, x in col.items():
        y = y0
        for seg in LAYOUT[rid]['segments']:
            if isinstance(seg, str):
                y += CPD_GAP[seg] - CPD_PITCH
                continue
            for n in numbers(seg):
                out.append((n, x, y))
                y += CPD_PITCH
    return out


def lay_kid(LAYOUT):
    seg = numbered(LAYOUT['kidlandia-stack'])[0]
    # Numbers go up as the column goes north (y decreases).
    return [(n, KID_STACK['x'], KID_STACK['y_south'] - i * KID_STACK['pitch'])
            for i, n in enumerate(numbers(seg))]


def lay_food(food):
    pts = sorted((FOOD_NUDGE.get(p, p) for p in food), key=lambda p: (p[1], p[0]))
    return [(i + 1, x, y) for i, (x, y) in enumerate(pts)]


def sort_key(n):
    return (1, int(n[1:])) if isinstance(n, str) else (0, n)


def fmt(v):
    return '%.1f' % v


def js_str(s):
    return 'null' if s is None else "'%s'" % s.replace('\\', '\\\\').replace("'", "\\'")


def main():
    src = open(COORDS).read()
    coords = {k: read_coords(k, src) for k in ('CPD', 'MCL', 'SPN', 'FOOD')}
    num = json.load(open(NUMBERING))
    sheet = {b['booth']: b for b in num['booths']}
    assert len(sheet) == len(num['booths']), 'duplicate booth number on the sheet'

    LAYOUT = layout(num['zone_ranges'], num['gaps'])
    laid = {
        'cpd': lay_cpd(coords['CPD'], LAYOUT),
        'mcl': lay_mclendon(coords['MCL'], LAYOUT),
        'spine': lay_park(coords['SPN'], LAYOUT),
        'kid': lay_kid(LAYOUT),
    }

    # ---- reconcile against the sheet before writing anything ----------------
    placed = set()
    total = 0
    for key, booths in laid.items():
        ns = sorted((b[0] for b in booths), key=sort_key)
        assert len(ns) == len(set(ns)), 'duplicate number in %s' % key
        for n in ns:
            assert n in sheet, 'laid out %s but it is not on the sheet' % n
            assert GROUP[sheet[n]['zone']] == key, (n, sheet[n]['zone'], key)
        placed.update(ns)
        if key == 'kid':
            zr = num['zone_ranges']['kidlandia']
            assert ns == numbers((zr['first'], zr['last'])) and len(ns) == zr['count'], ns
        else:
            total += len(ns)
        print('  %-6s %3d booths  %s-%s' % (key, len(ns), ns[0], ns[-1]))
    missing = sorted(set(sheet) - placed, key=sort_key)
    assert not missing, 'on the sheet but not laid out: %s' % missing
    assert total == num['numbers_assigned'], (total, num['numbers_assigned'])
    assert max(n for n in placed if isinstance(n, int)) == num['highest_number']
    assert all(n not in placed for n in num.get('numbers_not_present', []))
    assert {u['business'] for u in num['unnumbered']} == set(UNNUMBERED_AT), \
        'UNNUMBERED_AT does not match the sheet\'s unnumbered artists'
    assert sorted(n for n in placed if sheet[n]['status'] != 'assigned') == num['sponsor_or_open']
    for zid, zr in num['zone_ranges'].items():
        got = sorted((n for n in placed if sheet[n]['zone'] == zid), key=sort_key)
        want = [n for n in numbers((zr['first'], zr['last'])) if n in sheet]
        assert got == want and len(got) == zr['count'], (zid, got[:3], want[:3])
    print('  total  %3d numbered + %d Kidlandia, %d sponsor/open, %d unnumbered (sheet read %s)'
          % (total, len(laid['kid']), len(num['sponsor_or_open']), len(num['unnumbered']),
             num.get('read_date', '?')))

    lines = []
    w = lines.append
    w('// Per-booth records: what the app draws at the booth zoom and what the')
    w('// stepper walks. GENERATED by scripts/build-booths.py -- edit the inputs')
    w('// (basemapCoords.js for where, booth-numbering-2026.json for what) and')
    w('// re-run it rather than editing this file.')
    w('//')
    zr = num['zone_ranges']
    w('// HONEST ABOUT WHAT IS AND ISN\'T REAL:')
    w('//   - Art-market numbers and names are the artist market chair\'s 2026')
    w('//     assignments, sheet read %s: %s in the park, %s on McLendon,' % (
        num.get('read_date', '?'), num['poster_endpoints']['park'], num['poster_endpoints']['mclendon']))
    w('//     %s on Candler Park Dr, %s in Kidlandia. Each group is in number' % (
        num['poster_endpoints']['candler_park_dr'], num['poster_endpoints']['kidlandia']))
    w('//     order, so stepping follows the numbers -- which on Candler Park Dr')
    w('//     means south to north.')
    w('//   - `name` is the artist, `biz` the business, straight from the sheet.')
    w('//     Both are null on a sponsor booth.')
    w('//   - Positions are laid along the rows the export draws, at the official')
    w('//     counts. The %s-%s column is one vertical run inside the Kidlandia' % (
        zr['kidlandia']['first'], zr['kidlandia']['last']))
    w('//     area, lowest number at the south end; its exact spot is unverified.')
    w('//     So are the two unnumbered squares (UNNUMBERED).')
    w('//   - Food stalls carry NO truck names. The 2026 list is in vendors.json;')
    w('//     which truck parks at which stall is not assigned yet.')
    w('')
    w('export const BOOTHS = {')
    for key in ('cpd', 'mcl', 'spine', 'kid'):
        area = AREA[key]
        w('  %s: [' % key)
        for n, x, y in sorted(laid[key], key=lambda b: sort_key(b[0])):
            ident = '%s-%s' % (key, n if isinstance(n, str) else '%03d' % n)
            nn = "'%s'" % n if isinstance(n, str) else str(n)
            rec = sheet[n]
            w("    { id: '%s', n: %s, area: '%s', x: %s, y: %s, name: %s, biz: %s },"
              % (ident, nn, area, fmt(x), fmt(y), js_str(rec['name']), js_str(rec['business'])))
        w('  ],')
    w('  food: [')
    for n, x, y in lay_food(coords['FOOD']):
        w("    { id: 'food-%02d', n: %d, area: 'Food Court', x: %s, y: %s }," % (n, n, fmt(x), fmt(y)))
    w('  ],')
    w('};')
    w('')
    w('// On the sheet with a spot but no booth number. Drawn as a square with no')
    w('// number (n is null), placed by the chair\'s description -- see UNNUMBERED_AT')
    w('// in scripts/build-booths.py. `group` is the run whose sheet lists them;')
    w('// `area` and `where` are what the booth sheet says.')
    w('export const UNNUMBERED = [')
    for u in num['unnumbered']:
        at = UNNUMBERED_AT[u['business']]
        assert GROUP[u['zone']] == at['group'], (u['business'], u['zone'], at['group'])
        ident = 'unnumbered-' + re.sub(r'[^a-z0-9]+', '-', u['business'].lower()).strip('-')
        w("  { id: '%s', n: null, group: '%s', area: '%s', x: %s, y: %s, name: %s, biz: %s, where: %s },"
          % (ident, at['group'], AREA[at['group']], fmt(at['x']), fmt(at['y']),
             js_str(u['name']), js_str(u['business']), js_str(at['where'])))
    w('];')
    w('')
    w('// The three things a reader has to be told about this data used to live here as')
    w('// one BOOTH_CAVEAT string, printed under every booth. It was the tallest thing')
    w('// in the sheet and two thirds of it repeated the subtitle directly above it.')
    w('// The clauses now sit where each one is actually true, in DetailSheet.jsx:')
    w('//   numbers and positions are from the official map -> the booth footer')
    w('//   stalls have no truck assigned yet                -> the food-stall bullet')
    w('//   the K stack is placed by description             -> the Kidlandia bullet')
    w('// If you change one, it still has to be said somewhere. Do not just drop it.')
    open(OUT, 'w').write('\n'.join(lines) + '\n')
    print('wrote', OUT)


if __name__ == '__main__':
    main()
