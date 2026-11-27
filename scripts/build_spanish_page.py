#!/usr/bin/env python3
"""Build espanol.html from data/ayuda-espanol.json and the directory records it names.

Phone numbers and links are pulled from data/local-programs.json at build time, so the page and the directory cannot drift apart.
A Spanish-only number given in the data file must already appear in the directory record it belongs to.
Run via `npm run build` (from the scripts directory, like the other page builders).
"""
import html,json,re
from pathlib import Path
from site_parts import tel,icon
ROOT=Path(__file__).resolve().parents[1]
E=lambda s:html.escape(str(s),quote=True)
NEW=' (se abre en otra pestaña)'
digits=lambda s:re.sub(r'\D','',str(s or ''))
def item(it,recs):
    r=recs[it['record']]
    blob=' '.join(str(r.get(k) or '') for k in ('phone','phone_note','next_step','contact_how','email','description'))+' '+' '.join(r.get('constraints') or [])
    bits=[]
    phone=None if it.get('no_phone') else (it.get('phone') or r.get('phone'))
    if it.get('phone'):assert digits(it['phone']) in digits(blob),f'{it["record"]}: {it["phone"]} is not in the directory record'
    if phone and not it.get('sms_only'):bits.append(f'<a href="{E(tel(phone))}">Llamar al {E(phone)}</a>')
    if it.get('sms'):
        assert digits(it['sms']) in digits(blob),f'{it["record"]}: text number {it["sms"]} is not in the directory record'
        bits.append(f'<a href="sms:{E(digits(it["sms"]))}">{E(it.get("sms_label") or "Enviar un mensaje de texto al "+it["sms"])}</a>')
    if it.get('email'):
        assert it['email'] in blob,f'{it["record"]}: {it["email"]} is not in the directory record'
        bits.append(f'<a href="mailto:{E(it["email"])}">Escribir a {E(it["email"])}</a>')
    link=it.get('link')
    if link:assert link.split('//')[1].removeprefix('www.') in blob,f'{it["record"]}: {link} is not in the directory record'
    else:link=r['web'] if (r.get('web') or '').startswith('https://') else None
    if link:bits.append(f'<a href="{E(link)}" rel="noopener" target="_blank">{E(it.get("link_label") or "Sitio web")}{NEW}</a>')
    assert bits,it['record']
    return f'<article class="card"><h3>{E(it["name"])}</h3><p>{E(it["text"])}</p><div class="contact">'+''.join(bits)+'</div></article>'
# The crisis lines as a small side note in Spanish, like the English pages' note
SIDE=('<div class="side-help"><aside class="urgent" aria-labelledby="urgente-h"><h2 id="urgente-h">¿En crisis o en peligro ahora?</h2>'
      '<p><a href="tel:988">Llame al 988</a> o <a href="sms:988">envíe un texto al 988</a>, a cualquier hora. Si hay peligro inmediato, llame al 911.</p>'
      '<p><a href="#ahora-h">Líneas de crisis en español</a> · <a href="local-help.html?category=crisis" hreflang="en">Todas las líneas (en inglés)</a></p></aside></div>')
# Visuals (November 25, 2026): jump tiles to each section and the same icon on its heading. Decorative only: the section
# names are the text, in Spanish. A section with no icon here simply has none.
SEC_ICON={'ahora':'crisis','refugio':'ramps_home','local':'map_pin','comida':'food','beneficios':'benefits','trabajo':'work_school',
          'derechos':'rights_legal','salud':'medical','vision':'sensory','ninos':'children','mayores':'independent_living','interprete':'language'}
def h2(sid,title):
    return f'<h2 id="{E(sid)}-h" class="cat-h">{icon(SEC_ICON.get(sid,""),"hic")}{E(title)}</h2>'
