#!/usr/bin/env python3
"""Regenerate src/data/booths.js -- the per-booth records the app draws and steps.

    python3 scripts/build-booths.py        (from the repo root)

Two inputs, and this script hand-edits neither:

  src/assets/basemapCoords.js
      WHERE the rows are. The booth-tick centres from the canonical Figma
      export (1440x900 space), one list per run.

  src/data/booth-numbering-2026.json
      WHAT each booth is called. The committee's numbering, read off the
      official 2025 site map; the artist market chair confirmed 2026 uses the
      same configuration. Every row says which way its numbers run and where
      the breaks are, and the file's own `verification` block reconciles each
      segment count to its range.

The export draws each run where it is, but not at the committee's counts
(74 ticks on Candler Park Dr against 76 numbered booths; 62 in the park
against 61 numbered + 8 Kidlandia). So the official count is laid out ALONG
the export's rows rather than the ticks being numbered one-for-one:

  McLendon Ave      13 + 14 ticks match 88-76 and 75-62 exactly. Kept as is.
  In the park       each row's ticks form a polyline; each numbered segment is
                    resampled along it at even spacing to the official count,
                    both ends staying where the export put them. Numbers run
                    north to south, 1-32 on the southeast side of the path,
                    33-61 on the northwest side.
  Candler Park Dr   both columns are laid out afresh on the export's two column
                    x's, one pitch, so the mid-run speed bump reads as ONE
                    break across both columns. Numbers run north to south
                    DECREASING: 164 at the top of the street side, 89 at the
                    bottom. See cpd().
  Kidlandia         K1-K8 are not on the export at all. Placed as a short
                    vertical stack on the lawn just east of the Kidlandia
                    area. The stack's order (K1 north) is unconfirmed -- the
                    2025 map does not label them individually. See KID_STACK.
  Food court        the 16 stalls, verbatim from the export apart from the two
                    documented nudges; last year's truck names are pinned to
                    them in vendors.json order until 2026 placements arrive.

The script refuses to write if the totals do not come out at 164 numbered
booths plus 8 Kidlandia.
"""
import json
import math
import re
import statistics

COORDS = 'src/assets/basemapCoords.js'
NUMBERING = 'src/data/booth-numbering-2026.json'
VENDORS = 'src/data/vendors.json'
OUT = 'src/data/booths.js'

# The app's own short labels for each run (areas.js shortName / the stepper).
AREA = {'candler-park-drive': 'Candler Park Dr', 'mclendon': 'McLendon Ave',
        'park': 'In the Park', 'kidlandia': 'Kidlandia'}
# JSON zone id -> BOOTHS group key. Group keys are also the id prefix the app
# reads the stepper group off ('cpd-142' -> BOOTHS.cpd), so keep them stable.
GROUP = {'candler-park-drive': 'cpd', 'mclendon': 'mcl', 'park': 'spine', 'kidlandia': 'kid'}

# ---- Candler Park Dr layout -------------------------------------------------
# Booth pitch, in map units. The export's own ticks sit at 8.2 (street column)
# and 9.0 (park column); squares are drawn 8 wide, so 8.1 is the tightest
# the run can go without the squares overlapping. It is what lets 42 pitches
# plus a speed bump fit inside the blob Ernest drew for this street (y 368-749).
CPD_PITCH = 8.1
# Centre-to-centre across the mid-run speed bump: two booth widths of clear
# road, which reads as a break at the booth zoom without eating the run.
CPD_BUMP = 26.0
# The barricade is on the street side only. Both columns start level with the
# top speed bump and the mid-run speed bump is one physical bump, so the
# street side's 10 + barricade + 8 has to span the park side's 26:
#     16 * pitch + barricade = 25 * pitch   ->   barricade = 9 * pitch
# i.e. about eight booth widths of road with no booths, which is a cross
# street closed off with a barricade.
CPD_BARRICADE = 9 * CPD_PITCH
CPD_GAP = {'speed bump': CPD_BUMP, 'barricade': CPD_BARRICADE}

