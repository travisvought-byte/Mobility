#!/usr/bin/env python3
"""Build the national topic guides that answer one question each, from one data file per page:

  accessible-vehicles.html         data/accessible-vehicles.json        paying for an accessible vehicle or adaptations
  free-medical-equipment.html      data/free-medical-equipment.json     borrowing, reusing or paying for equipment
  social-security-disability.html  data/social-security-disability.json applying for SSDI or SSI, and appealing
  accessible-travel.html           data/accessible-travel.json          flying, trains, buses, rental cars and parks
  paid-family-caregiver.html       data/paid-family-caregiver.json      getting paid to care for a family member
  home-modifications.html          data/home-modifications.json         paying for ramps, stairlifts, bathrooms, doors

and their Spanish versions (November 27, 2026), each built from a data file that holds only the Spanish words:

  vehiculos-adaptados.html         data/vehiculos-adaptados.json        (accessible-vehicles)
  equipo-medico-gratis.html        data/equipo-medico-gratis.json       (free-medical-equipment)
  incapacidad-seguro-social.html   data/incapacidad-seguro-social.json  (social-security-disability)
  cuidador-familiar-pagado.html    data/cuidador-familiar-pagado.json   (paid-family-caregiver)
  modificaciones-hogar.html        data/modificaciones-hogar.json       (home-modifications)

Each page follows the caregiver and service animal pages: jump tiles, "where to start" paths, sections of short
statements each with a numbered citation, program cards, a numbered step list where order matters, quick answers
(with FAQ structured data built from the same questions and answers shown on the page) and a full source list.
Every source carries the date it was read and the page's own date. A phone number appears only where its source page
showed it (phone_on_source); where the same line is a directory record in data/local-programs.json (record), the build
stops if the directory number differs. Run via `npm run build` (from the scripts directory, like the other page
builders); finalize_pages.py then adds the landing copy, canonical, social, language and breadcrumb tags, the featured
organization block, the menu, the ad code and the visit counter.

A Spanish data file names the English guide it translates (translation_of). Its sources keep the English page's address,
title and checked date, which are taken from the English file so they cannot drift; the Spanish file gives the publisher
and page date in Spanish and, where the agency publishes one, the Spanish-language version of that page ("es", with
"related" when it is a companion page rather than the same page in Spanish). The build stops unless the translation has
the same sections, statements, steps, cards, phone numbers, records, quick answers and citations as the English guide,
and every number in each statement is the same. An item marked es_note adds a fact read on a Spanish-language page (such
as "press 7 for Spanish"); the note says which.
"""
import html,json,re
from pathlib import Path
from site_parts import SIDE_HELP,RELAY,ABOUT_LINK,tel,icon,ICON_PATHS
ROOT=Path(__file__).resolve().parents[1]
E=lambda s:html.escape(str(s),quote=True)
digits=lambda s:re.sub(r'\D','',str(s or ''))[-10:]
GUIDES=['accessible-vehicles','free-medical-equipment','social-security-disability','accessible-travel','paid-family-caregiver','home-modifications']
ES_GUIDES=['vehiculos-adaptados','equipo-medico-gratis','incapacidad-seguro-social','cuidador-familiar-pagado','modificaciones-hogar']
NAV='<nav aria-label="Main"><a href="./">Home</a><a href="mobility-rights.html">Find your next step</a><a href="local-help.html">Local help &amp; programs</a><a href="know-your-rights.html">Know your rights</a><a href="ramps-home-access.html">Ramps &amp; home access</a><a href="disability-advocacy.html">Advocacy</a><a href="mobility-independence.html">Repair &amp; adapt</a></nav>'
# The Spanish pages keep their own short menu, like the Spanish help page: the rest of the site is in English
NAV_ES=[('./','Inicio (en inglés)','en'),('espanol.html','Ayuda en español',None),('vehiculos-adaptados.html','Vehículos adaptados',None),
        ('equipo-medico-gratis.html','Equipo médico',None),('incapacidad-seguro-social.html','Incapacidad del Seguro Social',None),
        ('cuidador-familiar-pagado.html','Pago a cuidadores',None),('modificaciones-hogar.html','Modificaciones del hogar',None),
        ('local-help.html','Directorio de ayuda (en inglés)','en')]
