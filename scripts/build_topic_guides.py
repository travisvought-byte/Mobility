#!/usr/bin/env python3
"""Build the national topic guides that answer one question each, from one data file per page:

  accessible-vehicles.html         data/accessible-vehicles.json        paying for an accessible vehicle or adaptations
  free-medical-equipment.html      data/free-medical-equipment.json     borrowing, reusing or paying for equipment
  social-security-disability.html  data/social-security-disability.json applying for SSDI or SSI, and appealing

Each page follows the caregiver and service animal pages: jump tiles, "where to start" paths, sections of short
statements each with a numbered citation, program cards, a numbered step list where order matters, quick answers
(with FAQ structured data built from the same questions and answers shown on the page) and a full source list.
Every source carries the date it was read and the page's own date. A phone number appears only where its source page
showed it (phone_on_source); where the same line is a directory record in data/local-programs.json (record), the build
stops if the directory number differs. Run via `npm run build` (from the scripts directory, like the other page
builders); finalize_pages.py then adds the landing copy, canonical, social and breadcrumb tags, the featured
organization block, the menu, the ad code and the visit counter.
"""
import html,json,re
from pathlib import Path
from site_parts import SIDE_HELP,RELAY,ABOUT_LINK,tel,icon,ICON_PATHS
ROOT=Path(__file__).resolve().parents[1]
E=lambda s:html.escape(str(s),quote=True)
digits=lambda s:re.sub(r'\D','',str(s or ''))[-10:]
NEW='<span class="vh"> (new tab)</span>'
GUIDES=['accessible-vehicles','free-medical-equipment','social-security-disability']
NAV='<nav aria-label="Main"><a href="./">Home</a><a href="mobility-rights.html">Find your next step</a><a href="local-help.html">Local help &amp; programs</a><a href="know-your-rights.html">Know your rights</a><a href="ramps-home-access.html">Ramps &amp; home access</a><a href="disability-advocacy.html">Advocacy</a><a href="mobility-independence.html">Repair &amp; adapt</a></nav>'
def foot(note):
    return ('<footer><p>Created and maintained by <a href="https://travisvought.com/">Travis Vought</a>. <a href="mailto:travis@vethomeguard.org">Corrections</a> · <a href="./">Home</a> · '+ABOUT_LINK+'</p>'
            f'<p>Every statement on this page names the official page it comes from, with the date it was checked. {E(note)} Nothing you choose here is saved or sent.</p></footer>')
def exists(href):
    f=href.split('#')[0].split('?')[0]
    return (ROOT/f).exists() or f in [g+'.html' for g in GUIDES]
def link(href,label):
    """An outside link opens in a new tab and says so; a link to another page of this site must point at a file that exists."""
    if href.startswith('https://'):return f'<a href="{E(href)}" rel="noopener" target="_blank">{E(label)}{NEW}</a>'
    assert not href.startswith(('http:','//')) and exists(href),f'link to a missing page: {href}'
    return f'<a href="{E(href)}">{E(label)}</a>'
