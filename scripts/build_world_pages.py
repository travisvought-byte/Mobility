#!/usr/bin/env python3
"""Build world.html and countries/<slug>.html from data/world.json (owner direction, November 19, 2026: Mobility Talk
goes global, not only U.S.).

world.html is a root page, so finalize_pages.py adds its canonical, social tags, menu links and footer links.
Country pages are written whole here (head included, like the state pages); finalize_pages.py adds the phone menu
button, the privacy link and the visit counter. Do not edit the output by hand. Run via `npm run build`.

Phone numbers are printed the way each country writes them, and Call links dial the record's 'dial' digits from a phone
in that country. The U.S. urgent strip (988 and 911) is not used on these pages; each country page leads with its own
emergency number and crisis line instead.
"""
import html, json, re
from pathlib import Path
from site_parts import ABOUT_LINK

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'countries'
BASE = 'https://mobilitytalk.org/'
E = lambda s: html.escape(str(s), quote=True)
DATA = json.loads((ROOT / 'data/world.json').read_text())
SECTIONS = DATA['sections']
CORRECTIONS = 'travis@vethomeguard.org'
NEW_TAB = '<span class="vh"> (new tab)</span>'


def digits(s):
    return re.sub(r'\D', '', str(s or ''))


def validate():
    ids = set()
    records = [(r, None) for r in DATA['worldwide']]
    for c in DATA['countries']:
        assert re.fullmatch(r'[A-Z]{2}', c['code']) and re.fullmatch(r'[a-z-]+', c['slug']), c['code']
        assert digits(c['emergency']['number']) == c['emergency']['number'], c['code'] + ' emergency number is digits only'
        assert c['emergency']['source'].startswith('https://'), c['code']
        assert any(r['section'] == 'help-now' for r in c['resources']), c['code'] + ' needs a crisis line'
        records += [(r, c) for r in c['resources']]
    if True:
        for r, c in records:
            assert r['id'] not in ids, 'duplicate id ' + r['id']
            ids.add(r['id'])
            assert c is None or r['section'] in SECTIONS, r['id'] + ' section'
            assert r.get('sources') and all(u.startswith('https://') for u in r['sources']), r['id'] + ' sources'
            assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', r.get('reviewed_on', '')), r['id'] + ' reviewed_on'
            assert r.get('phone') or r.get('url') or r.get('email'), r['id'] + ' has no way to reach it'
            if r.get('phone'):
                assert re.fullmatch(r'\+?\d{3,15}', r['dial']), r['id'] + ' dial'
                assert digits(r['phone']) == digits(r['dial']), r['id'] + ': dial does not match the printed number'
            for u in [r.get('url')] + [l['url'] for l in r.get('links', [])]:
                assert u is None or u.startswith('https://'), r['id'] + ' link'


def link_list(urls):
    out = []
    for u in urls:
        host = u.split('//')[1].split('/')[0].removeprefix('www.')
        out.append(f'<a href="{E(u)}" rel="noopener" target="_blank">{E(host)}{NEW_TAB}</a>')
    return ', '.join(out)


def card(r, place=''):
    out = ['<article class="card">', f'<h3>{E(r["name"])}</h3>']
    if r.get('org') and r['org'].lower() != r['name'].lower():
        out.append(f'<p class="org">{E(r["org"])}</p>')
    out.append(f'<p>{E(r["what"])}</p>')
    if r.get('how'):
        out.append(f'<p><strong>Next step:</strong> {E(r["how"])}</p>')
    bits = []
    if r.get('phone'):
        bits.append(f'<a href="tel:{E(r["dial"])}">Call {E(r["phone"])}</a>')
    if r.get('text'):
        bits.append(f'<a href="sms:{E(digits(r["text"]))}">Text {E(r["text"])}</a>')
    if r.get('url'):
        bits.append(f'<a href="{E(r["url"])}" rel="noopener" target="_blank">Website{NEW_TAB}</a>')
    if r.get('email'):
        bits.append(f'<a href="mailto:{E(r["email"])}">Email</a>')
    for l in r.get('links', []):
        bits.append(f'<a href="{E(l["url"])}" rel="noopener" target="_blank">{E(l["label"])}{NEW_TAB}</a>')
    out.append('<div class="contact">' + ''.join(bits) + '</div>')
    if r.get('phone_note'):
        out.append(f'<p class="meta">{E(r["phone_note"])}</p>')
    if r.get('record_status') == 'directory_listed':
        out.append('<p class="meta">Listing: confirm details before you rely on it.</p>')
    subject = E('Correction: ' + r['name'] + (' (' + place + ')' if place else ''))
    out.append(f'<p class="meta">Checked {E(r["reviewed_on"])} against: {link_list(r["sources"])}. '
               f'<a href="mailto:{CORRECTIONS}?subject={subject}">Report a problem</a></p></article>')
    return ''.join(out)


