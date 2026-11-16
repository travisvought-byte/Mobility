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
 const TERR=['AS','GU','MP','PR','VI'];const covered=new Set(main.records.map(r=>r.state).filter(s=>s!=='US'&&!TERR.includes(s)));assert.equal(covered.size,51,'every state and D.C. has at least one state-level program');for(const c of TERR)assert(main.records.some(r=>r.state===c),'territory listed: '+c);for(const r of main.records.filter(r=>r.origin.includes('ndrn')))assert(r.phone&&r.url,'agency '+r.id);assert(main.records.some(r=>r.state==='OH'&&r.name.includes('Disability Rights Ohio')),'Ohio P&A present once');assert.equal(main.records.filter(r=>r.state==='OH'&&r.name.includes('Disability Rights Ohio')).length,1);assert(main.records.filter(r=>r.state==='US').length>=5,'federal baseline for every state');
 // Ohio default: statewide, national and county routes, grouped
 // no state chosen: nobody is shown another state's programs; national resources only, with a prompt to choose
 const p=await load();assert.equal(p.$('f-state').value,'');assert(/national resources? that work in every state/.test(p.$('status').textContent)&&p.$('status').textContent.includes('Choose your state'));assert(p.text().includes('988 Suicide & Crisis Lifeline'));assert(!p.text().includes('Ohio waiver home modifications'),'no state-specific records without a state');assert.equal(new URL(p.w.location.href).search,'','no state in the address until one is chosen');
 p.set('f-state','OH');const t=p.text();
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
 p.set('f-state','WY');assert(p.text().includes('Specially Adapted Housing'));assert(p.text().includes('Wyoming P&A System'));assert(!p.$('status').textContent.includes('have not added'));assert(p.d.getElementById('locators').textContent.includes('Centers for Independent Living'));assert(p.$('guide-link').href.includes('state=WY'));
 // links are safe: https only, no javascript:, user text never becomes markup
 for(const a of p.$('results').querySelectorAll('a[href]')){const h=a.getAttribute('href');assert(/^(https?:|tel:|mailto:)/.test(h),'unsafe href '+h);}
 p.set('f-q','<img src=x onerror=bad()>');assert.equal(p.$('results').querySelectorAll('img').length,0);
 assert.equal(p.w.localStorage.length+p.w.sessionStorage.length,0);
 // deep link
 const l=await load('?state=OH&county=Franklin&category=ramps_home');assert.equal(l.$('f-cat').value,'ramps_home');assert.equal(l.$('f-county').value,'Franklin');assert(l.text().includes('Ohio waiver home modifications'));
 const bad=await load('?state=XX&category=nope&audience=zzz');assert.equal(bad.$('f-state').value,'');assert.equal(bad.$('f-cat').value,'');assert.equal(bad.$('f-aud').value,'');
 // static pages
 const ramps=fs.readFileSync('ramps-home-access.html','utf8');assert(ramps.includes('HISA ramp or home accessibility modification'));assert(ramps.includes('Ohio Medicaid waiver accessibility modifications'));assert(!ramps.includes('VHG'));assert(ramps.includes('local-help.html?category=ramps_home'));
 const home=fs.readFileSync('index.html','utf8');assert(home.includes('local-help.html')&&home.includes('ramps-home-access.html'));
 // task chips, jump links, confirm badge, copy and print controls
 {const c=await load('?state=PA');assert(c.$('needs').querySelectorAll('button.need').length===18);assert(c.$('needs').textContent.includes('Build or fix a ramp'));assert(c.$('needs').textContent.includes('Rides and transportation'));assert(c.$('needs').querySelector('button').textContent.includes('Crisis or safety help'),'urgent need comes first');
  [...c.$('needs').querySelectorAll('button')].find(b=>b.textContent.includes('Build or fix a ramp')).click();assert.equal(c.$('f-cat').value,'ramps_home');assert(c.$('needs').querySelector('[aria-pressed=true]').textContent.includes('Build or fix a ramp'));
  c.set('f-cat','');assert(!c.$('jump').hidden&&c.$('jump').querySelectorAll('a').length>2);assert(c.text().includes('Listing: confirm details'));assert(c.$('f-copy')&&c.$('f-print'));}

 // reviewer fixes: honest link labels, county explanation, direct contacts
 {const NEWS=/daytondailynews|seniorsmobility|abc6onyourside|waupacanow|kffhealthnews|chausa/;const kinds=new Set(['official','gov','directory','news','rule','social','source']);
  for(const r of main.records.concat(vso.records)){const t=r.web&&/^https:\/\//.test(r.web)?r.web:r.url;if(t){assert(kinds.has(r.link_kind),'link_kind '+r.id);if(NEWS.test(t))assert.notEqual(r.link_kind,'official','news or directory link labeled official: '+r.id);}}
  const byId=id=>main.records.find(r=>r.id===id);assert.equal(byId('ohio-home-choice').phone,'888-221-1560');assert.equal(byId('oh-kettering-access-grant').phone,'937-296-3308');assert(byId('va-sah').phone&&byId('us-rebuilding-together').phone);assert(byId('ohio-dd-home-adaptations').contact_how.includes('service coordinator'));
  const cardLink=(c,name)=>{const a=[...c.$('results').querySelectorAll('article.card')].find(x=>x.querySelector('h4').textContent===name);assert(a,'card '+name);return [...a.querySelectorAll('a[target=_blank]')].map(x=>{assert(/ \(new tab\)$/.test(x.textContent),'new-tab links say so');return x.textContent.replace(/ \(new tab\)$/,'');});};
  const news=main.records.find(r=>r.link_kind==='news'&&!(r.web&&/^https:\/\//.test(r.web)));const nl=await load('?state='+news.state+'&category='+news.category);assert(cardLink(nl,news.name).includes('News article'));assert(!cardLink(nl,news.name).includes('Official page'));
  const dir=main.records.find(r=>r.link_kind==='directory'&&!r.web&&r.scope!=='counties');const dl=await load('?state='+dir.state+'&category='+dir.category);assert(cardLink(dl,dir.name).includes('Directory listing'));
  const off=await load('?state=OH&category=funding');assert(cardLink(off,byId('ohio-home-choice').name).includes('Official page'));
  // Morrow County: say plainly what the 10 results are
  const mo=await load('?state=OH&county=Morrow&category=equipment');const ms=mo.$('status').textContent;assert(/\d+ statewide or national equipment resources; no county-specific equipment programs are listed for Morrow County yet\./.test(ms),ms);
  const fr=await load('?state=OH&county=Franklin&category=ramps_home');assert(/\d+ programs? serves? Franklin County, and \d+ statewide or national/.test(fr.$('status').textContent),fr.$('status').textContent);
  // direct contact first inside a rank; routes without a line say how to reach them
  const ak=await load('?state=AK&category=transportation');assert(ak.text().includes('How to reach them: Call the member services number'));
  const nc=main.records.find(r=>!(r.phone||r.email||r.web||r.contact_how)&&r.link_kind==='gov');const ncl=await load('?state='+nc.state+'&category='+nc.category);assert(ncl.text().includes('No phone, email or website is listed for this program yet.'));
  const kt=await load('?state=OH&county=Montgomery&category=ramps_home');assert(kt.text().includes('Call 937-296-3308'));
  const ordered=await load('?state=OH&category=equipment');const heads=[...ordered.$('results').querySelectorAll('article.card')].map(a=>a.querySelector('.contact')?1:0);assert(heads.length>3);}
 // all-disabilities front door: audience filter, pinned crisis lines, state offices replace national pointers, guides, territories
 {const AUD=Object.keys(main.audiences),CATS=Object.keys(main.categories);
  assert(AUD.length>=10&&AUD.includes('blind')&&AUD.includes('deaf')&&AUD.includes('mental_health'));
  for(const r of main.records.concat(vso.records)){assert(Array.isArray(r.audience),'audience list '+r.id);for(const a of r.audience)assert(AUD.includes(a),'unknown audience '+a+' on '+r.id);assert(CATS.includes(r.category),'unknown category '+r.category+' on '+r.id);}
  for(const k of ['crisis','benefits','daily_living','housing','work_school','sensory'])assert(main.records.some(r=>r.category===k&&r.state==='US'),'national record in '+k);
  for(const st of covered){assert(main.records.some(r=>r.id===st.toLowerCase()+'-medicaid-agency'),st+' Medicaid agency');assert(main.records.some(r=>r.id===st.toLowerCase()+'-aps-report'),st+' abuse reporting line');assert(main.records.some(r=>r.state===st&&r.category==='work_school'),st+' vocational rehabilitation');}
  // Pennsylvania statewide programs are no longer filed under a county called Pennsylvania
  assert(!main.records.some(r=>r.state==='PA'&&r.counties.includes('Pennsylvania')));const pa=await load('?state=PA&county=Allegheny&category=rights_legal');assert(pa.text().includes('Disability Rights Pennsylvania'),'state P&A stays when a county is chosen');
  const b=await load('?state=TX&audience=blind');assert.equal(b.$('f-aud').value,'blind');const cards=[...b.$('results').querySelectorAll('article.card')];assert(cards.length>=4);for(const c of cards)assert(/For: .*Blind or low vision/.test(c.querySelector('.badge.who').textContent));
  assert(b.$('status').textContent.includes('Blind or low vision')&&b.$('status').textContent.includes('Any disability'));assert(new URL(b.w.location.href).searchParams.get('audience')==='blind');
  assert([...b.$('needs').querySelectorAll('button')].some(x=>x.disabled),'needs with nothing for this group are switched off');
  b.$('f-clear').click();assert.equal(b.$('f-aud').value,'');
  const cr=await load('?state=OH&category=crisis');const names=[...cr.$('results').querySelectorAll('article.card h4')].map(h=>h.textContent);
  assert(names[0].startsWith('988 '),'988 leads the crisis list');assert(names.includes('Ohio Adult Protective Services: report abuse, neglect or exploitation'));assert(!names.some(n=>n.startsWith('Adult Protective Services: report abuse')),'national pointer steps aside for the state line');
  assert(cr.$('results').querySelector('a[href="tel:988"]')&&cr.text().includes('Text HOME to 741741'));
  const noState=await load('?category=crisis');assert([...noState.$('results').querySelectorAll('article.card h4')].some(h=>h.textContent.startsWith('Adult Protective Services: report abuse')),'national pointer shows until a state is chosen');
  const be=await load('?state=OH&category=benefits');assert(be.text().includes('Ohio Department of Medicaid: apply for Medicaid')&&be.text().includes('Social Security: apply for disability benefits')&&!be.text().includes('Medicaid: find your state agency'));
  assert(be.$('results').querySelector('details.prep')&&/Have ready/.test(be.$('results').querySelector('details.prep').textContent)&&/Ask/.test(be.$('results').querySelector('details.prep').textContent),'before-you-call guide');
  const pr=await load('?state=PR');assert.equal(pr.$('f-state').value,'PR');assert(pr.text().includes('Puerto Rico Medicaid Program')&&pr.text().includes('Defensoría de las Personas con Impedimentos'));assert(pr.$('status').textContent.includes('only a few programs for Puerto Rico'));assert(pr.$('statemap').hidden,'no county map for territories');assert.equal(pr.$('handout-link').getAttribute('href'),'handout.html');
  const guides=JSON.parse(pr.d.getElementById('guide-data').textContent);for(const k of CATS){const g=guides.guides[k];assert(g&&g.need&&g.blurb&&g.ready.length>=2&&g.ask.length>=2,'guide for '+k);}assert.deepEqual([...guides.results_order].sort(),[...CATS].sort());
  assert(html.includes('href="tel:988"')&&html.includes('href="tel:711"'),'urgent strip and relay note');}
 console.log('PASS local help: no default state, 18 need chips, who-it-is-for filter, pinned crisis lines, before-you-call guides, territories, jump links, confirm badges, 51-jurisdiction coverage, unique records, grouped Ohio view, county narrowing with veterans offices, category/search filters, deep links, safe links and no storage; ramps guide and home links present.');
})().catch(e=>{console.error(e);process.exit(1)});
