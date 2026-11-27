#!/usr/bin/env python3
"""Add canonical and social tags and the visit counter to every page, and write sitemap.xml and robots.txt. Idempotent."""
import html,json,re
from pathlib import Path
from site_parts import URGENT,icon,LANDING,lede,iam,sprite
import ads as ADS
from build_topic_guides import translations
ROOT=Path(__file__).resolve().parents[1]
BASE='https://mobilitytalk.org/'
PAGES=['index.html','mobility-rights.html','local-help.html','know-your-rights.html','ramps-home-access.html','disability-advocacy.html','mobility-independence.html','partner.html','handout.html','about.html','espanol.html','blind-low-vision.html','deaf-hard-of-hearing.html','service-animals.html','caregiver-respite.html','accessible-vehicles.html','free-medical-equipment.html','social-security-disability.html','accessible-travel.html','paid-family-caregiver.html','home-modifications.html','disability-housing.html','disability-jobs.html','disability-parking.html','vehiculos-adaptados.html','equipo-medico-gratis.html','incapacidad-seguro-social.html','cuidador-familiar-pagado.html','modificaciones-hogar.html','vivienda-discapacidad.html','empleo-discapacidad.html','estacionamiento-discapacidad.html','privacy.html','auction.html','world.html']
ABOUT=' · <a href="about.html">About, sources and accessibility</a>'
MIF=(ROOT/'templates/partials/featured-mif.html').read_text().strip()
LUUL=(ROOT/'templates/partials/featured-luul.html').read_text().strip()
# pages that also carry the Light Upon Light block; on local-help it only shows when Washington is selected
# page -> (placement, shown only for Washington). 'after-mif' sits below the MIF block; 'before-mif' puts it first;
# a string anchor inserts it directly before that text. State-driven blocks lead with Light Upon Light when WA is chosen.
LUUL_PAGES={'index.html':('after-mif',False),'local-help.html':('before-mif',True),'mobility-rights.html':('<section id="route-result"',True),'disability-advocacy.html':('<section id="compose" class="compose"',True)}
LUUL_SCRIPT_PAGES={'mobility-rights.html','disability-advocacy.html'}
# page -> text the featured organization block is inserted before
MIF_BEFORE={'index.html':'<section class="panel" id="partner-invite">','local-help.html':'<section class="panel" id="locators">','ramps-home-access.html':'<section><p>Need a ramp or repair','mobility-rights.html':'<footer>','mobility-independence.html':'<footer>','blind-low-vision.html':'<section><p>Missing a program','deaf-hard-of-hearing.html':'<section><p>Missing a program','service-animals.html':'<section><p>Missing a program','caregiver-respite.html':'<section><p>Missing a program','accessible-vehicles.html':'<section><p>Missing a program','free-medical-equipment.html':'<section><p>Missing a program','social-security-disability.html':'<section><p>Missing a program','accessible-travel.html':'<section><p>Missing a program','paid-family-caregiver.html':'<section><p>Missing a program','home-modifications.html':'<section><p>Missing a program','disability-housing.html':'<section><p>Missing a program','disability-jobs.html':'<section><p>Missing a program','disability-parking.html':'<section><p>Missing a program',
           'vehiculos-adaptados.html':'<section><p>¿Falta un programa','equipo-medico-gratis.html':'<section><p>¿Falta un programa','incapacidad-seguro-social.html':'<section><p>¿Falta un programa',
           'cuidador-familiar-pagado.html':'<section><p>¿Falta un programa','modificaciones-hogar.html':'<section><p>¿Falta un programa',
           'vivienda-discapacidad.html':'<section><p>¿Falta un programa','empleo-discapacidad.html':'<section><p>¿Falta un programa',
           'estacionamiento-discapacidad.html':'<section><p>¿Falta un programa'}
# Spanish pages (November 27, 2026): the Spanish help page and the Spanish versions of eight guides. English guide -> its
# Spanish version, for the hreflang alternates both ways; the Spanish pages keep their own menu, a Spanish privacy link,
# and the English featured block marked as English; the English sister-guides line is left off them, as on espanol.html.
TRANSLATIONS=translations()
ES_PAGES={'espanol.html',*TRANSLATIONS.values()}
ALTERNATES={**{en:(en,es) for en,es in TRANSLATIONS.items()},**{es:(en,es) for en,es in TRANSLATIONS.items()}}
MAKER='Created and maintained by <a href="https://travisvought.com/">Travis Vought</a>.'
WORLD=json.loads((ROOT/'data/world.json').read_text())
ORG={'@context':'https://schema.org','@type':'Organization','@id':BASE+'#org','name':'Mobility Talk','url':BASE,'logo':BASE+'assets/social-card.png','email':'travis@vethomeguard.org','founder':{'@type':'Person','name':'Travis Vought','url':'https://travisvought.com/'},'areaServed':['US']+[c['code'] for c in WORLD['countries']],'description':'A free, source-linked guide to disability and mobility resources, rights and advocacy: every U.S. state, plus a growing list of other countries.'}
NAVBTN='<button type="button" class="navtoggle" aria-expanded="false" aria-controls="site-nav">Menu</button>'
def unnav(t):
    """Take out the phone menu button and its scripts so the page can be rebuilt; finalize adds them back last."""
    t=re.sub(r'<!--navjs-->.*?<!--/navjs-->','',t,flags=re.S).replace(NAVBTN,'')
    return t.replace('<nav id="site-nav" aria-label="Main">','<nav aria-label="Main">')
