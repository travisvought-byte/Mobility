#!/usr/bin/env python3
"""Build states/<slug>.html (one static, crawlable page per state) and states/index.html from data/.

Search engines cannot run local-help.js, so without these pages none of the program records are indexable.
Every page is generated; do not edit the output by hand. Run via `npm run build`.
"""
import html,json,re
from pathlib import Path
from build_mobility_routes import STATES,TERRITORIES
from site_parts import URGENT,RELAY,ABOUT_LINK,guides,prep_html,tel,icon,LANDING,lede
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
NAV=up('<nav aria-label="Main"><a href="./">Home</a><a href="mobility-rights.html">Find your next step</a><a href="local-help.html">Local help &amp; programs</a><a href="states/index.html" aria-current="page">All states</a><a href="world.html">Worldwide</a><a href="know-your-rights.html">Know your rights</a><a href="ramps-home-access.html">Ramps &amp; home access</a><a href="disability-advocacy.html">Advocacy</a><a href="mobility-independence.html">Repair &amp; adapt</a><a href="partner.html">Partner with us</a><a href="espanol.html" lang="es" hreflang="es">Español</a></nav>')
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
    return ('the ' if code in ('MP','VI','DC') else '')+name
# Short words for the search-result description, most-searched needs first.
SHORT={'benefits':'benefits','equipment':'equipment repair','ramps_home':'ramps','transportation':'rides','daily_living':'in-home help','housing':'housing','work_school':'jobs','rights_legal':'legal help','sensory':'vision and hearing','children':'kids','independent_living':'independent living centers','peer_support':'peer support','funding':'funding','navigation':'aging help','dd_board':'developmental disability agencies','crisis':'crisis lines'}
SHORT_ORDER=list(SHORT)
def fit_desc(lead,items,limit=158):
    """Search results show about 155 characters, so end on a whole item instead of cutting a word."""
    join=lambda xs:xs[0] if len(xs)==1 else ', '.join(xs[:-1])+' and '+xs[-1]
    for k in range(len(items),0,-1):
        d=lead+(join(items) if k==len(items) else ', '.join(items[:k])+' and more')+'.'
        if len(d)<=limit:return d
    return lead.rstrip(', :')+'.'
# ---- The opening of each state page, written for the person who lands there (owner direction, November 23, 2026) ----
# Everything in it comes from that state's own listings: the county-level help it has, programs only that state lists,
# and the offices to call first. No counts of listings are shown.
NDRN={a[0]:a[1] for a in json.loads((ROOT/'data/ndrn-protection-advocacy.json').read_text())['agencies']}
PATTERN=lambda i:re.sub(r'^[a-z]{2}-','XX-',i)
FAMILY_COUNT={}
for _r in DATA['records']:
    if _r['scope']=='statewide' and _r['state']!='US':FAMILY_COUNT[PATTERN(_r['id'])]=FAMILY_COUNT.get(PATTERN(_r['id']),0)+1
# Local help, in the words a visitor would use
COUNTY_WORDS={'dd_board':'developmental disability boards','navigation':'aging and disability offices','independent_living':'independent living centers',
  'ramps_home':'ramp and home repair programs','equipment':'equipment loan and repair programs','transportation':'ride services','peer_support':'peer support groups',
  'children':'help for families and children','daily_living':'in-home help','housing':'housing help','work_school':'job programs','benefits':'benefits help',
  'rights_legal':'legal help','funding':'funding programs','sensory':'vision and hearing programs','crisis':'crisis and mental health services'}