def the(name):
    return ('the ' if name in ('United Kingdom', 'Philippines') else '') + name


def nav(pre, current):
    links = [('./', 'Home'), ('mobility-rights.html', 'Find your next step'), ('local-help.html', 'Local help &amp; programs'),
             ('states/index.html', 'All states'), ('world.html', 'Worldwide'), ('know-your-rights.html', 'Know your rights'),
             ('ramps-home-access.html', 'Ramps &amp; home access'), ('disability-advocacy.html', 'Advocacy'),
             ('mobility-independence.html', 'Repair &amp; adapt'), ('partner.html', 'Partner with us')]
    a = ''.join(f'<a href="{pre}{"" if h == "./" and pre else h}"' + (' aria-current="page"' if h == current else '') + f'>{t}</a>'
                for h, t in links)
    return f'<nav aria-label="Main">{a}<a href="{pre}espanol.html" lang="es" hreflang="es">Español</a></nav>'


def foot(pre):
    return (f'<footer><p>Created and maintained by <a href="https://travisvought.com/">Travis Vought</a>. <a href="mailto:{CORRECTIONS}">Corrections</a> · '
            f'<a href="{pre or "./"}">Home</a> · <a href="{pre}partner.html">Partner with us</a> · ' + ABOUT_LINK.replace('href="', f'href="{pre}') + '</p>'
            '<p>Program details come from the programs’ own published pages or official directories, each with the date it was checked. '
            'This is general information, not legal or medical advice, and it does not decide eligibility. Nothing you choose here is saved or sent.</p></footer>')


def country_head(c, title, desc):
    url = f'{BASE}countries/{c["slug"]}.html'
    ld = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'Mobility Talk', 'item': BASE},
        {'@type': 'ListItem', 'position': 2, 'name': 'Worldwide', 'item': BASE + 'world.html'},
        {'@type': 'ListItem', 'position': 3, 'name': c['name'], 'item': url}]}
    LD = json.dumps(ld, ensure_ascii=False).replace('<', '\\u003c')
    return ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
            f'<title>{E(title)} | Mobility Talk</title><meta name="description" content="{E(desc)}">'
            '<link rel="stylesheet" href="../assets/site.css">'
            f'<link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Mobility Talk">'
            f'<meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:url" content="{url}">'
            f'<meta property="og:image" content="{BASE}assets/social-card.png"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#183449">'
            f'<script type="application/ld+json">{LD}</script></head>\n'
            '<body><a class="skip" href="#main">Skip to main content</a>\n')


def emergency_box(c):
    em = c['emergency']
    crisis = [r for r in c['resources'] if r['section'] == 'help-now']
    lines = ' '.join(f'{E(r["name"])}: <a href="tel:{E(r["dial"])}">{E(r["phone"])}</a>.' for r in crisis if r.get('phone'))
    return (f'<aside class="emergency" aria-labelledby="emergency-h"><h2 id="emergency-h">In danger or in crisis right now?</h2>'
            f'<p>In {E(the(c["name"]))}, call <a href="tel:{E(em["number"])}">{E(em["number"])}</a> ({E(em["label"])}).</p>'
            f'<p>{lines}</p></aside>')


def country_page(c):
    place = the(c['name'])
    n = len(c['resources'])
    checked = max(r['reviewed_on'] for r in c['resources'])
    kinds = [SECTIONS[k].lower() for k in SECTIONS if any(r['section'] == k for r in c['resources'])]
    title = f'Disability resources in {place}'
    desc = (f'Disability help in {place}: {", ".join(kinds)}. Phone numbers and official pages, each checked against its source.')[:300]
    secs, toc = [], []
    for k, label in SECTIONS.items():
        rs = [r for r in c['resources'] if r['section'] == k]
        if not rs:
            continue
        sid = 'crisis' if k == 'help-now' else k
        toc.append(f'<a href="#{sid}">{E(label)}</a>')
        secs.append(f'<section id="{sid}"><h2>{E(label)}</h2><div class="grid">' + ''.join(card(r, c['name']) for r in rs) + '</div></section>')
    relay = ''
    if c.get('relay'):
        relay = f'<p class="relay"><strong>Calling without your voice?</strong> {E(c["relay"])}'
        if c.get('relay_url'):
            relay += f' <a href="{E(c["relay_url"])}" rel="noopener" target="_blank">Relay service website{NEW_TAB}</a>'
        relay += '</p>'
    intro = (f'<p>Mobility Talk began in the United States and is now adding other countries. These are the first listings for {E(place)}: '
             f'{n} national programs and lines, each checked against its own page or an official directory (most recently on {E(checked)}). '
             'Local and regional services are not listed yet.</p>')
    body = (f'<header>{nav("../", "world.html")}<small>{E(c["name"].upper())} · DISABILITY RESOURCES</small><h1>{E(title)}</h1>{intro}</header>\n'
            f'<main id="main">{emergency_box(c)}'
            f'<section class="panel"><p>Numbers are written the way they are dialed inside {E(place)}. Calling from another country? Use the country code, and note that some free numbers only work inside the country.</p>{relay}'
            f'<div class="actions"><a class="button secondary" href="../world.html">Other countries</a><a class="button secondary" href="../states/index.html">United States: every state</a></div></section>'
            f'<nav class="toc" aria-label="Jump to a group of programs">{"".join(toc)}</nav>'
            + ''.join(secs)
            + f'<section><p>Know a national or local service in {E(place)} that should be here, or see something out of date? '
              f'<a href="mailto:{CORRECTIONS}?subject={E("Mobility Talk: " + c["name"])}">Tell us</a> and it will be checked against the program’s own page.</p></section>'
            f'</main>{foot("../")}</body></html>\n')
    return country_head(c, title, desc) + body