def outputs():
    d=json.loads((ROOT/'data/ayuda-espanol.json').read_text())
    recs={r['id']:r for r in json.loads((ROOT/'data/local-programs.json').read_text())['records']}
    body='';later=''
    for s in d['sections']:
        for it in s['items']:assert it['record'] in recs,f'no directory record {it["record"]}'
        cards=''.join(item(it,recs) for it in s['items'])
        intro=f'<p>{E(s["intro"])}</p>' if s.get('intro') else ''
        # Crisis and shelter lines sit after the everyday help, with a small side note (owner direction, November 22-23, 2026)
        if s.get('urgent'):
            later+=f'<section class="urgent" aria-labelledby="{E(s["id"])}-h">{h2(s["id"],s["title"])}{intro}<div class="list">{cards}</div></section>'
        elif s['id']=='refugio':
            later+=f'<section aria-labelledby="{E(s["id"])}-h">{h2(s["id"],s["title"])}{intro}<div class="list">{cards}</div></section>'
        else:
            body+=f'<section aria-labelledby="{E(s["id"])}-h">{h2(s["id"],s["title"])}{intro}<div class="list">{cards}</div></section>'
    body+=later
    order=[x['id'] for x in d['sections'] if not (x.get('urgent') or x['id']=='refugio')]+[x['id'] for x in d['sections'] if x.get('urgent') or x['id']=='refugio']
    titles={x['id']:x['title'] for x in d['sections']}
    i=d['interpreter']
    body+=(f'<section class="panel" aria-labelledby="interprete-h">{h2("interprete",i["title"])}<p>{E(i["text"])}</p>'
           f'<p><strong lang="en">{E(i["phrase_en"])}</strong><br>({E(i["phrase_es"])})</p></section>')
    order.append('interprete');titles['interprete']=i['title']
    tiles=('<nav class="toc tiles guide" aria-label="Secciones de esta página">'
           +''.join(f'<a href="#{E(k)}-h">{icon(SEC_ICON.get(k,""),"tic")}<span class="tl">{E(titles[k])}</span></a>' for k in order)+'</nav>')
    # the guides that have a Spanish version (November 27, 2026); the heading is not a jump-tile section, so it has no icon
    g=d.get('guides')
    if g:
        from build_topic_guides import ES_GUIDES
        for x in g['links']:assert x['href'].removesuffix('.html') in ES_GUIDES,x['href']
        body+=(f'<section class="panel" aria-labelledby="guias-h"><h2 id="guias-h">{E(g["title"])}</h2><p>{E(g["intro"])}</p><ul class="iconlist">'
               +''.join(f'<li>{icon(x["icon"])}<span><a href="{E(x["href"])}">{E(x["label"])}</a>: {E(x["text"])}</span></li>' for x in g['links'])+'</ul></section>')
    m=d['more']
    body+=(f'<section class="panel" aria-labelledby="mas-h"><h2 id="mas-h">{E(m["title"])}</h2><ul>'
           +''.join(f'<li><a href="{E(x["href"])}" hreflang="en">{E(x["label"])}</a></li>' for x in m['links'])+'</ul></section>')
    nav=('<nav aria-label="Principal"><a href="./" hreflang="en">Inicio (en inglés)</a><a href="local-help.html" hreflang="en">Directorio de ayuda (en inglés)</a>'
         '<a href="know-your-rights.html" hreflang="en">Sus derechos (en inglés)</a><a href="espanol.html" aria-current="page">Ayuda en español</a></nav>')
    foot=('<footer><p>Creado y mantenido por Travis Vought. <a href="mailto:travis@vethomeguard.org">Correcciones</a> · <a href="./" hreflang="en">Inicio (en inglés)</a> · '
          '<a href="about.html" hreflang="en">Acerca de este sitio, fuentes y accesibilidad (en inglés)</a></p>'
          f'<p>Esta página ofrece información general tomada de las páginas que publica cada programa, revisadas el {E(d["reviewed_on"])}. No es asesoría legal ni médica. '
          'Nada de lo que usted elija aquí se guarda ni se envía. El texto en español todavía no ha sido revisado por una persona hispanohablante; si encuentra un error, escríbanos.</p></footer>')
    page=('<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
          f'<title>{E(d["title"])}</title><meta name="description" content="{E(d["description"])}"><link rel="stylesheet" href="assets/site.css"></head>\n'
          '<body><a class="skip" href="#main">Saltar al contenido principal</a>\n'
          f'<header>{nav}<small>AYUDA EN ESPAÑOL · TODO EL PAÍS</small><h1>{E(d["h1"])}</h1><!--lede--><!--/lede--></header>\n'
          f'<main id="main">{tiles}{body}{SIDE}</main>{foot}</body></html>\n')
    return {'espanol.html':page}
if __name__=='__main__':
    for p,t in outputs().items():(ROOT/p).write_text(t)
    print('Built the Spanish help page.')
