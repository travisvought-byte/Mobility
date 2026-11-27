// National topic guides (November 27, 2026): accessible vehicles, free and low-cost equipment, Social Security
// disability, accessible travel, getting paid as a family caregiver, paying for home modifications, housing help, jobs and
// work with a disability, disability parking placards and plates, and the Spanish versions of all but accessible travel (checked at the end). For each page: every statement and step carries a citation to a listed source with its checked date, every
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
// state page groups each guide is linked from
// (accessible travel has no state page group; related pages link it instead, checked below. The paid caregiver guide is
// linked from the caregiver line under every state page's national lines as well, checked below.)
const GROUP={'accessible-vehicles':['transportation'],'free-medical-equipment':['equipment'],'social-security-disability':['benefits'],'accessible-travel':[],
 'paid-family-caregiver':['daily_living'],'home-modifications':['ramps_home','funding'],'disability-housing':['housing'],'disability-jobs':['work_school'],
 'disability-parking':['transportation']};
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
 if(GROUP[slug].length){
  for(const f of states){const sd=doc('states/'+f);let any=false;
   for(const k of GROUP[slug]){const g=sd.getElementById(k.replace('_','-'));if(!g)continue;assert(g.querySelector(`a[href="../${F}"]`),f+' links '+F+' from its '+k+' group');any=true;}
   if(any)linked++;}
  assert(linked>=(slug==='paid-family-caregiver'?40:50),F+' linked from '+linked+' state pages');}
 summary.push(`${F}: ${points} statements, ${steps} steps, ${cards} cards, ${items.length} quick answers, ${ids.length} sources, linked from ${linked} state pages`);
}
// related pages link the new guides
assert(doc('know-your-rights.html').querySelector('#benefit-denials a[href="social-security-disability.html"]'),'rights page links the Social Security guide');
assert(doc('ramps-home-access.html').querySelector('a[href="free-medical-equipment.html"]')&&doc('ramps-home-access.html').querySelector('a[href="accessible-vehicles.html"]'),'ramps page links the equipment and vehicle guides');
assert(doc('mobility-independence.html').querySelector('#help-title ~ p a[href="free-medical-equipment.html"]'),'repair page links the equipment guide');
assert(doc('know-your-rights.html').querySelector('#air-travel a[href="accessible-travel.html"]')&&doc('know-your-rights.html').querySelector('#transit a[href="accessible-travel.html"]'),'rights page links the travel guide from air travel and transit');
assert(doc('service-animals.html').querySelector('#air-travel a[href="accessible-travel.html"]'),'service animal air travel section links the travel guide');
assert(doc('accessible-vehicles.html').querySelector('#related a[href="accessible-travel.html"]'),'vehicle guide links the travel guide');
// the paid caregiver and home modification guides (November 27, 2026): the caregiver page's short paid-care summary and every
// state page's caregiver line point to the full caregiver guide; the ramps page, the rights page's housing situation and
// the two guides themselves link the home modification guide; neither guide repeats the ramps page's checklists, it links them
assert(doc('caregiver-respite.html').querySelector('#paid a[href="paid-family-caregiver.html"]'),'caregiver page paid-care section links the full guide');
for(const f of states)assert(doc('states/'+f).querySelector('#caregiver-link a[href="../paid-family-caregiver.html"]'),f+' caregiver line links the paid caregiver guide');
{const r=doc('ramps-home-access.html');assert(r.querySelectorAll('a[href="home-modifications.html"]').length>=2,'ramps page links the home modification guide from its routes and its related line');}
assert(doc('know-your-rights.html').querySelector('#housing a[href="home-modifications.html"]'),'rights page housing situation links the home modification guide');
{const h=doc('home-modifications.html');for(const k of ['va-hisa','va-sah','va-sha','ohio-waiver-home-modifications'])assert(h.querySelector(`a[href="ramps-home-access.html#${k}"]`),'home modification guide links the '+k+' checklist');
 assert(doc('ramps-home-access.html').getElementById('va-hisa'),'checklist anchors exist on the ramps page');
 assert(h.querySelector('#related a[href="paid-family-caregiver.html"]')&&doc('paid-family-caregiver.html').querySelector('#related a[href="home-modifications.html"]'),'the two guides link each other');}