def world_page():
    countries = sorted(DATA['countries'], key=lambda c: c['name'])
    rows = ''.join(f'<li><a href="countries/{c["slug"]}.html">{E(c["name"])}</a> <span class="meta">Emergency: '
                   f'<a href="tel:{E(c["emergency"]["number"])}">{E(c["emergency"]["number"])}</a> · {len(c["resources"])} listings</span></li>'
                   for c in countries)
    names = ', '.join(c['name'] for c in countries[:-1]) + ' and ' + countries[-1]['name']
    names = names.replace('Philippines', 'the Philippines').replace('United Kingdom', 'the United Kingdom')
    cards = ''.join(card(r) for r in DATA['worldwide'])
    head = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
            '<title>Disability help outside the United States | Mobility Talk</title>'
            f'<meta name="description" content="{E("Disability resources outside the United States: emergency numbers, crisis lines, disability benefits, equipment and home grants, and rights bodies for " + names + ", plus help that works in any country.")}">'
            '<link rel="stylesheet" href="assets/site.css"></head>\n<body><a class="skip" href="#main">Skip to main content</a>\n')
    nav_local = '<nav aria-label="Main"><a href="./">Home</a><a href="mobility-rights.html">Find your next step</a><a href="local-help.html">Local help &amp; programs</a><a href="know-your-rights.html">Know your rights</a><a href="ramps-home-access.html">Ramps &amp; home access</a><a href="disability-advocacy.html">Advocacy</a><a href="mobility-independence.html">Repair &amp; adapt</a></nav>'
    return (head + f'<header>{nav_local}<small>WORLDWIDE · DISABILITY RESOURCES</small><h1>Disability help outside the United States</h1>'
            f'<p>Mobility Talk began as a guide for every U.S. state. It is going global, one country at a time. The first countries are {E(names)}. '
            'Each page starts with the emergency number and a crisis line, then lists where to start, disability payments, equipment and home grants, and who handles discrimination, all checked against official pages.</p></header>\n'
            '<main id="main"><aside class="emergency" aria-labelledby="emergency-h"><h2 id="emergency-h">In danger right now?</h2>'
            '<p>Call your country’s emergency number. The numbers for the countries listed here are below; each one is dialed from a phone inside that country.</p></aside>'
            f'<section aria-labelledby="countries-h"><h2 id="countries-h">Choose a country</h2><ul class="statelist cols" id="country-list">{rows}</ul></section>'
            f'<section aria-labelledby="anywhere-h"><h2 id="anywhere-h">Help that works in any country</h2><div class="grid">{cards}</div></section>'
            '<section class="panel" aria-labelledby="us-h"><h2 id="us-h">In the United States?</h2><p>Every state, D.C. and the U.S. territories have their own page with phone numbers and official links.</p>'
            '<div class="actions"><a class="button" href="states/index.html">Choose your state</a><a class="button secondary" href="local-help.html">Search the directory</a></div></section>'
            f'<section><p>Don’t see your country, or know a service that belongs here? <a href="mailto:{CORRECTIONS}?subject={E("Mobility Talk: add a country")}">Tell us</a>. '
            'Countries are added as their listings are checked against official sources.</p></section></main>'
            '<footer><p>Created and maintained by Travis Vought. <a href="mailto:travis@vethomeguard.org">Corrections</a> · <a href="./">Home</a> · ' + ABOUT_LINK + '</p>'
            '<p>Program details come from the programs’ own published pages or official directories, each with the date it was checked. This is general information, not legal or medical advice, and it does not decide eligibility. Nothing you choose here is saved or sent.</p></footer></body></html>\n')


def outputs():
    validate()
    out = {'world.html': world_page()}
    for c in DATA['countries']:
        out[f'countries/{c["slug"]}.html'] = country_page(c)
    return out


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    for f in OUT.glob('*.html'):
        f.unlink()
    pages = outputs()
    for p, t in pages.items():
        (ROOT / p).write_text(t)
    print(f'Built world.html and {len(pages) - 1} country pages.')