NEED_ICON={'know-your-rights.html':'rights_legal','states/index.html':'map_pin','espanol.html':'language'}
def needgrid_icons(ul):
    ul=re.sub(r'<svg class="ic".*?</svg>','',ul,flags=re.S)
    def one(m):
        href=html.unescape(m.group(2));cat=re.search(r'category=([a-z_]+)',href)
        k=cat.group(1) if cat else NEED_ICON.get(href.split('?')[0])
        assert k and icon(k),'home need grid link has no icon: '+href
        return m.group(1)+icon(k)
    return re.sub(r'(<li><a [^>]*href="([^"]+)"[^>]*>)',one,ul)
def clean(s):return html.unescape(re.sub(r'\s+',' ',s)).strip()
for name in PAGES:
    p=ROOT/name;t=unnav(p.read_text())
    t=re.sub(r'<!--seo-->.*?<!--/seo-->','',t,flags=re.S)
    t=re.sub(r'<link rel="canonical"[^>]*>','',t);t=re.sub(r'<meta property="og:[^>]*>','',t)
    t=re.sub(r'<!--mif-->.*?<!--/mif-->','',t,flags=re.S);t=re.sub(r'<!--luul-->.*?<!--/luul-->','',t,flags=re.S);t=re.sub(r'<!--luulj-->.*?<!--/luulj-->','',t,flags=re.S)
    # Landing copy (data/landing.json): the page's title, description and heading where given, and the opening it speaks
    # to its visitor with, so each page reads as written for the person most likely to arrive on it (November 23, 2026).
    L=LANDING.get(name)
    if L:
        if L.get('title'):t=re.sub(r'<title>.*?</title>',lambda m:'<title>'+html.escape(L['title'],quote=False)+'</title>',t,count=1,flags=re.S)
        if L.get('description'):t=re.sub(r'<meta name="description" content="[^"]*">',lambda m:'<meta name="description" content="'+html.escape(L['description'],quote=True)+'">',t,count=1)
        if L.get('h1'):t=re.sub(r'(<h1[^>]*>).*?(</h1>)',lambda m:m.group(1)+L['h1']+m.group(2),t,count=1,flags=re.S)
        assert t.count('<!--lede-->')==1,name+' needs one <!--lede--> block for its landing copy'
        t=re.sub(r'<!--lede-->.*?<!--/lede-->',lambda m:lede(L['intro'],L.get('actions',[]),plain='assets/site.css' not in t and name!='index.html'),t,count=1,flags=re.S)
        if L.get('iam'):
            assert t.count('<!--iam-->')==1,name+' needs one <!--iam--> block'
            t=re.sub(r'<!--iam-->.*?<!--/iam-->',lambda m:iam(L['iam']),t,count=1,flags=re.S)
    place,wa_only=LUUL_PAGES.get(name,(None,False))
    blk=''
    if place:
        blk=LUUL
        if wa_only:
            blk=blk.replace('<section class="featured-org featured-org--also"','<section id="featured-state-wa" hidden class="featured-org featured-org--also featured-org--wa"',1).replace('ALSO FEATURED &middot; WASHINGTON','FEATURED IN WASHINGTON',1)
        blk='<!--luul-->'+blk+'<!--/luul-->'
    if name in MIF_BEFORE:
        assert MIF_BEFORE[name] in t,name
        mif='<!--mif-->'+(MIF.replace('<section class="featured-org"','<section class="featured-org" lang="en"',1) if name in ES_PAGES else MIF)+'<!--/mif-->'
        t=t.replace(MIF_BEFORE[name],(blk if place=='before-mif' else '')+mif+(blk if place=='after-mif' else '')+MIF_BEFORE[name],1)
    if place and place not in ('before-mif','after-mif'):
        assert place in t,(name,place)
        t=t.replace(place,blk+place,1)
    if name in LUUL_SCRIPT_PAGES:
        t=t.replace('</body>','<!--luulj--><script src="assets/featured-wa.js" defer></script><!--/luulj--></body>',1)
    # the home page is written by hand; its urgent strip is always the shared one, so the wording cannot drift
    if name=='index.html':
        assert t.count('<aside class="urgent"')==1,name
        t=re.sub(r'<aside class="urgent".*?</aside>',lambda m:URGENT,t,count=1,flags=re.S)
        # each need on the home grid gets the same small icon its group carries on the state pages
        t=re.sub(r'<ul class="needgrid" id="needgrid">.*?</ul>',lambda m:needgrid_icons(m.group(0)),t,count=1,flags=re.S)
    if name in ('index.html','mobility-independence.html') and 'assets/site.css' not in t:
        t=t.replace('</head>','<link rel="stylesheet" href="assets/site.css"></head>',1)
    t=re.sub(r'<a href="states/index\.html"[^>]*>All states</a>','',t)
    t=re.sub(r'(<a href="local-help\.html"[^>]*>Local help &amp; programs</a>)',lambda m:m.group(1)+'<a href="states/index.html">All states</a>',t,count=1)
    # every main menu offers the worldwide page, right after All states (owner direction, November 19, 2026)
    t=re.sub(r'<a href="world\.html"[^>]*>Worldwide</a>','',t)
    t=re.sub(r'(<a href="states/index\.html"[^>]*>All states</a>)',lambda m:m.group(1)+'<a href="world.html">Worldwide</a>',t,count=1)
    t=re.sub(r'<a href="partner\.html"[^>]*>Partner with us</a>','',t)
    t=re.sub(r'(<nav aria-label="(?:Main|Back)">.*?)(</nav>)',lambda m:m.group(1)+'<a href="partner.html">Partner with us</a>'+m.group(2),t,count=1,flags=re.S)
    # every English page offers the Spanish help page, last in the main navigation
    t=re.sub(r'<a href="espanol\.html"[^>]*>Español</a>','',t)
    t=re.sub(r'(<nav aria-label="(?:Main|Back)">.*?)(</nav>)',lambda m:m.group(1)+'<a href="espanol.html" lang="es" hreflang="es">Español</a>'+m.group(2),t,count=1,flags=re.S)
    # every page footer links to the about, sources and accessibility page (once)
    if name!='about.html' and 'href="about.html"' not in t:
        t=re.sub(r'(<footer[^>]*>.*?)(</p>)',lambda m:m.group(1)+ABOUT+m.group(2),t,count=1,flags=re.S)
    title=clean(re.search(r'<title>(.*?)</title>',t,re.S).group(1));desc=clean(re.search(r'<meta name="description" content="([^"]*)"',t).group(1))
    url=BASE if name=='index.html' else BASE+name
    e=lambda s:html.escape(s,quote=True)
    block=f'<!--seo--><link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Mobility Talk"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{url}"><meta property="og:image" content="{BASE}assets/social-card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Mobility Talk: mobility and disability resources, every state"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#183449"><!--/seo-->'
    if name in ALTERNATES:
        # the page in each language, and English as the default for everyone else
        en,es=ALTERNATES[name]
        alt=(f'<link rel="alternate" hreflang="en" href="{BASE}{en}"><link rel="alternate" hreflang="es" href="{BASE}{es}">'
             f'<link rel="alternate" hreflang="x-default" href="{BASE}{en}">')
        if name in ES_PAGES:alt+='<meta property="og:locale" content="es_US"><meta property="og:locale:alternate" content="en_US">'
        block=block.replace('<!--/seo-->',alt+'<!--/seo-->',1)
    t=re.sub(r"(<nav aria-label=\"Main\">.*?</nav>)",lambda m:re.sub(r"<a href=\"%s\">"%re.escape(name),"<a href=\"%s\" aria-current=\"page\">"%name,m.group(1)),t,count=1,flags=re.S)
    # structured data: the site and its maker on the home page, a breadcrumb trail everywhere else
    t=re.sub(r'<!--ld-->.*?<!--/ld-->','',t,flags=re.S)
    if name=='index.html':ld=[{'@context':'https://schema.org','@type':'WebSite','@id':BASE+'#website','name':'Mobility Talk','url':BASE,'inLanguage':'en','description':desc,'publisher':{'@id':BASE+'#org'}},ORG]
    else:ld={'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Mobility Talk','item':BASE},{'@type':'ListItem','position':2,'name':title.split(' | ')[0].split(': ')[0],'item':url}]}
    block+='<!--ld--><script type="application/ld+json">'+json.dumps(ld,ensure_ascii=False).replace('<','\\u003c')+'</script><!--/ld-->'
    # the maker's name links to his own site, which lists his other projects
    t=t.replace('Created and maintained by Travis Vought.',MAKER,1)
    t=t.replace("</head>",block+"</head>",1);p.write_text(t)
