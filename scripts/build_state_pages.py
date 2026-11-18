#!/usr/bin/env python3
"""Build states/<slug>.html (one static, crawlable page per state) and states/index.html from data/.

Search engines cannot run local-help.js, so without these pages none of the program records are indexable.
Every page is generated; do not edit the output by hand. Run via `npm run build`.
"""
import html,json,re
from pathlib import Path
from build_mobility_routes import STATES,TERRITORIES
from site_parts import URGENT,RELAY,ABOUT_LINK,guides,prep_html,tel
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'states'
BASE='https://mobilitytalk.org/'
E=lambda s:html.escape(str(s),quote=True)
DATA=json.loads((ROOT/'data/local-programs.json').read_text())
CATS=DATA['categories']
GUIDES=guides()
ORDER=[k for k in GUIDES['results_order'] if k!='veterans']
AUD=DATA.get('audiences',{})
NATIONAL=['us-988-lifeline','us-211','us-711-relay','us-ssa-disability-apply','us-ada-information-line','us-hud-housing-agency','us-jan','us-eeoc','us-medicare-equipment-repair','us-ship-medicare-counseling','us-wipa-benefits-counseling','us-icanconnect','us-tsa-cares']
STATUS_RANK={'official_source_reviewed':0,'official_search_extract_only':1,'directory_listed':2,'news_reported':3}
MIF=(ROOT/'templates/partials/featured-mif.html').read_text().strip()
LUUL=(ROOT/'templates/partials/featured-luul.html').read_text().strip()
GUIDE_STATE_OK=True
def slug(name):return re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
def up(s):
    """Rewrite root-relative hrefs in shared chrome so it works from states/."""
    return re.sub(r'(href|src)="(?!https?:|mailto:|tel:|sms:|#|\.\./)([^"]*)"',lambda m:f'{m.group(1)}="../{m.group(2) if m.group(2) not in ("./","") else ""}"',s)
NAV=up('<nav aria-label="Main"><a href="./">Home</a><a href="mobility-rights.html">Find your next step</a><a href="local-help.html">Local help &amp; programs</a><a href="states/index.html" aria-current="page">All states</a><a href="know-your-rights.html">Know your rights</a><a href="ramps-home-access.html">Ramps &amp; home access</a><a href="disability-advocacy.html">Advocacy</a><a href="mobility-independence.html">Repair &amp; adapt</a><a href="partner.html">Partner with us</a><a href="espanol.html" lang="es" hreflang="es">Español</a></nav>')
FOOT=up('<footer><p>Created and maintained by <a href="https://travisvought.com/">Travis Vought</a>. <a href="mailto:travis@vethomeguard.org">Corrections</a> · <a href="./">Home</a> · <a href="partner.html">Partner with us</a> · '+ABOUT_LINK+'</p><p>Program details come from the programs’ own published pages, each with the date it was checked. This is general information, not legal or medical advice, and it does not decide eligibility. Nothing you choose here is saved or sent.</p></footer>')
def head(title,desc,path):
    url=BASE+path
    ld={'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Mobility Talk','item':BASE},{'@type':'ListItem','position':2,'name':'All states','item':BASE+'states/'}]+([{'@type':'ListItem','position':3,'name':title.split(' | ')[0],'item':url}] if path!='states/' else [])}
    LD=json.dumps(ld).replace('<','\\u003c')
    return ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
      f'<title>{E(title)} | Mobility Talk</title><meta name="description" content="{E(desc)}">'
      '<link rel="stylesheet" href="../assets/site.css">'
      f'<link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Mobility Talk">'
      f'<meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:url" content="{url}"><meta property="og:image" content="{BASE}assets/social-card.png"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#183449">'
      f'<script type="application/ld+json">{LD}</script></head>\n'
      '<body><a class="skip" href="#main">Skip to main content</a>\n')
LINK_LABEL={'official':'Official page','gov':'Government page','directory':'Directory listing','news':'News article','rule':'Rule text','social':'Facebook page','source':'Source page'}
LINK_SHORT={**LINK_LABEL,'official':'Website'}
def link_for(r):
    w=r.get('web');u=r.get('url')
    if w and w.startswith('https://'):return w
    return u if u and u.startswith('https://') else None
def contact(r,compact=False):
    bits=[]
    if r.get('phone') and tel(r['phone']):bits.append(f'<a href="{E(tel(r["phone"]))}">Call {E(r["phone"])}</a>')
    L=link_for(r)
    if L:
        # Say what kind of page the link opens (same labels as the interactive directory), and that it opens a new tab
        kind=r.get('link_kind')
        bits.append(f'<a href="{E(L)}" rel="noopener" target="_blank">{LINK_SHORT.get(kind,"Source page")}<span class="vh"> (new tab)</span></a>' if compact else f'<a href="{E(L)}" rel="noopener" target="_blank">{LINK_LABEL.get(kind,"Source page")} (new tab)</a>')
    if r.get('email'):bits.append(f'<a href="mailto:{E(r["email"])}">Email</a>')
    return bits
