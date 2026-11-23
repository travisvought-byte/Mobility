#!/usr/bin/env python3
"""Build service-animals.html: a national page on service animals under the ADA, in housing and in air travel,
how to complain, and where people get a trained dog.

Every statement in data/service-animals.json names the primary sources it comes from, and each source carries the
date it was read and the page's own date; the page shows a numbered citation after each statement and a full source
list. Complaint-line phone numbers are pulled from the directory records in data/local-programs.json, and the build
stops if the number read on the official page (phone_on_source) differs from the record. The FAQ structured data is
built from the same questions and answers shown on the page. Run via `npm run build` (from the scripts directory,
like the other page builders); finalize_pages.py then adds canonical, social and breadcrumb tags, the featured
organization block and the visit counter.
"""
import html,json,re
from pathlib import Path
from site_parts import URGENT,RELAY,ABOUT_LINK
ROOT=Path(__file__).resolve().parents[1]
E=lambda s:html.escape(str(s),quote=True)
digits=lambda s:re.sub(r'\D','',str(s or ''))[-10:]
NEW='<span class="vh"> (new tab)</span>'
TITLE='Service animals: ADA rights, housing, air travel and trained dogs'
H1='Service animals: your rights and where to get a trained dog'
DESC=('Service animal rules under the ADA: the two questions staff may ask, housing and air travel, how to file a complaint and where to get a trained dog.')
NAV='<nav aria-label="Main"><a href="./">Home</a><a href="mobility-rights.html">Find your next step</a><a href="local-help.html">Local help &amp; programs</a><a href="know-your-rights.html">Know your rights</a><a href="ramps-home-access.html">Ramps &amp; home access</a><a href="disability-advocacy.html">Advocacy</a><a href="mobility-independence.html">Repair &amp; adapt</a></nav>'
FOOT=('<footer><p>Created and maintained by <a href="https://travisvought.com/">Travis Vought</a>. <a href="mailto:travis@vethomeguard.org">Corrections</a> · <a href="./">Home</a> · '+ABOUT_LINK+'</p>'
      '<p>Every statement on this page names the official page it comes from, with the date it was checked. This is general information, not legal advice. Nothing you choose here is saved or sent.</p></footer>')
def tel(p):return 'tel:'+re.sub(r'[^0-9+]','',str(p))
def ext(href,label):
    assert href.startswith('https://'),href
    return f'<a href="{E(href)}" rel="noopener" target="_blank">{E(label)}{NEW}</a>'
