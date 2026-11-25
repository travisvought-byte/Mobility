#!/usr/bin/env python3
"""Build the low-data, text-only edition: lite/index.html and lite/<slug>.html, one per country in data/world.json.

Why (owner direction, November 25, 2026: reach underserved countries and people on slow or costly connections): most
people offline or barely online are on cheap phones, paying for every megabyte, often through Opera Mini or a
zero-rated service such as Free Basics, which only takes pages that work without JavaScript, iframes, video or large
images. So each lite page is one small HTML file: no script, no stylesheet to fetch, no pictures, nothing to download
but the page itself. It works on feature-phone browsers, prints on one or two sheets, and is what the offline pack
(.github/workflows/offline-pack.yml) bundles for Kiwix readers and offline school and clinic servers.

Each page also carries a ready-made text message (the emergency number, the first crisis line and the page link) that
opens in the phone's SMS app or WhatsApp, because help in these places mostly travels person to person.

The full country page stays the one search engines index: each lite page names it as canonical, and lite pages are left
out of the sitemap. The full page links here ("Text-only, low-data version"). Do not edit the output by hand. Run via
`npm run build`; finalize_pages.py does not touch lite/.
"""
import html, json, re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'lite'
BASE = 'https://mobilitytalk.org/'
DATA = json.loads((ROOT / 'data/world.json').read_text())
SECTIONS = DATA['sections']
ORDER = ['start', 'money', 'equipment-home', 'work', 'rights', 'help-now']
CORRECTIONS = 'travis@vethomeguard.org'
# built and published by .github/workflows/offline-pack.yml
PACK = 'https://github.com/travisvought-byte/mobility/releases/download/offline/mobility-talk-lite'
E = lambda s: html.escape(str(s), quote=True)
MAX_BYTES = 16000  # a country page this size loads in a few seconds on 2G (about 5 KB sent, as GitHub Pages compresses it)
MAX_INDEX = 24000  # the country list is one line per country
# GoatCounter as a 43-byte image instead of its script, so the count still works with scripts off (the owner wants a
# visit counter on every site). Same counter and path prefix as finalize_pages.py.
COUNT = 'https://vhg-guide.goatcounter.com/count?p=' + quote('/mobilitytalk.org/lite/', safe='/')
# Kept small and inline: system fonts, high contrast, large tap targets, visible focus.
CSS = ('body{font:17px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:40em;margin:0 auto;padding:12px;color:#111;background:#fff}'
       'a{color:#0b4f8a}a:focus{outline:3px solid #c25e00;outline-offset:2px}h1{font-size:1.4em;line-height:1.25}h2{font-size:1.15em;margin-top:1.6em;border-top:2px solid #183449;padding-top:.5em}'
       'h3{font-size:1em;margin:1.2em 0 .2em}p{margin:.3em 0}.em{font-size:1.1em;padding:8px;border:2px solid #a00;background:#fff5f5}'
       '.c a{display:inline-block;margin:4px 12px 4px 0;padding:6px 0;font-weight:600}.m{color:#444;font-size:.9em}')
THE = ('United Kingdom', 'Philippines', 'Bahamas', 'Netherlands', 'Czech Republic', 'United Arab Emirates', 'Maldives', 'Solomon Islands',
       'Marshall Islands', 'Democratic Republic of the Congo', 'Federated States of Micronesia', 'Dominican Republic', 'Gambia', 'Republic of the Congo')


def the(name):
    return ('the ' if name in THE else '') + name


def digits(s):
    return re.sub(r'\D', '', str(s or ''))


def host(u):
    return u.split('//')[1].split('/')[0].removeprefix('www.')


def head(title, desc, canonical, path):
    return ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{E(title)}</title><meta name="description" content="{E(desc)}"><link rel="canonical" href="{canonical}">'
            f'<style>{CSS}</style></head>\n<body>'), f'<img src="{COUNT}{E(path)}" alt="" width="1" height="1">'


def foot(full, counter):
    return (f'<hr><p class="m">Mobility Talk, by Travis Vought. Free, no sign-in, nothing you choose is saved. '
            f'General information, not legal or medical advice. <a href="mailto:{CORRECTIONS}?subject=Mobility%20Talk%20text-only%20page">Report a problem</a></p>'
            f'<p class="m"><a href="index.html">All countries (text only)</a> · <a href="{full}">Full page with pictures</a> · '
            f'<a href="{BASE}privacy.html">Privacy</a></p>{counter}</body></html>\n')


def resource(r):
    out = [f'<h3>{E(r["name"])}</h3>']
    if r.get('org') and r['org'].lower() != r['name'].lower():
        out.append(f'<p class="m">{E(r["org"])}</p>')
    out.append(f'<p>{E(r["what"])}</p>')
    if r.get('how'):
        out.append(f'<p><strong>Next step:</strong> {E(r["how"])}</p>')
    bits = []
    if r.get('phone'):
        bits.append(f'<a href="tel:{E(r["dial"])}">Call {E(r["phone"])}</a>')
    if r.get('text'):
        bits.append(f'<a href="sms:{E(digits(r["text"]))}">Text {E(r["text"])}</a>')
    if r.get('url'):
        # the address is shown, not only linked, so it can be copied by hand or read aloud
        bits.append(f'<a href="{E(r["url"])}">{E(host(r["url"]))}</a>')
    if r.get('email'):
        bits.append(f'<a href="mailto:{E(r["email"])}">{E(r["email"])}</a>')
    out.append('<p class="c">' + ''.join(bits) + '</p>')
    if r.get('phone_note'):
        out.append(f'<p class="m">{E(r["phone_note"])}</p>')
    note = ' Confirm details before you rely on it.' if r.get('record_status') == 'directory_listed' else ''
    out.append(f'<p class="m">Checked {E(r["reviewed_on"])} against {E(host(r["sources"][0]))}.{note}</p>')
    return ''.join(out)


