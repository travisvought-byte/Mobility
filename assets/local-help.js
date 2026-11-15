(function(){
'use strict';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
const low=s=>String(s==null?'':s).toLowerCase();
const STATES=JSON.parse($('state-data').textContent);
const ORDER=['ramps_home','equipment','funding','independent_living','navigation','rights_legal','dd_board','veterans'];
const BLURB={ramps_home:'Programs that build, lend or pay for ramps, bathroom changes and other home access work.',equipment:'Try, borrow, repair, finance or reuse wheelchairs and assistive technology.',funding:'Medicaid waivers and other coverage routes that often pay for equipment and home changes.',independent_living:'Disability-led centers that help with equipment, home access, peer support and advocacy.',navigation:'A first call for aging and disability services in your area.',rights_legal:'Disability rights agencies and legal aid for denials, access and housing problems.',dd_board:'County boards for developmental disabilities, which coordinate services and waiver adaptations.',veterans:'County veterans offices that help file VA housing-adaptation and equipment claims.'};
const NEEDS=[['ramps_home','Build or fix a ramp'],['equipment','Wheelchair or equipment'],['funding','Help paying for it'],['independent_living','Disability center near me'],['rights_legal','Know my rights'],['veterans','Veteran benefits'],['','Show everything']];
let main=[],vso=[],cats={},mainOk=false;
const q=new URLSearchParams(location.search);
function sel(){return {state:$('f-state').value,county:$('f-county').value,category:$('f-cat').value,q:low($('f-q').value).trim()};}
function all(){return main.concat(vso);}
function fillCounties(state,keep){
  const set=new Set();
  for(const r of all())if(r.state===state)for(const c of r.counties||[])set.add(c);
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
function render(){
  const s=sel(),out=$('results');out.textContent='';
  const found=all().filter(r=>matches(r,s));
  const name=STATES[s.state]||s.state;
  const groups={},jump=[];for(const r of found)(groups[r.category]=groups[r.category]||[]).push(r);
  for(const k of ORDER){const g=groups[k];if(!g)continue;g.sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name));
    const head=el('div',null,'cat-head');head.id='cat-'+k;jump.push([k,(cats[k]||k),g.length]);head.append(el('h3',(cats[k]||k)+' ('+g.length+')'),el('p',BLURB[k]||''));
    const list=el('div',null,'list');for(const r of g)list.append(card(r,s));out.append(head,list);}
  const nav=$('jump');nav.textContent='';nav.hidden=jump.length<2;if(jump.length>1){nav.append(el('span','Jump to: '));for(const [k,n,c] of jump){const a=el('a',n+' ('+c+')');a.href='#cat-'+k;nav.append(a);}}
  drawNeeds(s);
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
