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
 const need=[...d.querySelectorAll('#needgrid a')];assert.equal(need.length,16,'need grid has 16 cards, four full rows');
 const PAGE_CARDS=['know-your-rights.html','states/index.html','espanol.html'];for(const h of PAGE_CARDS){assert(need.some(a=>a.getAttribute('href')===h),'home card for '+h);assert(fs.existsSync(h),h+' exists');}
 for(const a of need){const h=a.getAttribute('href');if(PAGE_CARDS.includes(h))continue;const u=new URL(h,'https://mobilitytalk.org/');assert.equal(u.pathname,'/local-help.html');assert(CATS.includes(u.searchParams.get('category')),'need link category '+h);assert(recs.some(r=>r.category===u.searchParams.get('category')&&r.state==='US'),'need link leads to at least one national record: '+h);}
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
 for(const a of need){const h=a.getAttribute('href');if(h.startsWith('local-help.html'))assert(h.includes('state=TX'),'state carried into '+h);}
 const sp=d.getElementById('need-statepage');assert.equal(sp.getAttribute('href'),'states/texas.html','state card goes to the chosen state page');
 for(const o of sel.querySelectorAll('option[value]')){if(!o.value)continue;sel.value=o.value;sel.dispatchEvent(new w.Event('change'));assert(fs.existsSync(sp.getAttribute('href')),'state page exists for '+o.value+': '+sp.getAttribute('href'));}
 sel.value='TX';sel.dispatchEvent(new w.Event('change'));
 for(const a of who)assert(a.getAttribute('href').includes('state=TX')&&a.getAttribute('href').includes('audience='));
 assert.equal(d.getElementById('home-state').value,'TX','next-step finder follows the state');
 sel.value='PR';sel.dispatchEvent(new w.Event('change'));assert(need[0].getAttribute('href').includes('state=PR'));assert.equal(d.getElementById('home-state').value,'TX','finder has no territories and keeps its last state');
 sel.value='';sel.dispatchEvent(new w.Event('change'));assert(!need[0].getAttribute('href').includes('state='));assert.equal(sp.getAttribute('href'),'states/index.html','no state chosen: the card lists all states');
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
 for(const st of noPhone){const a=byId.get(st.toLowerCase()+'-aps-report');assert(/Eldercare Locator at 1-800-677-1116/.test(a.next_step)&&/does not list a statewide number/.test(a.description),st+' says plainly that no statewide number is listed and gives another route');}
 for(const t of TERR)assert(byId.get(t.toLowerCase()+'-protection-advocacy')&&byId.get(t.toLowerCase()+'-medicaid-agency'),'territory basics '+t);
 // ---- round two (2026-11-15): children, early intervention, energy, food, shelter, jobs, vehicles, parking, territories, Spanish
 assert(CATS.includes('children')&&data.categories.children,'children category');assert.equal(byId.get('us-parent-centers').category,'children','parent centers sit with help for a child');
 const ECTA='https://ectacenter.org/contact/ptccoord.asp';
 for(const st of STATES.concat(TERR)){
  const r=byId.get(st.toLowerCase()+'-early-intervention');assert(r,'early intervention record '+st);
  assert.equal(r.category,'children');assert.deepEqual(r.audience,['children']);assert.equal(r.url,ECTA,st+' cites the ECTA Center list');assert.equal(r.record_status,'directory_listed');
  assert(r.phone&&/^[0-9()+ \-]{7,}$/.test(r.phone),st+' early intervention phone '+r.phone);assert(/As listed by the ECTA Center$/.test(r.phone_note),st+' says where the number came from');
  assert(/Referral line|referrals|hotline|Central Directory|program office|Extension/i.test(r.phone_note),st+' says what kind of number it is');
  assert(/evaluation under Part C of IDEA/.test(r.next_step)&&r.constraints.some(c=>/under age three/.test(c)),st+' says what to ask for and who it is for');
 }
 assert.equal(byId.get('us-early-intervention').hide_if_state_has,'-early-intervention','national pointer gives way to the state program');
 const R2=['us-liheap-energy-bills','us-utility-shutoff-rules','us-weatherization-assistance','us-national-hunger-hotline','us-home-delivered-meals','us-older-adult-food-programs','us-emergency-shelter','us-hud-housing-counselor','us-ned-vouchers','us-homeless-veterans-call-center','us-runaway-safeline','us-american-job-centers','us-federal-jobs-disability-hiring','us-abilityone','us-va-vre','us-vehicle-adaptation','us-aded-driver-rehab','us-disabled-parking-placards','us-early-intervention'];
 for(const id of R2){const r=byId.get(id);assert(r,'round two record '+id);assert(/^https:\/\//.test(r.url),'source link '+id);assert.equal(r.reviewed_on,'2026-11-15');assert(r.phone||r.contact_how,'says how to reach it: '+id);if(r.phone)assert(/^[0-9()+ \-]{3,}$/.test(r.phone),'phone is digits only: '+id);assert(r.description.length>40&&r.next_step.length>20,id);}
 assert(/guideline/.test(byId.get('us-disabled-parking-placards').constraints.join(' ')),'parking entry says the federal rule is a guideline and states decide');
 assert(/60 and older/.test(byId.get('us-home-delivered-meals').constraints.join(' ')),'meal entry says who the federal program is for');
 for(const t of TERR){const r=byId.get(t.toLowerCase()+'-at-program');assert(r&&r.phone&&/at3center\.net/.test(r.url)&&r.record_status==='directory_listed','territory assistive technology program '+t);}
 for(const t of ['PR','VI']){const r=byId.get(t.toLowerCase()+'-vr-agency');assert(r&&r.phone&&r.category==='work_school'&&/askjan\.org/.test(r.url),'territory vocational rehabilitation '+t);}
 assert(byId.get('tx-twc-vr').phone,'Texas vocational rehabilitation has a phone');
 // Spanish help page: Spanish text, every number backed by a directory record, offered from the English pages
 {const st=fs.readFileSync('espanol.html','utf8'),sd=new JSDOM(st).window.document,src=JSON.parse(fs.readFileSync('data/ayuda-espanol.json','utf8'));
  assert.equal(sd.documentElement.lang,'es');assert.equal(sd.querySelector('h1').textContent,'Ayuda en español');
  const items=src.sections.flatMap(x=>x.items);assert(items.length>=10,'Spanish page lists the lines that serve Spanish speakers');
  const digits=x=>String(x||'').replace(/\D/g,'');
  const blob=items.map(it=>{const r=byId.get(it.record);assert(r,'Spanish page record '+it.record);assert(it.evidence&&it.evidence.length>15,'evidence noted for '+it.record);return JSON.stringify(r);}).join(' ');
  for(const a of sd.querySelectorAll('a[href^="tel:"],a[href^="sms:"]')){const n=digits(a.getAttribute('href'));assert(n.length>=3&&digits(blob).includes(n),'number on the Spanish page is in the directory: '+a.getAttribute('href'));}
  assert.equal(sd.querySelectorAll('article.card').length,items.length);assert(/todavía no ha sido revisado/.test(sd.querySelector('footer').textContent),'says the Spanish has not been reviewed yet');
  assert(sd.querySelector('strong[lang="en"]'),'English phrase is marked as English');assert(!/veteranhomeguardians@gmail/i.test(st));
  for(const f of ['index.html','local-help.html','know-your-rights.html','mobility-rights.html','about.html','handout.html']){const a=new JSDOM(fs.readFileSync(f,'utf8')).window.document.querySelector('header nav a[href="espanol.html"]');assert(a&&a.getAttribute('lang')==='es'&&a.textContent==='Español',f+' offers the Spanish page');}
  assert(new JSDOM(fs.readFileSync('states/ohio.html','utf8')).window.document.querySelector('header nav a[href="../espanol.html"][lang="es"]'),'state pages offer the Spanish page');
 }
 console.log('PASS front door: need grid and who-it-is-for links, state carried without storage, urgent strip, map tile names, '+rights.rows.length+' rights situations tied to directory records with sourced deadlines, about page with privacy and accessibility limits, '+fresh.length+' sourced gap-fill records, early intervention in all '+(STATES.length+TERR.length)+' jurisdictions, Spanish help page backed by directory records.');
})().catch(e=>{console.error(e);process.exit(1)});