# ---- Kidlandia stack --------------------------------------------------------
# On the 2025 map K1-K8 are "a short vertical stack in the centre of the park,
# beside Pumpkin Smashing". The Kidlandia area on our basemap runs to about
# x 629 at this latitude; the stack sits two booth widths east of that edge,
# on the open lawn, level with the Kidlandia pin. Nothing in the export marks
# these, so this is placement by description -- verify against the 2026
# Kidlandia layout before print.
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
    """The official numbers of one segment, in the row's stated direction."""
    a, b = seg['from'], seg['to']
    if isinstance(a, str):                       # 'K1'..'K8'
        return ['K%d' % i for i in range(int(a[1:]), int(b[1:]) + 1)]
    step = 1 if b >= a else -1
    out = list(range(a, b + step, step))
    assert len(out) == seg['count'], seg
    return out


def numbered(row):
    return [s for s in row['segments'] if 'from' in s]


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


def lay_park(zone, spn):
    se, nw = two_rows(spn)
    side = {'park-east': se, 'park-west': nw}
    out = []
    for row in zone['rows']:
        pts = sorted(side[row['id']], key=lambda p: p[1])      # north to south
        found = split_on_gaps(pts)
        want = numbered(row)
        assert len(found) == len(want), (row['id'], [len(s) for s in found], [s['count'] for s in want])
        for seg, exp in zip(want, found):
            for n, (x, y) in zip(numbers(seg), resample(exp, seg['count'])):
                out.append((n, x, y))
    return out


def lay_mclendon(zone, mcl):
    boxes = split_on_gaps(sorted(mcl))                          # west to east
    want = [numbered(r)[0] for r in zone['rows']]
    assert [len(b) for b in boxes] == [s['count'] for s in want], [len(b) for b in boxes]
    out = []
    for seg, pts in zip(want, boxes):
        out.extend((n, x, y) for n, (x, y) in zip(numbers(seg), pts))
    return out


def lay_cpd(zone, cpd):
    xs = sorted({p[0] for p in cpd})
    street_x, park_x = xs[0], xs[-1]                            # outer, inner
    y0 = min(p[1] for p in cpd)                                 # the top tick
    col = {'cpd-street': street_x, 'cpd-park': park_x}
    out = []
    for row in zone['rows']:
        y = y0
        for seg in row['segments']:
            if 'break' in seg:
                y += CPD_GAP[seg['break']] - CPD_PITCH
                continue
            for n in numbers(seg):
                out.append((n, col[row['id']], y))
                y += CPD_PITCH
    return out


def lay_kid(zone):
    seg = numbered(zone['rows'][0])[0]
    return [(n, KID_STACK['x'], KID_STACK['y0'] + i * KID_STACK['pitch'])
            for i, n in enumerate(numbers(seg))]


def lay_food(food, vendors):
    pts = sorted((FOOD_NUDGE.get(p, p) for p in food), key=lambda p: (p[1], p[0]))
    out = []
    for i, (x, y) in enumerate(pts):
        v = vendors[i]['name'] if i < len(vendors) else None
        out.append((i + 1, x, y, v))
    return out


def sort_key(n):
    return (1, int(n[1:])) if isinstance(n, str) else (0, n)


def fmt(v):
    return '%.1f' % v