# Families listed in many states, or named elsewhere on the page, are not what makes a state's list its own
COMMON=re.compile(r'ucedd|ndrn|protection-advocacy|parent-center|usda|silc|ada-center|talking-book|icanconnect|nls|older-blind|cil-|adrc|tbi|dd-council|mental-health|aps|ombudsman|phone-equipment|tedp|f2f|medicaid-agency|vr-agency|early-intervention|placard|housing-finance|housing-search|liheap|5310|5311|nemt|deaf-hard-of-hearing-agency|disability-rights|legal-aid')
PICK_ORDER=['ramps_home','equipment','transportation','funding','navigation','dd_board','housing','daily_living','work_school','independent_living','sensory','benefits','peer_support']
def short_name(r):
    n=re.sub(r'\s*\((statewide|[^)]*\d[^)]*)\)\s*$','',r['name']).strip()
    head=n.split(': ')[0]
    return head if ': ' in n and len(head.split())>=2 else n
TERR_OWN=re.compile(r'-(at-program|talking-book|cil-(?!directory)|adrc|dd-council)')
def own_programs(wide,k=3,terr=False):
    """Up to k programs that only this state's list carries, one per kind of help where possible. A territory's list is
    mostly the same kinds of agency every state has, so there it names the territory's own agencies of those kinds."""
    if terr:
        c=[r for r in wide if TERR_OWN.search(r['id'])]
        c=[r for r in c if ',' not in short_name(r)]
        return sorted(c,key=lambda r:(['at-program','talking-book','cil-','adrc','dd-council'].index(next(x for x in ['at-program','talking-book','cil-','adrc','dd-council'] if x in r['id'])),r['id']))[:k]
    c=[r for r in wide if r['category'] in PICK_ORDER and FAMILY_COUNT.get(PATTERN(r['id']),0)<=3 and not COMMON.search(r['id'])]
    c=[r for r in c if ',' not in short_name(r) and not re.match(r'(Find|How|Apply|Disability independence)\b',short_name(r))]
    c.sort(key=lambda r:(PICK_ORDER.index(r['category']),STATUS_RANK.get(r.get('record_status'),9),len(short_name(r))))
    out=[];used=set()
    for r in c:
        if r['category'] in used:continue
        out.append(r);used.add(r['category'])
        if len(out)==k:break
    return out
def join_plain(xs):return xs[0] if len(xs)==1 else ', '.join(xs[:-1])+' and '+xs[-1]
def join_and(xs):
    if len(xs)==1:return xs[0]
    # names that hold their own "and" are kept apart with semicolons, so the list still reads as separate programs
    if any(' and ' in x for x in xs):return '; '.join(xs[:-1])+'; and '+xs[-1]
    return ', '.join(xs[:-1])+' and '+xs[-1]
def first_org(r):return re.split(r'\s*;\s*',r.get('org') or r['name'])[0]
def pa_record(code,wide):
    for r in wide:
        if r['category']!='rights_legal':continue
        if r['id'] in ('pa-ndrn-'+code.lower(),code.lower()+'-protection-advocacy') or (code in NDRN and r['name'].startswith(NDRN[code])):return r
    return None
def first_calls(code,wide):
    """The offices to call first when you are not sure where to start, each from this state's own listings."""
    by=lambda i:next((r for r in wide if r['id']==i),None)
    pa=pa_record(code,wide);lc=code.lower()
    rows=[('Disability rights problems','rights_legal',pa,NDRN.get(code) if pa and code in NDRN else (pa and pa['name'])),
          ('Help getting or keeping a job','work_school',by(lc+'-vr-agency'),None),
          ('Medicaid and help at home','benefits',by(lc+'-medicaid-agency'),None),
          ('Early intervention for a baby or toddler','children',by(lc+'-early-intervention'),None)]
    out=[]
    for label,anchor,r,shown in rows:
        if not r:continue
        nm=shown or (first_org(r) if anchor in ('children','benefits') else r['name'])
        call=f' · <a href="{E(tel(r["phone"]))}">Call {E(r["phone"])}</a>' if r.get('phone') and tel(r['phone']) else ''
        out.append((label,anchor,nm,call))
    return out
