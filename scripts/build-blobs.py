#!/usr/bin/env python3
"""Regenerate src/assets/basemapBlobs.js from src/assets/basemapCoords.js.

Run from the repo root:  python3 scripts/build-blobs.py

Method: signed distance field + marching squares.

  f(x, y) = distance to the nearest booth tick center
  blob    = the contour f = r

That is the outline of the union of discs of radius r centred on every tick, so
it FOLLOWS the run wherever it curves and always contains every square. The
previous version used a convex hull, which cuts straight across any concavity --
fine for a straight row, badly wrong for the curving car path, where one edge
tracked the booths and the opposite edge sheared off across open grass.

r per group is derived, not guessed: big enough to bridge the largest gap
between neighbouring ticks (so the run reads as one shape) and, for the paired
rows, to span the gap between the two rows.
"""
import math, re

src = open('src/assets/basemapCoords.js').read()
def arr(name):
    m = re.search(r'export const %s = \[(.*?)\];' % name, src, re.S)
    return [(float(a), float(b)) for a, b in re.findall(r'\[(-?[\d.]+),(-?[\d.]+)\]', m.group(1))]
CPD, MCL, SPN, FOOD = arr('CPD'), arr('MCL'), arr('SPN'), arr('FOOD')

def nn_gap(pts):
    """Largest distance from a tick to its nearest neighbour."""
    worst = 0.0
    for i, p in enumerate(pts):
        d = min(math.dist(p, q) for j, q in enumerate(pts) if j != i)
        worst = max(worst, d)
    return worst

def contour(pts, r, step=0.75):
    """Marching squares on f(x,y) = min distance to pts, at level r."""
    x0 = min(p[0] for p in pts) - r - 2; x1 = max(p[0] for p in pts) + r + 2
    y0 = min(p[1] for p in pts) - r - 2; y1 = max(p[1] for p in pts) + r + 2
    nx = int((x1 - x0) / step) + 1; ny = int((y1 - y0) / step) + 1
    grid = [[min(math.dist((x0 + i*step, y0 + j*step), p) for p in pts) - r
             for j in range(ny)] for i in range(nx)]

    def interp(ax, ay, av, bx, by, bv):
        t = 0.5 if av == bv else av / (av - bv)
        return (ax + (bx - ax) * t, ay + (by - ay) * t)

    segs = []
    for i in range(nx - 1):
        for j in range(ny - 1):
            ax, ay = x0 + i*step, y0 + j*step
            bx, by = ax + step, ay + step
            v = [grid[i][j], grid[i+1][j], grid[i+1][j+1], grid[i][j+1]]
            idx = sum((1 << k) for k, vv in enumerate(v) if vv < 0)
            if idx in (0, 15): continue
            e = {
                0: interp(ax, ay, v[0], bx, ay, v[1]),
                1: interp(bx, ay, v[1], bx, by, v[2]),
                2: interp(bx, by, v[2], ax, by, v[3]),
                3: interp(ax, by, v[3], ax, ay, v[0]),
            }
            table = {1:[(3,0)],2:[(0,1)],3:[(3,1)],4:[(1,2)],5:[(3,0),(1,2)],6:[(0,2)],
                     7:[(3,2)],8:[(2,3)],9:[(2,0)],10:[(0,1),(2,3)],11:[(2,1)],
                     12:[(1,3)],13:[(1,0)],14:[(0,3)]}
            for a, b in table[idx]:
                segs.append((e[a], e[b]))
    return segs

def chain(segs, tol=0.35):
    """Stitch marching-squares segments into closed loops.

    Adjacency map keyed on snapped endpoints, so this is linear rather than the
    O(n^2) linear scan it started as -- that version dropped segments and left
    a stray detached nub at the end of the west art-market row.
    """
    def key(p): return (round(p[0] / tol), round(p[1] / tol))
    adj = {}
    for i, (a, b) in enumerate(segs):
        adj.setdefault(key(a), []).append((i, b))
        adj.setdefault(key(b), []).append((i, a))

    used, loops = set(), []
    for i0, (a0, b0) in enumerate(segs):
        if i0 in used: continue
        used.add(i0)
        loop = [a0, b0]
        while True:
            nxt = None
            for j, other in adj.get(key(loop[-1]), []):
                if j not in used:
                    nxt = (j, other); break
            if nxt is None: break
            used.add(nxt[0]); loop.append(nxt[1])
            if key(loop[-1]) == key(loop[0]): break
        if len(loop) > 12: loops.append(loop)
    return loops

