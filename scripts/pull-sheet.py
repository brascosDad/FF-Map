#!/usr/bin/env python3
"""Re-read the artist market chair's sheet and rewrite src/data/booth-numbering-2026.json.

    python3 scripts/pull-sheet.py                 # fetch the live sheet (needs network)
    python3 scripts/pull-sheet.py path/to/export.csv   # or from a CSV you downloaded

Then `python3 scripts/build-booths.py` to lay the new numbering onto the map.

The sheet is the source of truth for WHAT is in every booth. It is somebody
else's document and it moves -- it was edited three times in the three days
before this script existed -- so nothing here is typed in by hand: the JSON is
rebuilt from the CSV export every time, and the read date is recorded in it.

What the sheet looks like (columns, in order):

    Location Type | OLD NUMBER | 2026 BOOTH NUMBER | Name | Business Name

  - One row per booth. "Location Type" is the chair's zone name; ZONES below
    maps each spelling she uses to the zone id the app reads.
  - A row with no 2026 number and no name is a section heading or a gap note
    ("EAST LAWN", "20 foot gap for bikes/emergencies"). Gap notes are kept as
    `gaps`; headings are dropped.
  - A row with a name but no number is an artist with a spot and no booth
    number (AWARE Wildlife). The Acoustic Stage booth has the words "Acoustic
    Stage booth" where its number would be. Both land in `unnumbered`.
  - "SPONSOR" in the name column with no business is a sponsor booth: it
    keeps its number and gets no name.
  - Kidlandia booths are numbered K0, K1, ... and count separately from the
    1-N run.

If the sheet grows a column or a new zone name, this script stops rather than
guessing: fix ZONES (or the parser) and re-run.
"""
import csv
import datetime
import io
import json
import re
import sys
import urllib.request

OUT = 'src/data/booth-numbering-2026.json'

# The chair's zone names, exactly as she spells them, -> the zone id the app
# uses. Order matters for Candler Park Dr: she lists "CPD West Side" twice, the
# first run (82-100) before the park-side zones and a second run at the far
# end of the street after them. The second run gets its own id so the map can
# place it north of the barricade where it belongs.
ZONES = {
    'East side of Park': ('east-park', 'Park - east side of the diagonal path'),
    'West side inside park': ('west-park', 'Park - west side, inside the park'),
    'McLendon South Side': ('mclendon-south', 'McLendon Ave - south side'),
    'McLendon South Side - ACOUSTIC STAGE': ('mclendon-south', None),
    'CPD West Side': ('cpd-west', 'Candler Park Dr - west side'),
    'CPD in front of West Lawn': ('cpd-west-lawn', 'Candler Park Dr - in front of the West Lawn'),
    'CPD Park Side In Front of Field': ('cpd-field', 'Candler Park Dr - park side, in front of the field'),
    'KIDLANDIA - on field': ('kidlandia', 'Kidlandia - on the field'),
}
SECOND_CPD_WEST = ('cpd-west-b', 'Candler Park Dr - west side (second run, at the far end of the street)')

# Booths where the sheet has the artist and the business in each other's
# columns. The app keeps them the right way round; the sheet is not corrected
# because it is not ours to edit.
NAME_BUSINESS_SWAPPED = {39}

# Carried over verbatim from the first version of this file: history a reader
# of the JSON still needs, and nothing the sheet can tell us.
SUPERSEDES = 'booth-numbering-2026.json (built from the 2025 official site map)'
CHANGE = 'All artist market booths resized to 15 ft. Every number downstream of the park moved.'
ENDPOINTS_2025 = {'park': '1-61', 'mclendon': '62-88', 'candler_park_dr': '89-164'}

# The poster groups zones into four runs. Zone id -> poster run.
POSTER_RUN = {'east-park': 'park', 'west-park': 'park', 'mclendon-south': 'mclendon',
              'cpd-west': 'candler_park_dr', 'cpd-west-lawn': 'candler_park_dr',
              'cpd-field': 'candler_park_dr', 'cpd-west-b': 'candler_park_dr',
              'kidlandia': 'kidlandia'}


def sheet_url():
    return json.load(open(OUT))['sheet_url']


def fetch_csv(url):
    export = re.sub(r'/edit.*$', '', url) + '/export?format=csv'
    with urllib.request.urlopen(export, timeout=30) as r:
        return r.read().decode('utf-8-sig')


def booth_key(s):
    """'12' -> 12, 'K3' -> 'K3', anything else -> the string itself."""
    s = s.strip()
    return int(s) if s.isdigit() else s


def sort_key(n):
    return (1, int(n[1:])) if isinstance(n, str) else (0, n)