def state_lede(code,name,place,wide,local):
    q=f'Living with a disability in {place}, or helping someone who is?'
    cats=sorted({r['category'] for r in local},key=lambda k:(-sum(1 for r in local if r['category']==k),k))
    whole='the whole territory' if code in TERRITORIES else ('the whole district' if code=='DC' else 'the whole state')
    if local:
        s2=f'Besides the agencies that serve {whole}, this page lists local {join_plain([COUNTY_WORDS[k] for k in cats[:3] if k in COUNTY_WORDS])} by county or region.'
    elif code in TERRITORIES:
        s2=f'These are the main public agencies that serve all of {place}.'
    else:
        s2=f'Every program listed here serves {whole}, so start with the group that matches what you need.'
    own=own_programs(wide,k=2 if code in TERRITORIES else 3,terr=code in TERRITORIES)
    s3=f' Programs listed for {place} include {join_and([short_name(r) for r in own])}.' if own else ''
    pc=next((r for r in wide if r['id']==code.lower()+'-parent-center'),None)
    if code in TERRITORIES and pc and 'Hawaii' in (pc.get('org') or ''):
        s3+=f' Help for families of children with disabilities comes from {short_name(pc)}, which also serves {place}.'
    if code=='WA':s3+=' Light Upon Light, a disability-inclusion nonprofit in Everett, is featured here too.'
    return f'{q} {s2}{s3}'
