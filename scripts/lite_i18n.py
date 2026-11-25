"""Shared by build_lite_pages.py and translate_lite.py: which countries get a machine-translated text-only page in
which language (data/lite-languages.json), which English strings those pages need translated, and the translation
cache (data/lite-translations.json), so the site build itself never needs a translation engine.

Only free text is machine-translated: what a service does, how to reach it, phone notes, the relay note and the
emergency line's label. Names of services and organizations, numbers, addresses and links are never translated.
A translation is used only if it keeps every number, link and email address of the English, at a sane length;
otherwise the English stays, marked lang="en".
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'data/lite-languages.json').read_text())
LANGS = CONFIG['languages']
CACHE_FILE = ROOT / 'data/lite-translations.json'
WORLD = json.loads((ROOT / 'data/world.json').read_text())
FIELDS = ('what', 'how', 'phone_note')


def countries(lang):
    codes = LANGS[lang]['countries']
    return [c for c in WORLD['countries'] if c['code'] in codes]


def strings(lang):
    """The English strings the pages in this language need, in a stable order."""
    out = []
    for c in countries(lang):
        out.append(c['emergency']['label'])
        if c.get('relay'):
            out.append(c['relay'])
        for r in c['resources']:
            out += [r[f] for f in FIELDS if r.get(f)]
    return list(dict.fromkeys(out))


def load_cache():
    return json.loads(CACHE_FILE.read_text()) if CACHE_FILE.exists() else {}


TOKENS = re.compile(r'https?://\S+|[\w.+-]+@[\w-]+\.[\w.]+|\d+')


def keeps_facts(src, tr):
    """True when the translation carries every number, link and email of the English (in any order) at a sane length."""
    if not tr or not tr.strip():
        return False
    strip = lambda s: s.rstrip('.,;:)')
    a = sorted(strip(t) for t in TOKENS.findall(src))
    b = sorted(strip(t) for t in TOKENS.findall(tr))
    return a == b and 0.4 <= len(tr) / max(len(src), 1) <= 2.5
