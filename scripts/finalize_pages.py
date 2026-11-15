#!/usr/bin/env python3
"""Add canonical and social tags to every page, and write sitemap.xml and robots.txt. Idempotent."""
import html,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE='https://mobilitytalk.org/'
PAGES=['index.html','mobility-rights.html','local-help.html','ramps-home-access.html','disability-advocacy.html','mobility-independence.html']
MIF=(ROOT/'templates/partials/featured-mif.html').read_text().strip()
LUUL=(ROOT/'templates/partials/featured-luul.html').read_text().strip()
# pages that also carry the Light Upon Light block; on local-help it only shows when Washington is selected
LUUL_PAGES={'index.html':False,'local-help.html':True}
# page -> text the featured organization block is inserted before
MIF_BEFORE={'index.html':'<section><h2>Ways to use this site</h2>','local-help.html':'<section class="panel" id="locators">','ramps-home-access.html':'<section class="panel"><h2>Before you spend anything','mobility-rights.html':'<footer>','mobility-independence.html':'<footer>'}
def clean(s):return html.unescape(re.sub(r'\s+',' ',s)).strip()
for name in PAGES:
    p=ROOT/name;t=p.read_text()
    t=re.sub(r'<!--seo-->.*?<!--/seo-->','',t,flags=re.S)
    t=re.sub(r'<link rel="canonical"[^>]*>','',t);t=re.sub(r'<meta property="og:[^>]*>','',t)
    t=re.sub(r'<!--mif-->.*?<!--/mif-->','',t,flags=re.S);t=re.sub(r'<!--luul-->.*?<!--/luul-->','',t,flags=re.S)
    if name in MIF_BEFORE:
        assert MIF_BEFORE[name] in t,name
        extra=''
        if name in LUUL_PAGES:
            blk=LUUL.replace('<section class="featured-org featured-org--also"','<section id="featured-state-wa" hidden class="featured-org featured-org--also"',1) if LUUL_PAGES[name] else LUUL
            extra='<!--luul-->'+blk+'<!--/luul-->'
        t=t.replace(MIF_BEFORE[name],'<!--mif-->'+MIF+'<!--/mif-->'+extra+MIF_BEFORE[name],1)
    if name in ('index.html','mobility-independence.html') and 'assets/site.css' not in t:
        t=t.replace('</head>','<link rel="stylesheet" href="assets/site.css"></head>',1)
    title=clean(re.search(r'<title>(.*?)</title>',t,re.S).group(1));desc=clean(re.search(r'<meta name="description" content="([^"]*)"',t).group(1))
    url=BASE if name=='index.html' else BASE+name
    e=lambda s:html.escape(s,quote=True)
    block=f'<!--seo--><link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Mobility Talk"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{url}"><meta name="twitter:card" content="summary"><meta name="theme-color" content="#183449"><!--/seo-->'
    t=re.sub(r"(<nav aria-label=\"Main\">.*?</nav>)",lambda m:re.sub(r"<a href=\"%s\">"%re.escape(name),"<a href=\"%s\" aria-current=\"page\">"%name,m.group(1)),t,count=1,flags=re.S)
    t=t.replace("</head>",block+"</head>",1);p.write_text(t)
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'<url><loc>{BASE if n=="index.html" else BASE+n}</loc></url>\n' for n in PAGES)+'</urlset>\n')
(ROOT/'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n')
print('Finalized',len(PAGES),'pages, sitemap.xml and robots.txt.')
