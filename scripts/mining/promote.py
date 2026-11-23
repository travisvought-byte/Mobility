#!/usr/bin/env python3
"""Publish a staged batch's new candidates into the site's source data.

Usage: python3 scripts/mining/promote.py pipeline/batches/BATCH

US rows go into data/added-programs.json (then rebuild data/local-programs.json with
scripts/extract_local_programs.py and the pages with npm run build). Country rows go into data/world.json.
Only rows with decision "new" are published; each becomes "promoted" with the id it was given. A row read only from a
directory keeps record_status directory_listed, which the pages show with a note. Nothing is overwritten or deleted.
"""
import json, sys
from pathlib import Path
from common import ADDED, ROOT, WORLD, load, read_csv, write_csv


def main():
    if len(sys.argv) != 2: sys.exit(__doc__)
    batch = Path(sys.argv[1]); rows = read_csv(batch / 'candidates.csv')
    origin = str((batch / 'candidates.csv').resolve().relative_to(ROOT))
    added = load(ADDED); world = load(WORLD)
    have = {r['id'] for r in added['records']}
    countries = {c['code']: c for c in world['countries']}
    n_us = n_world = 0
    for r in rows:
        if r['decision'] != 'new': continue
        rid = r['candidate_id']
        if r['target'] == 'us':
            if rid in have: continue
            added['records'].append({
                'id': rid, 'family': r['family'] or None, 'name': r['name'], 'org': r['org'] or r['name'], 'state': r['place'], 'scope': r['scope'],
                'counties': r['counties'], 'category': r['category'], 'description': r['what'], 'next_step': r['next_step'],
                'constraints': [], 'phone': r['phone'] or None, 'phone_note': None, 'email': r['email'] or None, 'web': None,
                'url': r['url'] or None, 'sources': r['sources'], 'reviewed_on': r['reviewed_on'],
                'record_status': r['record_status'], 'origin': origin})
            have.add(rid); n_us += 1
        else:
            c = countries[r['place']]
            if any(x['id'] == rid for x in c['resources']): continue
            rec = {'id': rid, 'section': r['section'], 'name': r['name'], 'org': r['org'] or r['name'], 'what': r['what'],
                   'how': r['how']}
            if r['phone']: rec['phone'] = r['phone']; rec['dial'] = r['dial']
            if r['email']: rec['email'] = r['email']
            if r['url']: rec['url'] = r['url']
            if r['record_status'] == 'directory_listed': rec['record_status'] = 'directory_listed'
            rec['sources'] = r['sources']; rec['reviewed_on'] = r['reviewed_on']
            c['resources'].append(rec); n_world += 1
        r['decision'] = 'promoted'; r['match_id'] = rid
    with open(ADDED, 'w', encoding='utf-8') as f:
        json.dump(added, f, indent=1, ensure_ascii=False)
    with open(WORLD, 'w', encoding='utf-8') as f:
        json.dump(world, f, indent=1, ensure_ascii=False); f.write('\n')
    write_csv(batch / 'candidates.csv', rows)
    print(f'published {n_us} US and {n_world} country listings from {origin}')


if __name__ == '__main__':
    main()
