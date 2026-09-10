#!/usr/bin/env python3
"""Regenerate src/assets/basemapBlobs.js from the hand-drawn blobs in Figma.

Run from the repo root:  python3 scripts/extract-blobs.py [path/to/export.svg]

Source of truth is the Figma export (default: design/basemap.svg). Ernest draws
each area as a layer named `blob-<something>`; this script finds every element
whose id starts with `blob-`, converts it to a single SVG path string (rects,
including rounded ones, become paths), and writes them out keyed by map area.

The export's coordinate space is the same 1440x900 canvas the app uses, so the
paths go in untouched. Figma writes blob layers without transforms; if one ever
shows up with a `transform`, the script stops rather than silently misplace it.

To add or re-shape a blob: edit it in Figma, keep the `blob-` name, re-export
the map frame to design/basemap.svg, run this script, commit both files.

Replaces scripts/build-blobs.py (the older distance-field generator), which is
kept only for reference.
"""
import re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else 'design/basemap.svg'
OUT = 'src/assets/basemapBlobs.js'

# Figma layer name -> the area key the app already uses (see src/data/areas.js).
AREA_FOR = {
    'blob-art-market-candler-park-dr': 'cpd',
    'blob-art-market-mclendon': 'mcl',
    'blob-art-market-car-path': 'spine',
    'blob-food-trucks': 'food',
}
ORDER = ['cpd', 'mcl', 'spine', 'food']

svg = open(SRC, encoding='utf-8').read()


def attr(tag, name, default=None):
    m = re.search(r'\s%s="([^"]*)"' % re.escape(name), tag)
    return m.group(1) if m else default


def num(v):
    return ('%.3f' % float(v)).rstrip('0').rstrip('.')


def rect_path(tag):
    x, y = float(attr(tag, 'x', 0)), float(attr(tag, 'y', 0))
    w, h = float(attr(tag, 'width')), float(attr(tag, 'height'))
    rx = float(attr(tag, 'rx', attr(tag, 'ry', 0)) or 0)
    rx = min(rx, w / 2, h / 2)
    if rx == 0:
        return 'M%s %sH%sV%sH%sZ' % tuple(map(num, (x, y, x + w, y + h, x)))
    r = num(rx)
    return ('M{a} {y}H{b}A{r} {r} 0 0 1 {x2} {c}V{d}A{r} {r} 0 0 1 {b} {y2}'
            'H{a}A{r} {r} 0 0 1 {x} {d}V{c}A{r} {r} 0 0 1 {a} {y}Z').format(
        a=num(x + rx), b=num(x + w - rx), c=num(y + rx), d=num(y + h - rx),
        x=num(x), y=num(y), x2=num(x + w), y2=num(y + h), r=r)


found = {k: [] for k in ORDER}
unknown = []
for m in re.finditer(r'<(rect|path|ellipse|circle|polygon)\b[^>]*\sid="(blob-[^"]*)"[^>]*>', svg):
    kind, name, tag = m.group(1), m.group(2), m.group(0)
    if 'transform=' in tag:
        sys.exit('%s has a transform; flatten it in Figma (Cmd+E) and re-export.' % name)
    if kind == 'rect':
        d = rect_path(tag)
    elif kind == 'path':
        d = attr(tag, 'd')
    else:
        sys.exit('%s is a <%s>; convert it to a path in Figma (Cmd+E) and re-export.' % (name, kind))
    area = AREA_FOR.get(name)
    if area is None:
        unknown.append(name)
        continue
    found[area].append(d)

missing = [k for k in ORDER if not found[k]]
if missing:
    sys.exit('No blob found for area(s): %s. Expected layers: %s' % (', '.join(missing), ', '.join(AREA_FOR)))

lines = [
    '// Area "blobs" shown at the furthest-out zoom in place of individual booth',
    '// squares. Hand-drawn by Ernest in Figma (layers named `blob-*`) and pulled',
    '// out of design/basemap.svg by scripts/extract-blobs.py -- do not hand-edit;',
    '// change the shape in Figma, re-export, and re-run the script.',
    '//',
    '// MapCanvas still clips the two street markets to their own street band, so',
    '// a blob drawn a touch wide can never spill onto the grass or across a kerb.',
    'export const BLOBS = {',
]
for k in ORDER:
    lines.append('  %s: [' % k)
    for d in found[k]:
        lines.append("    '%s'," % d)
    lines.append('  ],')
lines.append('};')
open(OUT, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

print('wrote %s from %s' % (OUT, SRC))
for k in ORDER:
    print('  %-5s %d shape(s)' % (k, len(found[k])))
if unknown:
    print('  ignored (no area mapping): %s' % ', '.join(unknown))
