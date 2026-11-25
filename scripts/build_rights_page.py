#!/usr/bin/env python3
"""Build know-your-rights.html from data/know-your-rights.json and the directory records it names.

Phone numbers and links are pulled from data/local-programs.json at build time, so the page and the directory cannot drift apart.
Run via `npm run build` (from the scripts directory, like the other page builders).
"""
import html,json,re
from pathlib import Path
from site_parts import URGENT,SIDE_HELP,RELAY,ABOUT_LINK,tel,icon,ICON_PATHS
ROOT=Path(__file__).resolve().parents[1]
E=lambda s:html.escape(str(s),quote=True)
NAV='<nav aria-label="Main"><a href="./">Home</a><a href="mobility-rights.html">Find your next step</a><a href="local-help.html">Local help &amp; programs</a><a href="know-your-rights.html">Know your rights</a><a href="ramps-home-access.html">Ramps &amp; home access</a><a href="disability-advocacy.html">Advocacy</a><a href="mobility-independence.html">Repair &amp; adapt</a></nav>'
FOOT='<footer><p>Created and maintained by Travis Vought. <a href="mailto:travis@vethomeguard.org">Corrections</a> · <a href="./">Home</a> · '+ABOUT_LINK+'</p><p>This page gives general information from the published pages linked in each section, with the date they were checked. It is not legal advice, it does not decide whether a law covers your situation, and deadlines can change. Nothing you choose here is saved or sent.</p></footer>'
LINK_LABEL={'official':'Official page','gov':'Government page','directory':'Directory listing','news':'News article','rule':'Rule text','social':'Facebook page','source':'Source page'}
def link_for(r):
    w=r.get('web');u=r.get('url')
    if w and w.startswith('https://'):return w
    return u if u and u.startswith('https://') else None
def contact_li(r):
    bits=[]
    if r.get('phone') and tel(r['phone']):bits.append(f'<a href="{E(tel(r["phone"]))}">Call {E(r["phone"])}</a>')
    L=link_for(r)
    if L:bits.append(f'<a href="{E(L)}" rel="noopener" target="_blank">{LINK_LABEL.get(r.get("link_kind"),"Source page")} (new tab)</a>')
    if r.get('email'):bits.append(f'<a href="mailto:{E(r["email"])}">Email</a>')
    note=f' <span class="meta">{E(r["phone_note"])}</span>' if r.get('phone') and r.get('phone_note') else ''
    how=f' <span class="meta">{E(r["contact_how"])}</span>' if r.get('contact_how') else ''
    return f'<li><strong>{E(r["name"])}</strong><br>'+' · '.join(bits)+note+how+'</li>'