RELAY_ES=('<p class="relay"><strong>¿Es sordo, tiene dificultad para oír o una discapacidad del habla?</strong> <a href="tel:711">Marque 711</a> '
          'para hacer una llamada gratuita por el servicio de retransmisión a cualquier número de esta página.</p>')
SIDE_ES=('<div class="side-help"><aside class="urgent" aria-labelledby="urgent-h"><h2 id="urgent-h">¿En crisis o en peligro ahora?</h2>'
         '<p><a href="tel:988">Llame al 988</a> o <a href="sms:988">envíe un texto al 988</a>, a cualquier hora. Si es sordo o tiene dificultad para oír: '
         'llame al 988 desde su videoteléfono, envíe un texto al 988 o marque 711 y luego 988. Si hay peligro inmediato, llame al 911.</p>'
         '<p><a href="espanol.html#ahora-h">Líneas de crisis en español</a> · <a href="local-help.html?category=crisis" hreflang="en">Todas las líneas (en inglés)</a></p></aside></div>')
UI={'en':{'new':'<span class="vh"> (new tab)</span>','source_n':'Source {n}: {t}','call':'Call {p}','next':'Next step:','sources_label':'Sources:',
          'on_page':'On this page','jump':'Jump to a section','quick':'Quick answers','sources':'Sources','paths':'Where to start','more':'More help on this site',
          'checked':'Sources checked {d}.','checked_one':'checked {d}','skip':'Skip to main content','in_en':'',
          'sources_p':'Sources checked {d}. Each page was read on the date shown. Programs, amounts and rules change, so check the source before you rely on it.',
          'missing':'Missing a program or see something out of date? <a href="mailto:travis@vethomeguard.org?subject={s}">Tell us</a> and it will be checked against the official source.',
          'switch':'Lea esta guía en español','corr':'Correction: '},
    'es':{'new':'<span class="vh"> (se abre en otra pestaña)</span>','source_n':'Fuente {n}: {t}','call':'Llamar al {p}','next':'Próximo paso:','sources_label':'Fuentes:',
          'on_page':'En esta página','jump':'Ir a una sección','quick':'Respuestas rápidas','sources':'Fuentes','paths':'Por dónde empezar','more':'Más ayuda en este sitio',
          'checked':'Fuentes revisadas el {d}.','checked_one':'revisada el {d}','skip':'Saltar al contenido principal','in_en':' (en inglés)',
          'sources_p':'Fuentes revisadas el {d}. Cada página se leyó en la fecha indicada. Los programas, las cantidades y las reglas cambian, así que revise la fuente antes de depender de ella. Casi todas las fuentes están en inglés; cuando la agencia publica una versión en español, también aparece.',
          'missing':'¿Falta un programa o ve algo desactualizado? <a href="mailto:travis@vethomeguard.org?subject={s}">Escríbanos</a> y lo revisaremos con la fuente oficial.',
          'switch':'Read this guide in English','corr':'Corrección: '}}
def foot(note,lang='en'):
    if lang=='es':
        return ('<footer><p>Creado y mantenido por <a href="https://travisvought.com/">Travis Vought</a>. <a href="mailto:travis@vethomeguard.org">Correcciones</a> · '
                '<a href="./" hreflang="en">Inicio (en inglés)</a> · <a href="about.html" hreflang="en">Acerca de este sitio, fuentes y accesibilidad (en inglés)</a></p>'
                f'<p>Cada afirmación de esta página indica la página oficial de donde proviene, con la fecha en que se revisó. {E(note)} Nada de lo que usted elija aquí se guarda ni se envía. '
                'El texto en español todavía no ha sido revisado por una persona hispanohablante; si encuentra un error, escríbanos.</p></footer>')
    return ('<footer><p>Created and maintained by <a href="https://travisvought.com/">Travis Vought</a>. <a href="mailto:travis@vethomeguard.org">Corrections</a> · <a href="./">Home</a> · '+ABOUT_LINK+'</p>'
            f'<p>Every statement on this page names the official page it comes from, with the date it was checked. {E(note)} Nothing you choose here is saved or sent.</p></footer>')
def exists(href):
    f=href.split('#')[0].split('?')[0]
    return (ROOT/f).exists() or f in [g+'.html' for g in GUIDES+ES_GUIDES]
