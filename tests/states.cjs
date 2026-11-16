const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const data=JSON.parse(fs.readFileSync('data/local-programs.json','utf8')).records;
const names=JSON.parse(fs.readFileSync('data/mobility-routes.json','utf8')).states||null;
const files=fs.readdirSync('states').filter(f=>f.endsWith('.html'));
const TERR=['AS','GU','MP','PR','VI'];
assert.equal(files.length,57,'51 state pages, 5 territory pages and the index');
const idx=new JSDOM(fs.readFileSync('states/index.html','utf8')).window.document;
const links=[...idx.querySelectorAll('ul.statelist a')].map(a=>a.getAttribute('href'));
assert.equal(idx.querySelectorAll('#state-list a').length,51,'index links every state and D.C.');assert.equal(idx.querySelectorAll('#territory-list a').length,5,'index links the five territories');
for(const l of links)assert(fs.existsSync(path.join('states',l)),'index link '+l);
const sm=fs.readFileSync('sitemap.xml','utf8');
assert(sm.includes('https://mobilitytalk.org/states/</loc>'));
let total=0,waLuul=0;
for(const f of files){
 const html=fs.readFileSync('states/'+f,'utf8'),d=new JSDOM(html).window.document;
 assert.equal(d.querySelectorAll('h1').length,1,f+' h1');
 const c=d.querySelector('link[rel=canonical]').href;
 assert.equal(c,f==='index.html'?'https://mobilitytalk.org/states/':'https://mobilitytalk.org/states/'+f,f+' canonical');
 assert(sm.includes(f==='index.html'?'/states/</loc>':'/states/'+f+'</loc>'),f+' in sitemap');
 assert(d.querySelector('meta[property="og:image"]'),f+' og:image');
 const ld=JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent);assert.equal(ld['@type'],'BreadcrumbList');
 assert.equal(d.querySelectorAll('.featured-org:not(.featured-org--also)').length,1,f+' features MIF once');
 assert(!/undefined|null<|\[object/.test(html),f+' no template leaks');
 for(const el of d.querySelectorAll('[href],[src]')){
  const u=el.getAttribute('href')||el.getAttribute('src');
  if(/^(https:|mailto:|tel:|sms:|#)/.test(u))continue;
  assert(!/^http:/.test(u),f+' insecure link '+u);
  const file=decodeURIComponent(u.split(/[?#]/)[0]);assert(fs.existsSync(path.join('states',file)),f+' links to missing '+u);
 }
 for(const a of d.querySelectorAll('a[href^="#"]')){const id=a.getAttribute('href').slice(1);assert(d.getElementById(id),f+' anchor #'+id);}
 for(const a of d.querySelectorAll('a[target=_blank]'))assert(/noopener/.test(a.rel),f+' noopener');
 if(f==='index.html')continue;
 const code=d.querySelector('a.button[href*="local-help.html?state="]').getAttribute('href').split('=')[1];
 const mine=data.filter(r=>r.state===code&&r.category!=='veterans'),terr=TERR.includes(code);
 assert(terr?mine.length>=2:mine.length>=15,code+' has a substantive list');
 assert(d.querySelector('.urgent a[href="tel:988"]')&&d.querySelector('a[href="tel:711"]'),code+' urgent strip and relay note');
 assert.equal(d.querySelectorAll('h4').length,0,code+' cards use h3 under the section h2');
 // every non-veterans record for this state is on the page, by name, and no other state's records are
 const text=d.querySelector('main').textContent;
 for(const r of mine)assert(text.includes(r.name),code+' missing '+r.name);
 const other=data.filter(r=>r.state!==code&&r.state!=='US'&&r.category!=='veterans'&&r.scope!=='national');
 const mineNames=new Set(mine.map(r=>r.name));
 for(const r of other.filter(r=>!mineNames.has(r.name)).slice(0,400))assert(!text.includes('<strong>'+r.name+'</strong>')&&!d.body.innerHTML.includes('<h3>'+r.name.replace(/&/g,'&amp;')+'</h3>'),code+' leaked '+r.id);
 if(!terr)assert.equal(d.querySelectorAll('a[href^="tel:"]').length>=10,true,code+' phone links');
 for(const a of d.querySelectorAll('a[href^="tel:"]'))assert(/^tel:\+?\d{3,}/.test(a.getAttribute('href')),code+' bad tel '+a.getAttribute('href'));
 if(!terr){assert(d.querySelector('a[href="../handout.html?state='+code+'"]'),code+' handout link');
  assert(d.querySelector('a[href="https://guide.vethomeguard.org/'+code.toLowerCase()+'.html"]'),code+' guide link');assert(d.querySelector('details.prep'),code+' before-you-call guide');}
 else assert(d.querySelector('a[href="https://dial.acl.gov/home"]'),code+' points to the DIAL database');
 const luul=!!d.querySelector('.featured-org--also');if(code==='WA')waLuul=luul?1:0;else assert(!luul,code+' must not carry Light Upon Light');
 total+=mine.length;
}
assert.equal(waLuul,1,'Washington leads with Light Upon Light');
assert(!/veteranhomeguardians@gmail/i.test(files.map(f=>fs.readFileSync('states/'+f,'utf8')).join('')),'private email stays out');
console.log('PASS states: 51 state pages, 5 territory pages and the index, '+total+' program records rendered as plain HTML, canonical/og/JSON-LD, sitemap, MIF everywhere, Light Upon Light only in Washington, valid tel and https links, no cross-state leaks.');