// current amounts as read on the program pages: USDA 504 limits, VA fiscal year 2027 grants, HISA lifetime limits
{const t=doc('home-modifications.html').querySelector('main').textContent;for(const s of ['$40,000','$10,000','$50,000','$133,042','$26,654','$53,585','$9,568','$6,800','$2,000'])assert(t.includes(s),'home modification guide shows '+s);}
// MDA (November 27, 2026): the grant's own FAQ page lists 1-800-572-1717 (Option 1); the Resource Center's page lists
// 1-833-ASK-MDA1. The directory keeps the number each record's page shows and names the other.
{const g=recs.get('us-mda-dme-grant'),s=recs.get('us-mda-support-groups');
 assert.equal(g.phone,'1-800-572-1717','MDA grant record has the number its FAQ page lists');assert(/Option 1/.test(g.phone_note)&&/1-833-275-6321/.test(g.phone_note),'MDA grant record labels both numbers');
 assert.equal(s.phone,'1-833-275-6321','MDA Resource Center number on the support groups record');assert(/1-800-572-1717/.test(s.phone_note),'support groups record names the general line');}

// housing help and jobs and work with a disability (November 27, 2026): linked from the rights page's housing, work and VR
// situations, the Social Security and home modification guides, and each other; the Social Security work amounts sit in a
// table with a caption, column headers and row headers, and match the statements and quick answers around it
{const k=doc('know-your-rights.html');assert(k.querySelector('#housing a[href="disability-housing.html"]'),'rights page housing situation links the housing guide');
 assert(k.querySelector('#work a[href="disability-jobs.html"]')&&k.querySelector('#agency-problems a[href="disability-jobs.html"]'),'rights page work and VR situations link the jobs guide');}
assert(doc('social-security-disability.html').querySelector('#related a[href="disability-jobs.html"]'),'Social Security guide links the jobs guide');
assert(doc('home-modifications.html').querySelector('#related a[href="disability-housing.html"]'),'home modification guide links the housing guide');
assert(doc('disability-housing.html').querySelector('#related a[href="disability-jobs.html"]')&&doc('disability-jobs.html').querySelector('#related a[href="disability-housing.html"]'),'the housing and jobs guides link each other');
{const h=doc('disability-housing.html');assert(h.querySelector('#fair-housing a[href="know-your-rights.html#housing"]')&&h.querySelector('#fair-housing a[href="home-modifications.html#renters"]'),'housing guide links the rights steps and renters\' changes instead of repeating them');
 assert(h.querySelector('#section-811 a[href="states/index.html"]')&&h.querySelector('#find a[href="states/index.html"]'),'housing guide points to the state pages for housing finance agencies and rental searches');
 const t=text(h.querySelector('#vouchers'));assert(/SSI and Social Security disability benefits count as income/.test(t)&&/Plan to Achieve Self-Support/.test(t),'housing guide says how SSI and SSDI count as income');}
{const j=doc('disability-jobs.html'),tb=j.querySelector('#ssdi-work table.data');assert(tb,'jobs guide has the earnings table');
 const wrap=tb.closest('.table-wrap');assert.equal(wrap.getAttribute('role'),'region');assert.equal(wrap.getAttribute('tabindex'),'0','table scrolls by keyboard on narrow screens');
 assert.equal(j.getElementById(wrap.getAttribute('aria-labelledby')),tb.querySelector('caption'),'table region is named by its caption');
 assert.deepEqual([...tb.querySelectorAll('caption a.cite')].map(a=>a.getAttribute('href')),['#src-ssa-sga','#src-ssa-twp'],'table caption cites both Social Security pages');
 assert.equal(tb.querySelectorAll('thead th[scope="col"]').length,4,'column headers');assert.equal(tb.querySelectorAll('tbody th[scope="row"]').length,2,'row headers');
 assert.deepEqual([...tb.querySelectorAll('tbody tr')].map(r=>[...r.children].map(text)),[['2026','$1,690','$2,830','$1,210'],['2027','$1,770','$2,950','$1,270']],'2026 and 2027 amounts as read on the Office of the Chief Actuary pages');
 const t=j.querySelector('main').textContent;for(const s of ['$1,690','$2,830','$1,770','$2,950','$1,210','$1,270','$2,410','$9,730','$20,000','$100,000'])assert(t.includes(s),'jobs guide shows '+s);
 assert(j.querySelector('#accommodations a[href="know-your-rights.html#work"]')&&j.querySelector('#ssdi-work a[href="social-security-disability.html"]'),'jobs guide links the rights steps and the Social Security guide instead of repeating them');}
