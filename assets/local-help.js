(function(){
'use strict';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
const low=s=>String(s==null?'':s).toLowerCase();
const STATES=JSON.parse($('state-data').textContent);
const ORDER=['ramps_home','equipment','funding','independent_living','navigation','rights_legal','peer_support','dd_board','veterans'];
const BLURB={ramps_home:'Programs that build, lend or pay for ramps, bathroom changes and other home access work.',equipment:'Try, borrow, repair, finance or reuse wheelchairs and assistive technology.',funding:'Medicaid waivers and other coverage routes that often pay for equipment and home changes.',independent_living:'Disability-led centers that help with equipment, home access, peer support and advocacy.',navigation:'A first call for aging and disability services in your area.',rights_legal:'Disability rights agencies and legal aid for denials, access and housing problems.',peer_support:'Peer mentors and support groups for wheelchair users, spinal cord injury, limb loss and other mobility disabilities. Many meet online.',dd_board:'County boards, regional centers and state offices for developmental disabilities. They decide eligibility, coordinate services and manage waiver funding.',veterans:'County veterans offices that help file VA housing-adaptation and equipment claims.'};
const NEEDS=[['ramps_home','Build or fix a ramp'],['equipment','Wheelchair or equipment'],['funding','Help paying for it'],['independent_living','Disability center near me'],['rights_legal','Know my rights'],['peer_support','Support groups'],['dd_board','Developmental disability services'],['veterans','Veteran benefits'],['','Show everything']];
let main=[],vso=[],cats={},mainOk=false;
const q=new URLSearchParams(location.search);
function sel(){return {state:$('f-state').value,county:$('f-county').value,category:$('f-cat').value,q:low($('f-q').value).trim()};}
function all(){return main.concat(vso);}
const mapCache={};let mapTok=0;
function fillCounties(state,keep){
  const set=new Set();
  for(const r of all())if(r.state===state)for(const c of r.counties||[])set.add(c);
  if(mapCache[state])for(const c of mapCache[state].counties)set.add(c.n);
  const sorted=[...set].sort((a,b)=>a.localeCompare(b)),box=$('f-county');box.textContent='';
  const first=el('option','All counties');first.value='';box.append(first);
  for(const c of sorted){const o=el('option',c);o.value=c;box.append(o);}
  box.value=sorted.includes(keep)?keep:'';
}
function matches(r,s){
  if(r.state!=='US'&&r.state!==s.state)return false;
  if(s.category&&r.category!==s.category)return false;
  if(r.category==='veterans'&&r.scope==='counties'&&!s.county&&s.category!=='veterans')return false;
  if(s.county&&r.scope==='counties'&&!r.counties.some(c=>low(c)===low(s.county)))return false;
  if(s.q){const h=low([r.name,r.org,r.description,r.next_step,(r.counties||[]).join(' ')].join(' '));if(!s.q.split(/\s+/).every(w=>h.includes(w)))return false;}
  return true;
}
const rank=r=>r.scope==='counties'?0:r.scope==='statewide'?1:2;
function scopeText(r,s){
  if(r.scope==='national')return 'Available in every state';
  if(r.scope==='statewide')return 'Statewide';
  const c=r.counties,more=c.length>8?' +'+(c.length-8)+' more':'';
  return 'Serves '+c.slice(0,8).join(', ')+more+' '+(c.length===1?'County':'counties');
}
function tel(p){const d=String(p).replace(/[^0-9+]/g,'');return d?'tel:'+d:null;}
function card(r,s){
  const c=el('article',null,'card');c.append(el('span',scopeText(r,s),'badge'));if(r.record_status==='directory_listed'||r.record_status==='news_reported')c.append(el('span','Listing: confirm details','badge warn'));c.append(el('h4',r.name));
  if(r.org&&low(r.org)!==low(r.name))c.append(el('p',r.org,'org'));
  if(r.description)c.append(el('p',r.description));
  if(r.next_step){const p=el('p');p.append(el('strong','Next step: '),document.createTextNode(r.next_step));c.append(p);}
  if(r.constraints&&r.constraints.length){const d=el('details');d.append(el('summary','Good to know'));const ul=el('ul');for(const x of r.constraints)ul.append(el('li',x));d.append(ul);c.append(d);}
  const contact=el('div',null,'contact');
  if(r.phone){const a=el('a','Call '+r.phone);const t=tel(r.phone);if(t)a.href=t;contact.append(a);}
  const site=r.web&&/^https:\/\//.test(r.web)?r.web:r.url;
  if(site&&/^https?:\/\//.test(site)){const a=el('a','Official page');a.href=site;a.rel='noopener';a.target='_blank';contact.append(a);}
  if(r.email){const a=el('a','Email');a.href='mailto:'+r.email;contact.append(a);}
  if(contact.children.length)c.append(contact);
  if(r.phone&&r.phone_note)c.append(el('p',r.phone_note,'meta'));
  const meta=el('p',null,'meta');meta.append(document.createTextNode(r.reviewed_on?'Source page checked '+r.reviewed_on+'. ':'Source page linked. '));
  const fix=el('a','Report a problem');fix.href='mailto:travis@vethomeguard.org?subject='+encodeURIComponent('Correction: '+r.name)+'&body='+encodeURIComponent('Record: '+r.id+'\n\nWhat should change:\n');meta.append(fix);c.append(meta);
  return c;
}
function drawNeeds(s){
  const box=$('needs');box.textContent='';
  for(const [k,label] of NEEDS){
    const n=all().filter(r=>matches(r,{...s,category:k,q:s.q})).length;
    const b=el('button',label+(k?' ('+n+')':''),'need');b.type='button';b.setAttribute('aria-pressed',String(s.category===k));
    b.addEventListener('click',()=>{$('f-cat').value=k;render();});box.append(b);
  }
}
const nk=x=>low(x).replace(/\bsaint\b/g,'st').replace(/[^a-z0-9]/g,'');
function paintMap(m,s){
  const sec=$('statemap'),box=$('map-wrap'),NS='http://www.w3.org/2000/svg';
  const name=STATES[s.state]||s.state,cnt={};let statewide=0,local=0;
  for(const r of main){if(r.state!==s.state||r.category==='veterans')continue;if(s.category&&r.category!==s.category)continue;
    if(r.scope==='counties'){local++;for(const c of r.counties||[])cnt[nk(c)]=(cnt[nk(c)]||0)+1;}else statewide++;}
  box.textContent='';
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',m.viewBox.join(' '));svg.setAttribute('role','group');svg.setAttribute('aria-label','County map of '+name);svg.setAttribute('class','statesvg');
  const pick=c=>{const box2=$('f-county');if(![...box2.options].some(o=>o.value===c))fillCounties(s.state,c);box2.value=(low(box2.value)===low(c))?'':c;render();};
  for(const c of m.counties){
    const n=cnt[nk(c.n)]||0,lvl=n===0?0:n===1?1:n<=3?2:n<=6?3:4;
    const p=document.createElementNS(NS,'path');p.setAttribute('d',c.d);p.setAttribute('class','co c'+lvl+(s.county&&nk(s.county)===nk(c.n)?' sel':''));
    p.setAttribute('tabindex','0');p.setAttribute('role','button');p.setAttribute('aria-label',c.n+': '+n+(n===1?' local program':' local programs')+'. Select to filter the list.');
    const ti=document.createElementNS(NS,'title');ti.textContent=c.n+' ('+n+')';p.append(ti);
    p.addEventListener('click',()=>pick(c.n));p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(c.n);}});
    svg.append(p);
  }
  box.append(svg);
  $('map-h').textContent='Map of resources in '+name;
  $('map-summary').textContent=statewide+' '+(statewide===1?'program serves':'programs serve')+' all of '+name+' (listed below). '+local+' '+(local===1?'program serves':'programs serve')+' specific counties. Select a county to narrow the list.';
  sec.hidden=false;
}
function drawMap(s){
  const sec=$('statemap');if(!sec)return;
  if(!main.some(r=>r.state===s.state)){sec.hidden=true;return;}
  if(mapCache[s.state]){paintMap(mapCache[s.state],s);return;}
  const tok=++mapTok;
  fetch('data/maps/'+s.state+'.json').then(r=>r.ok?r.json():null).catch(()=>null).then(m=>{
    if(!m||!Array.isArray(m.counties)||!Array.isArray(m.viewBox)){sec.hidden=true;return;}
    mapCache[s.state]=m;if(tok!==mapTok)return;
    fillCounties(s.state,$('f-county').value);render();});
}
function render(){
  const s=sel(),out=$('results');out.textContent='';
  const found=all().filter(r=>matches(r,s));
  const name=STATES[s.state]||s.state;
  const groups={},jump=[];for(const r of found)(groups[r.category]=groups[r.category]||[]).push(r);
  for(const k of ORDER){const g=groups[k];if(!g)continue;g.sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name));
    const head=el('div',null,'cat-head');head.id='cat-'+k;jump.push([k,(cats[k]||k),g.length]);head.append(el('h3',(cats[k]||k)+' ('+g.length+')'),el('p',BLURB[k]||''));
    const list=el('div',null,'list');for(const r of g)list.append(card(r,s));out.append(head,list);}
  const nav=$('jump');nav.textContent='';nav.hidden=jump.length<2;if(jump.length>1){nav.append(el('span','Jump to: '));for(const [k,n,c] of jump){const a=el('a',n+' ('+c+')');a.href='#cat-'+k;nav.append(a);}}
  drawNeeds(s);drawMap(s);
  let msg=found.length?'Showing '+found.length+' programs for '+name+(s.county?', '+s.county+' County':'')+'.':'No programs match these choices yet for '+name+'. Try All counties or a different category, or use the Veteran Resource Guide for local contacts.';
  if(found.length&&!main.some(r=>r.state===s.state))msg='We have not added '+name+' programs to this directory yet. Showing the federal VA routes; use the national directories below to find your state’s programs.';
  if(!s.county&&!s.category&&vso.some(r=>r.state===s.state))msg+=' Choose a county to also see its veterans service office.';
  if(!mainOk)msg='The directory could not load. Please reload, or use the Veteran Resource Guide.';
  $('status').textContent=msg;
  const u=new URLSearchParams();u.set('state',s.state);if(s.county)u.set('county',s.county);if(s.category)u.set('category',s.category);if($('f-q').value.trim())u.set('q',$('f-q').value.trim());
  history.replaceState(null,'','?'+u.toString());
  $('guide-link').href='https://guide.vethomeguard.org/?state='+encodeURIComponent(s.state);
}
function init(){
  const st=$('f-state'),cat=$('f-cat');
  for(const k of ORDER){const o=el('option',cats[k]||k);o.value=k;cat.append(o);}
  const wantState=(q.get('state')||'OH').toUpperCase();st.value=Object.hasOwn(STATES,wantState)?wantState:'OH';
  if(ORDER.includes(q.get('category')))cat.value=q.get('category');
  $('f-q').value=q.get('q')||'';
  fillCounties(st.value,q.get('county')||'');
  render();
}
function wire(){
  $('f-state').addEventListener('change',()=>{fillCounties($('f-state').value,'');render();});
  for(const id of ['f-county','f-cat'])$(id).addEventListener('change',render);
  $('f-q').addEventListener('input',render);
  $('f-print').addEventListener('click',()=>window.print());
  $('f-copy').addEventListener('click',()=>{const b=$('f-copy'),done=()=>{b.textContent='Link copied';setTimeout(()=>{b.textContent='Copy link to this list';},2000);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(location.href).then(done,()=>{b.textContent='Copy the address bar link';});else b.textContent='Copy the address bar link';});
  $('filters').addEventListener('submit',e=>{e.preventDefault();render();});
  $('f-clear').addEventListener('click',()=>{$('f-county').value='';$('f-cat').value='';$('f-q').value='';render();});
}
wire();
fetch('data/local-programs.json').then(r=>{if(!r.ok)throw 0;return r.json();}).then(d=>{main=d.records;cats=d.categories;mainOk=true;init();
  return fetch('data/county-veterans-offices.json').then(r=>r.ok?r.json():null).catch(()=>null).then(v=>{if(v){vso=v.records;const keep=$('f-county').value;fillCounties($('f-state').value,keep||q.get('county')||'');render();}});
}).catch(()=>{init();});
}());
