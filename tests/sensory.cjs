// National blind and low vision, and deaf and hard of hearing pages: every tagged directory record appears on its page,
// with the record's own phone number and link, under the right state, and the pages carry search metadata and structured data.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const recs=JSON.parse(fs.readFileSync('data/local-programs.json','utf8')).records.filter(r=>r.category!=='veterans');
const sm=fs.readFileSync('sitemap.xml','utf8');
const PAGES={'blind-low-vision.html':{aud:['blind'],nat:['blind','deafblind']},'deaf-hard-of-hearing.html':{aud:['deaf','deafblind'],nat:['deaf','deafblind']}};
const has=(r,tags)=>(r.audience||[]).some(a=>tags.includes(a));
const tel=p=>'tel:'+String(p).replace(/[^0-9+]/g,'');
let counted=[];
for(const [f,cfg] of Object.entries(PAGES)){
 const html=fs.readFileSync(f,'utf8'),d=new JSDOM(html).window.document;
 assert.equal(d.querySelectorAll('h1').length,1,f+' h1');
 assert(d.title.length>30&&d.title.length<=90,f+' title length '+d.title.length);
 const desc=d.querySelector('meta[name=description]').content;assert(desc.length>=120&&desc.length<=230,f+' description length '+desc.length);
 assert.equal(d.querySelector('link[rel=canonical]').href,'https://mobilitytalk.org/'+f,f+' canonical');
 assert(sm.includes('https://mobilitytalk.org/'+f+'</loc>'),f+' in sitemap');
 const ld=JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent);assert.equal(ld['@type'],'BreadcrumbList',f+' breadcrumb');assert.equal(ld.itemListElement.at(-1).item,'https://mobilitytalk.org/'+f);
 assert(/gc\.zgo\.at\/count\.js/.test(html),f+' visit counter');
 assert.equal(d.querySelectorAll('.featured-org:not(.featured-org--also)').length,1,f+' features MIF once');
 assert(d.querySelector('main > .side-help > aside.urgent')&&!d.querySelector('main').firstElementChild.classList.contains('urgent'),f+' crisis lines sit in the small side note, not a banner at the top');
 assert(!/undefined|null<|\[object/.test(html),f+' no template leaks');
 const nat=recs.filter(r=>r.state==='US'&&has(r,cfg.nat));
 const cards=[...d.querySelectorAll('#nat-h ~ .grid .card h3')].map(h=>h.textContent);
 assert.equal(cards.length,nat.length,f+' one card per national record');
 for(const r of nat)assert(cards.includes(r.name),f+' national '+r.id);
 const st=recs.filter(r=>r.state!=='US'&&has(r,cfg.aud));
 for(const r of st){
  const sec=d.getElementById('st-'+r.state.toLowerCase());assert(sec,f+' section for '+r.state);
  const li=[...sec.querySelectorAll('ul.statelist > li')].find(l=>l.querySelector(':scope > strong').textContent===r.name);
  assert(li,f+' '+r.id+' listed under '+r.state);
  if(r.phone)assert(li.querySelector(`a[href="${tel(r.phone)}"]`),f+' '+r.id+' phone');
  const link=[r.web,r.url].find(u=>u&&u.startsWith('https://'));if(link)assert(li.querySelector(`a[href="${link}"]`),f+' '+r.id+' link');
 }
 // no record from another group or state leaks in
 const listed=d.querySelectorAll('.state-group ul.statelist > li > strong').length;assert.equal(listed,st.length,f+' exactly the tagged records');
 for(const a of d.querySelectorAll('a[href^="#"]')){const id=a.getAttribute('href').slice(1);assert(d.getElementById(id),f+' anchor #'+id);}
 for(const a of d.querySelectorAll('.state-group a[href^="states/"]'))assert(fs.existsSync(a.getAttribute('href')),f+' state link '+a.getAttribute('href'));
 for(const a of d.querySelectorAll('a[href^="http:"]'))assert.fail(f+' insecure link');
 counted.push(f+': '+nat.length+' national, '+st.length+' state and local');
}
const home=new JSDOM(fs.readFileSync('index.html','utf8')).window.document;
for(const f of Object.keys(PAGES))assert(home.querySelector(`a[href="${f}"]`),'home links '+f);
const homeLd=JSON.parse(home.querySelector('script[type="application/ld+json"]').textContent);
assert(Array.isArray(homeLd)&&homeLd.some(x=>x['@type']==='WebSite')&&homeLd.some(x=>x['@type']==='Organization'),'home page names the site and its maker');
const oh=new JSDOM(fs.readFileSync('states/ohio.html','utf8')).window.document;
assert(oh.querySelector('#sensory a[href="../blind-low-vision.html"]')&&oh.querySelector('#sensory a[href="../deaf-hard-of-hearing.html"]'),'state pages point to the national guides');
console.log('PASS sensory pages: '+counted.join('; ')+'; home and state pages link them; structured data on the home page.');
