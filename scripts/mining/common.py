"""Shared helpers for the Mobility Talk sourcing pipeline (see docs/DATA-PIPELINE.md)."""
import csv, json, re, sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from build_mobility_routes import STATES, TERRITORIES  # noqa: E402

PLACES = {**STATES, **TERRITORIES}
REGISTRY = ROOT / 'pipeline' / 'registry.json'
BATCHES = ROOT / 'pipeline' / 'batches'
ADDED = ROOT / 'data' / 'added-programs.json'
LOCAL = ROOT / 'data' / 'local-programs.json'
WORLD = ROOT / 'data' / 'world.json'

# One normalized row per candidate listing. Lists are joined with " | ".
COLUMNS = ['candidate_id', 'target', 'place', 'family', 'category', 'section', 'name', 'org', 'what', 'how',
           'next_step', 'scope', 'counties', 'phone', 'dial', 'email', 'url', 'sources', 'reviewed_on',
           'record_status', 'evidence_note', 'decision', 'match_id', 'decision_note']
LIST_COLUMNS = {'counties', 'sources'}
DECISIONS = {'new', 'duplicate', 'rejected', 'review', 'promoted'}
STATUSES = {'official_source_reviewed', 'directory_listed'}
SEP = ' | '


def load(path):
    return json.load(open(path, encoding='utf-8'))


def registry():
    return load(REGISTRY)


def categories():
    return load(LOCAL)['categories']


def world_sections():
    return load(WORLD)['sections']


def slug(text, n=40):
    s = re.sub(r'[^a-z0-9]+', '-', (text or '').lower()).strip('-')
    return s[:n].strip('-')


def digits(text):
    return re.sub(r'\D', '', text or '')


def norm_url(u):
    """Host and path, without scheme, www, query or trailing slash, for matching the same page."""
    if not u:
        return ''
    p = urlparse(u.strip())
    return (p.netloc.lower().removeprefix('www.') + p.path.rstrip('/').lower())


STOP = {'the', 'of', 'and', 'for', 'a', 'an', 'in', 'de', 'la', 'el', 'des', 'du', 'et', 'y', 'inc', 'center', 'centre',
        'national', 'program', 'programme', 'services', 'service'}


def name_tokens(*texts):
    words = re.findall(r'[a-z0-9]+', ' '.join(t or '' for t in texts).lower())
    return {w for w in words if w not in STOP and len(w) > 2}


def similar(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def read_csv(path):
    rows = list(csv.DictReader(open(path, encoding='utf-8', newline='')))
    for r in rows:
        for c in LIST_COLUMNS:
            r[c] = [x for x in (r.get(c) or '').split(SEP) if x]
    return rows


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, lineterminator='\n')
        w.writeheader()
        for r in rows:
            out = {c: r.get(c) if r.get(c) is not None else '' for c in COLUMNS}
            for c in LIST_COLUMNS:
                out[c] = SEP.join(r.get(c) or [])
            w.writerow(out)


def existing_index():
    """Every published listing, by place, for duplicate checks: US programs (built and hand-added) and world resources."""
    idx = {}
    seen = set()
    for src in (load(LOCAL)['records'], load(ADDED)['records']):
        for r in src:
            if r['id'] in seen:
                continue
            seen.add(r['id'])
            idx.setdefault(('us', r['state']), []).append({
                'id': r['id'], 'tokens': name_tokens(r.get('name'), r.get('org')), 'name_tokens': name_tokens(r.get('name')),
                'urls': {norm_url(r.get('url')), norm_url(r.get('web'))} - {''}, 'phone': digits(r.get('phone')),
                'kind': r.get('category')})
    for c in load(WORLD)['countries']:
        for r in c['resources']:
            seen.add(r['id'])
            idx.setdefault(('world', c['code']), []).append({
                'id': r['id'], 'tokens': name_tokens(r.get('name'), r.get('org')), 'name_tokens': name_tokens(r.get('name')),
                'urls': {norm_url(r.get('url'))} - {''}, 'phone': digits(r.get('dial') or r.get('phone')),
                'kind': r.get('section')})
    for r in load(WORLD).get('worldwide', []):
        seen.add(r.get('id'))
    return idx, seen