def sort_key(r):return (r.get('sort',999),STATUS_RANK.get(r.get('record_status'),9),0 if r.get('phone') else 1,r['name'].lower())
def card(r):
    out=[f'<article class="card"><span class="badge">{"Serves all of "+E(TERRITORIES[r["state"]]) if r["state"] in TERRITORIES else "Statewide"}</span>' if r['scope']=='statewide' else '<article class="card">',f'<h3>{E(r["name"])}</h3>']
    who=[AUD[a] for a in r.get('audience') or [] if a in AUD]
    if who:out.append(f'<p class="meta">For: {E(", ".join(who))}</p>')
    if r.get('org') and r['org'].lower()!=r['name'].lower():out.append(f'<p class="org">{E(r["org"])}</p>')
    if r.get('description'):out.append(f'<p>{E(r["description"])}</p>')
    if r.get('next_step'):out.append(f'<p><strong>Next step:</strong> {E(r["next_step"])}</p>')
    if r.get('constraints'):out.append('<details><summary>Good to know</summary><ul>'+''.join(f'<li>{E(c)}</li>' for c in r['constraints'])+'</ul></details>')
    c=contact(r)
    if c:out.append('<div class="contact">'+''.join(c)+'</div>')
    if r.get('phone') and r.get('phone_note'):out.append(f'<p class="meta">{E(r["phone_note"])}</p>')
    if r.get('contact_how'):out.append(f'<p class="meta"><strong>How to reach them:</strong> {E(r["contact_how"])}</p>')
    elif not c:out.append('<p class="meta">No phone, email or website is listed for this program yet.</p>')
    if r.get('record_status') in ('directory_listed','news_reported'):out.append('<p class="meta">Listing: confirm details before you rely on it.</p>')
    out.append(f'<p class="meta">{"Source page checked "+E(r["reviewed_on"])+". " if r.get("reviewed_on") else "Source page linked. "}<a href="mailto:travis@vethomeguard.org?subject={E("Correction: "+r["name"])}">Report a problem</a></p></article>')
    return ''.join(out)
def local_li(r):
    c=r['counties'];cs=', '.join(c[:6])+(f' and {len(c)-6} more' if len(c)>6 else '')
    bits=contact(r,True)
    return f'<li><strong>{E(r["name"])}</strong>'+(f' <span class="meta">({E(cs)} {"County" if len(c)==1 else "counties"})</span>' if c else '')+(' · '+' · '.join(bits) if bits else '')+'</li>'
def the(code,name):
    """Place name as it reads in a sentence: 'the Northern Mariana Islands', 'the U.S. Virgin Islands'."""
    return ('the ' if code in ('MP','VI') else '')+name
