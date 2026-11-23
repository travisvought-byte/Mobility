#!/usr/bin/env python3
"""Stage researcher output as one normalized, deduplicated candidates file.

Usage: python3 scripts/mining/stage.py pipeline/batches/BATCH research-output.json [more.json ...]

Each input is a JSON list of rows in the shape docs/DATA-PIPELINE.md describes (a final {"skipped": [...]} object is
allowed). The script checks every row, normalizes it, compares it with everything already published (same page,
same phone number, or nearly the same name in the same place) and with the rest of the batch, and writes:
  BATCH/candidates.csv  one row per candidate with decision new, duplicate or rejected and the reason
  BATCH/skipped.csv     what researchers looked for and could not trace, with why (the next batch's leads)
Re-running is safe: decisions already set to promoted are kept.
"""
import csv, json, re, sys
from pathlib import Path
from urllib.parse import urlparse
from common import (COLUMNS, PLACES, STATUSES, digits, existing_index, load, name_tokens, norm_url, read_csv,
                    categories, similar, slug, world_sections, write_csv, WORLD)

DATE = re.compile(r'\d{4}-\d{2}-\d{2}$')
# Researchers' short tags mapped onto the family ids in pipeline/registry.json, so coverage counts them.
FAMILY_ALIASES = {'at-reuse': 'equipment-reuse', 'loan-closet': 'equipment-reuse', 'wheelchair-repair': 'equipment-reuse',
                  'dme-reuse': 'equipment-reuse', 'assistive-tech': 'at-program', 'at-act': 'at-program',
                  'tedp': 'phone-equipment', 'icanconnect': 'phone-equipment', 'nls': 'talking-book-library',
                  'vocational-rehab': 'vr-agency', 'protection-advocacy': 'pa-agency', 'paratransit': 'local-transit',
                  'vision-rehab': 'older-blind', 'nwd': 'adrc'}


def problems(r, target, cats, secs, countries):
    p = []
    if target == 'us':
        if r['place'] not in PLACES: p.append('unknown US place')
        if r['category'] not in cats: p.append('unknown category')
        if not r['next_step']: p.append('no next step')
    else:
        if r['place'] not in countries: p.append('country not on the site yet')
        if r['section'] not in secs or r['section'] == 'help-now': p.append('unknown section')
        if not r['how']: p.append('no how-to-reach line')
    if not r['name']: p.append('no name')
    if not r['what']: p.append('no description')
    if not (r['phone'] or r['url'] or r['email']): p.append('no way to reach it')
    if r['url'] and not r['url'].startswith('https://'): p.append('link is not https')
    if not r['sources'] or not all(u.startswith('https://') for u in r['sources']): p.append('needs https sources')
    if not DATE.match(r['reviewed_on'] or ''): p.append('no review date')
    if r['record_status'] not in STATUSES: p.append('unknown evidence level')
    if r['dial'] and not re.fullmatch(r'[*+]?\d{3,15}', r['dial']): p.append('bad dial digits')
    return p


def normalize(raw):
    target = 'world' if raw.get('section') else 'us'
    r = {c: '' for c in COLUMNS}
    for k in ('place', 'family', 'category', 'section', 'name', 'org', 'what', 'how', 'next_step', 'scope', 'phone',
              'email', 'url', 'reviewed_on', 'record_status', 'evidence_note'):
        v = raw.get(k)
        r[k] = re.sub(r'\s+', ' ', str(v)).strip() if v not in (None, []) else ''
    if raw.get('decision_note'): r['decision_note'] = raw['decision_note']
    r['target'] = target
    r['family'] = FAMILY_ALIASES.get(r['family'].lower(), r['family'].lower())
    r['place'] = r['place'].upper()
    r['counties'] = [c.strip() for c in raw.get('counties') or [] if c and c.strip()]
    r['sources'] = list(dict.fromkeys(u.strip() for u in raw.get('sources') or [] if u and u.strip()))
    if r['url'] and r['url'] not in r['sources'] and r['record_status'] == 'official_source_reviewed':
        r['decision_note'] = 'own link not among the pages read'
    if re.search(r'@(gmail|yahoo|hotmail|aol|outlook|icloud)\.(com|net)\b', r['email'], re.I):
        # The site lists no personal free-mail addresses (tests/front-door.cjs)
        r['email'] = ''; r['decision_note'] = 'personal free-mail address left off'
    m = re.match(r'(.*?\d{4})\s*/\s*\d+$', r['phone'])
    if m:
        # "(670) 322-6537/8": keep the first full number; the page lists the other
        r['phone'] = m.group(1); r['decision_note'] = (r['decision_note'] + '; ' if r['decision_note'] else '') + 'second number left off'
    if target == 'us':
        r['scope'] = 'counties' if r['counties'] else 'statewide'
    if target == 'world' and r['phone']:
        if r['phone'].startswith('+'):
            # The site prints numbers the way they are dialed inside the country; an international-only number stays off.
            r['decision_note'] = (r['decision_note'] + '; ' if r['decision_note'] else '') + 'international-format phone left off'
            r['phone'] = ''
        else:
            r['dial'] = digits(r['phone'])
    return r