def share_text(c):
    em = c['emergency']
    crisis = next((r for r in c['resources'] if r['section'] == 'help-now' and r.get('phone')), None)
    t = f'Disability help in {the(c["name"])}. Emergency: {em["number"]}.'
    if crisis:
        t += f' {crisis["name"]}: {crisis["phone"]}.'
    return t + f' More numbers: {BASE}lite/{c["slug"]}.html'


def share(c):
    t = quote(share_text(c), safe='')
    # "sms:?&body=" opens the messages app with the text filled in on both Android and iPhone
    return ('<h2 id="share">Send this to someone</h2><p>Opens a message with the emergency number, the crisis line and this page’s address. '
            'Nothing is sent until you press send.</p>'
            f'<p class="c"><a href="sms:?&amp;body={t}">Text message (SMS)</a><a href="https://wa.me/?text={t}">WhatsApp</a></p>')


def country_page(c):
    place = the(c['name'])
    title = f'Disability help in {c.get("title_name", place)} (text only) | Mobility Talk'
    full = f'{BASE}countries/{c["slug"]}.html'
    top, counter = head(title, f'Low-data, text-only list of disability help in {place}: emergency number, crisis lines, payments, equipment, work and rights.',
                        full, c['slug'] + '.html')
    em = c['emergency']
    body = [f'<p class="m"><a href="#share">Send to someone</a> · <a href="{full}">Full page</a> · <a href="index.html">Other countries</a></p>',
            f'<h1>Disability help in {E(c.get("title_name", place))}</h1>',
            f'<p class="em"><strong>Emergency in {E(place)}:</strong> call <a href="tel:{E(em["number"])}">{E(em["number"])}</a> ({E(em["label"])}).</p>']
    if c.get('relay'):
        body.append(f'<p><strong>Calling without your voice?</strong> {E(c["relay"])}</p>')
    for k in ORDER:
        rs = [r for r in c['resources'] if r['section'] == k]
        if rs:
            body.append(f'<h2 id="{"crisis" if k == "help-now" else k}">{E(SECTIONS[k])}</h2>' + ''.join(resource(r) for r in rs))
    body.append(share(c))
    body.append(f'<p class="m">Numbers are written the way they are dialed inside {E(place)}. Know a service that belongs here? '
                f'<a href="mailto:{CORRECTIONS}?subject={quote("Mobility Talk: " + c["name"])}">Tell us</a>.</p>')
    return top + ''.join(body) + foot(full, counter)


def index_page():
    countries = sorted(DATA['countries'], key=lambda c: c['name'])
    top, counter = head('Disability help worldwide (text only) | Mobility Talk',
                        f'Low-data, text-only disability help for {len(countries)} countries: emergency numbers, crisis lines and national programs.',
                        BASE + 'world.html', 'index.html')
    rows = ''.join(f'<li><a href="{c["slug"]}.html">{E(c["name"])}</a> · emergency <a href="tel:{E(c["emergency"]["number"])}">{E(c["emergency"]["number"])}</a></li>'
                   for c in countries)
    any_country = ''.join(resource(r) for r in DATA['worldwide'])
    return (top + '<h1>Disability help worldwide, text only</h1>'
            '<p>Small pages that load on slow connections and basic phones, with no pictures or scripts. '
            f'Choose your country for its emergency number, crisis lines and national programs. <a href="{BASE}world.html">Full version</a></p>'
            f'<h2>Countries</h2><ul>{rows}</ul><h2>Help that works in any country</h2>{any_country}'
            '<h2>Use it with no internet</h2><p>Download every country at once, about 400 KB: '
            f'<a href="{PACK}.zim">Kiwix file</a> (open it in the free Kiwix app on a phone or computer) or '
            f'<a href="{PACK}.zip">zip of plain pages</a> (unzip and open index.html). Schools, clinics and libraries with offline servers can load the Kiwix file.</p>'
            f'<h2>United States</h2><p>Every state has its own page: <a href="{BASE}states/index.html">mobilitytalk.org/states</a></p>'
            + foot(BASE + 'world.html', counter))


def check(name, page):
    size, limit = len(page.encode()), MAX_INDEX if name.endswith('index.html') else MAX_BYTES
    assert size <= limit, f'{name} is {size} bytes; keep it under {limit}'
    for bad in ('<script', '<iframe', '<video', '<link rel="stylesheet"'):
        assert bad not in page, f'{name} has {bad}'
    assert len(re.findall(r'<img ', page)) == 1, f'{name}: only the counter image is allowed'


def outputs():
    out = {'lite/index.html': index_page()}
    for c in DATA['countries']:
        out[f'lite/{c["slug"]}.html'] = country_page(c)
    for name, page in out.items():
        check(name, page)
    return out


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    for f in OUT.glob('*.html'):
        f.unlink()
    pages = outputs()
    for p, t in pages.items():
        (ROOT / p).write_text(t)
    sizes = sorted(len(t.encode()) for t in pages.values())
    print(f'Built {len(pages)} text-only pages in lite/ (largest {sizes[-1]} bytes, median {sizes[len(sizes) // 2]}).')
