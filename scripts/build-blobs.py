#!/usr/bin/env python3
"""Regenerate src/assets/basemapBlobs.js from src/assets/basemapCoords.js.

Run from the repo root:  python3 scripts/build-blobs.py

Each blob is the convex hull of a group's tick centers, offset outward with
round joins (Minkowski sum with a disc), then smoothed with a closed
Catmull-Rom spline. Organic outline, but tight to the real footprint.
"""
import math, re

src = open('src/assets/basemapCoords.js').read()
def arr(name):
    m = re.search(r'export const %s = \[(.*?)\];' % name, src, re.S)
    return [[float(a), float(b)] for a, b in re.findall(r'\[(-?[\d.]+),(-?[\d.]+)\]', m.group(1))]
CPD, MCL, SPN, FOOD = arr('CPD'), arr('MCL'), arr('SPN'), arr('FOOD')

def hull(pts):
    pts = sorted(set(map(tuple, pts)))
    if len(pts) < 3: return pts
    def cross(o,a,b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo=[]
    for p in pts:
        while len(lo)>=2 and cross(lo[-2],lo[-1],p)<=0: lo.pop()
        lo.append(p)
    up=[]
    for p in reversed(pts):
        while len(up)>=2 and cross(up[-2],up[-1],p)<=0: up.pop()
        up.append(p)
    return lo[:-1]+up[:-1]

def inflate(pts, d, samples=24):
    ring = []
    for (x, y) in pts:
        for i in range(samples):
            t = 2*math.pi*i/samples
            ring.append((x + d*math.cos(t), y + d*math.sin(t)))
    return hull(ring)

def smooth_path(pts, tension=1.0):
    n = len(pts); out = []
    for i in range(n):
        p0, p1, p2, p3 = pts[(i-1)%n], pts[i], pts[(i+1)%n], pts[(i+2)%n]
        c1 = (p1[0] + (p2[0]-p0[0])/(6*tension), p1[1] + (p2[1]-p0[1])/(6*tension))
        c2 = (p2[0] - (p3[0]-p1[0])/(6*tension), p2[1] - (p3[1]-p1[1])/(6*tension))
        if i == 0: out.append("M%.1f %.1f" % p1)
        out.append("C%.1f %.1f %.1f %.1f %.1f %.1f" % (c1[0],c1[1],c2[0],c2[1],p2[0],p2[1]))
    return " ".join(out) + " Z"

def blob(pts, pad):
    return smooth_path(inflate(hull(pts), pad))

mcl_w = [p for p in MCL if p[0] < 610]
mcl_e = [p for p in MCL if p[0] >= 610]
blobs = {'cpd': [blob(CPD, 11)], 'mcl': [blob(mcl_w, 11), blob(mcl_e, 11)],
         'spine': [blob(SPN, 12)], 'food': [blob(FOOD, 12)]}

out = '''// Area "blobs" shown at the furthest-out zoom level in place of individual
// booth squares. Generated from basemapCoords.js: convex hull of the tick
// centers, offset outward with round joins (a Minkowski sum with a disc), then
// smoothed with a closed Catmull-Rom spline. That keeps the outline organic
// while staying tight to the footprint the squares actually occupy, so a blob
// never bleeds into a neighbouring area.
//
// McLendon is two blobs, not one -- the row is interrupted where Mell Ave meets
// McLendon, and bridging that gap would draw a market across the street.
//
// Regenerate with scripts/build-blobs.py after changing any tick coordinates.
export const BLOBS = {
'''
for k in ('cpd','mcl','spine','food'):
    out += "  %s: [\n" % k
    for d in blobs[k]:
        out += "    '%s',\n" % d
    out += "  ],\n"
out += "};\n"
open('src/assets/basemapBlobs.js','w').write(out)
print("wrote src/assets/basemapBlobs.js")
