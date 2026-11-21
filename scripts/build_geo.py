#!/usr/bin/env python3
"""Write the outlines the help map draws: every state, D.C. and territory, and every county in each.

Source: the us-atlas package, version 3.0.1 (U.S. Census Bureau cartographic boundaries, 1:10,000,000,
ISC license), the same source the old county pictures came from. The package is not a dependency of this
site. Download its tarball once and point this script at the unpacked folder:

    curl -sSfO https://registry.npmjs.org/us-atlas/-/us-atlas-3.0.1.tgz && tar xzf us-atlas-3.0.1.tgz
    python3 scripts/build_geo.py package

Output (longitude and latitude, rounded to about 100 meters for counties and 1 kilometer for states,
which cannot be seen at the zoom levels each is drawn at):
  data/geo/states.json  one outline per state, D.C. and territory, keyed by postal code
  data/geo/<ST>.json    the county outlines for that state or territory, with the county names the
                        directory uses (Puerto Rico's municipios and the island districts of the other
                        territories count as counties here)
Nothing here is a place or an address: these are boundaries, used to shade where local programs serve
and to find which county a shared location falls in.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'geo'
FIPS = {'01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC',
        '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
        '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT',
        '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
        '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
        '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY',
        '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR', '78': 'VI'}
DIGITS = 3        # counties: about 100 meters
STATE_DIGITS = 2  # states, for the national map: about 1 kilometer


def wrap(polys):
    """Alaska's westernmost Aleutians lie past the date line; move them to the American side so the
    state draws in one piece instead of at both edges of the map."""
    return [[[[x - 360 if x > 0 else x, y] for x, y in r] for r in poly] for poly in polys]


def decoder(topo, digits=DIGITS):
    """TopoJSON arcs are delta-encoded integers; turn each into a list of [lon, lat]."""
    (sx, sy), (tx, ty) = topo['transform']['scale'], topo['transform']['translate']
    arcs = []
    for arc in topo['arcs']:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((round(x * sx + tx, digits), round(y * sy + ty, digits)))
        arcs.append(pts)

    def ring(ids):
        out = []
        for i in ids:
            pts = arcs[i] if i >= 0 else arcs[~i][::-1]
            out.extend(pts[1:] if out else pts)  # arcs share their end points
        clean = [out[0]]
        for p in out[1:]:
            if p != clean[-1]:
                clean.append(p)
        if clean[0] != clean[-1]:
            clean.append(clean[0])
        return [list(p) for p in clean] if len(clean) >= 4 else None

    def geometry(g):
        polys = [g['arcs']] if g['type'] == 'Polygon' else g['arcs'] if g['type'] == 'MultiPolygon' else []
        out = []
        for poly in polys:
            rings = [r for r in (ring(ids) for ids in poly) if r]
            if rings:
                out.append(rings)
        return out  # always a list of polygons, each a list of rings

    return geometry


def bbox(polys):
    xs = [p[0] for poly in polys for r in poly for p in r]
    ys = [p[1] for poly in polys for r in poly for p in r]
    return [min(xs), min(ys), max(xs), max(ys)]


def main(src):
    src = Path(src)
    states = json.loads((src / 'states-10m.json').read_text())
    counties = json.loads((src / 'counties-10m.json').read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    geo = decoder(states, STATE_DIGITS)
    out = []
    for g in states['objects']['states']['geometries']:
        code = FIPS.get(g['id'])
        if not code:
            continue
        polys = geo(g)
        if code == 'AK':
            polys = wrap(polys)
        out.append({'id': code, 'n': g['properties']['name'], 'b': bbox(polys), 'p': polys})
    out.sort(key=lambda s: s['id'])
    write(OUT / 'states.json', {'source': 'us-atlas 3.0.1 (U.S. Census Bureau cartographic boundaries)', 'states': out})
    geo, fine = decoder(counties), decoder(counties, DIGITS + 1)
    by = {}
    for g in counties['objects']['counties']['geometries']:
        code = FIPS.get(g['id'][:2])
        if not code:
            continue
        polys = geo(g) or fine(g)  # a very small place (Falls Church, Virginia) keeps a finer outline rather than vanish
        name = g['properties']['name']
        # Independent cities (county codes 510 and up in Maryland, Missouri and Virginia) share a name with a
        # county; the directory calls them "Baltimore City", "St. Louis City", "Fairfax City" and so on.
        if code in ('MD', 'MO', 'VA') and int(g['id'][2:]) >= 510 and not name.endswith(' City'):
            name += ' City'
        if code == 'AK':
            polys = wrap(polys)
        if polys:
            by.setdefault(code, []).append({'n': name, 'p': polys})
    total = 0
    for code, items in sorted(by.items()):
        items.sort(key=lambda c: c['n'])
        # Some listings name a city without "City" ("Virginia Beach"); where no county has that bare name,
        # keep it as another name for the city so those listings still shade it.
        names = {c['n'] for c in items}
        for c in items:
            if code in ('MD', 'MO', 'VA') and c['n'].endswith(' City') and c['n'][:-5] not in names:
                c['a'] = [c['n'][:-5]]
        total += write(OUT / f'{code}.json', {'state': code, 'b': bbox([p for c in items for p in c['p']]), 'counties': items})
    print(f'{len(out)} state outlines; county outlines for {len(by)} states and territories, {round(total / 1024)} KB')


def write(path, obj):
    text = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    path.write_text(text + '\n')
    return len(text)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
