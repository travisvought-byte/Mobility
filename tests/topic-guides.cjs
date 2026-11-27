// National topic guides (November 27, 2026): accessible vehicles, free and low-cost equipment, and Social Security
// disability. For each page: every statement and step carries a citation to a listed source with its checked date, every
// phone number shown was read on its source page (and matches the directory record where there is one), no other number
// slips in, the quick answers and their FAQ structured data say the same thing, and the page is wired in like the other
// national guides: title, description, canonical, social and breadcrumb tags, sitemap, visit counter, ad code, MIF block,
// landing copy, the home page guides list and the matching group on every state page.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),{execFileSync}=require('node:child_process');
const recs=new Map(JSON.parse(fs.readFileSync('data/local-programs.json','utf8')).records.map(r=>[r.id,r]));
const landing=JSON.parse(fs.readFileSync('data/landing.json','utf8')).pages;
const digits=s=>String(s||'').replace(/\D/g,'').slice(-10);
const text=e=>e.textContent.replace(/\s+/g,' ').trim();
const open=[];const doc=f=>{while(open.length)open.pop().close();const w=new JSDOM(fs.readFileSync(f,'utf8')).window;open.push(w);return w.document;};
// state page group each guide is linked from
const GROUP={'accessible-vehicles':'transportation','free-medical-equipment':'equipment','social-security-disability':'benefits'};
const home=doc('index.html'),homeLinks=[...home.querySelectorAll('ul.guidegrid a')].map(a=>a.getAttribute('href'));
const sitemap=fs.readFileSync('sitemap.xml','utf8');
const states=fs.readdirSync('states').filter(f=>f.endsWith('.html')&&f!=='index.html');
const summary=[];
for(const slug of Object.keys(GROUP)){
 const F=slug+'.html',data=JSON.parse(fs.readFileSync('data/'+slug+'.json','utf8')),html=fs.readFileSync(F,'utf8'),d=doc(F);
 assert.equal(data.page,F);
 assert.equal(d.querySelectorAll('h1').length,1,F+' one h1');assert.equal(text(d.querySelector('h1')),data.h1,F+' heading');
 assert(d.title.length>30&&d.title.length<=100,F+' title length '+d.title.length);
 const desc=d.querySelector('meta[name=description]').content;assert(desc.length>=120&&desc.length<=160,F+' description length '+desc.length);
 assert.equal(d.querySelector('link[rel=canonical]').href,'https://mobilitytalk.org/'+F,F+' canonical');
 assert.equal(d.querySelector('meta[property="og:url"]').content,'https://mobilitytalk.org/'+F,F+' Open Graph');assert(d.querySelector('meta[name="twitter:card"]'),F+' share card');
 assert(sitemap.includes('https://mobilitytalk.org/'+F+'</loc>'),F+' in sitemap');
 assert(/<!--gc-->/.test(html)&&/gc\.zgo\.at\/count\.js/.test(html),F+' visit counter');
 assert.equal((html.match(/adsbygoogle\.js/g)||[]).length,1,F+' loads the site ad code once, like the other topic guides');
 assert(d.querySelector('#site-nav button.navtoggle'),F+' shared phone menu');
 assert(d.querySelector('footer a.privacy-link[href="privacy.html"]')&&d.querySelector('footer a[href="about.html"]')&&d.querySelector('footer .related'),F+' shared footer');
 assert.equal(d.querySelectorAll('.featured-org:not(.featured-org--also)').length,1,F+' features MIF once');
 assert(d.querySelector('main > .side-help > aside.urgent')&&!d.querySelector('main').firstElementChild.classList.contains('urgent'),F+' crisis lines in the side note, not a banner');
 assert(!/undefined|null<|\[object|Veteran Home Guardians|vethomeguard\.org\/donate|paypal/i.test(html),F+' no template leaks, VHG branding or VHG donate links');
 assert.equal(d.querySelector('header .lede').textContent,landing[F].intro,F+' opening from data/landing.json');
 for(const a of d.querySelectorAll('header .hero-actions a'))assert(d.getElementById(a.getAttribute('href').slice(1)),F+' action lands on the page');
 // structured data: breadcrumb from finalize, FAQ built from the questions shown on the page
 const lds=[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
 const bc=lds.find(x=>x['@type']==='BreadcrumbList');assert(bc&&bc.itemListElement.at(-1).item==='https://mobilitytalk.org/'+F,F+' breadcrumb');
 const faq=lds.find(x=>x['@type']==='FAQPage');assert(faq,F+' FAQ structured data');
 const items=[...d.querySelectorAll('#questions .faq-item')];assert.equal(items.length,data.faq.length,F+' quick answers');assert(items.length>=4,F+' at least four quick answers');
 assert.equal(faq.mainEntity.length,items.length,F+' one FAQ entry per answer shown');
 items.forEach((it,i)=>{assert.equal(text(it.querySelector('h3')),faq.mainEntity[i].name,F+' FAQ question matches the page');
  const shown=text(it.querySelector('p')).replace(/\s*(\[\d+\])+$/,'');assert.equal(shown,faq.mainEntity[i].acceptedAnswer.text,F+' FAQ answer matches the page');
  assert.deepEqual([...it.querySelectorAll('a.cite')].map(a=>a.getAttribute('href').slice(5)),data.faq[i].src,F+' answer '+i+' cites its sources');});
 // sources: every one listed once, read on the checked date, linked, with its page date
 assert(new RegExp('Sources checked '+data.checked_label+'\\.').test(d.getElementById('checked-line').textContent),F+' checked line under the heading');
 const ids=Object.keys(data.sources);
 for(const id of ids){const li=d.getElementById('src-'+id),s=data.sources[id];assert(li,F+' source listed: '+id);assert(s.url.startsWith('https://'),F+' secure source '+id);
  assert.equal(s.checked,data.checked_on,F+' '+id+' read on the checked date');assert(li.querySelector(`a[href="${s.url}"]`),F+' source link '+id);assert(li.textContent.includes('checked '+s.checked),F+' as-of date '+id);}
 assert.equal(d.querySelectorAll('#sources li').length,ids.length,F+' no extra sources');
 for(const a of d.querySelectorAll('a.cite'))assert(d.getElementById(a.getAttribute('href').slice(1)),F+' citation target '+a.getAttribute('href'));
 // sections: every statement and step cites exactly its sources; every card cites at least one; jump tile per section
 let points=0,steps=0,cards=0;const phones=new Set();
 for(const s of data.sections){const sec=d.getElementById(s.id);assert(sec,F+' section '+s.id);
  assert.equal(sec.querySelectorAll('h2 svg.hic[aria-hidden="true"]').length,1,F+' '+s.id+' heading icon is decorative');
  assert(d.querySelector(`nav.toc a[href="#${s.id}"]`),F+' '+s.id+' in the jump list');
  const lis=[...sec.querySelectorAll(':scope > ul > li')];assert.equal(lis.length,(s.points||[]).length,F+' '+s.id+' statements');
  (s.points||[]).forEach((p,i)=>{assert.deepEqual([...lis[i].querySelectorAll('a.cite')].map(a=>a.getAttribute('href').slice(5)),p.src,F+' '+s.id+' statement '+i+' cites its sources');points++;});
  const st=[...sec.querySelectorAll(':scope > ol.stepper > li')];assert.equal(st.length,(s.steps||[]).length,F+' '+s.id+' steps');
  if(st.length)assert.equal(sec.querySelector(':scope > ol.stepper').getAttribute('role'),'list',F+' step list keeps its list role');
  (s.steps||[]).forEach((p,i)=>{assert.deepEqual([...st[i].querySelectorAll('a.cite')].map(a=>a.getAttribute('href').slice(5)),p.src,F+' '+s.id+' step '+i+' cites its sources');steps++;});
  for(const c of s.cards||[]){const card=d.getElementById(c.id);assert(card,F+' '+c.id);assert(card.querySelector('a.cite'),F+' '+c.id+' cites a source');cards++;
   for(const l of c.links)assert(card.querySelector(`a[href="${l.href}"]`),F+' '+c.id+' link '+l.href);
   if(c.record)assert(recs.has(c.record),F+' '+c.id+' directory record exists');
   if(c.phone){assert.equal(digits(c.phone),digits(c.phone_on_source),F+' '+c.id+' phone is the one read on the source page');
    const want='tel:'+c.phone.replace(/[^0-9+]/g,'');assert(card.querySelector(`a[href="${want}"]`),F+' '+c.id+' call link dials '+want);
    assert(card.querySelector(`a.cite[href="#src-${c.phone_src}"]`),F+' '+c.id+' cites the page its phone was read on');
    if(c.record)assert.equal(digits(recs.get(c.record).phone),digits(c.phone),F+' '+c.id+' matches directory record '+c.record);
    phones.add(digits(c.phone));for(const m of String(c.phone_label||'').matchAll(/\d[\d-]{9,}\d/g))phones.add(digits(m[0]));}}}
 // where to start: each path links a section on the page and names it
 for(const a of d.querySelectorAll('#start-h ~ ul.iconlist a')){const t=d.getElementById(a.getAttribute('href').slice(1));assert(t,F+' start path target');assert.equal(text(a),text(t.querySelector('h2')),F+' start path names its section');}
 // no phone number on the page that was not read on a source page (988 and 711 come from the shared strips)
 for(const m of d.querySelector('main').textContent.matchAll(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g))assert(phones.has(digits(m[0])),F+' unsourced phone number on the page: '+m[0]);
 for(const a of d.querySelectorAll('a[href^="tel:"]')){const h=a.getAttribute('href');assert(['tel:988','tel:711'].includes(h)||phones.has(digits(h)),F+' call link '+h);}
 for(const a of d.querySelectorAll('a[href^="http:"]'))assert.fail(F+' insecure link '+a.href);
 for(const a of d.querySelectorAll('a[target="_blank"]'))assert.equal(a.getAttribute('rel'),'noopener',F+' new-tab links use noopener');
 for(const a of d.querySelectorAll('a[href^="#"]'))if(a.getAttribute('href').length>1)assert(d.getElementById(a.getAttribute('href').slice(1)),F+' anchor '+a.getAttribute('href'));
 for(const a of d.querySelectorAll('main a[href]')){const h=a.getAttribute('href');if(/^(https?:|mailto:|tel:|sms:|#)/.test(h))continue;assert(fs.existsSync(h.split(/[?#]/)[0]||'index.html'),F+' internal link '+h);}
 const allIds=[...d.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(allIds).size,allIds.length,F+' ids are unique');
 for(const s of d.querySelectorAll('svg')){assert.equal(s.getAttribute('aria-hidden'),'true',F+' icon hidden from screen readers');assert.equal(s.getAttribute('focusable'),'false',F+' icon not focusable');}
 assert(/not (medical or )?legal|not legal, tax/.test(d.querySelector('footer').textContent),F+' footer says it is general information');
 // ad slots like the other topic guides; no sold ad markup while none is sold
 assert(!/ad-slot|assets\/ads\.css|<!--ad-->/.test(html),F+' no sold ad markup');
 const slots=execFileSync('python3',['-c',"import sys;sys.path.insert(0,'scripts');import ads;print(ads.slots_for('"+F+"'))"],{encoding:'utf8'}).trim();
 assert.equal(slots,`['${slug}', 'every-topic']`,F+' takes the topic ad slots');
 // linked from the home page guides list, and from the matching group on every state page that has that group
 assert(homeLinks.includes(F),F+' on the home page guides list');
 let linked=0;
 for(const f of states){const sd=doc('states/'+f),g=sd.getElementById(GROUP[slug].replace('_','-'));if(!g)continue;assert(g.querySelector(`a[href="../${F}"]`),f+' links '+F+' from its '+GROUP[slug]+' group');linked++;}
 assert(linked>=50,F+' linked from '+linked+' state pages');
 summary.push(`${F}: ${points} statements, ${steps} steps, ${cards} cards, ${items.length} quick answers, ${ids.length} sources, linked from ${linked} state pages`);
}
// related pages link the new guides
assert(doc('know-your-rights.html').querySelector('#benefit-denials a[href="social-security-disability.html"]'),'rights page links the Social Security guide');
assert(doc('ramps-home-access.html').querySelector('a[href="free-medical-equipment.html"]')&&doc('ramps-home-access.html').querySelector('a[href="accessible-vehicles.html"]'),'ramps page links the equipment and vehicle guides');
assert(doc('mobility-independence.html').querySelector('#help-title ~ p a[href="free-medical-equipment.html"]'),'repair page links the equipment guide');
console.log('PASS topic guides: '+summary.join('; ')+'. Every phone read on its source page; FAQ data matches the page; in the sitemap with canonical, share tags, ad code and the visit counter.');