def outputs():
    data=json.loads((ROOT/'data/know-your-rights.json').read_text())
    recs={r['id']:r for r in json.loads((ROOT/'data/local-programs.json').read_text())['records']}
    ids=[r['id'] for r in data['rows']];assert len(ids)==len(set(ids)),'duplicate row id'
    rows=[]
    for row in data['rows']:
        rs=[]
        for i in row['records']:
            assert i in recs,f'{row["id"]}: no directory record {i}'
            rs.append(recs[i])
        assert row['title'] and row['plain'] and row['who'] and row['steps'],row['id']
        for m in row.get('more',[]):assert re.match(r'^[a-z-]+\.html(\?[a-z_=&]+)?$',m['href']),m['href']
        checked=max(r['reviewed_on'] for r in rs if r.get('reviewed_on'))
        srcs=[]
        for r in rs:
            for u in (r.get('url'),r.get('web')):
                if u and u.startswith('https://') and u not in srcs:srcs.append(u)
        short=lambda u:(lambda s:s if len(s)<=64 else s[:61]+'…')(u.split('//')[1].removeprefix('www.').split('?')[0].rstrip('/'))
        src_links=' · '.join(f'<a href="{E(u)}" rel="noopener">{E(short(u))}</a>' for u in srcs)
        dl=f'<dt>Who handles it</dt><dd>{E(row["who"])}</dd><dt>First steps</dt><dd><ul>'+''.join(f'<li>{E(s)}</li>' for s in row['steps'])+'</ul></dd>'
        if row.get('deadline'):dl+=f'<dt>Deadline</dt><dd class="deadline">{E(row["deadline"])}</dd>'
        dl+='<dt>Who to contact</dt><dd><ul class="plain">'+''.join(contact_li(r) for r in rs)+'</ul></dd>'
        more=''.join(f'<li><a href="{E(m["href"])}">{E(m["label"])}</a></li>' for m in row.get('more',[]))
        if more:dl+=f'<dt>On this site</dt><dd><ul>{more}</ul></dd>'
        note=f'<p>{E(row["note"])}</p>' if row.get('note') else ''
        assert row['icon'] in ICON_PATHS,row['id']+' icon'
        rows.append(f'<article class="rights-row" id="{E(row["id"])}"><h3 class="cat-h">{icon(row["icon"],"hic")}{E(row["title"])}</h3><p>{E(row["plain"])}</p><dl>{dl}</dl>{note}<p class="meta">Source pages checked {E(checked)}: {src_links}</p></article>')
    toc=''.join(f'<a href="#{E(r["id"])}">{icon(r["icon"],"tic")}<span class="tl">{E(r["title"])}</span></a>' for r in data['rows'])
    # Deadlines at a glance (November 24, 2026): the time limits the rows above already state, drawn to scale. Each bar's
    # value must be words from that row's deadline, so the chart can only repeat what the source says.
    bars=[]
    for row in data['rows']:
        for b in row.get('deadline_chart',[]):
            assert row.get('deadline') and b['value'] in row['deadline'],f'{row["id"]}: "{b["value"]}" is not in its deadline'
            n=365 if b['value']=='one year' else int(re.match(r'(\d+) ',b['value']).group(1))
            assert n==b['days'] and 0<n<=365,row['id']
            bars.append((n,row['id'],b))
    bars.sort(key=lambda x:x[0])
    chart=('<section aria-labelledby="deadlines-h"><h2 id="deadlines-h" class="cat-h">'+icon('clock','hic')+'Deadlines the sources state</h2>'
           '<figure class="viz" aria-labelledby="deadlines-cap"><figcaption id="deadlines-cap"><strong>How long you generally have</strong>'
           'Bars are drawn to scale, counting one year as 365 days. Most of these limits apply “generally.” Read the full wording under each situation below and confirm the deadline with the office.</figcaption>'
           '<ul class="barchart">'+''.join(f'<li><a href="#{E(i)}">{E(b["label"])}</a><span class="bv">{E(b["value"])}</span>'
                                       f'<span class="bt" aria-hidden="true"><span class="bf" style="--w:{n/365*100:.1f}%"></span></span></li>' for n,i,b in bars)+'</ul></figure>'
           '<p>Situations not in this chart have no deadline on this page because their sources do not state one. Ask the office how long you have.</p></section>')
    desc='Disability rights in plain language: which office handles problems at work, in housing, school, health care, travel and benefits, and the deadlines.'
    page=('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
      f'<title>Know your rights: which law, which office, what deadline | Mobility Talk</title><meta name="description" content="{E(desc)}"><link rel="stylesheet" href="assets/site.css"></head>\n'
      '<body><a class="skip" href="#main">Skip to main content</a>\n'
      f'<header>{NAV}<small>KNOW YOUR RIGHTS · EVERY STATE</small><h1>Know your rights.</h1><!--lede--><!--/lede--></header>\n'
      f'<main id="main"><section class="panel"><h2>Before you start</h2><ul><li>Write down what happened, where, when and who was involved while you remember it.</li><li>Keep copies of letters, emails, notices and photos.</li><li>Deadlines can be short. Where a source states one, it is shown here.</li><li>Your state Protection and Advocacy agency helps with disability rights problems. <a href="local-help.html?category=rights_legal">Find yours</a>.</li></ul>{RELAY}</section>'
      f'{chart}<section aria-labelledby="situations-h"><h2 id="situations-h">Find your situation</h2><nav class="toc tiles guide" aria-label="Jump to a situation">{toc}</nav>'+''.join(rows)+'</section>'
      '<section class="panel"><h2>State laws add more</h2><p>States have their own disability rights, equipment warranty and repair laws. <a href="mobility-rights.html">Use the next-step finder</a> to see what we have checked for your state, or <a href="disability-advocacy.html">ask lawmakers for change</a>.</p></section>'
      f'{SIDE_HELP}</main>{FOOT}</body></html>\n')
    return {'know-your-rights.html':page}
if __name__=='__main__':
    for p,t in outputs().items():(ROOT/p).write_text(t)
    print('Built the know-your-rights page.')