def link(href,label,lang='en',hl=None):
    """An outside link opens in a new tab and says so; a link to another page of this site must point at a file that exists.
    hl='en' on a Spanish page marks a link to an English page: hreflang, and "(en inglés)" after it."""
    after=UI['es']['in_en'] if hl=='en' and lang=='es' else ''
    attr=' hreflang="en"' if hl=='en' and lang=='es' else ''
    if href.startswith('https://'):return f'<a href="{E(href)}"{attr} rel="noopener" target="_blank">{E(label)}{UI[lang]["new"]}</a>{after}'
    assert not href.startswith(('http:','//')) and exists(href),f'link to a missing page: {href}'
    return f'<a href="{E(href)}"{attr}>{E(label)}</a>{after}'
# Every number in a statement (amounts, dates, ages, percentages, form numbers), so a translation cannot change one
NUM=re.compile(r'\d[\d,]*(?:\.\d+)?')
def nums(s):return sorted(n.replace(',','') for n in NUM.findall(str(s or '')))
def parity(es,en):
    """Stop the build unless the Spanish file says what the English file says: same structure, citations, phones, numbers."""
    w=es['page']
    def same(a,b,where,item=None):
        if item and item.get('es_note'):return
        assert nums(a)==nums(b),f'{w}: {where}: numbers differ from the English guide: {nums(a)} vs {nums(b)}'
    for k in ('checked_on',):assert es[k]==en[k],f'{w}: {k} differs from the English guide'
    assert set(es['sources'])==set(en['sources']),f'{w}: sources differ from the English guide: {sorted(set(es["sources"])^set(en["sources"]))}'
    for k,s in es['sources'].items():
        assert set(s)<={'publisher','page_date','es'},f'{w}: source {k} may only give the publisher, page date and Spanish version'
        same(s['page_date'],en['sources'][k]['page_date'],f'source {k} page date')
        if s.get('es'):assert s['es']['url'].startswith('https://') and s['es'].get('title') and s['es'].get('page_date'),f'{w}: source {k} Spanish version'
    same(es['start'],en['start'],'start')
    assert [(p['icon'],p['href']) for p in es['start_paths']]==[(p['icon'],p['href']) for p in en['start_paths']],f'{w}: start paths'
    for a,b in zip(es['start_paths'],en['start_paths']):same(a['who']+' '+a['text'],b['who']+' '+b['text'],'start path '+b['href'])
    assert [s['id'] for s in es['sections']]==[s['id'] for s in en['sections']],f'{w}: sections differ from the English guide'
    for a,b in zip(es['sections'],en['sections']):
        sid=b['id']
        for k in ('icon','lead_src','cards_first'):assert a.get(k)==b.get(k),f'{w}: {sid} {k}'
        same(a['lead'],b['lead'],sid+' lead',a)
        for kind in ('steps','points'):
            assert len(a.get(kind) or [])==len(b.get(kind) or []),f'{w}: {sid} has a different number of {kind}'
            for i,(x,y) in enumerate(zip(a.get(kind) or [],b.get(kind) or [])):
                assert x['src']==y['src'],f'{w}: {sid} {kind} {i} cites different sources'
                same(x['text'],y['text'],f'{sid} {kind} {i}',x)
        assert [c['id'] for c in a.get('cards') or []]==[c['id'] for c in b.get('cards') or []],f'{w}: {sid} cards'
        for x,y in zip(a.get('cards') or [],b.get('cards') or []):
            for k in ('src','record','phone_src','phone_on_source'):assert x.get(k)==y.get(k),f'{w}: card {y["id"]} {k}'
            assert digits(x.get('phone'))==digits(y.get('phone')),f'{w}: card {y["id"]} phone'
            # a card's es_note sentence goes in "more"; every other field keeps the English numbers
            ks=('name','text','next','phone_label')+(() if x.get('es_note') else ('more',))
            same(' '.join(str(x.get(k) or '') for k in ks),' '.join(str(y.get(k) or '') for k in ks),'card '+y['id'])
            assert len(x['links'])>=1,f'{w}: card {y["id"]} links'
    assert len(es['faq'])==len(en['faq']),f'{w}: quick answers'
    for i,(x,y) in enumerate(zip(es['faq'],en['faq'])):
        assert x['src']==y['src'],f'{w}: quick answer {i} cites different sources'
        same(x['q']+' '+x['a'],y['q']+' '+y['a'],f'quick answer {i}',x)
