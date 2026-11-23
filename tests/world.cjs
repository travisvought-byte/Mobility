// Worldwide pages (owner direction, November 19, 2026: Mobility Talk goes global, not only U.S.).
// Checks world.html and every countries/<slug>.html against data/world.json: each listing is on its page with the
// number it dials, each page leads with its own emergency number instead of the U.S. strip, sources and dates are
// shown, links work, the pages are in the sitemap and every main menu offers the worldwide page.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const W=JSON.parse(fs.readFileSync('data/world.json','utf8'));
const digits=s=>String(s||'').replace(/\D/g,'');
const sm=fs.readFileSync('sitemap.xml','utf8');
const doc=f=>new JSDOM(fs.readFileSync(f,'utf8')).window.document;

// data rules
const ids=new Set();
for(const r of [...W.worldwide,...W.countries.flatMap(c=>c.resources)]){
 assert(!ids.has(r.id),'duplicate id '+r.id);ids.add(r.id);
 assert(r.sources.length&&r.sources.every(u=>u.startsWith('https://')),r.id+' sources');
 assert(/^\d{4}-\d{2}-\d{2}$/.test(r.reviewed_on),r.id+' reviewed_on');
 if(r.phone)assert.equal(digits(r.phone),digits(r.dial),r.id+' dials the number it prints');
 assert(!/988|911/.test(r.how||'')||['ca-988','world-us-citizens'].includes(r.id)||/112|111|999|000/.test(r.how),r.id+' does not send people to U.S. numbers');
}
for(const c of W.countries){
 assert(c.resources.some(r=>r.section==='help-now'),c.code+' has a crisis line');
 assert(c.resources.some(r=>r.section!=='help-now'&&r.section!=='start'||r.section==='start'),c.code+' has disability listings');
 assert(c.resources.filter(r=>r.section!=='help-now').length>=1,c.code+' has at least one disability listing');
}

// world.html
const w=doc('world.html');
assert.equal(w.querySelectorAll('h1').length,1);
assert.equal(w.querySelector('link[rel=canonical]').href,'https://mobilitytalk.org/world.html');
assert(sm.includes('https://mobilitytalk.org/world.html</loc>'),'world.html in sitemap');
const li=[...w.querySelectorAll('#country-list li')];
assert.equal(li.length,W.countries.length,'one row per country');
for(const c of W.countries){
 const row=li.find(l=>l.querySelector('a').getAttribute('href')==='countries/'+c.slug+'.html');
 assert(row,'world.html links '+c.slug);
 assert(row.querySelector(`a[href="tel:${c.emergency.number}"]`),c.code+' emergency number on the world page');
}
for(const r of W.worldwide)assert(w.querySelector('main').textContent.includes(r.name),'world page lists '+r.name);
assert(!w.querySelector('aside.urgent')&&!w.querySelector('a[href="tel:988"]'),'world page does not use the U.S. crisis strip');
assert(w.querySelector('#site-nav a[href="world.html"][aria-current="page"]'),'world page marked current in the menu');
assert(/<!--gc-->/.test(fs.readFileSync('world.html','utf8')),'world page counts visits');