def outputs():
    d=json.loads((ROOT/'data/service-animals.json').read_text())
    recs={r['id']:r for r in json.loads((ROOT/'data/local-programs.json').read_text())['records']}
    S=d['sources']
    for k,s in S.items():
        assert s['url'].startswith('https://') and s.get('checked') and s.get('page_date'),k
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
    secs=[];toc=[]
    for s in d['sections']:
        toc.append(f'<a href="#{E(s["id"])}">{E(s["title"])}</a>')
        body=f'<section id="{E(s["id"])}" aria-labelledby="{E(s["id"])}-h"><h2 id="{E(s["id"])}-h">{E(s["title"])}</h2>'
        if s.get('list'):
            body+=f'<p>{E(s["lead"])}</p><ol class="two-questions">'+''.join(f'<li><strong>{E(q)}</strong></li>' for q in s['list'])+'</ol>'+f'<p class="meta">Sources:{cite(s["list_src"])}</p>'
        body+='<ul>'+''.join(f'<li>{E(p["text"])}{cite(p["src"])}</li>' for p in s['points'])+'</ul></section>'
        secs.append(body)
    # complaints: the phone comes from the directory record and must match the number read on the official page
    comp=[]
    for c in d['complaints']:
        r=recs[c['record']]
        assert digits(r['phone'])==digits(c['phone_on_source']),f'{c["id"]}: directory {r["phone"]} differs from the source page {c["phone_on_source"]}'
        if c.get('phone_extra'):
            for n in re.findall(r'\d[\d-]{9,}\d',c['phone_extra']):
                assert digits(n) in re.sub(r'\D','',r.get('phone_note') or ''),f'{c["id"]}: {n} is not in the directory record'
        links=''.join(ext(l['href'],l['label']) for l in c['links'])
        comp.append(f'<article class="card" id="{E(c["id"])}"><h3>{E(c["title"])}</h3><p class="org">{E(c["who"])}</p>'
                    '<ol>'+''.join(f'<li>{E(x)}</li>' for x in c['steps'])+'</ol>'
                    f'<div class="contact"><a href="{E(tel(r["phone"]))}">Call {E(r["phone"])}</a>{links}</div>'
                    f'<p class="meta">{E(c["phone_label"])}.'+(f' {E(c["phone_extra"])}' if c.get('phone_extra') else '')+'</p>'
                    f'<p class="meta">Sources:{cite(c["src"]+[c["phone_src"]] if c["phone_src"] not in c["src"] else c["src"])}</p></article>')
    progs=[]
    for p in d['programs']:
        if p.get('record'):
            r=recs[p['record']];assert any(l['href'] in (r.get('web'),r.get('url')) for l in p['links']),p['id']
        bits=([f'<a href="{E(tel(p["phone"]))}">Call {E(p["phone"])}</a>'] if p.get('phone') else [])+[ext(l['href'],l['label']) for l in p['links']]
        progs.append(f'<article class="card" id="{E(p["id"])}"><h3>{E(p["name"])}</h3>'+(f'<p class="org">{E(p["org"])}</p>' if p['org']!=p['name'] else '')
                     +f'<p>{E(p["text"])}</p>'+(f'<p><strong>Next step:</strong> {E(p["next"])}</p>' if p.get('next') else '')
                     +f'<div class="contact">{"".join(bits)}</div>'+(f'<p class="meta">{E(p["phone_note"])}</p>' if p.get('phone_note') else '')
                     +f'<p class="meta">Sources:{cite(p["src"])}</p></article>')
    faq=''.join(f'<div class="faq-item"><h3>{E(f["q"])}</h3><p>{E(f["a"])}{cite(f["src"])}</p></div>' for f in d['faq'])
    unused=set(S)-set(order);assert not unused,f'sources never cited: {sorted(unused)}'
    srcs='<ol class="sources">'+''.join(f'<li id="src-{E(i)}">{E(S[i]["publisher"])}: {ext(S[i]["url"],S[i]["title"])}. {E(S[i]["page_date"][0].upper()+S[i]["page_date"][1:])}; checked {E(S[i]["checked"])}.</li>' for i in order)+'</ol>'
    ld={'@context':'https://schema.org','@type':'FAQPage','mainEntity':[{'@type':'Question','name':f['q'],'acceptedAnswer':{'@type':'Answer','text':f['a']}} for f in d['faq']]}
    faqld='<!--faqld--><script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False).replace('<','\\u003c')+'</script><!--/faqld-->'
    intro=('<p>What the law says about service animals in stores, restaurants, hotels, hospitals and government buildings, in rented homes and on planes. '
           'Each statement links to the official source it comes from, with the date we checked it.</p>')
    page=('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
      f'<title>{E(TITLE)} | Mobility Talk</title><meta name="description" content="{E(DESC)}"><link rel="stylesheet" href="assets/site.css">{faqld}</head>\n'
      '<body><a class="skip" href="#main">Skip to main content</a>\n'
      f'<header>{NAV}<small>SERVICE ANIMALS · ADA · HOUSING · AIR TRAVEL · EVERY STATE</small><h1>{E(H1)}</h1>{intro}</header>\n'
      f'<main id="main">{URGENT}<section class="panel" aria-labelledby="start-h"><h2 id="start-h">On this page</h2>'
      f'<nav class="toc" aria-label="Jump to a section">{"".join(toc)}<a href="#complain">How to file a complaint</a><a href="#get-a-dog">Where to get a trained dog</a><a href="#questions">Quick answers</a><a href="#sources">Sources</a></nav>'
      f'<p>Rules differ by place. The ADA covers businesses and state and local governments. The Fair Housing Act covers housing. The Department of Transportation’s rules cover flights. Your state may give more protection.</p>{RELAY}</section>'
      +''.join(secs)
      +f'<section id="complain" aria-labelledby="complain-h"><h2 id="complain-h">How to file a complaint</h2><p class="lead">Write down what happened, where and when, who you spoke with and what they said. Keep copies.</p><div class="grid">{"".join(comp)}</div>'
      '<p>The <a href="know-your-rights.html#public-places">Know your rights</a> page also lists free help, such as your state’s Protection and Advocacy agency and regional ADA Center.</p></section>'
      +f'<section id="get-a-dog" aria-labelledby="get-a-dog-h"><h2 id="get-a-dog-h">Where to get a trained service dog</h2><p class="lead">{E(d["programs_lead"])}</p><div class="grid">{"".join(progs)}</div>'
      '<p>Also on this site: <a href="blind-low-vision.html">Blind and low vision resources</a> · <a href="deaf-hard-of-hearing.html">Deaf and hard of hearing resources</a> · <a href="local-help.html?audience=veterans">Help for veterans in your state</a></p></section>'
      +f'<section id="questions" aria-labelledby="questions-h"><h2 id="questions-h">Quick answers</h2>{faq}</section>'
      +f'<section id="sources" class="panel" aria-labelledby="sources-h"><h2 id="sources-h">Sources</h2><p>Each source was read on the date shown. Laws and agency guidance change, so check the source before you rely on it.</p>{srcs}</section>'
      +f'<section><p>Missing a program or see something out of date? <a href="mailto:travis@vethomeguard.org?subject={E("Correction: Service animals page")}">Tell us</a> and it will be checked against the official source.</p></section>'
      f'</main>{FOOT}</body></html>\n')
    return {'service-animals.html':page}
if __name__=='__main__':
    for p,t in outputs().items():(ROOT/p).write_text(t)
    print('Built the service animals page.')
