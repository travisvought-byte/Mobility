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
 const R5=['us-als-care-services','us-arthritis-helpline','us-spina-bifida-resource-center','us-sickle-cell-member-organizations','us-ndss-helpline','us-nord-helpline','us-cf-foundation-compass','us-ucp-information-referral','us-little-people-of-america','us-gbs-cidp-patient-services','us-hdsa-helpline','us-dbsa-support-groups','us-cure-sma-community-support','us-cmt-association','us-post-polio-health-international','us-hydrocephalus-helpline','us-oi-foundation','us-national-ataxia-foundation','us-american-cancer-society-helpline','us-acs-road-to-recovery','us-lung-helpline','us-nkf-cares','us-adhd-national-resource-center','us-tourette-association','us-lupus-health-educators','us-supported-decision-making','us-donated-dental-services','us-assistance-dogs-international']; // round five records are checked in their own block below
 const fresh=added.filter(r=>r.reviewed_on==='2026-11-15'&&!R5.includes(r.id)&&(/-(medicaid-agency|aps-report|protection-advocacy|native-american-disability-law-center)$/.test(r.id)||(r.state==='US'&&['crisis','benefits','daily_living','housing','work_school','sensory'].includes(r.category))));
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
 // ---- round three (2026-11-15): Family-to-Family health centers, VA vehicle benefits, state agencies for deaf and hard of hearing people
 for(const st of STATES.concat(TERR)){
  const r=byId.get(st.toLowerCase()+'-f2f-health-center');assert(r,'Family-to-Family center '+st);
  assert.equal(r.category,'children');assert.deepEqual(r.audience,['children']);assert.equal(r.record_status,'directory_listed');
  assert(r.url.startsWith('https://familyvoices.org/affiliates/states/'),st+' cites its Family Voices page');
  assert(r.phone&&/^[0-9()+ \-]{7,}$/.test(r.phone),st+' center phone '+r.phone);assert(/As listed by Family Voices$/.test(r.phone_note),st+' says where the number came from');
 }
 assert.equal(byId.get('us-f2f-health-centers').hide_if_state_has,'-f2f-health-center','national pointer gives way to the state center');
 for(const id of ['ak-f2f-health-center-tribal','ok-f2f-health-center-tribal','nm-f2f-health-center-2','mn-f2f-health-center-2'])assert(byId.get(id)&&byId.get(id).phone,'additional center '+id);
 for(const id of ['ak-f2f-health-center-tribal','ok-f2f-health-center-tribal'])assert(/American Indian and Alaska Native/.test(byId.get(id).description),id+' says who it serves');
 {const v=byId.get('va-automobile-adaptive-equipment');assert(v&&v.phone&&/va\.gov/.test(v.url)&&v.audience.includes('veterans'),'VA vehicle benefit');assert(/until VA has authorized/.test(v.constraints.join(' ')),'says to wait for approval before buying');}
 {const deaf=recs.filter(r=>/-deaf-hard-of-hearing-agency(-\d)?$/.test(r.id));assert(deaf.length>=40,'state agencies for deaf and hard of hearing people: '+deaf.length);let own=0;
  for(const r of deaf){assert.equal(r.category,'sensory');assert(r.audience.includes('deaf'));
   if(r.url==='https://nasadhh.org/state-agency/'){assert(!r.phone&&r.contact_how,r.id+' has no phone on the roster and says how to reach the agency');assert.equal(r.record_status,'directory_listed');}
   else{own++;assert.equal(r.record_status,'official_search_extract_only',r.id);assert(/^https:\/\//.test(r.url)&&/^https:\/\//.test(r.web)&&!/nasadhh/.test(r.url+r.web),r.id+' cites and links the agency\'s own pages');
    assert(r.phone?(/^\d{3}-\d{3}-\d{4}$/.test(r.phone)&&/listed/.test(r.phone_note)):(r.email&&r.contact_how),r.id+' gives a sourced phone or an agency email');
    assert(!r.constraints.some(c=>/roster lists no phone/.test(c)),r.id+' no longer says the roster lists no phone');}
   if(r.web&&r.state!=='ID')assert(!/idaho/i.test(r.web),r.id+' does not carry another state\'s link');}
  assert(own>=44,'agency pages read for '+own+' deaf and hard of hearing agencies');
  for(const st of ['al','nd','sd'])assert(byId.get(st+'-deaf-hard-of-hearing-agency').description.startsWith('The national roster of state agencies lists none'),st+' says the roster has no agency and names the state program instead');
  for(const st of ['hi'])assert(!/videophone/i.test(byId.get(st+'-deaf-hard-of-hearing-agency').phone_note),st+': conflicting videophone numbers are left out');
  {const w=byId.get('wy-adult-hearing-aid-program');assert(w&&w.constraints.some(c=>/hearing tests/.test(c))&&/health\.wyo\.gov/.test(w.url),'Wyoming hearing aid program says what it does not cover');}
  for(const [st,host] of [['il','illinois.gov'],['in','in.gov']]){const w=byId.get(st+'-deaf-hard-of-hearing-agency').web;assert(!w||new URL(w).hostname.endsWith(host),st+' links only to its own state agency');}
  assert(!/videophone/i.test(byId.get('ne-deaf-hard-of-hearing-agency').phone_note),'Nebraska: conflicting videophone numbers are left out');}
 // ---- round four (2026-11-15): disability parking placards in every state and DC, from each state agency's own page
 {let phones=0;
  for(const st of STATES){
   const r=byId.get(st.toLowerCase()+'-disabled-parking-placard');assert(r,'parking placard record '+st);
   assert.equal(r.category,'transportation');assert.deepEqual(r.audience,['mobility']);assert.equal(r.record_status,'official_search_extract_only');assert.equal(r.state,st);
   assert(/^https:\/\//.test(r.url)&&r.url===r.web,st+' links the agency page');assert(!/familyvoices|nasadhh|ectacenter|usa\.gov/.test(r.url),st+' cites the state agency itself');
   assert(/Who can certify the disability: \S/.test(r.description),st+' says who can certify');assert(r.next_step.length>60,st+' says where to send the form');
   assert.equal(r.constraints[r.constraints.length-1],'Forms, fees and rules change. Check the agency’s page before you apply.');
   if(r.phone){phones++;assert(/^[0-9()+ \-]{7,}$/.test(r.phone)&&/(printed|listed|shown)/.test(r.phone_note),st+' parking number says where it came from');}else assert(r.contact_how,st+' says how to reach the agency');
  }
  assert(phones>=10&&phones<STATES.length,'phone numbers only where the agency showed one: '+phones);}
 assert.equal(byId.get('us-disabled-parking-placards').hide_if_state_has,'-disabled-parking-placard','national pointer gives way to the state record');
 assert(/local city, town or village/.test(byId.get('ny-disabled-parking-placard').description),'New York permits come from local offices, not DMV');
 // ---- round five (2026-11-15): national condition organizations, supported decision-making, donated dental care, assistance dogs
 {
  for(const id of R5){const r=byId.get(id);assert(r,'round five record '+id);assert.equal(r.state,'US');assert.equal(r.scope,'national');assert.equal(r.record_status,'official_search_extract_only');
   assert(/^https:\/\//.test(r.web)&&/^https:\/\//.test(r.url),id+' links the organization');assert(r.next_step.length>40&&r.constraints.length>=1,id+' says what to do and what to know');
   if(r.phone){assert(/^[0-9() \-]{10,}$/.test(r.phone),id+' phone format '+r.phone);assert(r.phone_note,id+' phone note');}else assert(r.contact_how,id+' says how to reach it');
   assert(!/\[email|@gmail\.com/.test(JSON.stringify(r)),id+' carries no personal or masked address');}
  const peer=R5.map(i=>byId.get(i)).filter(r=>r.category==='peer_support');assert(peer.length>=20,'condition helplines and peer groups: '+peer.length);
  for(const r of peer)assert(r.audience.length>=1,r.id+' says who it is for');
  for(const [id,vanity] of [['us-hdsa-helpline','345-HDSA'],['us-tourette-association','4-TOURET'],['us-little-people-of-america','LPA-2001'],['us-cf-foundation-compass','COMPASS'],['us-lung-helpline','LUNGUSA'],['us-nkf-cares','NKF-CARES'],['us-cmt-association','CMTA']])assert(byId.get(id).phone_note.includes(vanity),id+' keeps the lettered number the site shows');
  assert(/do not give medical advice|not medically trained/.test(byId.get('us-arthritis-helpline').constraints.join(' ')),'helpline limits stated');
  assert(/guardianship/.test(byId.get('us-supported-decision-making').description)&&byId.get('us-supported-decision-making').category==='rights_legal','supported decision-making as an alternative to guardianship');
  assert(/Medicaid/.test(byId.get('us-donated-dental-services').constraints.join(' '))&&/waiting list/.test(byId.get('us-donated-dental-services').constraints.join(' ')),'dental program says use coverage first and expect a wait');
  assert(/does not provide, train or certify/.test(byId.get('us-assistance-dogs-international').description),'ADI does not certify dogs');
  assert(/cancer-related appointments/.test(byId.get('us-acs-road-to-recovery').constraints.join(' '))&&byId.get('us-acs-road-to-recovery').category==='transportation','rides to cancer treatment');
  assert(/Online certificates and registrations give no rights/.test(byId.get('us-ada-service-animals').constraints.join(' ')),'service animal record warns about online registries');
  {const l=byId.get('us-liheap-energy-bills');assert.equal(l.phone,'1-866-674-6327');assert(/NEAR/.test(l.phone_note)&&/never charges a fee/.test(l.constraints.join(' ')),'energy help number and fee warning');}}
 // ---- round six (2026-11-16): independent living help for older adults with vision loss (Time To Be Bold state pages), nine more condition organizations
 {const OIB=['AL','AK','AZ','CA','CO','CT','DE','DC','FL','GA','HI','ID','IN','KS','LA','ME','MD','MN','MS','MO','MT','NE','NV','NH','NJ','NY','NC','ND','OK','OR','PA','RI','VT','VA','WA','WI','WY'];let ph=0;
  for(const st of OIB){const r=byId.get(st.toLowerCase()+'-older-blind-program');assert(r,'older blind program '+st);
   assert.equal(r.category,'sensory');assert.deepEqual(r.audience,['blind','older']);assert.equal(r.record_status,'directory_listed');assert.equal(r.state,st);
   assert(r.url.startsWith('https://www.timetobebold.org/'),st+' cites its Time To Be Bold page');assert(/Independent Living Services for Older Individuals who are Blind/.test(r.description),st+' names the federal program');
   assert(r.constraints.some(c=>/vocational rehabilitation/.test(c))&&r.constraints.some(c=>/Hadley/.test(c)),st+' says who it is for and what to do on a waiting list');
   if(r.phone){ph++;assert(/^[0-9\-]{12,14}$/.test(r.phone)&&/(Time To Be Bold|extension)/.test(r.phone_note),st+' says where the number came from');}else assert(r.contact_how,st+' says how to reach it');
   assert(!/@(gmail|yahoo)\.|\.(robinson|march|haynes|birmele|monk)@|hunter-payne|kmonk@|jbailey@|ahershberg@/i.test(JSON.stringify(r)),st+' carries no staff email');}
  assert(ph>=28&&ph<OIB.length,'phone numbers only where the state page showed a program line: '+ph);
  for(const st of ['mi','oh','tx'])assert(!byId.get(st+'-older-blind-program'),st+' already lists its program, so no duplicate');
  const n=byId.get('us-older-blind-programs');assert(n&&n.hide_if_state_has==='-older-blind-program'&&n.web.startsWith('https://www.timetobebold.org/'),'national pointer gives way to state listings');
  const R6=['us-mgfa-helpline','us-pwsa-family-support','us-fragile-x-foundation','us-cerebral-palsy-foundation','us-national-aphasia-association','us-rett-syndrome-foundation','us-angelman-syndrome-foundation','us-williams-syndrome-association','us-parent-project-muscular-dystrophy'];
  for(const id of R6){const r=byId.get(id);assert(r&&r.state==='US'&&r.category==='peer_support'&&r.audience.length,'round six organization '+id);assert(/^https:\/\//.test(r.web),id);assert(r.phone?/^[0-9\-]{12,14}$/.test(r.phone):r.contact_how,id+' contact');}
  assert(/24 hours a day/.test(byId.get('us-pwsa-family-support').description),'Prader-Willi line is round the clock');assert(!byId.get('us-national-aphasia-association').phone,'no phone where the site lists none');}
 // ---- round seven (2026-11-16): Parent Centers in 40 states, from each center's own site or the national Parent Center map
 {const pc=recs.filter(r=>/-parent-center(-\d+)?$/.test(r.id)&&r.state!=='US');const states=new Set(pc.map(r=>r.state));
  assert(states.size>=40,'Parent Centers in at least 40 states: '+states.size);
  for(const r of pc){assert.equal(r.category,byId.get('us-parent-centers').category,r.id+' sits with the national Parent Centers entry');assert.deepEqual(r.audience,['children']);
   assert(['official_search_extract_only','directory_listed'].includes(r.record_status),r.id);assert(/^https:\/\//.test(r.url),r.id+' source');
   if(r.record_status==='directory_listed')assert(/^https:\/\/(www\.parentcenterhub\.org|parentprojectmd\.org)\//.test(r.url),r.id+' directory listing cites the directory');
   if(r.phone)assert(/^\d{3}-\d{3}-\d{4}$/.test(r.phone)&&/(listed|newsletter)/.test(r.phone_note),r.id+' says where the number came from');else assert(r.contact_how,r.id+' says how to reach it');
   assert(r.constraints.some(c=>/not legal representation/.test(c)),r.id+' says it is not a lawyer');}
  for(const st of ['oh','il','mn','ga','nc','ut'])assert(byId.get(st+'-parent-center')&&byId.get(st+'-parent-center').phone,'primary center '+st);
  assert(/October 1, 2025/.test(byId.get('il-parent-center').description),'Illinois center change is explained');
  assert.equal(byId.get('us-parent-centers').hide_if_state_has,'-parent-center','national entry gives way to state centers');
  assert(pc.filter(r=>r.state==='CA').length>=10,'California regional centers listed');}
 // ---- round eight (2026-11-16): Parent Centers for the last ten states and D.C.; older-adult vision loss programs from ten more state agencies' own pages
 {const pc=recs.filter(r=>/-parent-center(-\d+)?$/.test(r.id)&&r.state!=='US');const states=new Set(pc.map(r=>r.state));
  for(const st of STATES)assert(states.has(st),'Parent Center listed for '+st);
  for(const st of ['in','ia','ms','mt','nj','ny','nd','tx','va','wy','dc'])assert(byId.get(st+'-parent-center'),'round eight parent center '+st);
  for(const n of [2,3,4]){const r=byId.get('tx-parent-center-'+n);assert(r&&/Education Service Center regions? [0-9]/.test(r.description)&&r.constraints.some(c=>/state office/.test(c)),'Texas regional project '+n+' names its regions');}
  {const dc=byId.get('dc-parent-center');assert(dc.phone==='202-678-8060'&&/aje-dc\.org\/training/.test(dc.url)&&!/2016/.test(dc.description),'D.C. listing uses the number on its current training page');}
  for(const id of ['ny-parent-center','ny-parent-center-2'])assert(byId.get(id).constraints.some(c=>/parentcenterhub\.org/.test(c)),id+' points the rest of the state to the finder');
  assert(/^Parent Centers are funded/.test(byId.get('wy-parent-center').description)&&!/^Parent Centers are funded/.test(byId.get('in-parent-center').description),'federal funding sentence only where the source supports it');
  const AG=['AR','IL','IA','KY','MA','NM','SC','TN','UT','WV'];
  for(const st of AG){const r=byId.get(st.toLowerCase()+'-older-blind-program');assert(r,'older blind program '+st);
   assert.equal(r.category,'sensory');assert.deepEqual(r.audience,['blind','older']);assert.equal(r.record_status,'official_search_extract_only');
   assert(!/timetobebold/.test(r.url)&&/\.(gov|org|il\.us)\//.test(r.url),st+' cites the state agency page');
   assert(r.constraints.some(c=>/vocational rehabilitation/.test(c))&&r.constraints.some(c=>/Hadley/.test(c)),st+' says who it is for and what to do on a waiting list');
   if(r.phone)assert(/^\d{3}-\d{3}-\d{4}$/.test(r.phone)&&/listed/.test(r.phone_note),st+' phone source');else assert(/main line is also in this directory/.test(r.contact_how),st+' says how to reach it');}
  const covered=STATES.filter(st=>byId.get(st.toLowerCase()+'-older-blind-program')||['MI','OH','TX'].includes(st));
  assert(covered.length>=50,'older-adult vision loss help in '+covered.length+' of 51 jurisdictions');
}
 // ---- round nine (2026-11-16): deaf agency contacts from their own pages (above), twelve national organizations, South Dakota older-blind services
 {const R9=['us-nfb-affiliates','us-nfb-newsline','us-scleroderma-hope-line','us-tsc-alliance-navigators','us-crohns-colitis-help-center','us-fara','us-ehlers-danlos-support-groups','us-diabetes-center-for-information','us-asha-profind','us-stuttering-foundation-referrals','us-lda-state-affiliates','us-mha-warmlines'];
  for(const id of R9){const r=byId.get(id);assert(r&&r.state==='US'&&r.scope==='national','round nine organization '+id);assert(/^https:\/\//.test(r.url)&&/^https:\/\//.test(r.web),id+' links');
   assert(r.phone?(/^\d{3}-\d{3}-\d{4}$/.test(r.phone)&&/listed/.test(r.phone_note)):r.contact_how,id+' contact');assert.equal(r.record_status,'official_search_extract_only');}
  assert(/988/.test(byId.get('us-mha-warmlines').constraints.join(' ')),'warmline listing points people in crisis to 988');
  assert(/dyslexia/.test(byId.get('us-nfb-newsline').description),'NEWSLINE eligibility includes print disabilities');
  const sd=byId.get('sd-older-blind-program');assert(sd&&/\.sd\.gov\//.test(sd.url)&&sd.constraints.some(c=>/Hadley/.test(c)),'South Dakota older-blind listing from the state board');
  for(const st of STATES)assert(byId.get(st.toLowerCase()+'-older-blind-program')||['MI','OH','TX'].includes(st),'older-adult vision loss help in '+st);}
 // ---- round eleven (2026-11-16): each state's and territory's mental health agency from SAMHSA's 2024 national directory
 {const MH=[...STATES,...TERR];for(const st of MH){const r=byId.get(st.toLowerCase()+'-mental-health-agency');assert(r,'state mental health agency '+st);
   assert.equal(r.category,'crisis');assert.deepEqual(r.audience,['mental_health']);
   if(r.record_status==='directory_listed'){assert(/samhsa\.gov\//.test(r.url),st+' cites the SAMHSA directory');assert(/SAMHSA/.test(r.phone_note),st+' phone as the directory printed it');}
   else{assert.equal(r.record_status,'official_search_extract_only');assert(/\.gov\//.test(r.url)&&!/samhsa/.test(r.url),st+' cites the agency page');assert(/listed/.test(r.phone_note),st+' says where the number came from');}
   assert(/^\d{3}-\d{3}-\d{4}$/.test(r.phone),st+' phone');assert(!r.web||/^https:\/\//.test(r.web),st+' only secure agency links');
   assert(r.constraints.some(c=>/988/.test(c)),st+' names 988 for a crisis');assert(r.web||/^Call the agency/.test(r.next_step),st+' next step does not point to a website it does not show');
   assert(!/@(gmail|yahoo)\.|bradley|muna/i.test(r.email||''),st+' no personal email');}}
 // ---- round twelve (2026-11-16): state housing finance agencies from NCSHA; NMEDA dealer locator
 {for(const st of [...STATES,'GU','MP','PR','VI']){const r=byId.get(st.toLowerCase()+'-housing-finance-agency');assert(r,'housing finance agency '+st);
   assert.equal(r.category,'housing');assert(!r.web||/^https:\/\/[a-z0-9.-]+(\/|$)/.test(r.web),st+' secure agency link');
   if(r.record_status==='directory_listed'){assert(r.url.startsWith('https://www.ncsha.org/'),st+' cites NCSHA');assert(!r.phone&&r.contact_how,st+' no phone that NCSHA did not print');}
   else{assert.equal(r.record_status,'official_search_extract_only');assert(r.web&&new URL(r.url).hostname===new URL(r.web).hostname,st+' cites and links its own site');assert(r.phone?/listed/.test(r.phone_note):r.contact_how,st+' contact');}
   assert(r.constraints.some(c=>/Public Housing Agency/.test(c)),st+' points renters to the housing agency listing');}
  const nyc=byId.get('ny-housing-finance-agency-2');assert(nyc&&nyc.scope==='counties'&&nyc.counties.includes('Kings'),'NYC agency listed for the five boroughs only');
  {const o=byId.get('or-housing-finance-agency');assert(o.web==='https://www.oregon.gov/ohcs/'&&/811/.test(o.description)&&/listed/.test(o.phone_note),'Oregon now links its own site, with Section 811 referrals');}for(const st of ['ar','hi'])assert(byId.get(st+'-housing-finance-agency').web,st+' now links its own site');
  const n=byId.get('us-nmeda-dealer-locator');assert(n&&n.constraints.some(c=>/sales contact/.test(c))&&n.constraints.some(c=>/receives nothing/.test(c)),'dealer locator says it shares contact details and that the site takes nothing');}
 // ---- round thirteen (2026-11-16): territories: DD councils, Parent Centers, Guam and American Samoa VR, Guam older-blind help
 {for(const t of TERR){const lo=t.toLowerCase();const dd=byId.get(lo+'-dd-council');assert(dd&&dd.url==='https://nacdd.org/councils/'&&/^\d{3}-\d{3}-\d{4}$/.test(dd.phone),'DD council for '+t);
   const pc=byId.get(lo+'-parent-center');assert(pc&&pc.url.startsWith('https://www.parentcenterhub.org/')&&pc.constraints.some(c=>/not legal representation/.test(c)),'Parent Center for '+t);}
  for(const t of ['as','gu','mp'])assert(/Hawaii/.test(byId.get(t+'-parent-center').description)&&byId.get(t+'-parent-center').constraints.some(c=>/Honolulu/.test(c)),t+' says the center is in Hawaii');
  assert(!byId.get('pr-parent-center-2').email,'no personal email for the Puerto Rico community center');
  for(const id of ['gu-vr-agency','as-vr-agency','gu-older-blind-program'])assert(byId.get(id)&&/^\d{3}-\d{3}-\d{4}$/.test(byId.get(id).phone),id);
  assert(!/executive director|\b(Smith|Sablan|Alerta|Candelario)\b/i.test(JSON.stringify(TERR.map(t=>byId.get(t.toLowerCase()+'-dd-council')))),'no staff names on territory council listings');}
 // ---- round fourteen (2026-11-16): follow-ups (mental health and housing websites) and territory independent living
 {for(const st of ['co','id','pa','tn','tx'])assert(/^https:\/\//.test(byId.get(st+'-mental-health-agency').web||''),st+' mental health agency now linked');
  assert(/Behavioral Health Administration/.test(byId.get('co-mental-health-agency').name),'Colorado names its current agency');
  for(const t of ['pr','mp','as']){const r=byId.get(t+'-cil-directory');assert(r&&r.url.includes('acl.gov')&&r.category==='independent_living','territory CIL listing '+t);assert(!/@/.test(r.description),t+' no personal email');}
  const vi=byId.get('vi-older-blind-program');assert(vi&&/dhs\.vi\.gov/.test(vi.url)&&vi.constraints.some(c=>/Hadley/.test(c)),'Virgin Islands older-blind help');}
 // ---- round fifteen (2026-11-16): four more deaf agencies from state pages; myositis; long COVID rights
 {for(const st of ['ut','ia','nh','tn']){const r=byId.get(st+'-deaf-hard-of-hearing-agency');assert(r.record_status==='official_search_extract_only'&&/^\d{3}-\d{3}-\d{4}$/.test(r.phone),st+' deaf agency from state pages');}
  assert(/advisory/.test(byId.get('ia-deaf-hard-of-hearing-agency').description),'Iowa says its commission is advisory');
  assert(/regional centers/.test(byId.get('tn-deaf-hard-of-hearing-agency').description),'Tennessee lists its regional centers');
  const lc=byId.get('us-long-covid-disability-rights');assert(lc&&/hhs\.gov/.test(lc.url)&&lc.constraints.some(c=>/800-514-0301/.test(c)),'long COVID listing cites HHS and names the ADA line');
  assert(byId.get('us-myositis-association')&&/myositis\.org/.test(byId.get('us-myositis-association').url),'myositis association');}
  // ---- round sixteen (2026-11-16): territories on the printed help list; Section 811; tribal VR; CNMI VR; bleeding disorders; dysautonomia
 {const as=byId.get('as-protection-advocacy');assert.equal(as.phone,'684-633-2441','American Samoa number in U.S. format');assert(/011/.test(as.phone_note)&&/area code 684/.test(as.phone_note),'note explains the old prefix');
  const s8=byId.get('us-hud-section-811');assert(s8&&s8.category==='housing'&&!s8.phone&&s8.contact_how&&/hud\.gov/.test(s8.url),'Section 811 listing');
  const t=byId.get('us-tribal-vr-projects');assert(t&&t.category==='work_school'&&/rsa\.ed\.gov/.test(t.url)&&/AIVRTTAC/.test(t.next_step),'tribal VR listing');
  const mp=byId.get('mp-vr-agency');assert(mp&&mp.phone==='670-322-6537'&&/Department of Labor/.test(mp.description)&&/\.gov\.mp\//.test(mp.url),'CNMI VR listing');
  const b=byId.get('us-bleeding-disorders-info');assert(b&&b.phone==='800-424-2634'&&/extension 2/.test(b.phone_note)&&/bleeding\.org/.test(b.url),'bleeding disorders line');
  const dy=byId.get('us-dysautonomia-international');assert(dy&&!dy.phone&&dy.contact_how&&dy.audience.includes('chronic'),'dysautonomia listing');
  assert(!/yamagata|rayphand|opad3937|@gmail/i.test(JSON.stringify([as,s8,t,mp,b,dy])),'no staff names or personal email in round sixteen');
  assert(!recs.some(r=>/@(gmail|yahoo|hotmail|aol|outlook|icloud)\.(com|net)\b/i.test(JSON.stringify(r))),'no free-mail addresses anywhere in the directory');
  for(const f of ['american-samoa','guam','northern-mariana-islands','puerto-rico','u-s-virgin-islands']){const h=fs.readFileSync('states/'+f+'.html','utf8');
   assert(/href="\.\.\/handout\.html\?state=(AS|GU|MP|PR|VI)">Print a help list</.test(h),f+' links its printed help list');assert(!/only a few programs/.test(h),f+' no outdated "only a few" wording');}
  assert(!/only a few programs/.test(fs.readFileSync('states/index.html','utf8')+fs.readFileSync('assets/local-help.js','utf8')),'outdated territory wording gone');}
  // ---- round seventeen (2026-11-16): phone equipment for every state (CT, DE programs; national list where none; captioned telephone service)
 {const all=[...STATES];const miss=all.filter(st=>!byId.get(st.toLowerCase()+'-tedp-phone-equipment'));
  assert.deepEqual(miss.sort(),['DC','ID','MI','NY','OH'],'only the five jurisdictions HLAA lists with no program lack a state phone equipment listing');
  const n=byId.get('us-tedp-state-programs');assert(n&&n.hide_if_state_has==='-tedp-phone-equipment'&&miss.every(st=>n.description.includes({DC:'District of Columbia',ID:'Idaho',MI:'Michigan',NY:'New York',OH:'Ohio'}[st])),'national list names the jurisdictions without a program');
  const ct=byId.get('ct-tedp-phone-equipment'),de=byId.get('de-tedp-phone-equipment'),ip=byId.get('us-captioned-telephone-service');
  assert(ct&&!ct.phone&&ct.contact_how&&ct.constraints.some(c=>/three years/.test(c)),'Connecticut program with its return rule');
  assert(de&&de.phone==='302-504-4741'&&/CapTel/.test(de.description)&&/\.delaware\.gov/.test(de.url),'Delaware CapTel and alerting devices');
  assert(ip&&ip.phone==='1-888-225-5322'&&/fcc\.gov/.test(ip.url)&&ip.audience.includes('deaf'),'captioned telephone service');
  const ny=byId.get('ny-deaf-hard-of-hearing-agency');assert(ny.phone==='518-491-5068'&&/838-900-7404/.test(ny.phone_note)&&/ny\.gov/.test(ny.url)&&!/woodfill|cahill/i.test(JSON.stringify(ny)),'New York office lines from its brochure, no staff names');
  assert.deepEqual(recs.filter(r=>/-deaf-hard-of-hearing-agency$/.test(r.id)&&/nasadhh/.test(r.url)).map(r=>r.state).sort(),['NV','VT','WI'],'three roster-only deaf listings remain');}
  // ---- round eighteen (2026-11-17): Spanish for Social Security, PABSS, Medicare, EEOC, JAN, CF Compass; two condition groups
 {const st=fs.readFileSync('espanol.html','utf8');
  for(const t of ['oprima el 7 para español','oprima el 2 para español','1-800-MEDICARE','EEOC: discriminación en el trabajo','Job Accommodation Network','administradores de casos que hablan español'])assert(st.includes(t),'Spanish page: '+t);
  assert(st.includes('href="tel:18007721213"')&&st.includes('href="https://www.ssa.gov/es/disability"')&&st.includes('href="https://www.eeoc.gov/es"')&&st.includes('href="https://es.medicare.gov"'),'Spanish page links Spanish pages and numbers');
  const src=JSON.parse(fs.readFileSync('data/ayuda-espanol.json','utf8'));assert.deepEqual(src.sections.map(s=>s.id),['ahora','refugio','comida','beneficios','trabajo','derechos','salud','vision','ninos'],'Spanish sections in order');
  assert(/Press 7 for Spanish/.test(byId.get('us-ssa-disability-apply').phone_note)&&/press 2 for Spanish/.test(byId.get('us-pabss').phone_note),'English listings say how to reach Spanish service');
  const m=byId.get('us-medicare-helpline');assert(m&&m.phone==='1-800-633-4227'&&/medicare\.gov/.test(m.url)&&m.constraints.some(c=>/Agent/.test(c)),'Medicare helpline listing');
  for(const id of ['us-pulmonary-fibrosis-help-center','us-marfan-foundation']){const r=byId.get(id);assert(r&&r.category==='peer_support'&&/listed/.test(r.phone_note)&&r.audience.includes('chronic'),id);}}
  // ---- round nineteen (2026-11-17): Parent Center lines for MI, NE, DC; South Dakota older-blind rules; parking placards for Guam, the Virgin Islands and Puerto Rico
 {const mi=byId.get('mi-parent-center'),ne=byId.get('ne-parent-center');
  assert(mi.phone==='800-552-4821'&&/Spanish 313-217-1060/.test(mi.phone_note)&&mi.email==='info@michiganallianceforfamilies.org','Michigan Parent Center line with Spanish and Arabic lines');
  assert(ne.phone==='402-346-0525'&&/800-284-8520/.test(ne.phone_note)&&/intake form/.test(ne.phone_note),'Nebraska Parent Center central line');
  for(const r of [mi,ne,byId.get('dc-parent-center')])assert(!/miller|sharif|sommer|corbett|blaeuer/i.test(JSON.stringify(r)),r.id+' carries no staff names');
  const sd=byId.get('sd-older-blind-program');assert(sd.phone==='605-773-4644'&&sd.constraints.some(c=>/55 or older/.test(c))&&sd.constraints.some(c=>/Hadley/.test(c)),'South Dakota says who qualifies');
  for(const st of ['GU','VI','PR']){const r=byId.get(st.toLowerCase()+'-disabled-parking-placard');assert(r,'parking placard '+st);
   assert(r.category==='transportation'&&r.audience.join()==='mobility'&&r.url===r.web&&/Who can certify the disability: \S/.test(r.description)&&r.contact_how,st+' placard listing in the state shape');
   assert.equal(r.constraints[r.constraints.length-1],'Forms, fees and rules change. Check the agency’s page before you apply.');}
  assert(/\.gov\b|guamtax\.com/.test(byId.get('gu-disabled-parking-placard').url)&&/bmv\.vi\.gov/.test(byId.get('vi-disabled-parking-placard').url)&&/pr\.gov/.test(byId.get('pr-disabled-parking-placard').url),'territory placards cite government sources');
  assert(!byId.get('as-disabled-parking-placard')&&!byId.get('mp-disabled-parking-placard'),'American Samoa and the Northern Mariana Islands still rely on the national entry');}
  // ---- round twenty (2026-11-17): finding an accessible rental; mitochondrial disease and retinal disease help lines
 {const h=byId.get('us-housing-search-network');assert(h&&h.category==='housing'&&h.phone==='1-877-428-8844'&&/40 accessibility fields/.test(h.description)&&/myhousingsearch\.com/.test(h.url),'national housing search network');
  const ma=byId.get('ma-mass-access-housing-registry');assert(ma&&ma.state==='MA'&&!ma.phone&&ma.contact_how&&/2011/.test(ma.constraints.join(' '))&&/massaccesshousingregistry\.org/.test(ma.web),'Mass Access registry, with the age of its source');
  const u=byId.get('us-umdf-support-line'),f=byId.get('us-foundation-fighting-blindness');
  assert(u&&u.phone==='888-900-6486'&&/listed/.test(u.phone_note)&&u.audience.includes('chronic'),'UMDF support line');
  assert(f&&f.phone==='800-683-5555'&&/listed/.test(f.phone_note)&&f.audience.includes('blind'),'Foundation Fighting Blindness line');
  assert(!/moore|garcia|kelts|leysieffer|gottel/i.test(JSON.stringify([h,ma,u,f])),'no staff names in round twenty');}
  // ---- round twenty-one (2026-11-17): Spanish for NAMI, the ADA National Network and Parent Centers; Narcolepsy Network
 {const st=fs.readFileSync('espanol.html','utf8');
  for(const t of ['Línea de Ayuda de NAMI','oprima el 2 para español, de lunes a viernes, de 10 a.m.','Red Nacional de la ADA','Centros para Padres','personal que habla español'])assert(st.includes(t),'Spanish page: '+t);
  assert(st.includes('href="tel:18009494232"')&&st.includes('href="https://adata.org/factsheet/ADANNservicesESP"'),'Spanish page links the ADA line and Spanish fact sheets');
  const a=byId.get('us-ada-national-network');assert(a&&a.hide_if_state_has==='-ada-center'&&/not an enforcement/.test(a.description)&&a.category==='rights_legal','national ADA line, hidden where the regional center is listed');
  assert(/Press 2 for Spanish/.test(byId.get('us-nami-helpline').phone_note)&&/recursos-en-espanol/.test(byId.get('us-parent-centers').constraints.join(' ')),'English listings say how to reach Spanish help');
  const n=byId.get('us-narcolepsy-network');assert(n&&n.phone==='888-292-6522'&&/listed/.test(n.phone_note)&&n.audience.includes('chronic'),'Narcolepsy Network');}
  // ---- round twenty-two (2026-11-17): state housing search sites from the MyHousingSearch network's own list
 {const HS=['AZ','CO','CT','DE','DC','FL','GA','ID','IL','IN','IA','ME','MD','MS','MT','NV','NJ','NC','OH','PA','RI','TN','VA','WI'];
  for(const st of HS){const r=byId.get(st.toLowerCase()+'-housing-search');assert(r,'housing search '+st);
   assert(r.category==='housing'&&r.record_status==='directory_listed'&&r.url==='https://www.myhousingsearch.com/ListOfSites.html'&&/^https:\/\/[a-z.]+\/$/.test(r.web)&&r.phone==='1-877-428-8844',st+' housing search listing shape');
   assert(r.name.toLowerCase().startsWith(r.web.slice(8,-1)),st+' names the site it links');}
  assert.equal(recs.filter(r=>/-housing-search$/.test(r.id)&&r.state!=='US').length,HS.length,'only statewide sites from the list');
  assert.equal(byId.get('us-housing-search-network').hide_if_state_has,'-housing-search','national listing shows only where a state has no site');}
  // ---- home page reel (2026-11-17): clean, accessible, after the crisis strip, built from data/home-reel.json
 {const home=fs.readFileSync('index.html','utf8'),src=JSON.parse(fs.readFileSync('data/home-reel.json','utf8'));
  const d=new JSDOM(home).window.document,reel=d.querySelector('section.reel');assert(reel,'home reel present');
  assert(d.querySelector('main').firstElementChild.classList.contains('urgent'),'crisis strip still leads the page');
  assert.equal(reel.previousElementSibling&&reel.previousElementSibling.classList.contains('urgent'),true,'reel sits right after the crisis strip');
  const slides=[...reel.querySelectorAll('.reel-slide[role="group"]')];assert.equal(slides.length,src.slides.length,'one slide per entry');
  slides.forEach((f,i)=>{const svg=f.querySelector('svg[role="img"]'),t=svg&&svg.querySelector('title');
   assert(t&&t.textContent===src.slides[i].alt&&svg.getAttribute('aria-labelledby')===t.id,'slide '+(i+1)+' drawing is described');
   assert.equal(f.querySelector('figcaption').textContent.startsWith(src.slides[i].joke),true,'slide '+(i+1)+' joke is real text');
   assert.equal(f.getAttribute('aria-label'),(i+1)+' of '+slides.length);});
  assert(reel.querySelector('#reel-play[hidden]')&&reel.querySelector('#reel-prev')&&reel.querySelector('#reel-next'),'controls work without the script; play control appears only with it');
  assert(/prefers-reduced-motion: reduce/.test(fs.readFileSync('assets/home-reel.js','utf8')),'reel respects reduced motion');
  assert(!/strip club|pussy|sex|naked|\bass\b|damn|hell\b/i.test(JSON.stringify(src)),'reel stays clean');}
 console.log('PASS front door: need grid and who-it-is-for links, state carried without storage, urgent strip, map tile names, '+rights.rows.length+' rights situations tied to directory records with sourced deadlines, about page with privacy and accessibility limits, '+fresh.length+' sourced gap-fill records, early intervention and a family health information center in all '+(STATES.length+TERR.length)+' jurisdictions, Spanish help page backed by directory records, a disability parking placard record from each state agency in all '+STATES.length+' jurisdictions (50 states and DC), 28 national condition organizations and supports with their own help lines or finders, older-adult vision loss programs in every state and D.C. (37 from Time To Be Bold, 11 from state agencies, 3 already listed), nine more condition organizations, Parent Centers in all 50 states and D.C., agency phone or videophone contacts for 42 state deaf and hard of hearing agencies plus state programs for three states the roster leaves out, twelve more national organizations, the state mental health agency for every state, D.C. and the five territories, every state housing finance agency, the NMEDA dealer locator, DD councils and Parent Centers in all five territories, and independent living centers for three of them; territories on the printed help list and state pages; Section 811, tribal vocational rehabilitation, CNMI vocational rehabilitation, bleeding disorders and dysautonomia; phone equipment in Connecticut and Delaware, a national list where a state has none, and captioned telephone service; Spanish lines for Social Security, PABSS, Medicare, the EEOC, JAN and CF Compass; pulmonary fibrosis and Marfan help lines; Parent Center lines for Michigan, Nebraska and D.C., South Dakota older-blind rules, and parking placards for Guam, the Virgin Islands and Puerto Rico; accessible rental searches, and mitochondrial and retinal disease help lines; Spanish for NAMI, the ADA National Network and Parent Centers, and Narcolepsy Network; housing search sites for 23 states and D.C.');
})().catch(e=>{console.error(e);process.exit(1)});