def parse(text):
    rows = list(csv.reader(io.StringIO(text)))
    header = [h.strip() for h in rows[0]]
    want = ['Location Type', 'OLD NUMBER', '2026 BOOTH NUMBER', 'Name', 'Business Name']
    assert header == want, 'sheet columns changed: %s' % header

    booths, unnumbered, gaps, zone_label = [], [], [], {}
    seen_field = False
    prev = None
    for raw in rows[1:]:
        raw = (raw + [''] * 5)[:5]
        zone_name, old, new, name, biz = [c.strip() for c in raw]
        if not new and not name:
            if zone_name and re.search(r'\bgap\b', zone_name, re.I) and prev is not None:
                gaps.append({'after_booth': prev, 'note': zone_name})
            continue
        assert zone_name in ZONES, 'unknown zone on the sheet: %r (booth %r)' % (zone_name, new)
        zid, label = ZONES[zone_name]
        if zid == 'cpd-field':
            seen_field = True
        if zid == 'cpd-west' and seen_field:
            zid, label = SECOND_CPD_WEST
        if label:
            zone_label[zid] = label

        if name.upper() == 'SPONSOR' and not biz:
            name = biz = None
            status = 'sponsor_or_open'
        else:
            status = 'assigned'
        n = booth_key(new)
        if isinstance(n, str) and not re.fullmatch(r'K\d+', n):
            # No number: "Acoustic Stage booth", or nothing at all.
            unnumbered.append({'zone': zid, 'booth': n or None, 'name': name, 'business': biz,
                               'note': ('listed as the %s, not numbered' % n) if n
                                       else 'no number on the sheet'})
            continue
        if n in NAME_BUSINESS_SWAPPED:
            name, biz = biz, name
        booths.append({'booth': n, 'zone': zid, 'name': name, 'business': biz, 'status': status,
                       'booth_2025': booth_key(old) if old else None})
        prev = n

    # The gap note names the booth before it; the one after is the next row.
    for g in gaps:
        after = next(b for b in booths if b['booth'] == g['after_booth'])
        nxt = min((b for b in booths if b['zone'] == after['zone'] and sort_key(b['booth']) > sort_key(after['booth'])),
                  key=lambda b: sort_key(b['booth']))
        g['before_booth'] = nxt['booth']
        g['zone'] = after['zone']
    gaps = [{k: g[k] for k in ('after_booth', 'before_booth', 'zone', 'note')} for g in gaps]
    return booths, unnumbered, gaps, zone_label


def build(booths, unnumbered, gaps, zone_label, url, read_date):
    nums = sorted(b['booth'] for b in booths if isinstance(b['booth'], int))
    assert nums == sorted(set(nums)), 'a booth number appears twice on the sheet'
    highest = nums[-1]
    not_present = [n for n in range(1, highest + 1) if n not in set(nums)]
    sponsor = sorted(b['booth'] for b in booths if b['status'] != 'assigned')
    named = [b['name'] for b in booths if b['name']] + [u['name'] for u in unnumbered]
    twice = sorted({n for n in named if named.count(n) > 1})

    zone_ranges = {}
    order = []
    for b in booths:
        if b['zone'] not in order:
            order.append(b['zone'])
    for zid in order:
        zs = sorted((b['booth'] for b in booths if b['zone'] == zid), key=sort_key)
        zone_ranges[zid] = {'label': zone_label[zid], 'first': zs[0], 'last': zs[-1], 'count': len(zs)}

    poster = {}
    for run in ('park', 'mclendon', 'candler_park_dr', 'kidlandia'):
        zs = sorted((b['booth'] for b in booths if POSTER_RUN[b['zone']] == run), key=sort_key)
        poster[run] = '%s-%s' % (zs[0], zs[-1])

    return {
        'source': "Courtney Weil, Google Sheet 'FF map '26: for map updates'. Rebuilt from the live sheet by "
                  "scripts/pull-sheet.py -- do not hand-edit; re-run it. Booth 39 keeps name/business the right "
                  "way round (the sheet has them swapped).",
        'read_date': read_date,
        'sheet_url': url,
        'supersedes': SUPERSEDES,
        'change': CHANGE,
        'highest_number': highest,
        'numbers_assigned': len(nums),
        'named_artists': len(named),
        'sponsor_or_open': sponsor,
        'numbers_not_present': not_present,
        'artists_holding_two_booths': twice,
        'gaps': gaps,
        'zone_ranges': zone_ranges,
        'poster_endpoints': poster,
        'poster_endpoints_2025_DO_NOT_USE': ENDPOINTS_2025,
        'unnumbered': unnumbered,
        'booths': booths,
    }


def main(argv):
    url = sheet_url()
    if len(argv) > 1:
        text = open(argv[1], encoding='utf-8-sig').read()
    else:
        text = fetch_csv(url)
    booths, unnumbered, gaps, zone_label = parse(text)
    data = build(booths, unnumbered, gaps, zone_label, url, datetime.date.today().isoformat())
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print('wrote %s: %d numbered (1-%d), %d Kidlandia, %d sponsor/open, %d unnumbered, read %s'
          % (OUT, data['numbers_assigned'], data['highest_number'],
             data['zone_ranges'].get('kidlandia', {}).get('count', 0),
             len(data['sponsor_or_open']), len(unnumbered), data['read_date']))
    for zid, zr in data['zone_ranges'].items():
        print('  %-14s %s-%s  (%d)' % (zid, zr['first'], zr['last'], zr['count']))
    if data['numbers_not_present']:
        print('  NOTE numbers missing from the sheet:', data['numbers_not_present'])


if __name__ == '__main__':
    main(sys.argv)