def main():
    src = open(COORDS).read()
    coords = {k: read_coords(k, src) for k in ('CPD', 'MCL', 'SPN', 'FOOD')}
    num = json.load(open(NUMBERING))
    zones = {z['id']: z for z in num['zones']}
    vendors = json.load(open(VENDORS))['vendors']

    laid = {
        'cpd': lay_cpd(zones['candler-park-drive'], coords['CPD']),
        'mcl': lay_mclendon(zones['mclendon'], coords['MCL']),
        'spine': lay_park(zones['park'], coords['SPN']),
        'kid': lay_kid(zones['kidlandia']),
    }
    zone_of = {v: k for k, v in GROUP.items()}

    # ---- reconcile against the committee's totals before writing anything ----
    total = 0
    for key, booths in laid.items():
        z = zones[zone_of[key]]
        ns = sorted((b[0] for b in booths), key=sort_key)
        assert len(ns) == len(set(ns)), 'duplicate number in %s' % key
        lo, hi = z['range'].split('-')
        if key == 'kid':
            assert ns == ['K%d' % i for i in range(1, 9)], ns
        else:
            assert ns == list(range(int(lo), int(hi) + 1)), (key, ns[0], ns[-1], len(ns))
            total += len(ns)
        print('  %-6s %3d booths  %s' % (key, len(ns), z['range']))
    assert total == num['_totals']['numbered_artist_booths'] == 164, total
    assert len(laid['kid']) == num['_totals']['kidlandia_booths'] == 8
    print('  total  %3d numbered + %d Kidlandia' % (total, len(laid['kid'])))

    lines = []
    w = lines.append
    w('// Per-booth records: what the app draws at the booth zoom and what the')
    w('// stepper walks. GENERATED by scripts/build-booths.py -- edit the inputs')
    w('// (basemapCoords.js for where, booth-numbering-2026.json for what) and')
    w('// re-run it rather than editing this file.')
    w('//')
    w('// HONEST ABOUT WHAT IS AND ISN\'T REAL:')
    w('//   - Art-market numbers are the committee\'s OFFICIAL booth numbers, from')
    w('//     the 2025 site map the artist market chair confirmed for 2026: 1-61 in')
    w('//     the park, 62-88 on McLendon, 89-164 on Candler Park Dr, K1-K8 in')
    w('//     Kidlandia. Each group is in number order, so stepping follows the')
    w('//     numbers -- which on Candler Park Dr means south to north.')
    w('//   - Positions are laid along the rows the export draws, at the official')
    w('//     counts. The K1-K8 stack is placed by description only; its order is')
    w('//     unconfirmed.')
    w('//   - Art-market booths have NO names. The 2026 artist list is due 9/18.')
    w('//   - Food-truck NAMES are LAST YEAR\'S (2025) list from vendors.json, pinned')
    w('//     to the stall positions arbitrarily. Which truck parks where is not')
    w('//     known.')
    w('')
    w('export const BOOTHS = {')
    for key in ('cpd', 'mcl', 'spine', 'kid'):
        area = AREA[zone_of[key]]
        w('  %s: [' % key)
        for n, x, y in sorted(laid[key], key=lambda b: sort_key(b[0])):
            ident = '%s-%s' % (key, n if isinstance(n, str) else '%03d' % n)
            nn = "'%s'" % n if isinstance(n, str) else str(n)
            w("    { id: '%s', n: %s, area: '%s', x: %s, y: %s }," % (ident, nn, area, fmt(x), fmt(y)))
        w('  ],')
    w('  food: [')
    for n, x, y, v in lay_food(coords['FOOD'], vendors):
        tail = ', vendor: %s' % json.dumps(v) if v else ''
        w("    { id: 'food-%02d', n: %d, area: 'Food Court', x: %s, y: %s%s }," % (n, n, fmt(x), fmt(y), tail))
    w('  ],')
    w('};')
    w('')
    w('// The three things a reader has to be told about this data used to live here as')
    w('// one BOOTH_CAVEAT string, printed under every booth. It was the tallest thing')
    w('// in the sheet and two thirds of it repeated the subtitle directly above it.')
    w('// The clauses now sit where each one is actually true, in DetailSheet.jsx:')
    w('//   numbers and positions are from the official map -> the booth footer')
    w('//   truck names are last year\'s (2025)              -> the food-stall bullet')
    w('//   the K stack is placed by description             -> the Kidlandia bullet')
    w('// If you change one, it still has to be said somewhere. Do not just drop it.')
    open(OUT, 'w').write('\n'.join(lines) + '\n')
    print('wrote', OUT)


if __name__ == '__main__':
    main()
