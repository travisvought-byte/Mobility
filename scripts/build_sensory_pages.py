#!/usr/bin/env python3
"""Build blind-low-vision.html and deaf-hard-of-hearing.html: one national page per group, listing every
directory record tagged for that group, national services first and then state by state.

Nothing here is new data. Every name, phone number, link, eligibility note and review date comes from
data/local-programs.json, so these pages and the directory cannot drift apart. Run via `npm run build`
(from the scripts directory, like the other page builders); finalize_pages.py then adds canonical,
social and structured-data tags, the featured organization block and the visit counter.
"""
import html,json,re
from pathlib import Path
from build_mobility_routes import STATES,TERRITORIES
from site_parts import URGENT,SIDE_HELP,RELAY,ABOUT_LINK,guides,prep_html
from build_state_pages import card,contact,sort_key,slug,the
ROOT=Path(__file__).resolve().parents[1]
E=lambda s:html.escape(str(s),quote=True)
DATA=json.loads((ROOT/'data/local-programs.json').read_text())
GUIDE=guides()['guides']['sensory']
NAV='<nav aria-label="Main"><a href="./">Home</a><a href="mobility-rights.html">Find your next step</a><a href="local-help.html">Local help &amp; programs</a><a href="know-your-rights.html">Know your rights</a><a href="ramps-home-access.html">Ramps &amp; home access</a><a href="disability-advocacy.html">Advocacy</a><a href="mobility-independence.html">Repair &amp; adapt</a></nav>'
FOOT=('<footer><p>Created and maintained by <a href="https://travisvought.com/">Travis Vought</a>. <a href="mailto:travis@vethomeguard.org">Corrections</a> · <a href="./">Home</a> · '+ABOUT_LINK+'</p>'
      '<p>Every listing comes from the program’s own published page or an official directory, with the date it was checked. This is general information, not legal or medical advice, and it does not decide eligibility. Nothing you choose here is saved or sent.</p></footer>')
# Kinds of state program, matched on the record id the directory builder gives each family. Anything else is shown as "More state programs".
PAGES={
 'blind-low-vision.html':{
  'aud':{'blind'},'nat_aud':{'blind','deafblind'},
  'title':'Blind and low vision resources and services in every state',
  'h1':'Blind and low vision resources in every state',
  'small':'BLIND · LOW VISION · ALL AGES · EVERY STATE',
  'desc':'Free help if you are blind or have low vision: braille and audio books, training, state agencies for the blind and help for older adults, every state.',
  'kinds':[('rsa-blind-agency','State agency for blind and low-vision residents'),('nls','Talking-book and braille library'),('older-blind','Independent living help for older adults with vision loss')],
  'other':'deaf-hard-of-hearing.html','other_label':'Deaf and hard of hearing resources',
  'deafblind':'<p>DeafBlind? iCanConnect, the free communication technology and training program for people with both significant hearing and vision loss, is listed for every state on the <a href="deaf-hard-of-hearing.html#deafblind">Deaf and hard of hearing page</a>.</p>',
  'rights':[('public-places','A business, public place or government service'),('work','At work or applying for a job'),('agency-problems','A vocational rehabilitation or disability agency turned you down')],
  'aud_key':'blind'},
 'deaf-hard-of-hearing.html':{
  'aud':{'deaf','deafblind'},'nat_aud':{'deaf','deafblind'},
  'title':'Deaf and hard of hearing resources and services in every state',
  'h1':'Deaf and hard of hearing resources in every state',
  'small':'DEAF · HARD OF HEARING · DEAFBLIND · EVERY STATE',
  'desc':'Free help if you are deaf, hard of hearing or DeafBlind: 711 relay, free phone equipment, state agencies and iCanConnect, with contacts for every state.',
  'kinds':[('deaf-hard-of-hearing-agency','State office for deaf and hard of hearing people'),('tedp','Phone equipment program for hearing loss'),('icanconnect','Free equipment for people who are DeafBlind (iCanConnect)')],
  'other':'blind-low-vision.html','other_label':'Blind and low vision resources',
  'deafblind':'',
  'rights':[('phones-relay','Phones, relay and captioning'),('public-places','A business, public place or government service'),('health-care','Health care and social services'),('work','At work or applying for a job')],
  'aud_key':'deaf'},
}
def kind_of(r,kinds):
    for k,_ in kinds:
        if re.search(r'(^|-)'+re.escape(k)+r'(-|$)',r['id']):return k
    return 'other'
def item(r):
    """One program in a state list: name, area served, contact, and the record's own words on who it serves and how to start."""
    c=r.get('counties') or []
    area=f' <span class="meta">({E(", ".join(c[:6])+(f" and {len(c)-6} more" if len(c)>6 else ""))} {"County" if len(c)==1 else "counties"})</span>' if c else ''
    bits=contact(r,True)
    more=[]
    if r.get('description'):more.append(f'<p>{E(r["description"])}</p>')
    if r.get('next_step'):more.append(f'<p><strong>Next step:</strong> {E(r["next_step"])}</p>')
    if r.get('constraints'):more.append('<ul>'+''.join(f'<li>{E(x)}</li>' for x in r['constraints'])+'</ul>')
    if r.get('phone') and r.get('phone_note'):more.append(f'<p class="meta">{E(r["phone_note"])}</p>')
    if r.get('contact_how'):more.append(f'<p class="meta"><strong>How to reach them:</strong> {E(r["contact_how"])}</p>')
    if r.get('record_status') in ('directory_listed','news_reported'):more.append('<p class="meta">Listing: confirm details before you rely on it.</p>')
    if r.get('reviewed_on'):more.append(f'<p class="meta">Source page checked {E(r["reviewed_on"])}.</p>')
    det=f'<details><summary>Who it serves and how to start<span class="vh">: {E(r["name"])}</span></summary>{"".join(more)}</details>' if more else ''
    return f'<li><strong>{E(r["name"])}</strong>{area}'+(' · '+' · '.join(bits) if bits else '')+det+'</li>'
