#!/usr/bin/env python3
"""Fetch machine-readable open data named in pipeline/registry.json and stage it as leads.

Usage: python3 scripts/mining/fetch_open_data.py [YYYY-MM-DD]

Needs ordinary internet access (a normal computer or a session that can reach data.transportation.gov; the
cloud sessions behind this site cannot). For each source with
method "open_data_script" it saves a trimmed raw snapshot to pipeline/raw/, writes leads in the researcher format to
pipeline/batches/DATE-open-data/leads.json and stages them with stage.py. Every lead is staged as decision "review":
a feed row is never published until someone reads the provider's own page, confirms it offers rides people with
disabilities can use, and records the counties it serves.

Sources handled:
  ntd_reporters  FTA National Transit Database, reporter agency information (data.transportation.gov ccvf-fykn),
                 U.S. government work. Each agency is placed in the county that holds its listed location.
"""
import datetime, json, subprocess, sys, urllib.request
from pathlib import Path
from common import BATCHES, PLACES, ROOT

UA = {'User-Agent': 'mobilitytalk.org open-data pipeline (+https://mobilitytalk.org/about.html)'}
NTD_API = 'https://data.transportation.gov/resource/ccvf-fykn.json?$limit=50000'
NTD_PAGE = 'https://data.transportation.gov/d/ccvf-fykn'


def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return json.load(r)


def pick(row, *needles, exclude=()):
    """First field whose name contains all the needles (field names differ between NTD releases)."""
    for k, v in row.items():
        kl = k.lower()
        if all(n in kl for n in needles) and not any(x in kl for x in exclude) and v not in (None, ''):
            return v
    return None


def point(row):
    for v in row.values():
        if isinstance(v, dict):
            if 'coordinates' in v and len(v['coordinates']) == 2: return float(v['coordinates'][0]), float(v['coordinates'][1])
            if 'latitude' in v and 'longitude' in v: return float(v['longitude']), float(v['latitude'])
    lat, lon = pick(row, 'latitude'), pick(row, 'longitude')
    return (float(lon), float(lat)) if lat and lon else None


def inside(x, y, ring):
    hit = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: hit = not hit
    return hit


_geo = {}
def county_at(state, pt):
    if not pt: return None
    if state not in _geo:
        f = ROOT / 'data' / 'geo' / f'{state}.json'
        _geo[state] = json.load(open(f))['counties'] if f.exists() else []
    for c in _geo[state]:
        for poly in c['p']:
            if inside(pt[0], pt[1], poly[0]) and not any(inside(pt[0], pt[1], hole) for hole in poly[1:]):
                return c['n']
    return None


def ntd_reporters(day):
    rows = get_json(NTD_API)
    raw, leads = [], []
    for row in rows:
        name = pick(row, 'agency', exclude=('id', 'type', 'voms'))
        state = (pick(row, 'state', exclude=('parent',)) or '').upper().strip()
        city = pick(row, 'city')
        url = pick(row, 'url') or pick(row, 'website')
        ntd_id = pick(row, 'ntd_id') or pick(row, 'ntdid')
        org_type = pick(row, 'organization_type')
        reporter_type = pick(row, 'reporter_type')
        if not name or state not in PLACES: continue
        pt = point(row); county = county_at(state, pt)
        raw.append({'ntd_id': ntd_id, 'agency': name, 'city': city, 'state': state, 'url': url,
                    'organization_type': org_type, 'reporter_type': reporter_type, 'county': county})
        own = url if isinstance(url, str) and url.startswith('https://') else ''
        leads.append({'place': state, 'family': 'local-transit', 'category': 'transportation', 'name': name, 'org': name,
                      'what': f'Public transit provider in {city or "this state"} listed in the Federal Transit Administration’s National Transit Database.',
                      'next_step': 'Call and ask whether it runs door-to-door or ADA paratransit rides in your area, who qualifies and how to apply.',
                      'counties': [county] if county else [], 'url': own, 'sources': [NTD_PAGE], 'reviewed_on': day,
                      'record_status': 'directory_listed', 'decision': 'review',
                      'evidence_note': f'NTD reporter list: {reporter_type or "reporter"}, {org_type or "organization type not given"}, NTD ID {ntd_id or "not given"}'
                                       + ('' if own else f'; listed web address {url!r} needs checking' if url else '; no web address listed'),
                      'decision_note': 'county is where the listed location sits, not the full service area' if county else 'no county found'})
    return raw, leads


HANDLERS = {'ntd_reporters': ntd_reporters}


def main():
    day = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().isoformat()
    batch = BATCHES / f'{day}-open-data'; batch.mkdir(parents=True, exist_ok=True)
    (ROOT / 'pipeline' / 'raw').mkdir(exist_ok=True)
    all_leads = []
    for name, fn in HANDLERS.items():
        raw, leads = fn(day)
        with open(ROOT / 'pipeline' / 'raw' / f'{name}-{day}.json', 'w', encoding='utf-8') as f:
            json.dump({'fetched_on': day, 'source': NTD_PAGE, 'rows': raw}, f, indent=1, ensure_ascii=False); f.write('\n')
        print(name, len(raw), 'rows,', sum(1 for r in raw if r['county']), 'placed in a county')
        all_leads += leads
    with open(batch / 'leads.json', 'w', encoding='utf-8') as f:
        json.dump(all_leads, f, indent=1, ensure_ascii=False); f.write('\n')
    subprocess.run([sys.executable, str(Path(__file__).with_name('stage.py')), str(batch), str(batch / 'leads.json')], check=True)


if __name__ == '__main__':
    main()