def build(slug):
    d=json.loads((ROOT/f'data/{slug}.json').read_text())
    page=d['page'];assert page==slug+'.html',page
    recs={r['id']:r for r in json.loads((ROOT/'data/local-programs.json').read_text())['records']}
    S=d['sources']
    for k,s in S.items():
        assert s['url'].startswith('https://') and s.get('checked')==d['checked_on'] and s.get('page_date') and s.get('title') and s.get('publisher'),k
    order=[]
    def cite(ids):
        assert ids,'every statement needs a source'
        out=[]
        for i in ids:
            assert i in S,f'{slug}: unknown source {i}'
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
        elif c.get('record'):assert c['record'] in recs,c['id']
        bits+=[link(l['href'],l['label']) for l in c['links']]
        src=c['src']+([c['phone_src']] if c.get('phone') and c['phone_src'] not in c['src'] else [])
        return (f'<article class="card" id="{E(c["id"])}"><h3>{E(c["name"])}</h3>'+(f'<p class="org">{E(c["org"])}</p>' if c['org']!=c['name'] else '')
                +f'<p>{E(c["text"])}</p>'+(f'<p>{E(c["more"])}</p>' if c.get('more') else '')
                +(f'<p><strong>Next step:</strong> {E(c["next"])}</p>' if c.get('next') else '')
                +f'<div class="contact">{"".join(bits)}</div>'+(f'<p class="meta">{E(c["phone_label"])}.</p>' if c.get('phone_label') else '')
                +f'<p class="meta">Sources:{cite(src)}</p></article>')
    ids=[s['id'] for s in d['sections']]
    tile=lambda i,t,ic:f'<a href="#{E(i)}">{icon(ic,"tic")}<span class="tl">{E(t)}</span></a>'
    secs=[];toc=[]
    for s in d['sections']:
        assert s['icon'] in ICON_PATHS,s['id']
        toc.append(tile(s['id'],s['title'],s['icon']))
        body=(f'<section id="{E(s["id"])}" aria-labelledby="{E(s["id"])}-h"><h2 id="{E(s["id"])}-h" class="cat-h">{icon(s["icon"],"hic")}{E(s["title"])}</h2>'
              f'<p class="lead">{E(s["lead"])}'+(cite(s['lead_src']) if s.get('lead_src') else '')+'</p>')
        if s.get('steps'):
            # a step diagram where the order matters; each step is words on the page with its own citation
            assert len(s['steps'])>=2,s['id']
            body+=(f'<h3 id="{E(s["id"])}-steps">{E(s["steps_title"])}</h3>' if s.get('steps_title') else '')
            body+='<ol class="stepper" role="list">'+''.join(f'<li>{E(p["text"])}{cite(p["src"])}</li>' for p in s['steps'])+'</ol>'
        pts='<ul>'+''.join(f'<li>{E(p["text"])}{cite(p["src"])}</li>' for p in s['points'])+'</ul>' if s.get('points') else ''
        cards='<div class="grid">'+''.join(card(c) for c in s['cards'])+'</div>' if s.get('cards') else ''
        body+=(cards+pts) if s.get('cards_first') else (pts+cards)
        if s.get('after'):
            for h in re.findall(r'href="([^"#]+)',s['after']):assert exists(h),f'{s["id"]}: link to a missing page {h}'
            body+=s['after']
        secs.append(body+'</section>')
    # where to start: one line per kind of visitor, each pointing at the section that answers them (no new facts here)
    paths=''
    if d.get('start_paths'):
        lis=[]
        for p in d['start_paths']:
            assert p['icon'] in ICON_PATHS and p['href'][1:] in ids,p
            sec=next(s for s in d['sections'] if s['id']==p['href'][1:])
            lis.append(f'<li>{icon(p["icon"])}<span><strong>{E(p["who"])}</strong> {E(p["text"])} <a href="{E(p["href"])}">{E(sec["title"])}</a></span></li>')
        paths=f'<h3 id="paths-h">Where to start</h3><ul class="iconlist" aria-labelledby="paths-h">{"".join(lis)}</ul>'
    faq=''.join(f'<div class="faq-item"><h3>{E(f["q"])}</h3><p>{E(f["a"])}{cite(f["src"])}</p></div>' for f in d['faq'])
    unused=set(S)-set(order);assert not unused,f'{slug}: sources never cited: {sorted(unused)}'
    srcs='<ol class="sources">'+''.join(f'<li id="src-{E(i)}">{E(S[i]["publisher"])}: {link(S[i]["url"],S[i]["title"])}. {E(S[i]["page_date"][0].upper()+S[i]["page_date"][1:])}; checked {E(S[i]["checked"])}.</li>' for i in order)+'</ol>'
    ld={'@context':'https://schema.org','@type':'FAQPage','mainEntity':[{'@type':'Question','name':f['q'],'acceptedAnswer':{'@type':'Answer','text':f['a']}} for f in d['faq']]}
    faqld='<!--faqld--><script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False).replace('<','\\u003c')+'</script><!--/faqld-->'
    related=''.join(f'<li>{icon(r["icon"])}<span>{link(r["href"],r["label"])}: {E(r["text"])}</span></li>' for r in d['related'])
    checked=d['checked_label']
    # the opening is filled from data/landing.json by finalize_pages.py
    intro=('<!--lede--><!--/lede-->'
           f'<p class="meta" id="checked-line">Sources checked {E(checked)}.</p>')
    out=('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
      f'<title>{E(d["title"])} | Mobility Talk</title><meta name="description" content="{E(d["description"])}"><link rel="stylesheet" href="assets/site.css">{faqld}</head>\n'
      '<body><a class="skip" href="#main">Skip to main content</a>\n'
      f'<header>{NAV}<small>{E(d["eyebrow"])}</small><h1>{E(d["h1"])}</h1>{intro}</header>\n'
      f'<main id="main"><section class="panel" aria-labelledby="start-h"><h2 id="start-h">On this page</h2>'
      f'<nav class="toc tiles guide" aria-label="Jump to a section">{"".join(toc)}{tile("questions","Quick answers","chat_q")}{tile("sources","Sources","book")}</nav>'
      f'<p>{E(d["start"])}</p>{paths}{RELAY}</section>'
      +''.join(secs)
      +f'<section id="questions" aria-labelledby="questions-h"><h2 id="questions-h" class="cat-h">{icon("chat_q","hic")}Quick answers</h2>{faq}</section>'
      +f'<section id="related" aria-labelledby="related-h"><h2 id="related-h" class="cat-h">{icon("link","hic")}More help on this site</h2><ul class="iconlist">{related}</ul></section>'
      +f'<section id="sources" class="panel" aria-labelledby="sources-h"><h2 id="sources-h">Sources</h2><p>Sources checked {E(checked)}. Each page was read on the date shown. Programs, amounts and rules change, so check the source before you rely on it.</p>{srcs}</section>'
      +f'<section><p>Missing a program or see something out of date? <a href="mailto:travis@vethomeguard.org?subject={E("Correction: "+d["correction_subject"])}">Tell us</a> and it will be checked against the official source.</p></section>'
      f'{SIDE_HELP}</main>{foot(d["footer_note"])}</body></html>\n')
    return page,out
def outputs():return dict(build(g) for g in GUIDES)
if __name__=='__main__':
    for p,t in outputs().items():(ROOT/p).write_text(t)
    print('Built',len(GUIDES),'topic guides.')
