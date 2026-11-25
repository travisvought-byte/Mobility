#!/usr/bin/env python3
"""Build caregiver-respite.html: a national page for people who care for a disabled family member or a veteran.
Respite and how to find it, the Eldercare Locator and Area Agencies on Aging, VA caregiver programs, Medicaid home
and community-based services, paid family caregiving in general terms, and taking care of yourself.

Every statement in data/caregiver-respite.json names the official pages it comes from, each with the date it was
read and the page's own date; the page shows a numbered citation after each statement and a full source list.
A phone number appears only where a source page showed it. Where the same line is also a directory record in
data/local-programs.json, the build stops if the directory number differs from the number read on the source page
(phone_on_source). Run via `npm run build` (from the scripts directory, like the other page builders);
finalize_pages.py then adds canonical, social and breadcrumb tags, the featured organization block, the menu and
the visit counter.
"""
import html,json,re
from pathlib import Path
from site_parts import URGENT,SIDE_HELP,RELAY,ABOUT_LINK,tel,icon
ROOT=Path(__file__).resolve().parents[1]
E=lambda s:html.escape(str(s),quote=True)
digits=lambda s:re.sub(r'\D','',str(s or ''))[-10:]
NEW='<span class="vh"> (new tab)</span>'
PAGE='caregiver-respite.html'
TITLE='Caregiver and respite help: VA support and paid family care'
H1='Caregiver and respite help'
DESC=('Caring for a disabled family member or a veteran? Find respite, VA caregiver programs and support line, Medicaid home care and paid family caregiving.')
NAV='<nav aria-label="Main"><a href="./">Home</a><a href="mobility-rights.html">Find your next step</a><a href="local-help.html">Local help &amp; programs</a><a href="know-your-rights.html">Know your rights</a><a href="ramps-home-access.html">Ramps &amp; home access</a><a href="disability-advocacy.html">Advocacy</a><a href="mobility-independence.html">Repair &amp; adapt</a></nav>'
FOOT=('<footer><p>Created and maintained by <a href="https://travisvought.com/">Travis Vought</a>. <a href="mailto:travis@vethomeguard.org">Corrections</a> · <a href="./">Home</a> · '+ABOUT_LINK+'</p>'
      '<p>Every statement on this page names the official page it comes from, with the date it was checked. This is general information, not medical or legal advice. Nothing you choose here is saved or sent.</p></footer>')
def ext(href,label):
    assert href.startswith('https://'),href
    return f'<a href="{E(href)}" rel="noopener" target="_blank">{E(label)}{NEW}</a>'