def state_page(code,name,recs,national):
    terr=code in TERRITORIES;place=the(code,name)
    mine=[r for r in recs if r['state']==code and r['category']!='veterans']
    wide=[r for r in mine if r['scope']=='statewide'];local=[r for r in mine if r['scope']=='counties']
    have={r['category'] for r in mine}
    pa=pa_record(code,wide);pa_name=NDRN.get(code) if pa and code in NDRN else None
    desc=fit_desc(f'Disability help in {place}, with phone numbers: ',([pa_name] if pa_name else [])+[SHORT[k] for k in SHORT_ORDER if k in have])
    p=slug(name);path=f'states/{p}.html'
    secs=[];counts=[]
    for k in ORDER:
        w=sorted([r for r in wide if r['category']==k],key=sort_key);l=sorted([r for r in local if r['category']==k],key=sort_key)
        if not (w or l):continue
        g=GUIDES['guides'].get(k) or {}
        s=f'<section id="{k.replace("_","-")}"><h2 class="cat-h">{icon(k,"hic")}{E(CATS[k])}</h2>'+(f'<p class="lead">{E(g["blurb"])}</p>' if g.get('blurb') else '')+prep_html(g,3)
        if w:s+='<div class="grid">'+''.join(card(r) for r in w)+'</div>'
        if l:
            s+=f'<h3>County and regional programs</h3><ul class="statelist">'+''.join(local_li(r) for r in l)+'</ul>'
        if k=='sensory':s+='<p class="meta">National services and every state’s programs: <a href="../blind-low-vision.html">Blind and low vision resources</a> · <a href="../deaf-hard-of-hearing.html">Deaf and hard of hearing resources</a> · <a href="../service-animals.html">Service animals: your rights and where to get a trained dog</a></p>'
        if k=='daily_living':s+='<p class="meta">Caring for a family member or a veteran? Respite, VA caregiver programs and paid family care: <a href="../caregiver-respite.html">Caregiver and respite help</a> · Medicaid self-directed care, the VA stipend, leave and taxes: <a href="../paid-family-caregiver.html">Getting paid to care for a family member</a></p>'
        # national how-to guides for the same need (added November 27, 2026)
        if k=='equipment':s+='<p class="meta">Borrow or reuse equipment, and what Medicare, Medicaid and the VA pay, including repairs: <a href="../free-medical-equipment.html">Free and low-cost wheelchairs and equipment</a></p>'
        if k=='transportation':s+='<p class="meta">Who helps pay for a wheelchair van, hand controls or a lift: <a href="../accessible-vehicles.html">Help paying for an accessible vehicle</a></p>'
        if k in ('ramps_home','funding'):s+='<p class="meta">Current limits for VA home grants, USDA repair loans and grants, Medicaid waivers and the tax rules: <a href="../home-modifications.html">Help paying for home modifications</a></p>'
        if k=='benefits':s+='<p class="meta">Applying for SSDI or SSI, step by step, and appealing a denial: <a href="../social-security-disability.html">How to apply for Social Security disability</a></p>'
        if k=='rights_legal':s+='<p class="meta">Service animal rights in public places, housing and air travel, and where to get a trained dog: <a href="../service-animals.html">Service animals and your rights</a></p>'
        secs.append(s+'</section>')
        counts.append(k)
        SHOWN.add(k)
    # Jump tiles: one per group on this page, with its icon and name (listing counts are not shown: owner rule, November 23, 2026)
    toc=''.join(f'<a href="#{k.replace("_","-")}">{icon(k,"tic")}<span class="tl">{E(CATS[k])}</span></a>' for k in counts)
    nat=''.join(f'<li><strong>{E(r["name"])}</strong> · '+' · '.join(contact(r,True))+'</li>' for r in national if r.get('phone'))
    extra=LUUL.replace('ALSO FEATURED &middot; WASHINGTON','FEATURED IN WASHINGTON',1) if code=='WA' else ''
    gcode=code.lower()
    # Ohio is the guide's home page; there is no oh.html.
    guide_page='?state=OH' if code=='OH' else f'{gcode}.html'
    urgent='<div class="side-help">'+up(URGENT).replace('local-help.html?category=crisis',f'local-help.html?state={code}&amp;category=crisis')+'</div>'
    fc=first_calls(code,wide)
    calls=(f'<h2 id="first-h">Not sure where to start in {E(place)}?</h2><ul class="statelist firstcalls">'
           +''.join(f'<li><strong>{E(label)}:</strong> {E(nm)}{call} · <a href="#{anchor.replace("_","-")}">{E(CATS[anchor])}</a></li>' for label,anchor,nm,call in fc)+'</ul>') if fc else ''
    if terr:
        actions=(f'<div class="actions"><a class="button" href="../local-help.html?state={code}">Filter by need</a><a class="button secondary" href="../handout.html?state={code}">Print a help list</a><a class="button secondary" href="../know-your-rights.html">Know your rights</a></div>'
          f'<p class="meta">This list covers the main public agencies for {E(place)}; fewer community programs are listed than for the states. The federal <a href="https://dial.acl.gov/home" rel="noopener" target="_blank">DIAL database (new tab)</a> lists the Centers for Independent Living, assistive technology program, developmental disabilities council and Protection and Advocacy agency in each territory.</p>')
        everywhere=f'<section class="panel"><h2>National lines</h2><p>These lines serve the whole country. Ask each one whether it serves {E(place)}.</p><ul class="statelist">{nat}</ul>'+CARE+'</section>'
    else:
        actions=(f'<div class="actions"><a class="button" href="../local-help.html?state={code}">Filter by county or need</a><a class="button secondary" href="../handout.html?state={code}">Print a help list</a><a class="button secondary" href="../mobility-rights.html?state={code}">Find your next step</a><a class="button secondary" href="../know-your-rights.html">Know your rights</a><a class="button secondary" href="../disability-advocacy.html?state={code}">Advocacy letters</a></div>'
          f'<p class="meta">Looking for nursing-home, aging or veterans benefits help in {E(name)}? Use the <a href="https://guide.vethomeguard.org/{guide_page}">Veteran Resource Guide for {E(name)}</a>.</p>')
        everywhere=f'<section class="panel"><h2>Available in every state</h2><p>These national lines help wherever you live, including {E(name)}.</p><ul class="statelist">{nat}</ul>'+CARE+'</section>'
    lede=state_lede(code,name,place,wide,local)
    body=(f'<header>{NAV}<small>{E(name.upper())} · ALL AGES · ALL DISABILITIES</small><h1>Disability and mobility resources in {E(place)}</h1><p class="lede">{E(lede)}</p></header>\n'
      f'<main id="main"><nav class="toc tiles" aria-label="What do you need? Jump to a group of programs">{toc}</nav>'
      +(f'<section class="panel" aria-labelledby="first-h">' if calls else '<section class="panel">')+f'{calls}{actions}{RELAY}</section>'
      +''.join(secs)+everywhere
      +(extra and '<!--luul-->'+up(extra)+'<!--/luul-->')+'<!--mif-->'+MIF+'<!--/mif-->'
      +f'<section><p>Missing a program or see something out of date? <a href="mailto:travis@vethomeguard.org?subject={E("Correction: "+name)}">Tell us</a> and it will be checked against the program’s own page.</p></section>{urgent}</main>{FOOT}</body></html>')
    n=len(mine)
    return path,head(f'Disability and mobility resources in {place}',desc,path)+body,n
