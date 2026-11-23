// Landing pages (owner direction, November 23, 2026): every page a visitor can land on from search speaks to the person
// most likely to arrive there. Each has its own title, description, heading and share tags, an opening written to that
// visitor, and the actions they most likely came for first. Crisis and emergency numbers are a small side note, never a
// banner at the top, and no page states a count of listings. The home page has an "I'm here as" chooser.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const L=JSON.parse(fs.readFileSync('data/landing.json','utf8')).pages;
// each page is parsed, checked and closed in turn, so the run stays small in memory
const open=[];const doc=f=>{while(open.length)open.pop().close();const w=new JSDOM(fs.readFileSync(f,'utf8')).window;open.push(w);return w.document;};
const pages=[...Object.keys(L),...fs.readdirSync('states').filter(f=>f.endsWith('.html')).map(f=>'states/'+f),...fs.readdirSync('countries').filter(f=>f.endsWith('.html')).map(f=>'countries/'+f)];
const seen={title:new Map(),desc:new Map(),h1:new Map(),lede:new Map()};
const once=(k,v,f)=>{assert(v&&v.length>8,f+' has a '+k);assert(!seen[k].has(v),`${f} repeats the ${k} of ${seen[k].get(v)}: ${v}`);seen[k].set(v,f);};
const COUNT=/\b\d+ (programs?|listings?|listed|national services|services and|agencies and)\b/i;
for(const f of [...new Set(pages)]){
 const d=doc(f),t=d.querySelector('title').textContent.trim(),desc=d.querySelector('meta[name=description]').content;
 once('title',t,f);once('desc',desc,f);once('h1',d.querySelector('h1').textContent.replace(/\s+/g,' ').trim(),f);
 assert(desc.length<=160,f+' description fits a search result: '+desc.length);
 const og=d.querySelector('meta[property="og:title"]').content,ogd=d.querySelector('meta[property="og:description"]').content;
 assert(t.startsWith(og)||og===t,f+' share title matches the page title');assert.equal(ogd,desc,f+' share description matches');
 const lede=d.querySelector('header .lede');assert(lede,f+' opens with words to its visitor');once('lede',lede.textContent.trim(),f);
 for(const s of [t,desc,lede.textContent])assert(!COUNT.test(s),f+' states no count of listings: '+s);
 const main=d.querySelector('main');
 assert(!main.firstElementChild.matches('aside.urgent,aside.emergency,.side-help,section.urgent'),f+' does not open on a crisis banner');
 const side=d.querySelector('.side-help');if(side)assert.equal(side.parentElement,main,f+' side note sits in main');
 // in-page action links land somewhere on the page
 for(const a of d.querySelectorAll('header .hero-actions a[href^="#"], header .lede-list a[href^="#"]'))assert(d.getElementById(a.getAttribute('href').slice(1)),f+' action '+a.getAttribute('href'));
}
// root pages carry their landing copy from the data file
for(const [f,c] of Object.entries(L)){
 const d=doc(f),lede=d.querySelector('header .lede');
 assert.equal(lede.textContent,c.intro,f+' opening comes from data/landing.json');
 assert(c.audience,f+' records who it is written for');
 if(c.h1)assert.equal(d.querySelector('h1').innerHTML,c.h1,f+' heading');
 if(c.title)assert.equal(d.querySelector('title').textContent,c.title,f+' title');
 const acts=[...d.querySelectorAll('header .hero-actions a')].map(a=>[a.textContent,a.getAttribute('href').replace(/^\.\.\//,'')]);
 assert.deepEqual(acts,(c.actions||[]).map(a=>[a.label,a.href]),f+' actions in order');
 for(const a of c.actions||[])if(!a.href.startsWith('#'))assert(fs.existsSync(a.href.split('?')[0]),f+' action page exists: '+a.href);
}
// the home page chooser: every kind of visitor routes to a page or filter that exists
{const d=doc('index.html'),iam=d.querySelector('header nav.iam');assert(iam,'home chooser');
 assert.match(iam.querySelector('h2').textContent,/I’m here as/);
 const links=[...iam.querySelectorAll('a')];assert.equal(links.length,L['index.html'].iam.length);
 for(const a of links){const h=a.getAttribute('href').split('?')[0];assert(fs.existsSync(h),'chooser link '+h);a.getBoundingClientRect;}
 for(const want of ['Wheelchair','Blind','Deaf','caregiver','Parent','Veteran','discrimination'])assert(links.some(a=>a.textContent.includes(want)),'chooser offers '+want);
 const aud=JSON.parse(fs.readFileSync('data/local-programs.json','utf8'));
 for(const a of links){const q=new URL(a.getAttribute('href'),'https://x/').searchParams;
  if(q.get('audience'))assert(aud.audiences[q.get('audience')],'audience filter exists: '+q.get('audience'));
  if(q.get('category'))assert(aud.categories[q.get('category')],'category filter exists: '+q.get('category'));}}
// state pages name what is distinctive in their own listings, and their first calls are records on that page
const recs=JSON.parse(fs.readFileSync('data/local-programs.json','utf8')).records;
let firstCalls=0;
for(const f of fs.readdirSync('states').filter(f=>f.endsWith('.html')&&f!=='index.html')){
 const d=doc('states/'+f),lede=d.querySelector('header .lede').textContent;
 for(const m of lede.matchAll(/include ([^.]+)\./g))for(const nm of (m[1].includes('; ')?m[1].split(/; and |; /):m[1].split(/, and |, | and /))){
  const n=nm.replace(/^and /,'').trim();assert(recs.some(r=>r.name.startsWith(n)||r.name===n),f+' names a listed program: '+n);
  assert(d.body.textContent.includes(n),f+' the program it names is on the page: '+n);}
 for(const li of d.querySelectorAll('.firstcalls li')){const call=li.querySelector('a[href^="tel:"]');
  if(call)assert([...d.querySelectorAll('article.card a[href^="tel:"]')].some(a=>a.getAttribute('href')===call.getAttribute('href')),f+' first call matches a listing');
  const g=li.querySelector('a[href^="#"]');assert(g&&d.getElementById(g.getAttribute('href').slice(1)),f+' first call links its group');firstCalls++;}
}
console.log(`PASS landing: ${seen.title.size} entry pages with their own title, description, heading, share tags and opening; actions first and in place; no crisis banner at the top and no listing counts; home "I'm here as" chooser routes ${L['index.html'].iam.length} kinds of visitor; state openings name programs on their own page; ${firstCalls} first calls match listings.`);
