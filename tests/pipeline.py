#!/usr/bin/env python3
"""Checks for the sourcing pipeline: registry shape, every staged batch, and that the coverage report is current."""
import json, re, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts' / 'mining'))
from common import BATCHES, COLUMNS, DECISIONS, STATUSES, load, read_csv, ADDED, WORLD, LOCAL, PLACES  # noqa: E402

errors = []
reg = load(ROOT / 'pipeline' / 'registry.json')
cats = load(LOCAL)['categories']; secs = load(WORLD)['sections']
ids = set()
for f in reg['families']:
    if f['id'] in ids: errors.append('duplicate family ' + f['id'])
    ids.add(f['id'])
    if f['applies_to'] not in ('us', 'country'): errors.append(f['id'] + ': applies_to')
    if f['applies_to'] == 'us':
        if f['category'] not in cats: errors.append(f['id'] + ': unknown category')
        re.compile(f['match']['id'])
    elif f['section'] not in secs: errors.append(f['id'] + ': unknown section')
    if not f['sources']: errors.append(f['id'] + ': no sources')
    for s in f['sources']:
        if s.get('url') and not s['url'].startswith('https://'): errors.append(f['id'] + ': source link not https')

added = {r['id'] for r in load(ADDED)['records']}
world = {r['id'] for c in load(WORLD)['countries'] for r in c['resources']}
batches = sorted(p for p in BATCHES.glob('*') if p.is_dir()) if BATCHES.exists() else []
for b in batches:
    path = b / 'candidates.csv'
    if not path.exists(): errors.append(f'{b.name}: no candidates.csv'); continue
    header = path.read_text(encoding='utf-8').splitlines()[0].split(',')
    if header != COLUMNS: errors.append(f'{b.name}: columns differ from the schema')
    seen = set()
    for r in read_csv(path):
        cid = r['candidate_id']
        if cid in seen: errors.append(f'{b.name}: duplicate candidate {cid}')
        seen.add(cid)
        if r['decision'] not in DECISIONS: errors.append(f'{cid}: decision {r["decision"]!r}')
        if r['decision'] in ('new', 'promoted', 'review'):
            if r['record_status'] not in STATUSES: errors.append(f'{cid}: evidence level')
            if not r['sources'] or not all(u.startswith('https://') for u in r['sources']): errors.append(f'{cid}: sources')
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', r['reviewed_on']): errors.append(f'{cid}: date')
            if r['target'] == 'us' and r['place'] not in PLACES: errors.append(f'{cid}: place')
        if r['decision'] == 'promoted' and r['match_id'] not in (added if r['target'] == 'us' else world):
            errors.append(f'{cid}: marked promoted but not in the site data')
        if r['decision'] == 'duplicate' and not r['match_id']: errors.append(f'{cid}: duplicate without the listing it matches')

res = subprocess.run([sys.executable, str(ROOT / 'scripts' / 'mining' / 'coverage.py'), '--check'], capture_output=True, text=True)
if res.returncode: errors.append(res.stdout + res.stderr)
if errors:
    print('\n'.join(errors)); sys.exit(1)
print(f'pipeline: {len(reg["families"])} source families, {len(batches)} batches checked, coverage report current')
