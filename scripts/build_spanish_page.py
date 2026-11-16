#!/usr/bin/env python3
"""Build espanol.html from data/ayuda-espanol.json and the directory records it names.

Phone numbers and links are pulled from data/local-programs.json at build time, so the page and the directory cannot drift apart.
A Spanish-only number given in the data file must already appear in the directory record it belongs to.
Run via `npm run build` (from the scripts directory, like the other page builders).
"""
import html,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
E=lambda s:html.escape(str(s),quote=True)
NEW=' (se abre en otra pestaña)'
digits=lambda s:re.sub(r'\D','',str(s or ''))
def tel(p):
    d=re.sub(r'[^0-9+]','',str(p));return 'tel:'+d if d else None
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
def outputs():
    d=json.loads((ROOT/'data/ayuda-espanol.json').read_text())
    recs={r['id']:r for r in json.loads((ROOT/'data/local-programs.json').read_text())['records']}
    body=''
    for s in d['sections']:
        for it in s['items']:assert it['record'] in recs,f'no directory record {it["record"]}'
        cards=''.join(item(it,recs) for it in s['items'])
        intro=f'<p>{E(s["intro"])}</p>' if s.get('intro') else ''
        if s.get('urgent'):
            body+=f'<section class="urgent" aria-labelledby="{E(s["id"])}-h"><h2 id="{E(s["id"])}-h">{E(s["title"])}</h2>{intro}<div class="list">{cards}</div></section>'
        else:
            body+=f'<section aria-labelledby="{E(s["id"])}-h"><h2 id="{E(s["id"])}-h">{E(s["title"])}</h2>{intro}<div class="list">{cards}</div></section>'
    i=d['interpreter']
    body+=(f'<section class="panel" aria-labelledby="interprete-h"><h2 id="interprete-h">{E(i["title"])}</h2><p>{E(i["text"])}</p>'
           f'<p><strong lang="en">{E(i["phrase_en"])}</strong><br>({E(i["phrase_es"])})</p></section>')
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
          f'<header>{nav}<small>AYUDA EN ESPAÑOL · TODO EL PAÍS</small><h1>{E(d["h1"])}</h1><p>{E(d["lead"])}</p></header>\n'
          f'<main id="main">{body}</main>{foot}</body></html>\n')
    return {'espanol.html':page}
if __name__=='__main__':
    for p,t in outputs().items():(ROOT/p).write_text(t)
    print('Built the Spanish help page.')