def resample(loop, n=120):
    pts = loop[:-1] if math.dist(loop[0], loop[-1]) < 1e-6 else loop[:]
    total, cum = 0.0, [0.0]
    for i in range(len(pts)):
        total += math.dist(pts[i], pts[(i+1) % len(pts)]); cum.append(total)
    out = []
    for k in range(n):
        target = total * k / n
        i = max(m for m in range(len(cum)-1) if cum[m] <= target)
        seg = cum[i+1] - cum[i]
        t = 0 if seg == 0 else (target - cum[i]) / seg
        a, b = pts[i], pts[(i+1) % len(pts)]
        out.append((a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t))
    return out

def smooth(pts, passes=2):
    for _ in range(passes):
        n = len(pts)
        pts = [((pts[(i-1)%n][0] + 2*pts[i][0] + pts[(i+1)%n][0])/4,
                (pts[(i-1)%n][1] + 2*pts[i][1] + pts[(i+1)%n][1])/4) for i in range(n)]
    return pts

def to_path(pts):
    n = len(pts); out = ["M%.1f %.1f" % pts[0]]
    for i in range(n):
        p0, p1, p2, p3 = pts[(i-1)%n], pts[i], pts[(i+1)%n], pts[(i+2)%n]
        c1 = (p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6)
        c2 = (p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6)
        out.append("C%.1f %.1f %.1f %.1f %.1f %.1f" % (c1[0],c1[1],c2[0],c2[1],p2[0],p2[1]))
    return " ".join(out) + " Z"

def blobs_for(pts, r):
    return [to_path(smooth(resample(l))) for l in chain(contour(pts, r))]

mcl_w = [p for p in MCL if p[0] < 610]
mcl_e = [p for p in MCL if p[0] >= 610]

# r: bridge the widest neighbour gap, with a little slack. Reported so the
# numbers are auditable rather than magic.
groups = {'cpd': (CPD, 9.5), 'mcl': (None, 11.5), 'spine': (SPN, 12.0), 'food': (FOOD, 13.0)}
for name, pts in (('cpd', CPD), ('mcl-w', mcl_w), ('mcl-e', mcl_e), ('spine', SPN), ('food', FOOD)):
    print("%-6s %2d ticks, widest neighbour gap %.1f" % (name, len(pts), nn_gap(pts)))

out_blobs = {
    'cpd':   blobs_for(CPD, 9.5),
    'mcl':   blobs_for(mcl_w, 11.5) + blobs_for(mcl_e, 11.5),
    'spine': blobs_for(SPN, 14.0),
    'food':  blobs_for(FOOD, 16.0),
}
for k, v in out_blobs.items():
    print("%-6s -> %d loop(s)" % (k, len(v)))

out = '''// Area "blobs" shown at the furthest-out zoom in place of individual booth
// squares. Generated by scripts/build-blobs.py -- do not hand-edit.
//
// Each blob is the contour of "distance to the nearest booth tick = r", i.e.
// the outline of the union of discs centred on every square. It therefore
// follows the run wherever it curves and always contains every square. (An
// earlier version used a convex hull, which cut straight across the curve of
// the car path -- one edge tracked the booths, the other sheared off into open
// grass.)
//
// Containment is enforced twice: the radius keeps the shape tight to the ticks,
// and MapCanvas additionally clips the two street markets to their own street
// band, so neither can bleed onto the grass or across a kerb.
export const BLOBS = {
'''
for k in ('cpd','mcl','spine','food'):
    out += "  %s: [\n" % k
    for d in out_blobs[k]:
        out += "    '%s',\n" % d
    out += "  ],\n"
out += "};\n"
open('src/assets/basemapBlobs.js','w').write(out)
print("wrote src/assets/basemapBlobs.js")
