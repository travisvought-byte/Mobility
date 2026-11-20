// National caregiver and respite page (November 20, 2026): every statement carries a citation to a listed official
// source with its checked date, every phone number shown is one read on its source page (and matches the directory
// record where there is one), no other number slips in, and the page is wired in like the other national pages:
// title, description, canonical, social and breadcrumb tags, sitemap, visit counter, home page, every state page.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),{execFileSync}=require('node:child_process');
const F='caregiver-respite.html';
const data=JSON.parse(fs.readFileSync('data/caregiver-respite.json','utf8'));
const recs=new Map(JSON.parse(fs.readFileSync('data/local-programs.json','utf8')).records.map(r=>[r.id,r]));
const html=fs.readFileSync(F,'utf8'),d=new JSDOM(html).window.document;
const digits=s=>String(s||'').replace(/\D/g,'').slice(-10);
assert.equal(d.querySelectorAll('h1').length,1,'one h1');
assert(d.title.length>30&&d.title.length<=100,'title length '+d.title.length);
const desc=d.querySelector('meta[name=description]').content;assert(desc.length>=120&&desc.length<=230,'description length '+desc.length);
assert.equal(d.querySelector('link[rel=canonical]').href,'https://mobilitytalk.org/'+F,'canonical');
assert(d.querySelector('meta[property="og:title"]')&&d.querySelector('meta[property="og:url"]').content==='https://mobilitytalk.org/'+F,'Open Graph');
assert(d.querySelector('meta[name="twitter:card"]'),'share card');
assert(fs.readFileSync('sitemap.xml','utf8').includes('https://mobilitytalk.org/'+F+'</loc>'),'in sitemap');
assert(/<!--gc-->/.test(html)&&/gc\.zgo\.at\/count\.js/.test(html),'visit counter');
assert(d.querySelector('#site-nav button.navtoggle'),'shared phone menu');
assert(d.querySelector('footer a.privacy-link[href="privacy.html"]')&&d.querySelector('footer a[href="about.html"]'),'shared footer links');
assert.equal(d.querySelectorAll('.featured-org:not(.featured-org--also)').length,1,'features MIF once');
assert(d.querySelector('main').firstElementChild.classList.contains('urgent'),'urgent strip leads');
assert(!/undefined|null<|\[object|Veteran Home Guardians/.test(html),'no template leaks or VHG branding');
const lds=[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
const bc=lds.find(x=>x['@type']==='BreadcrumbList');assert(bc&&bc.itemListElement.at(-1).item==='https://mobilitytalk.org/'+F,'breadcrumb');
// sources: every one listed once, read today from an official site, and the page says when they were checked
assert(/Sources checked November 20, 2026\./.test(d.getElementById('checked-line').textContent),'checked line under the heading');
assert(/Sources checked November 20, 2026\./.test(d.getElementById('sources').textContent),'checked line in the source list');
const OFFICIAL=/^https:\/\/(www\.)?(caregiver\.va\.gov|va\.gov|acl\.gov|eldercare\.acl\.gov|archrespite\.org|medicaid\.gov|usa\.gov)\//;
const ids=Object.keys(data.sources);
for(const id of ids){const li=d.getElementById('src-'+id),s=data.sources[id];assert(li,'source listed: '+id);
 assert(OFFICIAL.test(s.url),'official source '+s.url);assert.equal(s.checked,'2026-11-20',id+' read on November 20, 2026');
 assert(li.querySelector(`a[href="${s.url}"]`),'source link '+id);assert(li.textContent.includes('checked '+s.checked),'as-of date '+id);}
assert.equal(d.querySelectorAll('#sources li').length,ids.length,'no extra sources');
for(const a of d.querySelectorAll('a.cite'))assert(d.getElementById(a.getAttribute('href').slice(1)),'citation target '+a.getAttribute('href'));
// sections: each statement cites exactly its sources; each card cites at least one
let points=0,cards=0;
for(const s of data.sections){const sec=d.getElementById(s.id);assert(sec,'section '+s.id);
 assert.equal(sec.querySelectorAll('h2 svg.hic[aria-hidden="true"]').length,1,s.id+' heading icon is decorative');
 assert(d.querySelector(`nav.toc a[href="#${s.id}"]`),s.id+' in the jump list');
 const lis=[...sec.querySelectorAll(':scope > ul > li')];assert.equal(lis.length,s.points.length,s.id+' statements');
 s.points.forEach((p,i)=>{const c=[...lis[i].querySelectorAll('a.cite')].map(a=>a.getAttribute('href').slice(5));assert.deepEqual(c,p.src,s.id+' statement '+i+' cites its sources');points++;});
 for(const c of s.cards||[]){const card=d.getElementById(c.id);assert(card,c.id);assert(card.querySelector('a.cite'),c.id+' cites a source');cards++;
  for(const l of c.links)assert(card.querySelector(`a[href="${l.href}"]`)&&OFFICIAL.test(l.href),c.id+' official link '+l.href);
  if(c.phone){assert.equal(digits(c.phone),digits(c.phone_on_source),c.id+' phone is the one read on the source page');
   const want='tel:'+c.phone.replace(/[^0-9+]/g,'');assert(card.querySelector(`a[href="${want}"]`),c.id+' call link dials '+want);
   assert(card.querySelector(`a.cite[href="#src-${c.phone_src}"]`),c.id+' cites the page its phone was read on');
   if(c.record)assert.equal(digits(recs.get(c.record).phone),digits(c.phone),c.id+' matches directory record '+c.record);}}}
assert(d.querySelector('#va-csl-card a[href="tel:18552603274"]'),'VA Caregiver Support Line');
assert(d.querySelector('#eldercare-card a[href="tel:18006771116"]'),'Eldercare Locator');
assert(d.querySelector('#arch-locator-card a[href="https://archrespite.org/caregiver-resources/respitelocator/"]'),'ARCH locator');
// no phone number on the page that was not read on a source page (988, 711 and 838255 come from the shared strips and the VA page)
const allowed=new Set(data.sections.flatMap(s=>(s.cards||[]).filter(c=>c.phone).map(c=>digits(c.phone))));
const text=d.querySelector('main').textContent;
for(const m of text.matchAll(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g))assert(allowed.has(digits(m[0])),'unsourced phone number on the page: '+m[0]);
for(const a of d.querySelectorAll('a[href^="tel:"]')){const h=a.getAttribute('href');assert(['tel:988','tel:711'].includes(h)||allowed.has(digits(h)),'call link '+h);}
for(const a of d.querySelectorAll('a[href^="http:"]'))assert.fail('insecure link '+a.href);
for(const a of d.querySelectorAll('a[target="_blank"]'))assert.equal(a.getAttribute('rel'),'noopener','new-tab links use noopener');
for(const a of d.querySelectorAll('a[href^="#"]'))assert(d.getElementById(a.getAttribute('href').slice(1)),'anchor '+a.getAttribute('href'));
assert(/not medical or legal advice/.test(d.querySelector('footer').textContent),'footer says it is general information, not medical or legal advice');
// advertising: a topic slot like the other national pages, empty while data/ads.json is empty
assert(!/ad-slot|assets\/ads\.css|<!--ad-->/.test(html),'no ad markup while there is no ad');
const withAd=execFileSync('python3',['-c',"import sys;sys.path.insert(0,'scripts');import ads;print(ads.slots_for('"+F+"'))"],{encoding:'utf8'}).trim();
assert.equal(withAd,"['caregiver-respite', 'every-topic']",'takes the same ad slots as the other topic pages');
// linked from the home page (under the need grid) and from the in-home help group on every state page that has one
const doc=f=>new JSDOM(fs.readFileSync(f,'utf8')).window.document;
assert(doc('index.html').querySelector(`#caregiver-line a[href="${F}"]`),'home page links it under the need grid');
const states=fs.readdirSync('states').filter(f=>f.endsWith('.html')&&f!=='index.html');let linked=0;
let inhome=0;
for(const f of states){const sd=doc('states/'+f);assert(sd.querySelector(`#caregiver-link a[href="../${F}"]`),f+' links it under the national lines');linked++;
 const s=sd.getElementById('daily-living');if(s){assert(s.querySelector(`a[href="../${F}"]`),f+' links it from in-home help');inhome++;}}
assert.equal(linked,56,'linked from every state and territory page');assert(inhome>=40,'linked from the in-home help group ('+inhome+')');
console.log(`PASS caregivers: ${points} cited statements and ${cards} program cards, ${ids.length} official sources checked 2026-11-20, every phone read on its source page; linked from home, all ${linked} state and territory pages and ${inhome} in-home help groups; in the sitemap with canonical, share tags and the visit counter.`);