STATE_PAGES=sorted(f'states/{q.name}' for q in (ROOT/'states').glob('*.html') if q.name!='index.html')
COUNTRY_PAGES=sorted(f'countries/{q.name}' for q in (ROOT/'countries').glob('*.html'))
ALL=PAGES+['states/index.html']+STATE_PAGES+COUNTRY_PAGES
SUB=('states/','countries/')
# Visit counts: every page reports to the shared GoatCounter dashboard under /mobilitytalk.org/... paths,
# so this site never mixes with the others there. No cookies; query strings are dropped.
COUNTER=('<!--gc--><script>window.goatcounter={path:function(){return "/mobilitytalk.org"+location.pathname},'
         'referrer:function(){try{var u=new URL(document.referrer);return u.origin+u.pathname}catch(e){return ""}}};</script>'
         '<script data-goatcounter="https://vhg-guide.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script><!--/gc-->')
# Site icon for browser tabs, bookmarks and search results (the 404 page uses root paths; it is served at any depth).
def icon(pre):return f'<!--icon--><link rel="icon" href="{pre}favicon.svg" type="image/svg+xml"><link rel="icon" href="{pre}favicon.ico" sizes="48x48"><link rel="apple-touch-icon" href="{pre}apple-touch-icon.png"><!--/icon-->'
AD_LIST=ADS.load();AD_CLIENT=ADS.load_client()
RELATED=('<!--related--><p class="related">More free guides: '
         '<a href="https://guide.vethomeguard.org/">Veteran Resource Guide</a> (veterans and their families) · '
         '<a href="https://www.yogamomtalk.com/">Yoga Mom Talk</a> (help for moms and families) · '
         '<a href="https://ninas-map.com/">Nina\'s Map</a> (Native and Indigenous communities)</p><!--/related-->')
