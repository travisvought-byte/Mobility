#!/usr/bin/env python3
"""Fill data/lite-translations.json with machine translations for the text-only pages in other languages, using
Argos Translate (free, open source, runs offline once its language models are downloaded). Only strings not yet in the
file are translated, so a run after a data change translates just what changed. A translation that loses a number,
link or email, or comes out far too long or short, is stored as null and the page keeps the English for it.

Runs in .github/workflows/translate-lite.yml (pip install argostranslate; the models download there). After it,
run `npm run build` so the pages pick up the new strings. `--check` lists what is missing and exits 1 if anything is.
"""
import json, sys
from lite_i18n import LANGS, CACHE_FILE, load_cache, strings, keeps_facts


def missing(cache):
    return {lang: [s for s in strings(lang) if s not in cache.get(lang, {})] for lang in LANGS}


def main():
    cache = load_cache()
    todo = missing(cache)
    count = sum(map(len, todo.values()))
    if '--check' in sys.argv:
        for lang, items in todo.items():
            if items:
                print(f'{lang}: {len(items)} strings not yet translated')
        sys.exit(1 if count else 0)
    if not count:
        print('All strings already translated.')
    else:
        import argostranslate.package as pkg
        import argostranslate.translate as tr
        pkg.update_package_index()
        available = pkg.get_available_packages()
        for lang, items in todo.items():
            if not items:
                continue
            if not any(l.code == lang for l in tr.get_installed_languages()):
                pkg.install_from_path(next(p for p in available if p.from_code == 'en' and p.to_code == lang).download())
            kept = 0
            for s in items:
                out = tr.translate(s, 'en', lang)
                good = keeps_facts(s, out)
                cache.setdefault(lang, {})[s] = out if good else None
                kept += good
            print(f'{lang}: translated {len(items)} strings, {kept} kept, {len(items) - kept} left in English')
    # Keep only strings the pages still use, sorted, so the file's diff shows what changed.
    used = {lang: set(strings(lang)) for lang in LANGS}
    cache = {lang: dict(sorted((k, v) for k, v in cache.get(lang, {}).items() if k in used[lang])) for lang in LANGS}
    CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
