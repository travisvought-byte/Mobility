// National service animals page: every statement carries a citation to a listed source with its checked date,
// complaint phone numbers match the directory records, the FAQ structured data matches the questions shown,
// and the page is linked from home, Know your rights, the sensory pages and every state and territory page.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const F='service-animals.html';
const data=JSON.parse(fs.readFileSync('data/service-animals.json','utf8'));
const recs=new Map(JSON.parse(fs.readFileSync('data/local-programs.json','utf8')).records.map(r=>[r.id,r]));
const html=fs.readFileSync(F,'utf8'),d=new JSDOM(html).window.document;
const tel=p=>'tel:'+String(p).replace(/[^0-9+]/g,'');
assert.equal(d.querySelectorAll('h1').length,1,'one h1');
assert(d.title.length>30&&d.title.length<=90,'title length '+d.title.length);
const desc=d.querySelector('meta[name=description]').content;assert(desc.length>=120&&desc.length<=230,'description length '+desc.length);
assert.equal(d.querySelector('link[rel=canonical]').href,'https://mobilitytalk.org/'+F,'canonical');
assert(d.querySelector('meta[property="og:title"]')&&d.querySelector('meta[property="og:url"]').content==='https://mobilitytalk.org/'+F,'Open Graph');
assert(fs.readFileSync('sitemap.xml','utf8').includes('https://mobilitytalk.org/'+F+'</loc>'),'in sitemap');
assert(/gc\.zgo\.at\/count\.js/.test(html),'visit counter');
assert.equal(d.querySelectorAll('.featured-org:not(.featured-org--also)').length,1,'features MIF once');
assert(d.querySelector('main > .side-help > aside.urgent')&&!d.querySelector('main').firstElementChild.classList.contains('urgent'),'crisis lines sit in the small side note, not a banner at the top (owner direction 2026-11-22, repeated 2026-11-23)');
assert(!/undefined|null<|\[object|Veteran Home Guardians/.test(html),'no template leaks or VHG branding');
// structured data: a breadcrumb, and an FAQPage whose questions and answers are the ones shown on the page
const lds=[...d.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent));
const bc=lds.find(x=>x['@type']==='BreadcrumbList');assert(bc&&bc.itemListElement.at(-1).item==='https://mobilitytalk.org/'+F,'breadcrumb');
const faq=lds.find(x=>x['@type']==='FAQPage');assert(faq,'FAQPage');
const shown=[...d.querySelectorAll('#questions .faq-item')];
assert.equal(faq.mainEntity.length,shown.length,'one FAQ entry per question shown');
faq.mainEntity.forEach((q,i)=>{assert.equal(q.name,shown[i].querySelector('h3').textContent,'FAQ question '+i);assert(shown[i].querySelector('p').textContent.startsWith(q.acceptedAnswer.text),'FAQ answer '+i+' shown on the page');});
// every source is listed once with its checked date, and every citation points at a listed source
const ids=Object.keys(data.sources);
for(const id of ids){const li=d.getElementById('src-'+id);assert(li,'source listed: '+id);const s=data.sources[id];
 assert(li.querySelector(`a[href="${s.url}"]`),'source link '+id);assert(li.textContent.includes('checked '+s.checked),'as-of date '+id);assert(/^\d{4}-\d{2}-\d{2}$/.test(s.checked),'date format '+id);}
assert.equal(d.querySelectorAll('#sources li').length,ids.length,'no extra sources');
for(const a of d.querySelectorAll('a.cite'))assert(d.getElementById(a.getAttribute('href').slice(1)),'citation target '+a.getAttribute('href'));
let points=0;
for(const s of data.sections){const sec=d.getElementById(s.id);assert(sec,'section '+s.id);
 const lis=[...sec.querySelectorAll(':scope > ul > li')];assert.equal(lis.length,s.points.length,s.id+' statements');
 s.points.forEach((p,i)=>{assert(p.src.length,'source for '+s.id+' '+i);const cites=[...lis[i].querySelectorAll('a.cite')].map(a=>a.getAttribute('href').slice(5));assert.deepEqual(cites,p.src,s.id+' statement '+i+' cites its sources');points++;});}
const two=[...d.querySelectorAll('#two-questions ol.two-questions li')].map(l=>l.textContent);
assert.deepEqual(two,['Is the dog a service animal required because of a disability?','What work or task has the dog been trained to perform?'],'the two questions');
// complaints: phone from the directory record, matching the number read on the official page, and official https links
for(const c of data.complaints){const card=d.getElementById(c.id),r=recs.get(c.record);assert(card&&r,c.id);
 assert.equal(r.phone.replace(/\D/g,'').slice(-10),c.phone_on_source.replace(/\D/g,'').slice(-10),c.id+' directory phone matches the source page');
 assert(card.querySelector(`a[href="${tel(r.phone)}"]`),c.id+' phone link');
 for(const l of c.links)assert(card.querySelector(`a[href="${l.href}"]`)&&l.href.startsWith('https://'),c.id+' link '+l.href);}
assert(d.querySelector('#complain-ada a[href="https://civilrights.justice.gov/report"]'),'DOJ civil rights portal');
assert(d.querySelector('#complain-housing a[href="https://www.hud.gov/reporthousingdiscrimination"]'),'HUD report page');
assert(d.querySelector('#complain-air a[href="https://www.transportation.gov/airconsumer/file-consumer-complaint"]'),'DOT complaint page');
// programs: each has its own link and a cited source
for(const p of data.programs){const card=d.getElementById(p.id);assert(card,p.id);assert(card.querySelector('a.cite'),p.id+' cites a source');for(const l of p.links)assert(card.querySelector(`a[href="${l.href}"]`),p.id+' link');if(p.phone)assert(card.querySelector(`a[href="${tel(p.phone)}"]`),p.id+' phone');}
for(const a of d.querySelectorAll('a[href^="http:"]'))assert.fail('insecure link '+a.href);
for(const a of d.querySelectorAll('a[target="_blank"]'))assert.equal(a.getAttribute('rel'),'noopener','new-tab links use noopener');
for(const a of d.querySelectorAll('a[href^="#"]'))assert(d.getElementById(a.getAttribute('href').slice(1)),'anchor '+a.getAttribute('href'));
// linked from home, Know your rights (public places, housing, air travel), the sensory pages and every state and territory page
const doc=f=>new JSDOM(fs.readFileSync(f,'utf8')).window.document;
assert(doc('index.html').querySelector(`a[href="${F}"]`),'home links it');
const kyr=doc('know-your-rights.html');for(const id of ['public-places','housing','air-travel'])assert(kyr.querySelector(`#${id} a[href="${F}"]`),'Know your rights links it from '+id);
for(const f of ['blind-low-vision.html','deaf-hard-of-hearing.html'])assert(doc(f).querySelector(`a[href="${F}"]`),f+' links it');
const states=fs.readdirSync('states').filter(f=>f.endsWith('.html')&&f!=='index.html');assert.equal(states.length,56);
for(const f of states)assert(doc('states/'+f).querySelector(`#rights-legal a[href="../${F}"]`),f+' links it');
console.log(`PASS service animals: ${points} cited statements, ${ids.length} sources with checked dates, ${data.complaints.length} complaint routes with directory phones, ${data.programs.length} dog programs, FAQPage matches the ${shown.length} questions shown; linked from home, Know your rights, the sensory pages and all ${states.length} state and territory pages.`);