def state_page(code,name,recs,national):
    terr=code in TERRITORIES;place=the(code,name)
    mine=[r for r in recs if r['state']==code and r['category']!='veterans']
    wide=[r for r in mine if r['scope']=='statewide'];local=[r for r in mine if r['scope']=='counties']
    counties=sorted({c for r in local for c in r.get('counties',[])})
    n=len(mine)
    kinds=', '.join(CATS[k].lower().replace('&','and') for k in ORDER if any(r['category']==k for r in mine))
    desc=(f'{n} disability programs and agencies in {place}, with phone numbers and official pages: {kinds}.')[:300]
    p=slug(name);path=f'states/{p}.html'
    secs=[]
    for k in ORDER:
        w=sorted([r for r in wide if r['category']==k],key=sort_key);l=sorted([r for r in local if r['category']==k],key=sort_key)
        if not (w or l):continue
        g=GUIDES['guides'].get(k) or {}
        s=f'<section id="{k.replace("_","-")}"><h2>{E(CATS[k])}</h2>'+(f'<p class="lead">{E(g["blurb"])}</p>' if g.get('blurb') else '')+prep_html(g,3)
        if w:s+='<div class="grid">'+''.join(card(r) for r in w)+'</div>'
        if l:
            s+=f'<h3>County and regional programs ({len(l)})</h3><ul class="statelist">'+''.join(local_li(r) for r in l)+'</ul>'
        if k=='sensory':s+='<p class="meta">National services and every state’s programs: <a href="../blind-low-vision.html">Blind and low vision resources</a> · <a href="../deaf-hard-of-hearing.html">Deaf and hard of hearing resources</a></p>'
        secs.append(s+'</section>')
    toc=''.join(f'<a href="#{k.replace("_","-")}">{E(CATS[k])}</a>' for k in ORDER if any(r['category']==k for r in mine))
    nat=''.join(f'<li><strong>{E(r["name"])}</strong> · '+' · '.join(contact(r,True))+'</li>' for r in national if r.get('phone'))
    extra=LUUL.replace('ALSO FEATURED &middot; WASHINGTON','FEATURED IN WASHINGTON',1) if code=='WA' else ''
    gcode=code.lower()
    urgent=up(URGENT).replace('local-help.html?category=crisis',f'local-help.html?state={code}&amp;category=crisis')
    if terr:
        intro=f'<p>{n} programs and agencies listed for {E(place)} so far, plus national lines. Each lists how to reach it and links to its own page.</p>'
        actions=(f'<div class="actions"><a class="button" href="../local-help.html?state={code}">Filter by need</a><a class="button secondary" href="../handout.html?state={code}">Print a help list</a><a class="button secondary" href="../know-your-rights.html">Know your rights</a></div>'
          f'<p class="meta">This list covers the main public agencies for {E(place)}; fewer community programs are listed than for the states. The federal <a href="https://dial.acl.gov/home" rel="noopener" target="_blank">DIAL database (new tab)</a> lists the Centers for Independent Living, assistive technology program, developmental disabilities council and Protection and Advocacy agency in each territory.</p>')
        everywhere=f'<section class="panel"><h2>National lines</h2><p>These lines serve the whole country. Ask each one whether it serves {E(place)}.</p><ul class="statelist">{nat}</ul></section>'
    else:
        intro=(f'<p>{n} programs and agencies in {E(name)}: {len(wide)} that serve the whole state and {len(local)} that serve specific counties'+(f' across {len(counties)} counties' if counties else '')+'. Each lists how to reach it and links to its own page. Start with the group that matches what you need.</p>')
        actions=(f'<div class="actions"><a class="button" href="../local-help.html?state={code}">Filter by county or need</a><a class="button secondary" href="../handout.html?state={code}">Print a help list</a><a class="button secondary" href="../mobility-rights.html?state={code}">Find your next step</a><a class="button secondary" href="../know-your-rights.html">Know your rights</a><a class="button secondary" href="../disability-advocacy.html?state={code}">Advocacy letters</a></div>'
          f'<p class="meta">Looking for nursing-home, aging or veterans benefits help in {E(name)}? Use the <a href="https://guide.vethomeguard.org/{gcode}.html">Veteran Resource Guide for {E(name)}</a>.</p>')
        everywhere=f'<section class="panel"><h2>Available in every state</h2><p>These national lines help wherever you live, including {E(name)}.</p><ul class="statelist">{nat}</ul></section>'
    body=(f'<header>{NAV}<small>{E(name.upper())} · ALL AGES · ALL DISABILITIES</small><h1>Disability and mobility resources in {E(place)}</h1>{intro}</header>\n'
      f'<main id="main">{urgent}<section class="panel">{actions}{RELAY}</section>'
      f'<nav class="toc" aria-label="Jump to a group of programs">{toc}</nav>'
      +''.join(secs)+everywhere
      +(extra and '<!--luul-->'+up(extra)+'<!--/luul-->')+'<!--mif-->'+MIF+'<!--/mif-->'
      +f'<section><p>Missing a program or see something out of date? <a href="mailto:travis@vethomeguard.org?subject={E("Correction: "+name)}">Tell us</a> and it will be checked against the program’s own page.</p></section></main>{FOOT}</body></html>')
    return path,head(f'Disability and mobility resources in {place}',desc,path)+body,n
def index_page(rows,trows):
    li=lambda rs:''.join(f'<li><a href="{slug(nm)}.html">{E(nm)}</a> <span class="meta">{n} programs</span></li>' for code,nm,n in rs)
    desc='Disability and mobility resources for every U.S. state, D.C. and the U.S. territories: benefits, equipment, ramps, rides, in-home help, work, vision and hearing services, rights and legal help, and developmental disability agencies.'
    return head('Disability and mobility resources by state',desc,'states/')+(f'<header>{NAV}<small>ALL STATES · ALL AGES · ALL DISABILITIES</small><h1>Disability and mobility resources by state</h1><p>Choose your state for a full list of programs and agencies, with phone numbers and official pages. Every state, the District of Columbia and the U.S. territories are listed.</p></header>'
      f'<main id="main">{up(URGENT)}<section aria-labelledby="st-h"><h2 id="st-h">States and D.C.</h2><ul class="statelist cols" id="state-list">{li(rows)}</ul></section>'
      f'<section aria-labelledby="terr-h"><h2 id="terr-h">U.S. territories</h2><p>Each territory lists its main public disability agencies, plus national lines. Fewer community programs are listed than for the states.</p><ul class="statelist cols" id="territory-list">{li(trows)}</ul></section><!--mif-->{MIF}<!--/mif--></main>{FOOT}</body></html>')
def build():
    recs=DATA['records'];national=[r for i in NATIONAL for r in recs if r['id']==i]
    OUT.mkdir(exist_ok=True)
    for f in OUT.glob('*.html'):f.unlink()
    rows=[];trows=[]
    for places,acc in ((STATES,rows),(TERRITORIES,trows)):
        for code,name in sorted(places.items(),key=lambda x:x[1]):
            path,t,n=state_page(code,name,recs,national);(ROOT/path).write_text(t);acc.append((code,name,n))
    (OUT/'index.html').write_text(index_page(rows,trows))
    return rows+trows
if __name__=='__main__':
    rows=build();print(f'Built {len(rows)} state and territory pages and the states index.')
