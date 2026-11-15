#!/usr/bin/env python3
"""Add canonical and social tags to every page, and write sitemap.xml and robots.txt. Idempotent."""
import html,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE='https://mobilitytalk.org/'
PAGES=['index.html','mobility-rights.html','local-help.html','ramps-home-access.html','disability-advocacy.html','mobility-independence.html']
def clean(s):return html.unescape(re.sub(r'\s+',' ',s)).strip()
for name in PAGES:
    p=ROOT/name;t=p.read_text()
    t=re.sub(r'<!--seo-->.*?<!--/seo-->','',t,flags=re.S)
    t=re.sub(r'<link rel="canonical"[^>]*>','',t);t=re.sub(r'<meta property="og:[^>]*>','',t)
    title=clean(re.search(r'<title>(.*?)</title>',t,re.S).group(1));desc=clean(re.search(r'<meta name="description" content="([^"]*)"',t).group(1))
    url=BASE if name=='index.html' else BASE+name
    e=lambda s:html.escape(s,quote=True)
    block=f'<!--seo--><link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Mobility Talk"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{url}"><meta name="twitter:card" content="summary"><meta name="theme-color" content="#183449"><!--/seo-->'
    t=t.replace('</head>',block+'</head>',1);p.write_text(t)
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'<url><loc>{BASE if n=="index.html" else BASE+n}</loc></url>\n' for n in PAGES)+'</urlset>\n')
(ROOT/'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n')
print('Finalized',len(PAGES),'pages, sitemap.xml and robots.txt.')
