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
      business. This is the second numbering (v2): every artist booth was
      resized to 15 ft, so there are fewer of them and every number after the
      park moved. Poster endpoints are 1-54 park, 55-81 McLendon, 82-142
      Candler Park Dr, K0-K9 Kidlandia. 112-114 are not on the sheet.

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
                    x's at the 15 ft pitch, so the mid-run speed bump reads as
                    ONE break across both columns. Numbers run north to south
                    DECREASING: 142 at the top of the street side, 82 at the
                    bottom. The street side is the sheet's two "west side"
                    zones (135-142 north of the barricade, 82-100 south of
                    it); the park side is "West Lawn" (101-111, south) and
                    "field" (115-134, north). See cpd().
  Kidlandia         K0-K9 are not on the export at all. Placed as a short
                    vertical stack on the lawn just east of the Kidlandia
                    area. The stack's order (K0 north) is unconfirmed -- the
                    sheet does not place them. See KID_STACK.
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
# row. A string is a break. Counts are checked against the sheet, not assumed.
LAYOUT = {
    # In the park: two rows flanking the diagonal path, numbers increasing
    # north to south. The export's southeast row splits at the 20 ft gap; the
    # northwest row splits where the path bends.
    'park-east': {'dir': 'asc', 'segments': [(1, 24), 'gap', (25, 28)]},
    'park-west': {'dir': 'asc', 'segments': [(29, 37), 'bend', (38, 54)]},
    # McLendon: one run in two boxes either side of Mell Ave, numbers
    # DECREASING west to east -- 81 at the west end, 55 by the Acoustic Stage.
    'mclendon-west': {'dir': 'desc', 'segments': [(81, 69)]},
    'mclendon-east': {'dir': 'desc', 'segments': [(68, 55)]},
    # Candler Park Dr: numbers DECREASING north to south on both columns.
    # Street (outer) side: the sheet's second west-side run sits north of the
    # barricade; the first fills the rest, with the speed bump between 95 and
    # 94 (the sheet's 2025 crosswalk puts three old numbers, 105-107, between
    # them, and the 2025 bump sat between old 106 and 107).
    'cpd-street': {'dir': 'desc', 'segments': [(142, 135), 'barricade', (100, 95), 'speed bump', (94, 82)]},
    # Park (inner) side: "field" north of the bump, "West Lawn" south of it.
    # 112-114 are not on the sheet; the bump is where they would have fallen.
    'cpd-park': {'dir': 'desc', 'segments': [(134, 115), 'speed bump', (111, 101)]},
    'kidlandia-stack': {'dir': 'asc', 'segments': [('K0', 'K9')]},
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

# ---- Kidlandia stack --------------------------------------------------------
# On the 2025 map the K booths are "a short vertical stack in the centre of
# the park, beside Pumpkin Smashing". The Kidlandia area on our basemap runs
# to about x 629 at this latitude; the stack sits two booth widths east of
# that edge, on the open lawn, level with the Kidlandia pin. Nothing in the
# export marks these, so this is placement by description -- verify against
# the 2026 Kidlandia layout before print.
KID_STACK = {'x': 645.0, 'y0': 400.0, 'pitch': 9.0}

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


def lay_park(spn):
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


def lay_mclendon(mcl):
    boxes = split_on_gaps(sorted(mcl))                          # west to east
    want = [numbered(LAYOUT[r])[0] for r in ('mclendon-west', 'mclendon-east')]
    assert [len(b) for b in boxes] == [len(numbers(s)) for s in want], [len(b) for b in boxes]
    out = []
    for seg, pts in zip(want, boxes):
        out.extend((n, x, y) for n, (x, y) in zip(numbers(seg), pts))
    return out


def lay_cpd(cpd):
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


def lay_kid():
    seg = numbered(LAYOUT['kidlandia-stack'])[0]
    return [(n, KID_STACK['x'], KID_STACK['y0'] + i * KID_STACK['pitch'])
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

    laid = {
        'cpd': lay_cpd(coords['CPD']),
        'mcl': lay_mclendon(coords['MCL']),
        'spine': lay_park(coords['SPN']),
        'kid': lay_kid(),
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
    assert all(n not in placed for n in num['numbers_not_present'])
    assert sorted(n for n in placed if sheet[n]['status'] != 'assigned') == num['sponsor_or_open']
    for zid, zr in num['zone_ranges'].items():
        got = sorted((n for n in placed if sheet[n]['zone'] == zid), key=sort_key)
        want = [n for n in numbers((zr['first'], zr['last'])) if n in sheet]
        assert got == want and len(got) == zr['count'], (zid, got[:3], want[:3])
    print('  total  %3d numbered + %d Kidlandia, %d sponsor/open, %d not on the sheet'
          % (total, len(laid['kid']), len(num['sponsor_or_open']), len(num['numbers_not_present'])))

    lines = []
    w = lines.append
    w('// Per-booth records: what the app draws at the booth zoom and what the')
    w('// stepper walks. GENERATED by scripts/build-booths.py -- edit the inputs')
    w('// (basemapCoords.js for where, booth-numbering-2026.json for what) and')
    w('// re-run it rather than editing this file.')
    w('//')
    w('// HONEST ABOUT WHAT IS AND ISN\'T REAL:')
    w('//   - Art-market numbers and names are the artist market chair\'s 2026')
    w('//     assignments: 1-54 in the park, 55-81 on McLendon, 82-142 on Candler')
    w('//     Park Dr (112-114 are not on her sheet), K0-K9 in Kidlandia. Each')
    w('//     group is in number order, so stepping follows the numbers -- which')
    w('//     on Candler Park Dr means south to north.')
    w('//   - `name` is the artist, `biz` the business, straight from the sheet.')
    w('//     Both are null on a sponsor or open booth.')
    w('//   - Positions are laid along the rows the export draws, at the official')
    w('//     counts. The K0-K9 stack is placed by description only; its order is')
    w('//     unconfirmed.')
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
    w('// On the sheet but with no booth number, so nowhere to draw them. The area')
    w('// sheet lists them under the run they belong to.')
    w('export const UNNUMBERED = [')
    for u in num['unnumbered']:
        w("  { group: '%s', name: %s, biz: %s, where: %s },"
          % (GROUP[u['zone']], js_str(u['name']), js_str(u['business']),
             js_str(u['booth'] if isinstance(u['booth'], str) else None)))
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
