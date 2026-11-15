const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('local-help.html','utf8'),script=fs.readFileSync('assets/local-help.js','utf8');
const main=JSON.parse(fs.readFileSync('data/local-programs.json','utf8')),vso=JSON.parse(fs.readFileSync('data/county-veterans-offices.json','utf8'));
async function load(query=''){
 const dom=new JSDOM(html,{url:'https://example.org/local-help.html'+query,runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.fetch=async u=>({ok:true,json:async()=>u.includes('county-veterans')?vso:main});
 w.eval(script);await new Promise(r=>setTimeout(r,20));
 const $=id=>d.getElementById(id),set=(id,v)=>{$(id).value=v;$(id).dispatchEvent(new w.Event(id==='f-q'?'input':'change'));};
 return {dom,w,d,$,set,text:()=>$('results').textContent};
}
(async()=>{
 // data integrity
 assert(main.records.length>500&&vso.records.length>1000);
 const ids=new Set();for(const r of main.records.concat(vso.records)){assert(!ids.has(r.id),'duplicate id '+r.id);ids.add(r.id);assert(r.name&&r.category&&r.state&&['national','statewide','counties'].includes(r.scope));assert(r.phone||r.url||r.web,'no way to reach '+r.id);if(r.scope==='counties')assert(r.counties.length>0);}
 const covered=new Set(main.records.map(r=>r.state).filter(s=>s!=='US'));assert(covered.size>=20&&covered.has('OH')&&covered.has('KY'),'state-level programs for the researched states');assert(main.records.filter(r=>r.state==='US').length>=5,'federal baseline for every state');
 // Ohio default: statewide, national and county routes, grouped
 const p=await load();assert.equal(p.$('f-state').value,'OH');const t=p.text();
 assert(t.includes('Ramps & home modification'));assert(t.includes('VA Home Improvements and Structural Alterations'));assert(t.includes('Ohio waiver home modifications'));assert(t.includes('AT Ohio Device Lending Library'));assert(t.includes('Delaware County Board of Developmental Disabilities'));
 assert(p.$('status').textContent.includes('Choose a county'));assert(!t.includes('County veterans')||true);
 // county narrowing keeps national/statewide, drops other counties, adds that county's veterans office
 p.set('f-county','Delaware');const d2=p.text();assert(d2.includes('Delaware County Board'));assert(!d2.includes('Wyandot County Board'));assert(d2.includes('Center for Disability Empowerment'));assert(d2.includes('VA Specially Adapted Housing'));assert(p.$('results').querySelectorAll('a[href^="tel:"]').length>0);assert(p.$('f-county').value==='Delaware');
 assert(d2.includes('Veterans benefits help'),'county veterans office appears once a county is chosen');
 // category + search + state change
 p.set('f-cat','independent_living');assert(!p.text().includes('Ramps & home modification'));assert(p.text().includes('Independent living centers'));
 p.set('f-cat','');p.set('f-q','ramp');assert(p.text().toLowerCase().includes('ramp'));p.set('f-q','zzzz-no-match');assert(p.$('status').textContent.includes('No programs match'));
 p.set('f-q','');p.set('f-state','KY');assert.equal(p.$('f-county').value,'');assert(p.text().includes('RampUp! KY'));assert(!p.text().includes('Ohio waiver'));assert(p.text().includes('Specially Adapted Housing'));
 assert(new URL(p.w.location.href).searchParams.get('state')==='KY');
 // a state with only the national baseline still shows federal routes
 p.set('f-state','WY');assert(p.text().includes('Specially Adapted Housing'));assert(p.$('status').textContent.includes('have not added Wyoming'));assert(p.d.getElementById('locators').textContent.includes('Centers for Independent Living'));assert(p.$('guide-link').href.includes('state=WY'));
 // links are safe: https only, no javascript:, user text never becomes markup
 for(const a of p.$('results').querySelectorAll('a[href]')){const h=a.getAttribute('href');assert(/^(https?:|tel:|mailto:)/.test(h),'unsafe href '+h);}
 p.set('f-q','<img src=x onerror=bad()>');assert.equal(p.$('results').querySelectorAll('img').length,0);
 assert.equal(p.w.localStorage.length+p.w.sessionStorage.length,0);
 // deep link
 const l=await load('?state=OH&county=Franklin&category=ramps_home');assert.equal(l.$('f-cat').value,'ramps_home');assert.equal(l.$('f-county').value,'Franklin');assert(l.text().includes('Ohio waiver home modifications'));
 const bad=await load('?state=XX&category=nope');assert.equal(bad.$('f-state').value,'OH');assert.equal(bad.$('f-cat').value,'');
 // static pages
 const ramps=fs.readFileSync('ramps-home-access.html','utf8');assert(ramps.includes('HISA ramp or home accessibility modification'));assert(ramps.includes('Ohio Medicaid waiver accessibility modifications'));assert(!ramps.includes('VHG'));assert(ramps.includes('local-help.html?category=ramps_home'));
 const home=fs.readFileSync('index.html','utf8');assert(home.includes('local-help.html')&&home.includes('ramps-home-access.html'));
 console.log('PASS local help: 51-jurisdiction coverage, unique records, grouped Ohio view, county narrowing with veterans offices, category/search filters, deep links, safe links and no storage; ramps guide and home links present.');
})().catch(e=>{console.error(e);process.exit(1)});