def load(slug):
    """A guide's data. A Spanish file is completed from the English one it translates (sources' addresses, titles, dates)."""
    d=json.loads((ROOT/f'data/{slug}.json').read_text())
    assert d['page']==slug+'.html',d['page']
    d.setdefault('lang','en')
    if d['lang']=='es':
        en=json.loads((ROOT/f'data/{d["translation_of"]}.json').read_text())
        parity(d,en)
        d['alternate']=en['page']
        d['sources']={k:{**en['sources'][k],**d['sources'][k]} for k in en['sources']}
    return d
def translations():
    """English guide page -> its Spanish version, for the hreflang tags and the language links."""
    out={}
    for s in ES_GUIDES:
        d=json.loads((ROOT/f'data/{s}.json').read_text())
        out[d['translation_of']+'.html']=d['page']
    return out
def build(slug):
    d=load(slug);lang=d['lang'];U=UI[lang]
    page=d['page']
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
            out.append(f'<a class="cite" href="#src-{E(i)}" aria-label="{E(U["source_n"].format(n=n,t=S[i]["title"]))}">[{n}]</a>')
        return ' <span class="meta">'+''.join(out)+'</span>'
    def card(c):
        bits=[]
        if c.get('phone'):
            # the number must be the one read on its source page, and the directory's own record must agree
            assert digits(c['phone'])==digits(c['phone_on_source']),f'{c["id"]}: {c["phone"]} is not the number read on the source page'
            assert c['phone_src'] in S,c['id']
            if c.get('record'):
                assert digits(recs[c['record']]['phone'])==digits(c['phone']),f'{c["id"]}: directory record {c["record"]} has {recs[c["record"]]["phone"]}'
            bits.append(f'<a href="{E(tel(c["phone"]))}">{E(U["call"].format(p=c["phone"]))}</a>')
        elif c.get('record'):assert c['record'] in recs,c['id']
        bits+=[link(l['href'],l['label'],lang,l.get('lang')) for l in c['links']]
        src=c['src']+([c['phone_src']] if c.get('phone') and c['phone_src'] not in c['src'] else [])
        return (f'<article class="card" id="{E(c["id"])}"><h3>{E(c["name"])}</h3>'+(f'<p class="org">{E(c["org"])}</p>' if c['org']!=c['name'] else '')
                +f'<p>{E(c["text"])}</p>'+(f'<p>{E(c["more"])}</p>' if c.get('more') else '')
                +(f'<p><strong>{U["next"]}</strong> {E(c["next"])}</p>' if c.get('next') else '')
                +f'<div class="contact">{"".join(bits)}</div>'+(f'<p class="meta">{E(c["phone_label"])}.</p>' if c.get('phone_label') else '')
                +f'<p class="meta">{U["sources_label"]}{cite(src)}</p></article>')
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
        paths=f'<h3 id="paths-h">{U["paths"]}</h3><ul class="iconlist" aria-labelledby="paths-h">{"".join(lis)}</ul>'
    faq=''.join(f'<div class="faq-item"><h3>{E(f["q"])}</h3><p>{E(f["a"])}{cite(f["src"])}</p></div>' for f in d['faq'])
    unused=set(S)-set(order);assert not unused,f'{slug}: sources never cited: {sorted(unused)}'
    def src_li(i):
        s=S[i];date=s['page_date'][0].upper()+s['page_date'][1:]
        if lang=='en':
            return f'<li id="src-{E(i)}">{E(s["publisher"])}: {link(s["url"],s["title"])}. {E(date)}; {U["checked_one"].format(d=E(s["checked"]))}.</li>'
        # Spanish page: the English page the statement was read on, then the agency's Spanish-language page where it has one
        out=(f'<li id="src-{E(i)}">{E(s["publisher"])}: <a href="{E(s["url"])}" hreflang="en" rel="noopener" target="_blank"><span lang="en">{E(s["title"])}</span>{U["new"]}</a> (en inglés). '
             f'{E(date)}; {U["checked_one"].format(d=E(d["checked_label"]))}.')
        if s.get('es'):
            x=s['es']
            out+=(f' {"Página relacionada en español" if x.get("related") else "Versión en español"}: <a href="{E(x["url"])}" hreflang="es" rel="noopener" target="_blank">{E(x["title"])}{U["new"]}</a>, '
                  f'{E(x["page_date"])}; {U["checked_one"].format(d=E(d["checked_label"]))}.')
        return out+'</li>'
    srcs='<ol class="sources">'+''.join(src_li(i) for i in order)+'</ol>'
    ld={'@context':'https://schema.org','@type':'FAQPage','inLanguage':lang,'mainEntity':[{'@type':'Question','name':f['q'],'acceptedAnswer':{'@type':'Answer','text':f['a']}} for f in d['faq']]}
    faqld='<!--faqld--><script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False).replace('<','\\u003c')+'</script><!--/faqld-->'
    related=''.join(f'<li>{icon(r["icon"])}<span>{link(r["href"],r["label"],lang,r.get("lang"))}: {E(r["text"])}</span></li>' for r in d['related'])
    checked=d['checked_label']
    # the language link: an English guide that has a Spanish version points to it, and the Spanish version points back
    other=d.get('alternate') or translations().get(page)
    switch=''
    if other:
        ol='en' if lang=='es' else 'es'
        assert exists(other),other
        switch=f'<p class="meta lang-switch"><a href="{E(other)}" lang="{ol}" hreflang="{ol}">{U["switch"]}</a></p>'
    # the opening is filled from data/landing.json by finalize_pages.py
    intro=('<!--lede--><!--/lede-->'
           f'<p class="meta" id="checked-line">{U["checked"].format(d=E(checked))}</p>{switch}')
    if lang=='es':
        nav='<nav aria-label="Principal">'+''.join(f'<a href="{E(h)}"'+(f' hreflang="{hl}"' if hl else '')+(' aria-current="page"' if h==page else '')+f'>{E(t)}</a>' for h,t,hl in NAV_ES)+'</nav>'
    else:nav=NAV
    out=(f'<!doctype html>\n<html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
      f'<title>{E(d["title"])} | Mobility Talk</title><meta name="description" content="{E(d["description"])}"><link rel="stylesheet" href="assets/site.css">{faqld}</head>\n'
      f'<body><a class="skip" href="#main">{U["skip"]}</a>\n'
      f'<header>{nav}<small>{E(d["eyebrow"])}</small><h1>{E(d["h1"])}</h1>{intro}</header>\n'
      f'<main id="main"><section class="panel" aria-labelledby="start-h"><h2 id="start-h">{U["on_page"]}</h2>'
      f'<nav class="toc tiles guide" aria-label="{U["jump"]}">{"".join(toc)}{tile("questions",U["quick"],"chat_q")}{tile("sources",U["sources"],"book")}</nav>'
      f'<p>{E(d["start"])}</p>{paths}{RELAY_ES if lang=="es" else RELAY}</section>'
      +''.join(secs)
      +f'<section id="questions" aria-labelledby="questions-h"><h2 id="questions-h" class="cat-h">{icon("chat_q","hic")}{U["quick"]}</h2>{faq}</section>'
      +f'<section id="related" aria-labelledby="related-h"><h2 id="related-h" class="cat-h">{icon("link","hic")}{U["more"]}</h2><ul class="iconlist">{related}</ul></section>'
      +f'<section id="sources" class="panel" aria-labelledby="sources-h"><h2 id="sources-h">{U["sources"]}</h2><p>{U["sources_p"].format(d=E(checked))}</p>{srcs}</section>'
      +f'<section><p>{U["missing"].format(s=E(U["corr"]+d["correction_subject"]))}</p></section>'
      f'{SIDE_ES if lang=="es" else SIDE_HELP}</main>{foot(d["footer_note"],lang)}</body></html>\n')
    return page,out
def outputs():return dict(build(g) for g in GUIDES+ES_GUIDES)
if __name__=='__main__':
    for p,t in outputs().items():(ROOT/p).write_text(t)
    print('Built',len(GUIDES),'topic guides and',len(ES_GUIDES),'Spanish versions.')