def main():
    if len(sys.argv) < 3: sys.exit(__doc__)
    batch = Path(sys.argv[1]); inputs = [Path(a) for a in sys.argv[2:]]
    cats = categories(); secs = world_sections(); countries = {c['code'] for c in load(WORLD)['countries']}
    idx, ids = existing_index()
    old = {r['candidate_id']: r for r in read_csv(batch / 'candidates.csv')} if (batch / 'candidates.csv').exists() else {}
    rows, skipped, raw_review = [], [], {}
    for path in inputs:
        for raw in json.load(open(path, encoding='utf-8')):
            if isinstance(raw, dict) and 'skipped' in raw:
                skipped += raw['skipped']; continue
            r = normalize(raw); rows.append(r)
            if raw.get('decision') == 'review': raw_review[id(r)] = True
    taken = set(ids)
    batch_seen = []
    for r in rows:
        key = (r['target'], r['place'])
        base = f"{r['place'].lower()}-{slug(r['family'] or r['section'] or r['category'], 18)}-{slug(r['org'] if len(r['name']) > 45 else r['name'], 30)}".strip('-')
        cid, n = base, 2
        while cid in taken: cid, n = f'{base}-{n}', n + 1
        taken.add(cid); r['candidate_id'] = cid
        p = problems(r, r['target'], cats, secs, countries)
        review = raw_review.get(id(r))
        if p and not review:
            r['decision'] = 'rejected'; r['decision_note'] = '; '.join(p); continue
        tok = name_tokens(r['name'], r['org']); ntok = name_tokens(r['name']); url = norm_url(r['url']); ph = digits(r['phone'])
        kind = r['category'] if r['target'] == 'us' else r['section']
        match = None
        for e in idx.get(key, []) + [b for b in batch_seen if (b['key'] == key)]:
            # One organization often runs several programs from one page or phone line (a center for independent living
            # and its loan closet), so a shared page or number only counts as a duplicate for the same kind of help.
            if url and url in e['urls'] and urlparse(r['url']).path.strip('/') and e['kind'] == kind:
                match = (e['id'], 'same page'); break
            if len(ph) >= 7 and ph == e['phone'] and e['kind'] == kind:
                match = (e['id'], 'same phone number'); break
            if similar(ntok, e['name_tokens']) >= 0.6 or similar(tok, e['tokens']) >= 0.75:
                match = (e['id'], 'nearly the same name'); break
        prev = old.get(cid)
        if prev and prev['decision'] == 'promoted':
            r['decision'], r['match_id'] = 'promoted', prev['match_id']
        elif match:
            r['decision'], r['match_id'] = 'duplicate', match[0]
            r['decision_note'] = '; '.join(x for x in (r['decision_note'], match[1]) if x)
        elif review:
            # Machine-fetched open-data leads: staged for a reviewer, never published straight from the feed.
            r['decision'] = 'review'; r['decision_note'] = '; '.join(x for x in [r['decision_note']] + p if x)
        else:
            r['decision'] = 'new'
        batch_seen.append({'key': key, 'id': cid, 'tokens': tok, 'name_tokens': ntok, 'urls': {url} - {''}, 'phone': ph, 'kind': kind})
    write_csv(batch / 'candidates.csv', rows)
    with open(batch / 'skipped.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n'); w.writerow(['place', 'what', 'why'])
        for s in skipped: w.writerow([s.get('place', ''), s.get('what', ''), s.get('why', '')])
    from collections import Counter
    print(len(rows), 'candidates:', dict(Counter(r['decision'] for r in rows)), '|', len(skipped), 'skipped leads')


if __name__ == '__main__':
    main()
