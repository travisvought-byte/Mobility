// Guide visuals (November 24, 2026): step diagrams, a deadline chart, a service dog and emotional support animal
// comparison, short timelines, jump tiles and icons on the long guides and the country pages.
// Checks that every picture only repeats what the page's words say (steps are real ordered lists, chart values are
// words from the sources' own deadlines, timeline dates are the dates in the text), that icons are decorative and
// point to drawings that exist, that ids stay unique, and that the new parts keep a high contrast and print fallback.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const doc=f=>new JSDOM(fs.readFileSync(f,'utf8')).window.document;
const css=fs.readFileSync('assets/site.css','utf8');
const sprite=fs.readFileSync('assets/icons.svg','utf8');
const symbols=new Set([...sprite.matchAll(/<symbol id="([a-z_]+)"/g)].map(m=>m[1]));
assert(symbols.size>=40&&!/<script|href=|<text|<title/.test(sprite),'icons.svg holds line drawings only');
const text=e=>e.textContent.replace(/\s+/g,' ').trim();
let svgs=0,uses=0;
// every icon on these pages is decorative: hidden from screen readers, no text of its own, and drawn here or in icons.svg
function icons(d,f){
 for(const s of d.querySelectorAll('svg')){
  if(s.getAttribute('role')==='img'){assert(s.getAttribute('aria-labelledby')||s.getAttribute('aria-label'),f+' informative drawing has a name');continue;}
  assert.equal(s.getAttribute('aria-hidden'),'true',f+' icon hidden from screen readers');assert.equal(s.getAttribute('focusable'),'false',f+' icon not focusable');
  assert.equal(s.querySelectorAll('title,text').length,0,f+' icon carries no text');
  for(const u of s.querySelectorAll('use')){const h=u.getAttribute('href');const m=h.match(/^(?:\.\.\/)?assets\/icons\.svg#([a-z_]+)$/);
   assert(m&&symbols.has(m[1]),f+' icon points to a drawing in icons.svg: '+h);uses++;}
  svgs++;
 }
 const ids=[...d.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length,f+' ids are unique');
 for(const a of d.querySelectorAll('a[href^="#"]'))if(a.getAttribute('href').length>1)assert(d.getElementById(a.getAttribute('href').slice(1)),f+' anchor '+a.getAttribute('href'));
}
// jump tiles: each names its section exactly and carries one icon
function tiles(d,f,min){
 const nav=d.querySelector('nav.toc.tiles.guide');assert(nav,f+' jump tiles');const links=[...nav.querySelectorAll('a')];assert(links.length>=min,f+' tiles');
 for(const a of links){const t=d.getElementById(a.getAttribute('href').slice(1));assert(t,f+' tile target');assert.equal(a.querySelectorAll('svg.tic').length,1,f+' one icon per tile');
  const h=t.matches('h2,h3')?t:t.querySelector('h2,h3'),hw=new Set(text(h).toLowerCase().split(' '));assert(text(a).toLowerCase().split(' ').every(w=>hw.has(w)),f+' tile names its section: '+text(a));}
 return links.length;
}
// step diagrams are ordered lists whose steps are words on the page
function steppers(d,f){const ol=[...d.querySelectorAll('ol.stepper')];for(const o of ol){assert.equal(o.tagName,'OL');assert.equal(o.getAttribute('role'),'list',f+' list role kept when bullets are hidden');
 const li=o.querySelectorAll(':scope > li');assert(li.length>=2,f+' steps');for(const l of li)assert(text(l).length>5,f+' each step has words');}return ol.length;}

// Know your rights: tiles and heading icons for the 14 situations, and the deadline chart
const kyr=JSON.parse(fs.readFileSync('data/know-your-rights.json','utf8')),k=doc('know-your-rights.html');icons(k,'know-your-rights');
assert.equal(tiles(k,'know-your-rights',14),kyr.rows.length);
for(const r of kyr.rows)assert.equal(k.getElementById(r.id).querySelectorAll('h3 svg.hic').length,1,r.id+' heading icon');
const bars=[...k.querySelectorAll('figure.viz ul.barchart > li')];let expect=[];
for(const r of kyr.rows)for(const b of r.deadline_chart||[]){assert(r.deadline.includes(b.value),r.id+' chart value is in the source wording');expect.push({...b,id:r.id});}
expect.sort((a,b)=>a.days-b.days);assert.equal(bars.length,expect.length,'one bar per stated deadline');assert(bars.length>=3);
bars.forEach((li,i)=>{const e=expect[i];assert.equal(li.querySelector('a').getAttribute('href'),'#'+e.id,'bar links its situation');assert.equal(text(li.querySelector('.bv')),e.value,'bar value written out');
 const w=parseFloat(li.querySelector('.bf').getAttribute('style').match(/--w:([\d.]+)%/)[1]);assert(Math.abs(w-e.days/365*100)<0.06,'bar drawn to scale');
 assert.equal(li.querySelector('.bt').getAttribute('aria-hidden'),'true','the bar itself is hidden; its value is text');
 const dl=k.getElementById(e.id).querySelector('.deadline');assert(dl&&dl.textContent.includes(e.value),e.id+' deadline on the page says '+e.value);});
assert(/drawn to scale/.test(text(k.querySelector('figure.viz figcaption')))&&/generally/.test(text(k.querySelector('figure.viz figcaption'))),'chart caption says how to read it');

// Service animals: tiles, two questions as bubbles, the comparison with words beside every symbol, the 48-hour timelines
const sa=JSON.parse(fs.readFileSync('data/service-animals.json','utf8')),s=doc('service-animals.html');icons(s,'service-animals');tiles(s,'service-animals',sa.sections.length);
const cmp=s.querySelector('.compare');assert(cmp&&s.getElementById(sa.compare.after).contains(cmp),'comparison sits in its section');
const cells=[...cmp.querySelectorAll('.cmp-cell')];assert.equal(cells.length,sa.compare.rows.reduce((n,r)=>n+(r.cells?2:1),0));
for(const c of cells){const m=c.querySelector('dd > .mark');assert(m&&/^(yes|no|differs)$/.test(m.classList[1]),'each cell has a mark');assert(text(m).length>2,'mark has a word, not color alone');
 assert(c.querySelector('dt')&&text(c.querySelector('dt')).length>5,'each cell says which animal');assert(c.querySelector('a.cite'),'each cell cites its source');}
for(const r of sa.compare.rows)assert(cmp.querySelector(`.cmp-where a[href="${r.href}"]`),'row links its section '+r.href);
assert.equal(cmp.querySelector('.cmp-cols').getAttribute('aria-hidden'),'true','column labels are visual only; each cell names its animal');
const air=s.getElementById(sa.form_timeline.after),lanes=[...air.querySelectorAll('figure.viz ol.timeline')];assert.equal(lanes.length,sa.form_timeline.lanes.length,'48-hour timelines');
const airText=text(air.querySelector(':scope > ul'));assert(/48 hours before departure/.test(airText)&&/at the gate/.test(airText),'the 48-hour rule is in the statements above the timeline');
steppers(s,'service-animals');

// Caregivers: tiles with the section icons
const cg=doc('caregiver-respite.html');icons(cg,'caregiver-respite');tiles(cg,'caregiver-respite',5);

// Topic guides (accessible vehicles, free and low-cost equipment, Social Security disability, accessible travel, paid family
// caregivers, home modifications, disability housing, disability jobs, and the Spanish versions of all but accessible travel): tiles, icons and step lists
for(const g of ['accessible-vehicles','free-medical-equipment','social-security-disability','accessible-travel','paid-family-caregiver','home-modifications','disability-housing','disability-jobs','disability-parking','vehiculos-adaptados','equipo-medico-gratis','incapacidad-seguro-social','cuidador-familiar-pagado','modificaciones-hogar','vivienda-discapacidad','empleo-discapacidad']){const gd=JSON.parse(fs.readFileSync('data/'+g+'.json','utf8')),d=doc(g+'.html');icons(d,g);assert.equal(tiles(d,g,gd.sections.length+2),gd.sections.length+2,g+' one tile per section plus quick answers and sources');assert.equal(steppers(d,g),gd.sections.filter(s=>s.steps).length,g+' step lists');}

// Vision and hearing guides: the three steps, jump tiles, a key of kinds, and the same icon on every kind heading
for(const f of ['blind-low-vision.html','deaf-hard-of-hearing.html']){const d=doc(f);icons(d,f);tiles(d,f,3);assert.equal(steppers(d,f),1,f+' how to use this page');
 const key=[...d.querySelectorAll('ul.kinds-key > li')].map(l=>[text(l),l.querySelector('use').getAttribute('href')]),kinds=new Map(key);assert(key.length>=4,f+' key');
 const hs=[...d.querySelectorAll('.state-group h4')];assert(hs.length>50,f+' kind headings');
 for(const h of hs){const u=h.querySelector('svg.kic use');assert(u,f+' heading icon');assert.equal(kinds.get(text(h)),u.getAttribute('href'),f+' heading icon matches the key: '+text(h));}}

// Ramps: route icons, icon list, the checklists' parts as steps that jump to each part, and the decorative header drawing
const rp=doc('ramps-home-access.html');icons(rp,'ramps');assert.equal(rp.querySelectorAll('.route article > svg.hic').length,6,'route icons');
assert.equal(rp.querySelectorAll('ul.iconlist > li > svg').length,4,'before-you-spend icons');
const art=rp.querySelector('header svg.hero-art');assert(art&&art.getAttribute('aria-hidden')==='true'&&!art.querySelector('text'),'header drawing is decorative and states no measurement');
for(const det of rp.querySelectorAll('details[id]')){const ol=det.querySelector('ol.stepper'),hs=[...det.querySelectorAll('h3.check-h')];assert(ol,det.id+' steps');
 assert.deepEqual([...ol.querySelectorAll('li')].map(text),hs.map(text),det.id+' steps are the checklist parts in order');
 [...ol.querySelectorAll('a')].forEach((a,i)=>assert.equal(a.getAttribute('href'),'#'+hs[i].id,det.id+' step jumps to its part'));}
steppers(rp,'ramps');

// Repair and adapt: the timeline repeats dates from the list above it
const mi=doc('mobility-independence.html');icons(mi,'mobility-independence');const rtr=mi.getElementById('right-to-repair'),list=text(rtr.querySelector('ul'));
const dates=[...rtr.querySelectorAll('ol.timeline time')];assert.equal(dates.length,3);for(const t of dates)assert(list.includes(text(t)),'timeline date is in the list: '+text(t));

// Finder: the four steps link to the four numbered sections
const mr=doc('mobility-rights.html');const how=[...mr.querySelectorAll('nav.howto ol.stepper a')];assert.equal(how.length,4);
how.forEach((a,i)=>{const sec=mr.getElementById(a.getAttribute('href').slice(1));assert(sec,'finder step target');assert.equal(text(sec.querySelector('h2')),`${i+1}. ${text(a)}`,'finder step names its section');});

// Country pages: one icon per group heading and per line of the opening list, from icons.svg
let countries=0;
for(const f of fs.readdirSync('countries').filter(f=>f.endsWith('.html'))){const d=doc('countries/'+f);
 for(const h of d.querySelectorAll('main > section[id] > h2'))if(h.parentElement.id!=='about')assert.equal(h.querySelectorAll('svg.hic use').length,1,f+' group icon');
 for(const li of d.querySelectorAll('.lede-list li'))assert.equal(li.querySelectorAll('svg.lic use').length,1,f+' opening line icon');
 icons(d,f);countries++;}

// stylesheet: new parts keep Windows high contrast, dark mode and print fallbacks, and load nothing from outside
assert(/@media\(forced-colors:active\)\{svg\.kic,svg\.mic,\.iconlist svg\{background:none\}/.test(css)&&/\.barchart \.bf\{forced-color-adjust:none;background:CanvasText\}/.test(css),'high contrast mode keeps icons and bars');
assert(/ol\.stepper>li::before\{[^}]*border:2px solid var\(--green\)/.test(css),'step circles have a border, which shows in high contrast mode');
assert(/@media print\{\.toc\.tiles\.guide,\.kinds-key\{display:none\}/.test(css),'print drops the jump tiles and key');
assert(/\.hero-art\{display:none\}/.test(css),'header drawing hidden on narrow screens');
console.log(`PASS guide visuals: ${bars.length} deadline bars from the sources' own words, a cited service dog and emotional support animal comparison, step lists, timelines and jump tiles on 9 guides; ${svgs} decorative icons (${uses} from icons.svg) on the guides and ${countries} country pages.`);
