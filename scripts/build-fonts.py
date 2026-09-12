#!/usr/bin/env python3
"""Convert the Brice .otf weights the design team ships into woff2.

    python3 scripts/build-fonts.py

Only the weights listed in WEIGHTS are converted -- see src/styles/fonts.css for
why the masthead's Black is currently the only one that ships. The .otf files
stay in the repo as the source of truth; the .woff2 beside them is what the
browser actually loads (21KB against 34KB, identical outlines).
"""
import os
from fontTools.ttLib import TTFont

WEIGHTS = ['Brice-Black']
SRC_DIR = 'src/assets/fonts'

for name in WEIGHTS:
    src = os.path.join(SRC_DIR, name + '.otf')
    out = os.path.join(SRC_DIR, name + '.woff2')
    if not os.path.exists(src):
        raise SystemExit('missing %s' % src)
    f = TTFont(src)
    f.flavor = 'woff2'
    f.save(out)
    print('%s -> %s  (%dKB -> %dKB)' % (
        os.path.basename(src), os.path.basename(out),
        os.path.getsize(src) // 1024, os.path.getsize(out) // 1024))