// country pages
const files=fs.readdirSync('countries').filter(f=>f.endsWith('.html'));
assert.deepEqual(files.sort(),W.countries.map(c=>c.slug+'.html').sort(),'one page per country, no strays');
let listings=0,calls=0;
for(const c of W.countries){
 const f='countries/'+c.slug+'.html',html=fs.readFileSync(f,'utf8'),d=doc(f),main=d.querySelector('main');
 assert.equal(d.documentElement.lang,'en');assert.equal(d.querySelectorAll('h1').length,1,f+' h1');
 assert.equal(d.querySelector('link[rel=canonical]').href,'https://mobilitytalk.org/'+f,f+' canonical');
 assert.equal(d.querySelectorAll('link[rel=canonical]').length,1);
 assert(sm.includes('https://mobilitytalk.org/'+f+'</loc>'),f+' in sitemap');
 assert(d.querySelector('meta[property="og:image"]')&&d.querySelector('meta[name=description]'),f+' social and description');
 const ld=JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent);
 assert.equal(ld['@type'],'BreadcrumbList');assert.equal(ld.itemListElement[1].item,'https://mobilitytalk.org/world.html');
 // the country's own emergency number is on the page in a small side note (owner direction, November 22 and 23, 2026), not the U.S. strip
 const em=main.querySelector(':scope > .side-help > aside.emergency');
 assert(em&&em.querySelector(`a[href="tel:${c.emergency.number}"]`),f+' emergency number in the side note');
 assert(!main.firstElementChild.classList.contains('emergency')&&!main.firstElementChild.classList.contains('side-help'),f+' the side note is not a banner at the top');
 // the opening speaks to the visitor and lists what is there for that country, each group linked
 const lede=d.querySelector('header .lede');assert(lede&&lede.textContent.includes(c.name.replace(/^(the )/,'')),f+' opening');
 for(const k of ['start','money','equipment-home','work','rights'])if(c.resources.some(r=>r.section===k))assert(d.querySelector(`header .lede-list a[href="#${k}"]`)&&d.getElementById(k),f+' opening links '+k);
 assert(!/\b\d+ (national programs|listings)\b/.test(d.body.textContent),f+' states no count of listings');
 assert(!d.querySelector('aside.urgent'),f+' no U.S. urgent strip');
 if(c.code!=='CA')assert(!d.querySelector('a[href="tel:988"],a[href="tel:911"],a[href="tel:711"]')||c.emergency.number==='911',f+' no U.S. numbers');
 const crisis=c.resources.find(r=>r.section==='help-now');
 assert(em.querySelector(`a[href="tel:${crisis.dial}"]`),f+' crisis line in the side note');
 // every listing, with its number, sources and date
 for(const r of c.resources){
  const card=[...d.querySelectorAll('article.card')].find(a=>a.querySelector('h3').textContent===r.name);
  assert(card,f+' missing '+r.name);listings++;
  assert.equal(card.closest('section').id,r.section==='help-now'?'crisis':r.section,r.id+' is in its section');
  if(r.phone){const a=card.querySelector('a[href^="tel:"]');assert.equal(a.getAttribute('href'),'tel:'+r.dial,r.id+' call link');assert.equal(a.textContent,'Call '+r.phone,r.id+' shows its number');calls++;}
  if(r.text)assert(card.querySelector(`a[href="sms:${digits(r.text)}"]`),r.id+' text link');
  if(r.url)assert(card.querySelector(`a[href="${r.url}"]`),r.id+' website');
  if(r.email)assert(card.querySelector(`a[href="mailto:${r.email}"]`),r.id+' email');
  for(const u of r.sources)assert(card.querySelector(`a[href="${u.replace(/"/g,'\\"')}"]`),r.id+' source '+u);
  assert(card.textContent.includes('Checked '+r.reviewed_on),r.id+' date');
  assert.equal(/confirm details/.test(card.textContent),r.record_status==='directory_listed',r.id+' confirm-details note only on directory listings');
 }
 assert.equal(d.querySelectorAll('article.card').length,c.resources.length,f+' no extra cards');
 if(c.relay)assert(main.querySelector('.relay'),f+' relay note');
 // links, anchors, new tabs, menu, footer, counter, no ads
 for(const el of d.querySelectorAll('[href],[src]')){
  const u=el.getAttribute('href')||el.getAttribute('src');
  if(/^(https:|mailto:|tel:|sms:|#)/.test(u))continue;
  assert(!/^http:/.test(u),f+' insecure link '+u);
  assert(fs.existsSync(path.join('countries',decodeURIComponent(u.split(/[?#]/)[0]))),f+' links to missing '+u);
 }
 for(const a of d.querySelectorAll('a[href^="#"]'))assert(d.getElementById(a.getAttribute('href').slice(1)),f+' anchor '+a.getAttribute('href'));
 for(const a of d.querySelectorAll('a[target=_blank]'))assert(/noopener/.test(a.rel)&&/new tab/.test(a.textContent),f+' new tab links say so');
 for(const a of d.querySelectorAll('a[href^="tel:"]'))assert(/^tel:[*+]?\d{2,15}$/.test(a.getAttribute('href')),f+' bad tel '+a.getAttribute('href')); // two digits: Senegal's 15
 assert(d.querySelector('#site-nav a[href="../world.html"][aria-current="page"]')&&d.querySelector('button.navtoggle'),f+' menu');
 assert(d.querySelector('footer a.privacy-link[href="../privacy.html"]'),f+' privacy link');
 assert(/<!--gc-->/.test(html)&&!/ad-slot/.test(html),f+' counts visits and carries no ad');
 assert(!/undefined|null<|\[object/.test(html),f+' no template leaks');
}
// every main menu offers the worldwide page
const roots=fs.readdirSync('.').filter(f=>f.endsWith('.html')&&!/^google[0-9a-f]{16}\.html$/.test(f)&&!['404.html','espanol.html'].includes(f));
for(const f of roots)assert(doc(f).querySelector('nav[aria-label="Main"] a[href="world.html"],nav[aria-label="Back"] a[href="world.html"]'),f+' menu links Worldwide');
for(const f of fs.readdirSync('states').filter(f=>f.endsWith('.html')))assert(doc('states/'+f).querySelector('#site-nav a[href="../world.html"]'),'states/'+f+' menu links Worldwide');
assert(doc('index.html').querySelector('#world-line a[href="world.html"]'),'home page points to the worldwide page');
console.log(`PASS world: world.html and ${files.length} country pages, ${listings} listings with ${calls} call links that dial the number shown, sources and dates on every card, each page opening with what is listed there and carrying its own emergency number and crisis line in a side note, sitemap, menus, privacy link, visit counter and no ads.`);
