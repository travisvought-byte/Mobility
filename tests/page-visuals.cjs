// Visuals on the remaining U.S. pages (November 25, 2026): the states index, the directory, the Spanish page, the advocacy
// page, the handout, about, privacy, partner, the auction and the 404 page. Checks that every U.S. page now carries at least
// one picture, that every icon is decorative and points to a drawing that exists, that step diagrams are real ordered lists
// whose links reach their sections, that jump tiles name their sections exactly, and that the key on the states index names
// exactly the groups the state pages use.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const doc=f=>new JSDOM(fs.readFileSync(f,'utf8')).window.document;
const text=e=>e.textContent.replace(/\s+/g,' ').trim();
const sprite=fs.readFileSync('assets/icons.svg','utf8');
const symbols=new Set([...sprite.matchAll(/<symbol id="([a-z_]+)"/g)].map(m=>m[1]));
let icons=0;
function check(f){
 const d=doc(f);
 for(const s of d.querySelectorAll('svg')){
  if(s.getAttribute('role')==='img'){assert(s.getAttribute('aria-labelledby')||s.getAttribute('aria-label'),f+' informative drawing has a name');continue;}
  assert.equal(s.getAttribute('aria-hidden'),'true',f+' icon hidden from screen readers');assert.equal(s.getAttribute('focusable'),'false',f+' icon not focusable');
  assert.equal(s.querySelectorAll('title,text').length,0,f+' icon carries no text');
  for(const u of s.querySelectorAll('use')){const m=u.getAttribute('href').match(/^(?:\/|\.\.\/)?assets\/icons\.svg#([a-z_]+)$/);assert(m&&symbols.has(m[1]),f+' icon points to a drawing in icons.svg: '+u.getAttribute('href'));}
  icons++;
 }
 const ids=[...d.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length,f+' ids are unique');
 for(const a of d.querySelectorAll('a[href^="#"]'))if(a.getAttribute('href').length>1)assert(d.getElementById(a.getAttribute('href').slice(1)),f+' anchor '+a.getAttribute('href'));
 for(const o of d.querySelectorAll('ol.stepper')){assert.equal(o.getAttribute('role'),'list',f+' list role kept when numbers are drawn');const li=o.querySelectorAll(':scope > li');assert(li.length>=2,f+' steps');for(const l of li)assert(text(l).length>5,f+' each step has words');}
 return d;
}
const visual=d=>d.querySelector('svg,ol.stepper,ol.timeline,ul.barchart,img');

// every U.S. page (the lite and country pages are left as they are on purpose) carries at least one picture
const US=['index.html','about.html','auction.html','blind-low-vision.html','caregiver-respite.html','deaf-hard-of-hearing.html','disability-advocacy.html','espanol.html','handout.html','know-your-rights.html','local-help.html','mobility-independence.html','mobility-rights.html','partner.html','privacy.html','ramps-home-access.html','service-animals.html','accessible-vehicles.html','free-medical-equipment.html','social-security-disability.html','accessible-travel.html','paid-family-caregiver.html','home-modifications.html','disability-housing.html','disability-jobs.html','disability-parking.html','vehiculos-adaptados.html','equipo-medico-gratis.html','incapacidad-seguro-social.html','cuidador-familiar-pagado.html','modificaciones-hogar.html','vivienda-discapacidad.html','empleo-discapacidad.html','estacionamiento-discapacidad.html','404.html','states/index.html',...fs.readdirSync('states').filter(f=>f.endsWith('.html')&&f!=='index.html').map(f=>'states/'+f)];
for(const f of US)assert(visual(check(f)),f+' has a visual');

// states index: one key entry per group used on any state page, in the state pages' order, each with that group's icon
{const groups=new Map();for(const f of fs.readdirSync('states').filter(f=>f.endsWith('.html')&&f!=='index.html')){const d=doc('states/'+f);
  for(const h of d.querySelectorAll('h2.cat-h'))groups.set(text(h),h.querySelector('svg').innerHTML);}
 const key=[...doc('states/index.html').querySelectorAll('#groups-h ~ ul.groupkey > li')];assert.equal(key.length,groups.size,'key names every group the state pages use');
 for(const li of key){assert(groups.has(text(li)),'key entry is a state page group: '+text(li));assert.equal(li.querySelector('svg').innerHTML,groups.get(text(li)),'key icon matches the state pages: '+text(li));}}

// directory: need buttons get their group's icon from icons.svg; national directories list carries icons
{const d=doc('local-help.html'),gd=JSON.parse(d.getElementById('guide-data').textContent);assert(gd.icons.length>=15,'need icons');for(const k of gd.icons){assert(symbols.has(k),'need icon drawn: '+k);assert(gd.guides[k],'need icon is a need: '+k);}
 assert(/needIcon\(k\)/.test(fs.readFileSync('assets/local-help.js','utf8')),'need buttons carry their icon');assert.equal(d.querySelectorAll('#locators ul.iconlist > li > svg').length,5,'national directories have icons');}

// Spanish page: one tile per section in page order, each naming its section exactly, and the same icon on the heading
{const d=doc('espanol.html'),tiles=[...d.querySelectorAll('nav.toc.tiles.guide a')],hs=[...d.querySelectorAll('main h2.cat-h')];
 assert.equal(d.querySelector('nav.toc.tiles.guide').getAttribute('aria-label'),'Secciones de esta página');assert(tiles.length>=10);
 tiles.forEach((a,i)=>{const h=d.getElementById(a.getAttribute('href').slice(1));assert.equal(h,hs[i],'tiles follow page order');assert.equal(text(a),text(h),'tile names its section');
  assert.equal(a.querySelector('svg').innerHTML,h.querySelector('svg').innerHTML,'tile and heading share an icon');});}

// advocacy: an icon on each problem and topic card, and the three steps link to their parts of the builder
{const d=doc('disability-advocacy.html');assert.equal(d.querySelectorAll('.problem-grid > a > svg.pic').length,7);assert.equal(d.querySelectorAll('.topic > svg.pic').length,5);
 const st=[...d.querySelectorAll('nav.howto ol.stepper a.st')].map(a=>a.getAttribute('href'));assert.deepEqual(st,['#compose','#review','#contacts']);
 assert(/\.howto ol\.stepper/.test(fs.readFileSync('assets/disability-advocacy.css','utf8')),'step drawing styles load on both pages that use them');
 const mr=doc('mobility-rights.html');assert([...mr.querySelectorAll('link[rel=stylesheet]')].some(l=>l.getAttribute('href')==='assets/disability-advocacy.css'),'the finder still loads the step styles');}

// handout, about, auction: step diagrams; privacy: who your browser talks to, each linked to its section; partner and 404: icons
assert.equal(doc('handout.html').querySelectorAll('section.no-print ol.stepper > li').length,3,'handout steps stay off the printout');
{const d=doc('about.html');assert.equal(d.querySelectorAll('ul.iconlist').length,2);assert.equal(d.querySelectorAll('#fix-h ~ ol.stepper > li').length,3);}
assert.equal(doc('auction.html').querySelectorAll('#how-h ~ ol.stepper > li').length,4,'auction steps');
{const d=doc('privacy.html'),cards=[...d.querySelectorAll('ul.glance > li')];assert.equal(cards.length,5);for(const c of cards)assert(d.getElementById(c.querySelector('a.gt').getAttribute('href').slice(1)),'card links its section');
 assert.equal(d.querySelectorAll('#short-h ~ ul.iconlist > li > svg').length,6);}
assert.equal(doc('partner.html').querySelectorAll('h2.cat-h > svg.hic').length,6,'partner section icons');
assert.equal(doc('404.html').querySelectorAll('.grid > article > svg.hic').length,3,'404 card icons');

// stylesheet: the new parts keep Windows high contrast and print fallbacks
const css=fs.readFileSync('assets/site.css','utf8');
assert(/@media\(forced-colors:active\)\{ul\.glance>li>svg\{background:none\}\}/.test(css)&&/@media print\{ul\.groupkey svg,ul\.glance>li>svg,\.need svg\.nic\{display:none\}/.test(css),'high contrast and print');
console.log(`PASS page visuals: every one of ${US.length} U.S. pages has a picture; ${icons} decorative icons, all drawn from icons.svg or inline; step lists, tiles and the states key match their pages.`);