SHOWN=set()  # groups that appear on at least one state or territory page, for the key on the states index
CARE='<p class="meta" id="caregiver-link">Caring for a family member or a veteran? <a href="../caregiver-respite.html">Caregiver and respite help</a>: finding a break, VA caregiver programs, Medicaid home care and paid family care. <a href="../paid-family-caregiver.html">Getting paid to care for a family member</a>: Medicaid, the VA stipend, leave and taxes.</p>'
def tile_map():
    """The home page's clickable grid of state squares, pointed at the state pages (one source: index.html)."""
    m=re.search(r'<div class="tilemap"[^>]*>.*?</div>',(ROOT/'index.html').read_text(),re.S)
    if not m:return ''
    names={**STATES,**TERRITORIES}
    return re.sub(r'href="local-help\.html\?state=([A-Z]{2})"',lambda x:f'href="{slug(names[x.group(1)])}.html"',m.group(0)).replace(': programs and resources"',': state page"')
def group_key():
    """Visual key (November 25, 2026): the groups a state page sorts its programs into, each with the icon it carries
    on the state pages' jump tiles and headings. Icons are decorative; the group names are the text."""
    ks=[k for k in ORDER if k in SHOWN]
    if not ks:return ''
    lis=''.join(f'<li>{icon(k,"tic")}<span>{E(CATS[k])}</span></li>' for k in ks)
    return ('<section aria-labelledby="groups-h"><h2 id="groups-h">What a state page lists</h2>'
            '<p>Each state page sorts its programs into groups by what you need, and marks each group with the same icon as here. '
            'A page shows only the groups that have programs listed for that state or territory.</p>'
            f'<ul class="groupkey" role="list">{lis}</ul></section>')
def index_page(rows,trows):
    L=LANDING['states/index.html']
    li=lambda rs:''.join(f'<li><a href="{slug(nm)}.html">{E(nm)}</a></li>' for code,nm,n in rs)
    desc='Disability and mobility programs in every U.S. state, D.C. and the territories, with phone numbers: benefits, equipment, ramps, rides and legal help.'
    tm=tile_map()
    mapsec=(f'<section aria-labelledby="map-h"><h2 id="map-h">Choose your state on the map</h2><div class="home-map">{tm}</div></section>' if tm else '')
    return head('Disability and mobility resources by state',desc,'states/')+(f'<header>{NAV}<small>ALL STATES · ALL AGES · ALL DISABILITIES</small><h1>Disability and mobility resources by state</h1>{up(lede(L["intro"],L.get("actions",[])))}</header>'
      f'<main id="main">{mapsec}<section aria-labelledby="st-h"><h2 id="st-h">States and D.C.</h2><ul class="statelist cols" id="state-list">{li(rows)}</ul></section>'
      f'<section aria-labelledby="terr-h"><h2 id="terr-h">U.S. territories</h2><p>Each territory lists its main public disability agencies, plus national lines. Fewer community programs are listed than for the states.</p><ul class="statelist cols" id="territory-list">{li(trows)}</ul></section>{group_key()}<!--mif-->{MIF}<!--/mif-->'
      f'<div class="side-help">{up(URGENT)}</div></main>{FOOT}</body></html>')
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
