// All-disabilities front door: home page need grid, know-your-rights page, about page and the sourcing of the November 2026 records.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const data=JSON.parse(fs.readFileSync('data/local-programs.json','utf8')),recs=data.records,byId=new Map(recs.map(r=>[r.id,r]));
const added=JSON.parse(fs.readFileSync('data/added-programs.json','utf8')).records;
const CATS=Object.keys(data.categories),AUD=Object.keys(data.audiences);
const STATES=Object.keys(JSON.parse(fs.readFileSync('data/mobility-routes.json','utf8')).states.reduce((o,s)=>(o[s.code]=1,o),{}));
const TERR=['AS','GU','MP','PR','VI'];
(async()=>{
 // ---- home page
 const html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('assets/home.js','utf8');
 assert(!/localStorage|sessionStorage|document\.cookie/.test(js),'home script stores nothing');
 const dom=new JSDOM(html,{url:'https://mobilitytalk.org/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 const need=[...d.querySelectorAll('#needgrid a')];assert(need.length>=10,'need grid');
 for(const a of need){const h=a.getAttribute('href');if(h==='know-your-rights.html')continue;const u=new URL(h,'https://mobilitytalk.org/');assert.equal(u.pathname,'/local-help.html');assert(CATS.includes(u.searchParams.get('category')),'need link category '+h);assert(recs.some(r=>r.category===u.searchParams.get('category')&&r.state==='US'),'need link leads to at least one national record: '+h);}
 assert(need[0].textContent.includes('Crisis or safety help'),'urgent need first');
 const who=[...d.querySelectorAll('#whorow a')];assert.equal(who.length,AUD.length,'one link per audience');
 for(const a of who){const k=new URL(a.getAttribute('href'),'https://mobilitytalk.org/').searchParams.get('audience');assert(AUD.includes(k));assert.equal(a.textContent,data.audiences[k],'label matches the directory');assert(recs.filter(r=>r.audience.includes(k)).length>=3,'audience has records: '+k);}
 assert.equal(d.querySelectorAll('#need-state option[value]').length,1+STATES.length+TERR.length,'state select lists states, D.C. and territories');
 assert(d.querySelector('.urgent a[href="tel:988"]')&&d.querySelector('.urgent a[href="sms:988"]'),'urgent strip');
 assert(d.querySelector('main').firstElementChild.classList.contains('urgent'),'urgent strip leads the page');
 assert(d.querySelector('#needs').compareDocumentPosition(d.querySelector('#start'))&4,'needs come before the equipment finder');
 // voice-control users say what they see: each map tile's accessible name contains its visible code
 const tiles=[...d.querySelectorAll('.tilemap a.tile')];assert.equal(tiles.length,51);for(const a of tiles)assert(a.getAttribute('aria-label').startsWith(a.textContent.trim()+', '),'tile name contains '+a.textContent);
 w.eval(js);
 const sel=d.getElementById('need-state');sel.value='TX';sel.dispatchEvent(new w.Event('change'));
 for(const a of need)if(a.getAttribute('href')!=='know-your-rights.html')assert(a.getAttribute('href').includes('state=TX'),'state carried into '+a.getAttribute('href'));
 for(const a of who)assert(a.getAttribute('href').includes('state=TX')&&a.getAttribute('href').includes('audience='));
 assert.equal(d.getElementById('home-state').value,'TX','next-step finder follows the state');
 sel.value='PR';sel.dispatchEvent(new w.Event('change'));assert(need[0].getAttribute('href').includes('state=PR'));assert.equal(d.getElementById('home-state').value,'TX','finder has no territories and keeps its last state');
 sel.value='';sel.dispatchEvent(new w.Event('change'));assert(!need[0].getAttribute('href').includes('state='));
 assert.equal(w.localStorage.length+w.sessionStorage.length,0);

 // ---- know your rights
 const rights=JSON.parse(fs.readFileSync('data/know-your-rights.json','utf8')),rd=new JSDOM(fs.readFileSync('know-your-rights.html','utf8')).window.document;
 assert(rights.rows.length>=10);
 for(const row of rights.rows){
  const art=rd.getElementById(row.id);assert(art&&art.matches('article.rights-row'),'row '+row.id);assert.equal(art.querySelector('h3').textContent,row.title);
  for(const id of row.records){const r=byId.get(id);assert(r,'rights row '+row.id+' names a real record: '+id);assert(art.textContent.includes(r.name),row.id+' shows '+id);if(r.phone)assert(art.querySelector('a[href="tel:'+String(r.phone).replace(/[^0-9+]/g,'')+'"]'),row.id+' phone link for '+id);}
  const dl=art.querySelector('.deadline');
  if(row.deadline){assert(dl&&dl.textContent===row.deadline,row.id+' deadline shown as written');assert(/\d|one year|does not state/.test(row.deadline),row.id+' deadline gives a time limit or says the source does not state one');}
  else assert(!dl,row.id+' shows no deadline when the source states none');
  assert(/Source pages checked \d{4}-\d{2}-\d{2}/.test(art.textContent)&&art.querySelector('.meta a[href^="https://"]'),row.id+' dated source links');
  for(const a of art.querySelectorAll('a[target=_blank]')){assert(/noopener/.test(a.rel));assert(/\(new tab\)$/.test(a.textContent));}
 }
 assert(rd.querySelector('.toc').querySelectorAll('a').length===rights.rows.length);assert(/not legal advice/.test(rd.querySelector('footer').textContent));
 // deadlines on the page come from records that state them
 assert(byId.get('us-eeoc').description.includes('180 calendar days')&&byId.get('us-ssa-appeal').description.includes('60 days')&&byId.get('us-hud-fair-housing-complaint').constraints.join(' ').includes('one year'));

 // ---- about page: says who, sources, privacy, and is honest about accessibility limits
 const ab=new JSDOM(fs.readFileSync('about.html','utf8')).window.document,at=ab.querySelector('main').textContent;
 for(const id of ['what-h','who-h','sources-h','fix-h','privacy-h','access-h'])assert(ab.getElementById(id),'about section '+id);
 assert(/has not had a formal accessibility audit/.test(at)&&/not yet been tested with people who use screen readers/.test(at),'accessibility limits stated');
 assert(/Nothing you type or choose on this site is saved or sent/.test(at)&&/no paid placement/i.test(at));
 assert(ab.querySelector('a[href^="mailto:travis@vethomeguard.org"]')&&!/veteranhomeguardians@gmail/i.test(ab.documentElement.outerHTML));
 for(const f of ['index.html','local-help.html','know-your-rights.html','mobility-rights.html','disability-advocacy.html','ramps-home-access.html','mobility-independence.html','partner.html','handout.html','states/ohio.html','states/index.html'])assert(new JSDOM(fs.readFileSync(f,'utf8')).window.document.querySelector('footer a[href$="about.html"]'),f+' footer links to the about page');

 // ---- sourcing of the records added on 2026-11-15
 const fresh=added.filter(r=>r.reviewed_on==='2026-11-15'&&(/-(medicaid-agency|aps-report|protection-advocacy|native-american-disability-law-center)$/.test(r.id)||(r.state==='US'&&['crisis','benefits','daily_living','housing','work_school','sensory'].includes(r.category))));
 assert(fresh.length>=140,'gap-fill records present: '+fresh.length);
 for(const r of fresh){
  assert(/^https:\/\//.test(r.url),'source link '+r.id);assert(['official_source_reviewed','directory_listed'].includes(r.record_status),r.id);
  assert(r.description.length>40&&r.next_step.length>20,'plain description and next step '+r.id);
  if(r.phone)assert(/^[0-9()+ \-]{3,}$/.test(r.phone),'phone is digits only: '+r.id+' '+r.phone);
  if(r.record_status==='directory_listed')assert(/napsa-now\.org|ndrn\.org/.test(r.url),'directory record cites its directory '+r.id);
  assert(!/veteranhomeguardians@gmail/i.test(JSON.stringify(r)));
 }
 for(const st of STATES){const m=byId.get(st.toLowerCase()+'-medicaid-agency');assert(m&&m.url.includes('medicaid.gov')&&(m.phone||m.web),st+' Medicaid contact from Medicaid.gov');}
 const noPhone=STATES.filter(st=>!byId.get(st.toLowerCase()+'-aps-report').phone);assert.deepEqual(noPhone.sort(),['CO','NC','WI'],'states where the directory lists only county reporting');
 for(const st of noPhone)assert(/county/.test(byId.get(st.toLowerCase()+'-aps-report').next_step));
 for(const t of TERR)assert(byId.get(t.toLowerCase()+'-protection-advocacy')&&byId.get(t.toLowerCase()+'-medicaid-agency'),'territory basics '+t);
 console.log('PASS front door: need grid and who-it-is-for links, state carried without storage, urgent strip, map tile names, '+rights.rows.length+' rights situations tied to directory records with sourced deadlines, about page with privacy and accessibility limits, '+fresh.length+' sourced gap-fill records.');
})().catch(e=>{console.error(e);process.exit(1)});