def build(name,cfg,recs):
    nat=sorted([r for r in recs if r['state']=='US' and set(r.get('audience') or [])&cfg['nat_aud']],key=sort_key)
    places={**{k:v for k,v in sorted(STATES.items(),key=lambda x:x[1])},**{k:v for k,v in sorted(TERRITORIES.items(),key=lambda x:x[1])}}
    mine=[r for r in recs if r['state'] in places and set(r.get('audience') or [])&cfg['aud']]
    labels=dict(cfg['kinds'])
    secs=[];toc=[];count=0
    for code,pname in places.items():
        rs=[r for r in mine if r['state']==code]
        if not rs:continue
        count+=len(rs)
        groups=''
        for k in [k for k,_ in cfg['kinds']]+['other']:
            g=sorted([r for r in rs if kind_of(r,cfg['kinds'])==k],key=lambda r:(r['scope']!='statewide',)+sort_key(r))
            if g:groups+=f'<h4>{E(labels.get(k,"More state programs"))}</h4><ul class="statelist">'+''.join(item(r) for r in g)+'</ul>'
        sid='st-'+code.lower()
        toc.append(f'<a href="#{sid}">{E(pname)}</a>')
        secs.append(f'<section class="state-group" id="{sid}" aria-labelledby="{sid}-h"><h3 id="{sid}-h">{E(pname)}</h3>{groups}'
                    f'<p class="meta"><a href="states/{slug(pname)}.html">Everything else listed for {E(the(code,pname))}</a></p></section>')
    n_states=len(secs)
    # the opening is filled from data/landing.json by finalize_pages.py; listing counts are not shown (owner rule)
    natcards='<div class="grid">'+''.join(card(r) for r in nat)+'</div>'
    rights=''.join(f'<li><a href="know-your-rights.html#{k}">{E(t)}</a></li>' for k,t in cfg['rights'])
    page=('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
      f'<title>{E(cfg["title"])} | Mobility Talk</title><meta name="description" content="{E(cfg["desc"])}"><link rel="stylesheet" href="assets/site.css"></head>\n'
      '<body><a class="skip" href="#main">Skip to main content</a>\n'
      f'<header>{NAV}<small>{E(cfg["small"])}</small><h1>{E(cfg["h1"])}</h1><!--lede--><!--/lede--></header>\n'
      f'<main id="main"><section class="panel" aria-labelledby="start-h"><h2 id="start-h">How to use this page</h2>'
      '<ol><li>Start with the national services below. Most are free and work wherever you live.</li><li>Then find your state for the agencies and programs there.</li><li>Open “Who it serves and how to start” on any listing to see what the program itself says about who qualifies and the first step.</li></ol>'
      f'{prep_html(GUIDE,3)}{RELAY}{cfg["deafblind"]}</section>'
      f'<section aria-labelledby="nat-h"><h2 id="nat-h">National services</h2><p class="lead">These serve people in every state.</p>{natcards}</section>'
      f'<section aria-labelledby="states-h"><h2 id="states-h">Programs in your state</h2><nav class="toc" aria-label="Jump to a state">{"".join(toc)}</nav>'
      +(f'<p id="deafblind">iCanConnect, listed in each state below, provides free distance communication technology and training to people with both significant hearing and vision loss. It is for people with low incomes, and programs verify disability and income. The national information line is listed above.</p>' if cfg['aud_key']=='deaf' else '')
      +''.join(secs)+'</section>'
      f'<section class="panel" aria-labelledby="rights-h"><h2 id="rights-h">If you are turned away or refused help</h2><p>The <a href="know-your-rights.html">Know your rights</a> page says which office handles each kind of problem, the first steps and any deadline the source states.</p><ul>{rights}</ul>'
      f'<p>Also on this site: <a href="{cfg["other"]}">{E(cfg["other_label"])}</a> · <a href="service-animals.html">Service animals and your rights</a> · <a href="local-help.html?audience={cfg["aud_key"]}">Filter the full directory</a> · <a href="states/index.html">Every state’s full list</a></p></section>'
      f'<section><p>Missing a program or see something out of date? <a href="mailto:travis@vethomeguard.org?subject={E("Correction: "+cfg["h1"])}">Tell us</a> and it will be checked against the program’s own page.</p></section>'
      f'{SIDE_HELP}</main>{FOOT}</body></html>\n')
    return page
def outputs():
    recs=[r for r in DATA['records'] if r['category']!='veterans']
    return {name:build(name,cfg,recs) for name,cfg in PAGES.items()}
if __name__=='__main__':
    for p,t in outputs().items():(ROOT/p).write_text(t)
    print('Built the blind and low vision and the deaf and hard of hearing pages.')