def outputs():
    d=json.loads((ROOT/'data/caregiver-respite.json').read_text())
    recs={r['id']:r for r in json.loads((ROOT/'data/local-programs.json').read_text())['records']}
    S=d['sources']
    for k,s in S.items():
        assert s['url'].startswith('https://') and s.get('checked')==d['checked_on'] and s.get('page_date'),k
    order=[]
    def cite(ids):
        assert ids,'every statement needs a source'
        out=[]
        for i in ids:
            assert i in S,f'unknown source {i}'
            if i not in order:order.append(i)
            n=order.index(i)+1
            out.append(f'<a class="cite" href="#src-{E(i)}" aria-label="Source {n}: {E(S[i]["title"])}">[{n}]</a>')
        return ' <span class="meta">'+''.join(out)+'</span>'
    def card(c):
        bits=[]
        if c.get('phone'):
            # the number must be the one read on its source page, and the directory's own record must agree
            assert digits(c['phone'])==digits(c['phone_on_source']),f'{c["id"]}: {c["phone"]} is not the number read on the source page'
            assert c['phone_src'] in S,c['id']
            if c.get('record'):
                assert digits(recs[c['record']]['phone'])==digits(c['phone']),f'{c["id"]}: directory record {c["record"]} has {recs[c["record"]]["phone"]}'
            bits.append(f'<a href="{E(tel(c["phone"]))}">Call {E(c["phone"])}</a>')
        bits+=[ext(l['href'],l['label']) for l in c['links']]
        if c.get('email'):bits.append(f'<a href="mailto:{E(c["email"])}">Email {E(c["email"])}</a>')
        src=c['src']+([c['phone_src']] if c.get('phone') and c['phone_src'] not in c['src'] else [])
        return (f'<article class="card" id="{E(c["id"])}"><h3>{E(c["name"])}</h3>'+(f'<p class="org">{E(c["org"])}</p>' if c['org']!=c['name'] else '')
                +f'<p>{E(c["text"])}</p>'+(f'<p>{E(c["more"])}</p>' if c.get('more') else '')
                +(f'<p><strong>Next step:</strong> {E(c["next"])}</p>' if c.get('next') else '')
                +f'<div class="contact">{"".join(bits)}</div>'+(f'<p class="meta">{E(c["phone_label"])}.</p>' if c.get('phone') else '')
                +f'<p class="meta">Sources:{cite(src)}</p></article>')
    secs=[];toc=[]
    for s in d['sections']:
        toc.append(f'<a href="#{E(s["id"])}">{icon(s["icon"],"tic")}<span class="tl">{E(s["title"])}</span></a>')
        body=(f'<section id="{E(s["id"])}" aria-labelledby="{E(s["id"])}-h"><h2 id="{E(s["id"])}-h" class="cat-h">{icon(s["icon"],"hic")}{E(s["title"])}</h2>'
              f'<p class="lead">{E(s["lead"])}'+(cite(s['lead_src']) if s.get('lead_src') else '')+'</p>')
        if s['points']:body+='<ul>'+''.join(f'<li>{E(p["text"])}{cite(p["src"])}</li>' for p in s['points'])+'</ul>'
        if s.get('cards'):body+='<div class="grid">'+''.join(card(c) for c in s['cards'])+'</div>'
        body+=s.get('after','')
        secs.append(body+'</section>')
    unused=set(S)-set(order);assert not unused,f'sources never cited: {sorted(unused)}'
    srcs='<ol class="sources">'+''.join(f'<li id="src-{E(i)}">{E(S[i]["publisher"])}: {ext(S[i]["url"],S[i]["title"])}. {E(S[i]["page_date"][0].upper()+S[i]["page_date"][1:])}; checked {E(S[i]["checked"])}.</li>' for i in order)+'</ol>'
    checked=d['checked_label']
    # the opening is filled from data/landing.json by finalize_pages.py
    intro=('<!--lede--><!--/lede-->'
           f'<p class="meta" id="checked-line">Sources checked {E(checked)}.</p>')
    page=('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
      f'<title>{E(TITLE)} | Mobility Talk</title><meta name="description" content="{E(DESC)}"><link rel="stylesheet" href="assets/site.css"></head>\n'
      '<body><a class="skip" href="#main">Skip to main content</a>\n'
      f'<header>{NAV}<small>CAREGIVERS · RESPITE · VETERANS · EVERY STATE</small><h1>{E(H1)}</h1>{intro}</header>\n'
      f'<main id="main"><section class="panel" aria-labelledby="start-h"><h2 id="start-h">On this page</h2>'
      f'<nav class="toc tiles guide" aria-label="Jump to a section">{"".join(toc)}<a href="#sources">{icon("book","tic")}<span class="tl">Sources</span></a></nav>'
      '<p>Not sure where to start? Call the Eldercare Locator for help near you. If the person you care for is a veteran enrolled in VA health care, also call the VA Caregiver Support Line. Both numbers are below.</p>'
      f'{RELAY}</section>'
      +''.join(secs)
      +f'<section id="sources" class="panel" aria-labelledby="sources-h"><h2 id="sources-h">Sources</h2><p>Sources checked {E(checked)}. Each page was read on the date shown. Programs and rules change, so check the source before you rely on it.</p>{srcs}</section>'
      +f'<section><p>Missing a program or see something out of date? <a href="mailto:travis@vethomeguard.org?subject={E("Correction: Caregiver and respite page")}">Tell us</a> and it will be checked against the official source.</p></section>'
      f'{SIDE_HELP}</main>{FOOT}</body></html>\n')
    return {PAGE:page}
if __name__=='__main__':
    for p,t in outputs().items():(ROOT/p).write_text(t)
    print('Built the caregiver and respite page.')