for name in ALL+['404.html']:
    p=ROOT/name;t=re.sub(r'<!--gc-->.*?<!--/gc-->','',p.read_text(),flags=re.S)
    t=re.sub(r'<!--icon-->.*?<!--/icon-->','',t,flags=re.S)
    # Phones: the main menu folds behind a Menu button, with Español left showing. The class is set in the head so the
    # page does not jump; without JavaScript, or on pages without the shared stylesheet, the full menu shows as before.
    t=unnav(t)
    if 'assets/site.css' in t and '<nav aria-label="Main">' in t:
        pre='../' if name.startswith(SUB) else ''
        t=t.replace('<nav aria-label="Main">','<nav id="site-nav" aria-label="Main">'+NAVBTN,1)
        t=t.replace('</head>','<!--navjs--><script>document.documentElement.classList.add("navjs")</script><!--/navjs--></head>',1)
        t=t.replace('</body>','<!--navjs--><script src="'+pre+'assets/nav.js" defer></script><!--/navjs--></body>',1)
    # every page footer links to the privacy page, at the end of its first line (once)
    pre='/' if name=='404.html' else ('../' if name.startswith(SUB) else '')
    t=re.sub(r' · <a class="privacy-link"[^>]*>[^<]*</a>','',t)
    link=(f' · <a class="privacy-link" href="{pre}privacy.html" hreflang="en">Privacidad (en inglés)</a>' if name in ES_PAGES
          else f' · <a class="privacy-link" href="{pre}privacy.html">Privacy</a>')
    t,n=re.subn(r'(<footer[^>]*>\s*<p>.*?)(</p>)',lambda m:m.group(1)+link+m.group(2),t,count=1,flags=re.S)
    assert n==1,name+' has no footer line for the privacy link'
    # sister guides for the same visitors: veterans, moms and families, Native communities (owner direction, November 26, 2026)
    t=re.sub(r'<!--related-->.*?<!--/related-->','',t,flags=re.S)
    if name not in ES_PAGES and not name.startswith('lite/'):
        t=t.replace('</footer>',RELATED+'</footer>',1)
    # advertising: only where data/ads.json has an active ad for this page's slot; otherwise nothing is written
    t=ADS.apply(t,name,AD_LIST,AD_CLIENT)
    assert t.count('</head>')==1,name
    p.write_text(t.replace('</head>',icon(pre)+COUNTER+'</head>',1))
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'<url><loc>{BASE if n=="index.html" else (BASE+'states/' if n=='states/index.html' else BASE+n)}</loc></url>\n' for n in ALL)+'</urlset>\n')
# ads.txt names the AdSense publisher, or is removed when there is none
if AD_CLIENT:(ROOT/'ads.txt').write_text(ADS.ads_txt(AD_CLIENT))
else:(ROOT/'ads.txt').unlink(missing_ok=True)
# the shared icon file that the guide and country pages point to (assets/icons.svg), from the same drawings as the inline icons
(ROOT/'assets/icons.svg').write_text(sprite())
(ROOT/'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n')
print('Finalized',len(PAGES),'pages,',len(STATE_PAGES),'state pages,',len(COUNTRY_PAGES),'country pages, sitemap.xml and robots.txt.')