// disability parking: one line per state with its official placard page (a .gov site, new tab), the five unconfirmed states
// named, the guide linked from related guides, the rights page and the next-step finder, and each state page's transportation
// group carries that state's own placard page where the guide lists one
{const P=JSON.parse(fs.readFileSync('data/disability-parking.json','utf8')),list=P.sections.find(s=>s.id==='by-state').state_links,p=doc('disability-parking.html');
 const lis=[...p.querySelectorAll('#by-state .statelinks li')];assert.equal(lis.length,list.length,'one line per listed state');assert(list.length>=40,'most states listed');
 for(const [i,x] of list.entries()){const a=lis[i].querySelector('a');assert.equal(a.getAttribute('href'),x.url);assert(/^https:\/\/[^/]+\.(gov|us)\//.test(x.url),x.state+' official site');
  assert.equal(a.getAttribute('target'),'_blank');assert.equal(a.getAttribute('rel'),'noopener');assert(text(lis[i]).startsWith(x.state+':'),x.state+' named');}
 assert.equal(new Set(list.map(x=>x.code)).size,51,'every state and DC listed once');for(const c of ['IL','OH','RI','WV','WY'])assert(list.some(x=>x.code===c),c+' listed');
 for(const f of ['accessible-vehicles.html','accessible-travel.html'])assert(doc(f).querySelector('#related a[href="disability-parking.html"]'),f+' links the parking guide');
 assert(doc('know-your-rights.html').querySelector('#public-places a[href="disability-parking.html"]'),'rights page public places links the parking guide');
 assert(doc('mobility-rights.html').querySelector('a[href="disability-parking.html"]'),'next-step finder links the parking guide');
 let own=0;for(const x of list){const f='states/'+x.state.toLowerCase().replace(/[^a-z]+/g,'-')+'.html';assert(fs.existsSync(f),f);
  const g=doc(f).getElementById('transportation');if(g&&g.querySelector(`a[href="${x.url}"]`))own++;}
 assert(own>=40,'state pages link their own placard page: '+own);}

// ---- Spanish versions (November 27, 2026). The build already stops unless each translation has the English guide's
// sections, statements, citations, cards, phones, records, quick answers and numbers. Here the built pages are checked:
// language and hreflang both ways, sitemap, counter, ad code, the English featured block marked as English, a Spanish menu
// and footer, the side note, FAQ data in Spanish that matches the page, every source with the English page it was read on
// and its checked date (and the agency's Spanish page where listed), and links to English pages marked as English.
const T={'vehiculos-adaptados':'accessible-vehicles','equipo-medico-gratis':'free-medical-equipment','incapacidad-seguro-social':'social-security-disability',
 'cuidador-familiar-pagado':'paid-family-caregiver','modificaciones-hogar':'home-modifications','vivienda-discapacidad':'disability-housing','empleo-discapacidad':'disability-jobs',
 'estacionamiento-discapacidad':'disability-parking'};
const hubLinks=[...doc('espanol.html').querySelectorAll('#guias-h ~ ul a')].map(a=>a.getAttribute('href'));
const SPANISH=new Set(['espanol.html',...Object.keys(T).map(s=>s+'.html')]);
for(const [es,en] of Object.entries(T)){
 const F=es+'.html',EN=en+'.html',data=JSON.parse(fs.readFileSync('data/'+es+'.json','utf8')),endata=JSON.parse(fs.readFileSync('data/'+en+'.json','utf8')),html=fs.readFileSync(F,'utf8');
 const want=[['en','https://mobilitytalk.org/'+EN],['es','https://mobilitytalk.org/'+F],['x-default','https://mobilitytalk.org/'+EN]];
 {const ed=doc(EN);assert.deepEqual([...ed.querySelectorAll('link[rel=alternate]')].map(l=>[l.getAttribute('hreflang'),l.getAttribute('href')]),want,EN+' hreflang alternates');
  const a=ed.querySelector('header .lang-switch a');assert(a&&a.getAttribute('href')===F&&a.getAttribute('hreflang')==='es'&&a.getAttribute('lang')==='es',EN+' links its Spanish version');}
 const d=doc(F);
 assert.equal(data.lang,'es');assert.equal(data.translation_of,en);assert.equal(data.page,F);
 assert.equal(d.documentElement.lang,'es',F+' lang');assert.equal(d.querySelectorAll('h1').length,1);assert.equal(text(d.querySelector('h1')),data.h1,F+' heading');
 assert(d.title.length>30&&d.title.length<=100,F+' title length');
 const desc=d.querySelector('meta[name=description]').content;assert(desc.length>=120&&desc.length<=160,F+' description length '+desc.length);
 assert.equal(d.querySelector('link[rel=canonical]').href,'https://mobilitytalk.org/'+F,F+' canonical');assert.equal(d.querySelector('meta[property="og:url"]').content,'https://mobilitytalk.org/'+F);
 assert.equal(d.querySelector('meta[property="og:locale"]').content,'es_US',F+' share locale');
 assert.deepEqual([...d.querySelectorAll('link[rel=alternate]')].map(l=>[l.getAttribute('hreflang'),l.getAttribute('href')]),want,F+' hreflang alternates');
 const sw=d.querySelector('header .lang-switch a');assert(sw&&sw.getAttribute('href')===EN&&sw.getAttribute('hreflang')==='en'&&sw.getAttribute('lang')==='en',F+' links the English guide');
 assert(sitemap.includes('https://mobilitytalk.org/'+F+'</loc>'),F+' in sitemap');
 assert(/<!--gc-->/.test(html)&&/gc\.zgo\.at\/count\.js/.test(html),F+' visit counter');
 assert.equal((html.match(/adsbygoogle\.js/g)||[]).length,1,F+' loads the site ad code once, like the English guides');
 const slots=execFileSync('python3',['-c',"import sys;sys.path.insert(0,'scripts');import ads;print(ads.slots_for('"+F+"'))"],{encoding:'utf8'}).trim();assert.equal(slots,`['${es}', 'every-topic']`,F+' ad slots');
 const mif=d.querySelectorAll('.featured-org:not(.featured-org--also)');assert.equal(mif.length,1,F+' features MIF once');assert.equal(mif[0].getAttribute('lang'),'en',F+' English featured block is marked as English');
 const nav=d.querySelector('header nav[aria-label="Principal"]');assert(nav&&nav.querySelector(`a[href="${F}"][aria-current="page"]`)&&nav.querySelector('a[href="espanol.html"]'),F+' Spanish menu');
 for(const x of Object.keys(T))assert(nav.querySelector(`a[href="${x}.html"]`),F+' menu links '+x);
 const foot=d.querySelector('footer');assert(foot.querySelector('a.privacy-link[href="privacy.html"][hreflang="en"]')&&/Privacidad/.test(foot.textContent),F+' Spanish privacy link');
 assert(foot.querySelector('a[href="about.html"][hreflang="en"]')&&!foot.querySelector('.related'),F+' Spanish footer');assert(/todavía no ha sido revisado/.test(foot.textContent)&&/no asesoría/.test(foot.textContent),F+' footer: general information, Spanish not yet reviewed');
 assert(d.querySelector('main > .side-help > aside.urgent a[href="tel:988"]'),F+' crisis lines in the side note');
 assert(!/undefined|null<|\[object|Veteran Home Guardians|vethomeguard\.org\/donate|paypal/i.test(html),F+' no template leaks or VHG donate links');
 assert.equal(d.querySelector('header .lede').textContent,landing[F].intro,F+' opening from data/landing.json');
 for(const a of d.querySelectorAll('header .hero-actions a'))assert(d.getElementById(a.getAttribute('href').slice(1)),F+' action lands on the page');
 assert(new RegExp('Fuentes revisadas el '+data.checked_label+'\\.').test(d.getElementById('checked-line').textContent),F+' checked line in Spanish');
 // FAQ structured data in Spanish, built from the answers shown
 const lds=[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
 assert(lds.find(x=>x['@type']==='BreadcrumbList'),F+' breadcrumb');const faq=lds.find(x=>x['@type']==='FAQPage');assert(faq&&faq.inLanguage==='es',F+' FAQ data in Spanish');
 const items=[...d.querySelectorAll('#questions .faq-item')];assert.equal(items.length,endata.faq.length,F+' as many quick answers as the English guide');assert.equal(faq.mainEntity.length,items.length);
 items.forEach((it,i)=>{assert.equal(text(it.querySelector('h3')),faq.mainEntity[i].name,F+' FAQ question matches the page');
  assert.equal(text(it.querySelector('p')).replace(/\s*(\[\d+\])+$/,''),faq.mainEntity[i].acceptedAnswer.text,F+' FAQ answer matches the page');
  assert.deepEqual([...it.querySelectorAll('a.cite')].map(a=>a.getAttribute('href').slice(5)),endata.faq[i].src,F+' answer '+i+' cites the English guide\'s sources');});
 // sources: the English page each statement was read on, its checked date, and the Spanish page where the agency has one
 for(const [id,s] of Object.entries(endata.sources)){const li=d.getElementById('src-'+id);assert(li,F+' source '+id);
  assert(li.querySelector(`a[href="${s.url}"][hreflang="en"] span[lang="en"]`),F+' '+id+' links the English page, marked as English');assert(li.textContent.includes('revisada el '+data.checked_label),F+' '+id+' checked date');
  const x=data.sources[id].es;if(x){assert(x.url.startsWith('https://'),F+' '+id+' Spanish page is secure');assert(li.querySelector(`a[href="${x.url}"][hreflang="es"]`),F+' '+id+' links the Spanish page');}}
 assert.equal(d.querySelectorAll('#sources li').length,Object.keys(endata.sources).length,F+' no extra sources');
 // sections, statements, steps and cards line up with the English guide, citation for citation
 const phones=new Set();
 for(const s of endata.sections){const sec=d.getElementById(s.id);assert(sec,F+' section '+s.id);assert(d.querySelector(`nav.toc a[href="#${s.id}"]`),F+' '+s.id+' in the jump list');
  const lis=[...sec.querySelectorAll(':scope > ul > li')];assert.equal(lis.length,(s.points||[]).length,F+' '+s.id+' statements');
  (s.points||[]).forEach((p,i)=>assert.deepEqual([...lis[i].querySelectorAll('a.cite')].map(a=>a.getAttribute('href').slice(5)),p.src,F+' '+s.id+' statement '+i));
  const st=[...sec.querySelectorAll(':scope > ol.stepper > li')];assert.equal(st.length,(s.steps||[]).length,F+' '+s.id+' steps');
  for(const c of s.cards||[]){const card=d.getElementById(c.id);assert(card&&card.querySelector('a.cite'),F+' '+c.id);
   if(c.phone){const want='tel:'+c.phone.replace(/[^0-9+]/g,'');assert(card.querySelector(`a[href="${want}"]`),F+' '+c.id+' call link dials '+want);
    if(c.record)assert.equal(digits(recs.get(c.record).phone),digits(c.phone),F+' '+c.id+' matches directory record');
    phones.add(digits(c.phone));for(const m of String(c.phone_label||'').matchAll(/\d[\d-]{9,}\d/g))phones.add(digits(m[0]));}}}
 for(const m of d.querySelector('main').textContent.matchAll(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g))assert(phones.has(digits(m[0])),F+' unsourced phone number on the page: '+m[0]);
 for(const a of d.querySelectorAll('a[href^="tel:"]')){const h=a.getAttribute('href');assert(['tel:988','tel:711'].includes(h)||phones.has(digits(h)),F+' call link '+h);}
 // links: secure, new tabs say so, anchors land, and a link to an English page of this site is marked as English
 for(const a of d.querySelectorAll('a[href^="http:"]'))assert.fail(F+' insecure link '+a.href);
 for(const a of d.querySelectorAll('a[target="_blank"]')){assert.equal(a.getAttribute('rel'),'noopener',F+' noopener');if(!a.closest('.featured-org'))assert(/se abre en otra pestaña/.test(a.textContent),F+' new tab says so in Spanish: '+a.href);}
 for(const a of d.querySelectorAll('a[href^="#"]'))if(a.getAttribute('href').length>1)assert(d.getElementById(a.getAttribute('href').slice(1)),F+' anchor '+a.getAttribute('href'));
 for(const a of d.querySelectorAll('a[href]')){const h=a.getAttribute('href');if(/^(https?:|mailto:|tel:|sms:|#)/.test(h)||a.closest('.featured-org'))continue;const file=h.split(/[?#]/)[0]||'index.html';
  assert(fs.existsSync(file==='./'?'index.html':file),F+' internal link '+h);if(!SPANISH.has(file))assert.equal(a.getAttribute('hreflang'),'en',F+' link to an English page is marked: '+h);}
 const allIds=[...d.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(allIds).size,allIds.length,F+' ids are unique');
 for(const s of d.querySelectorAll('svg'))assert.equal(s.getAttribute('aria-hidden'),'true',F+' icon hidden from screen readers');
 assert(hubLinks.includes(F),'the Spanish help page links '+F);
 summary.push(`${F}: Spanish version of ${EN}, ${items.length} quick answers, ${Object.values(data.sources).filter(x=>x.es).length} Spanish-language source pages`);
}
// the Spanish jobs guide keeps the English earnings table: same cells, a caption and headers in Spanish, both citations,
// and the same scrollable, named region; the housing and jobs versions link each other and the Spanish help page lists them
{const es=doc('empleo-discapacidad.html'),tb=es.querySelector('#ssdi-work table.data');assert(tb,'Spanish jobs guide has the earnings table');
 const wrap=tb.closest('.table-wrap');assert.equal(wrap.getAttribute('role'),'region');assert.equal(wrap.getAttribute('tabindex'),'0');assert.equal(es.getElementById(wrap.getAttribute('aria-labelledby')),tb.querySelector('caption'));
 assert.deepEqual([...tb.querySelectorAll('caption a.cite')].map(a=>a.getAttribute('href')),['#src-ssa-sga','#src-ssa-twp'],'Spanish table caption cites both Social Security pages');
 assert(/Seguro Social/.test(text(tb.querySelector('caption'))),'Spanish table caption');assert.equal(tb.querySelectorAll('thead th[scope="col"]').length,4);assert.equal(tb.querySelectorAll('tbody th[scope="row"]').length,2);
 assert.deepEqual([...tb.querySelectorAll('tbody tr')].map(r=>[...r.children].map(text)),[['2026','$1,690','$2,830','$1,210'],['2027','$1,770','$2,950','$1,270']],'Spanish table has the English amounts');
 assert(es.querySelector('#related a[href="vivienda-discapacidad.html"]')&&doc('vivienda-discapacidad.html').querySelector('#related a[href="empleo-discapacidad.html"]'),'the Spanish housing and jobs guides link each other');
 assert(doc('incapacidad-seguro-social.html').querySelector('#related a[href="empleo-discapacidad.html"]')&&doc('modificaciones-hogar.html').querySelector('#related a[href="vivienda-discapacidad.html"]'),'Spanish Social Security and home modification guides link the new Spanish guides, as the English ones do');}
// the Spanish parking guide lists the same 50 states and DC, each once, with the English list's official page, a label in
// Spanish, the link marked as English (hreflang and "(en inglés)") and a new tab that says so; the Spanish vehicles guide and the
// Spanish help page link it
{const en=JSON.parse(fs.readFileSync('data/disability-parking.json','utf8')).sections.find(s=>s.id==='by-state').state_links,
  es=JSON.parse(fs.readFileSync('data/estacionamiento-discapacidad.json','utf8')).sections.find(s=>s.id==='by-state').state_links,p=doc('estacionamiento-discapacidad.html');
 const url=new Map(en.map(x=>[x.code,x.url])),lis=[...p.querySelectorAll('#by-state .statelinks li')];
 assert.equal(lis.length,51,'Spanish parking guide: one line for each state and DC');assert.equal(new Set(es.map(x=>x.code)).size,51,'every state and DC listed once in Spanish');
 assert.deepEqual([...url.keys()].sort(),es.map(x=>x.code).sort(),'the Spanish list names the same states as the English list');
 for(const [i,x] of es.entries()){const a=lis[i].querySelector('a');assert.equal(a.getAttribute('href'),url.get(x.code),x.code+' same official page as the English list');
  assert.equal(a.getAttribute('hreflang'),'en',x.code+' link marked as English');assert.equal(a.getAttribute('target'),'_blank');assert.equal(a.getAttribute('rel'),'noopener');
  assert(/se abre en otra pestaña/.test(a.textContent),x.code+' new tab said in Spanish');assert(text(lis[i]).startsWith(x.state+':')&&/\(en inglés\)$/.test(text(lis[i])),x.code+' named in Spanish, page noted as English');
  assert(text(a).includes(x.title)&&text(a).includes(x.agency),x.code+' Spanish label');}
 assert(doc('vehiculos-adaptados.html').querySelector('#related a[href="estacionamiento-discapacidad.html"]'),'the Spanish vehicles guide links the Spanish parking guide, as the English one does');
 assert(p.querySelector('#related a[href="vehiculos-adaptados.html"]'),'the Spanish parking guide links the Spanish vehicles guide');
 assert(p.querySelector('#who-sets-rules a[href="know-your-rights.html#public-places"][hreflang="en"]'),'Spanish parking guide points to the English rights page, marked as English');}
console.log('PASS topic guides: '+summary.join('; ')+'. Every phone read on its source page; FAQ data matches the page; in the sitemap with canonical, share tags, ad code and the visit counter.');
