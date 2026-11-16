(function(){
'use strict';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
const low=s=>String(s==null?'':s).toLowerCase();
const nk=x=>low(x).replace(/\bsaint\b/g,'st').replace(/[^a-z0-9]/g,'');
const STATES=JSON.parse($('state-data').textContent);
const GD=JSON.parse($('guide-data').textContent),GUIDES=GD.guides;
// Chips follow the order of the guide file; the results list has its own order so everyday needs come first
const ORDER=GD.results_order,NEEDS=Object.keys(GUIDES).map(k=>[k,GUIDES[k].need]).concat([['','Show everything']]);
const TERRITORIES=new Set(JSON.parse($('territory-data').textContent));
let main=[],vso=[],cats={},auds={},mainOk=false;
const q=new URLSearchParams(location.search);
function sel(){return {state:$('f-state').value,county:$('f-county').value,category:$('f-cat').value,audience:$('f-aud').value,q:low($('f-q').value).trim()};}
function all(){return main.concat(vso);}
const mapCache={};let mapTok=0;
function fillCounties(state,keep){
  const seen=new Map();
  if(mapCache[state])for(const c of mapCache[state].counties)seen.set(nk(c.n),c.n);
  for(const r of all())if(state&&r.state===state)for(const c of r.counties||[])if(!seen.has(nk(c)))seen.set(nk(c),c);
  const sorted=[...seen.values()].sort((a,b)=>a.localeCompare(b)),box=$('f-county');box.textContent='';
  const first=el('option',state?'All counties':'Choose a state first');first.value='';box.append(first);
  for(const c of sorted){const o=el('option',c);o.value=c;box.append(o);}
  box.value=sorted.find(c=>nk(c)===nk(keep))||'';box.disabled=!sorted.length;
}
// A national record that only points to "your state office" steps aside once that state's own office is listed
function replaced(r,s){return !!(s.state&&r.hide_if_state_has&&main.some(x=>x.id===low(s.state)+r.hide_if_state_has));}
function matches(r,s){
  if(r.state!=='US'&&r.state!==s.state)return false;
  if(replaced(r,s))return false;
  if(s.category&&r.category!==s.category)return false;
  if(s.audience&&!(r.audience||[]).includes(s.audience))return false;
  if(r.category==='veterans'&&r.scope==='counties'&&!s.county&&s.category!=='veterans')return false;
  if(s.county&&r.scope==='counties'&&!r.counties.some(c=>nk(c)===nk(s.county)))return false;
  if(s.q){const h=low([r.name,r.org,r.description,r.next_step,(r.counties||[]).join(' ')].join(' '));if(!s.q.split(/\s+/).every(w=>h.includes(w)))return false;}
  return true;
}
const rank=r=>r.scope==='counties'?0:r.scope==='statewide'?1:2;
const pin=r=>r.sort==null?999:r.sort;
const LINK_LABEL={official:'Official page',gov:'Government page',directory:'Directory listing',news:'News article',rule:'Rule text',social:'Facebook page',source:'Source page'};
const SHORT={ramps_home:'ramp and home modification',equipment:'equipment',independent_living:'independent living',navigation:'navigation',funding:'funding',transportation:'transportation',rights_legal:'rights and legal',dd_board:'developmental disability',peer_support:'peer support',veterans:'veterans service',crisis:'crisis and safety',benefits:'benefits',daily_living:'in-home help and food',housing:'housing',work_school:'work and school',children:'children and family',sensory:'vision and hearing'};
const direct=r=>!!(r.phone||r.email||(r.web&&/^https:\/\//.test(r.web))||r.contact_how);
function countyNote(found,s){
  const wide=found.filter(r=>r.scope!=='counties').length,local=found.length-wide,w=SHORT[s.category]?SHORT[s.category]+' ':'',cn=s.county+' County';
  const res=wide===1?'resource':'resources',wideText=wide+' statewide or national '+w+res;
  if(!local)return wideText+'; no county-specific '+w+'programs are listed for '+cn+' yet.';
  return local+' '+(local===1?'program serves':'programs serve')+' '+cn+', and '+wideText+' also apply.';
}
function scopeText(r,s){
  if(r.scope==='national')return 'Available in every state';
  if(r.scope==='statewide')return TERRITORIES.has(r.state)?'Serves '+(STATES[r.state]||r.state):'Statewide';
  const c=r.counties,more=c.length>8?' +'+(c.length-8)+' more':'';
  return 'Serves '+c.slice(0,8).join(', ')+more+' '+(c.length===1?'County':'counties');
}
function tel(p){const d=String(p).replace(/[^0-9+]/g,'');return d?'tel:'+d:null;}
function card(r,s){
  const c=el('article',null,'card');c.append(el('span',scopeText(r,s),'badge'));if(r.record_status==='directory_listed'||r.record_status==='news_reported')c.append(el('span','Listing: confirm details','badge warn'));
  const who=(r.audience||[]).map(a=>auds[a]).filter(Boolean);if(who.length)c.append(el('span','For: '+who.join(', '),'badge who'));
  c.append(el('h4',r.name));
  if(r.org&&low(r.org)!==low(r.name))c.append(el('p',r.org,'org'));
  if(r.description)c.append(el('p',r.description));
  if(r.next_step){const p=el('p');p.append(el('strong','Next step: '),document.createTextNode(r.next_step));c.append(p);}
  if(r.constraints&&r.constraints.length){const d=el('details');d.append(el('summary','Good to know'));const ul=el('ul');for(const x of r.constraints)ul.append(el('li',x));d.append(ul);c.append(d);}
  const contact=el('div',null,'contact');
  if(r.phone){const a=el('a','Call '+r.phone);const t=tel(r.phone);if(t)a.href=t;contact.append(a);}
  const site=r.web&&/^https:\/\//.test(r.web)?r.web:r.url;
  if(site&&/^https?:\/\//.test(site)){const a=el('a',(LINK_LABEL[r.link_kind]||'Source page')+' (new tab)');a.href=site;a.rel='noopener';a.target='_blank';contact.append(a);}
  if(r.email){const a=el('a','Email');a.href='mailto:'+r.email;contact.append(a);}
  if(contact.children.length)c.append(contact);
  if(r.phone&&r.phone_note)c.append(el('p',r.phone_note,'meta'));
  if(r.contact_how){const p=el('p',null,'meta');p.append(el('strong','How to reach them: '),document.createTextNode(r.contact_how));c.append(p);}
  else if(!direct(r)){c.append(el('p','No phone, email or website is listed for this program yet. '+(r.link_kind==='gov'?'The government page linked here has the application steps.':'The link goes to a source, not to the program itself, so call 2-1-1 to confirm how to apply.'),'meta'));}
  const meta=el('p',null,'meta');meta.append(document.createTextNode(r.reviewed_on?'Source page checked '+r.reviewed_on+'. ':'Source page linked. '));
  const fix=el('a','Report a problem');fix.href='mailto:travis@vethomeguard.org?subject='+encodeURIComponent('Correction: '+r.name)+'&body='+encodeURIComponent('Record: '+r.id+'\n\nWhat should change:\n');meta.append(fix);c.append(meta);
  return c;
}
// "Before you call": what to have ready and what to ask, for each kind of help
function prep(k){
  const g=GUIDES[k];if(!g||!(g.ready&&g.ready.length))return null;
  const d=el('details',null,'prep');d.append(el('summary','Before you call: what to have ready and what to ask'));
  const add=(title,items)=>{if(!items||!items.length)return;d.append(el('h4',title));const ul=el('ul');for(const x of items)ul.append(el('li',x));d.append(ul);};
  add('Have ready',g.ready);add('Ask',g.ask);
  d.append(el('p','These are general reminders. Each program sets its own rules, so ask what it needs.','meta'));
  return d;
}
function drawNeeds(s){
  const box=$('needs');box.textContent='';
  for(const [k,label] of NEEDS){
    const n=all().filter(r=>matches(r,{...s,category:k,q:s.q})).length;
    const b=el('button',label+(k?' ('+n+')':''),'need');b.type='button';b.setAttribute('aria-pressed',String(s.category===k));
    if(k&&!n&&s.category!==k)b.disabled=true;
    b.addEventListener('click',()=>{$('f-cat').value=k;render();toResults();});box.append(b);
  }
}
// After a need is chosen with a button, take the reader to the list (the chips redraw, so focus would be lost anyway)
function toResults(){const h=$('results-h');if(!h)return;h.setAttribute('tabindex','-1');if(h.scrollIntoView)h.scrollIntoView();h.focus({preventScroll:true});}
function paintMap(m,s){
  const sec=$('statemap'),box=$('map-wrap'),NS='http://www.w3.org/2000/svg';
  const name=STATES[s.state]||s.state,cnt={};let statewide=0,local=0;
  for(const r of main){if(r.state!==s.state||r.category==='veterans')continue;if(s.category&&r.category!==s.category)continue;if(s.audience&&!(r.audience||[]).includes(s.audience))continue;
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
  if(!local){sec.hidden=true;return;}
  box.append(svg);
  $('map-h').textContent='Map of resources in '+name;
  $('map-summary').textContent=statewide+' '+(statewide===1?'program serves':'programs serve')+' all of '+name+' (listed below). '+local+' '+(local===1?'program serves':'programs serve')+' specific counties. Select a county to narrow the list.';
  sec.hidden=false;
}
function drawMap(s){
  const sec=$('statemap');if(!sec)return;
  if(!s.state||TERRITORIES.has(s.state)||!main.some(r=>r.state===s.state)){sec.hidden=true;return;}
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
  const name=STATES[s.state]||s.state,terr=TERRITORIES.has(s.state);
  const groups={},jump=[];for(const r of found)(groups[r.category]=groups[r.category]||[]).push(r);
  for(const k of ORDER){const g=groups[k];if(!g)continue;g.sort((a,b)=>pin(a)-pin(b)||rank(a)-rank(b)||direct(b)-direct(a)||a.name.localeCompare(b.name));
    const head=el('div',null,'cat-head');head.id='cat-'+k;jump.push([k,(cats[k]||k),g.length]);head.append(el('h3',(cats[k]||k)+' ('+g.length+')'),el('p',(GUIDES[k]&&GUIDES[k].blurb)||''));
    const pr=prep(k);if(pr)head.append(pr);
    const list=el('div',null,'list');for(const r of g)list.append(card(r,s));out.append(head,list);}
  const nav=$('jump');nav.textContent='';nav.hidden=jump.length<2;if(jump.length>1){nav.append(el('span','Jump to: '));for(const [k,n,c] of jump){const a=el('a',n+' ('+c+')');a.href='#cat-'+k;nav.append(a);}}
  drawNeeds(s);drawMap(s);
  const luul=$('featured-state-wa');if(luul)luul.hidden=s.state!=='WA';
  const who=s.audience&&auds[s.audience]?auds[s.audience]:'';
  let msg;
  if(!s.state)msg=(found.length?'Showing '+found.length+' national '+(found.length===1?'resource':'resources')+' that work in every state. ':'No national resources match these choices. ')+'Choose your state to add local programs.';
  else if(found.length)msg='Showing '+found.length+(found.length===1?' program':' programs')+' for '+name+(s.county?', '+s.county+' County':'')+'.'+(s.county?' '+countyNote(found,s):'');
  else msg='No programs match these choices yet for '+name+'. Try All counties, a different type of help or Any disability.';
  if(who&&found.length)msg+=' These are made for this group: '+who+'. Programs for people with any disability can help too; choose Any disability to see them.';
  if(terr&&found.length)msg+=' We list only a few programs for '+name+' so far. The DIAL database under Aging and disability navigation lists more, and national lines are shown too; ask each one whether it serves '+name+'.';
  if(s.state&&!terr&&!s.county&&!s.category&&(!s.audience||s.audience==='veterans')&&vso.some(r=>r.state===s.state))msg+=' Choose a county to also see its veterans service office.';
  if(!mainOk)msg='The directory could not load. Please reload, or browse the plain list of every state.';
  $('status').textContent=msg;
  const u=new URLSearchParams();if(s.state)u.set('state',s.state);if(s.county)u.set('county',s.county);if(s.category)u.set('category',s.category);if(s.audience)u.set('audience',s.audience);if($('f-q').value.trim())u.set('q',$('f-q').value.trim());
  const qs=u.toString();history.replaceState(null,'',qs?'?'+qs:location.pathname);
  const st=s.state&&!terr?s.state:'';
  const hl=$('handout-link');if(hl)hl.href='handout.html'+(st?'?state='+encodeURIComponent(st):'');
  $('guide-link').href='https://guide.vethomeguard.org/'+(st?'?state='+encodeURIComponent(st):'');
}
function init(){
  const st=$('f-state'),cat=$('f-cat'),aud=$('f-aud');
  for(const k of ORDER){const o=el('option',cats[k]||k);o.value=k;cat.append(o);}
  for(const k of Object.keys(auds)){const o=el('option',auds[k]);o.value=k;aud.append(o);}
  const wantState=(q.get('state')||'').toUpperCase();st.value=Object.hasOwn(STATES,wantState)?wantState:'';
  if(ORDER.includes(q.get('category')))cat.value=q.get('category');
  if(Object.hasOwn(auds,q.get('audience')||''))aud.value=q.get('audience');
  $('f-q').value=q.get('q')||'';
  fillCounties(st.value,q.get('county')||'');
  render();
}
function wire(){
  $('f-state').addEventListener('change',()=>{fillCounties($('f-state').value,'');render();});
  for(const id of ['f-county','f-cat','f-aud'])$(id).addEventListener('change',render);
  $('f-q').addEventListener('input',render);
  $('f-print').addEventListener('click',()=>window.print());
  $('f-copy').addEventListener('click',()=>{const b=$('f-copy'),done=()=>{b.textContent='Link copied';setTimeout(()=>{b.textContent='Copy link to this list';},2000);};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(location.href).then(done,()=>{b.textContent='Copy the address bar link';});else b.textContent='Copy the address bar link';});
  $('filters').addEventListener('submit',e=>{e.preventDefault();render();});
  $('f-clear').addEventListener('click',()=>{$('f-county').value='';$('f-cat').value='';$('f-aud').value='';$('f-q').value='';render();});
}
wire();
fetch('data/local-programs.json').then(r=>{if(!r.ok)throw 0;return r.json();}).then(d=>{main=d.records;cats=d.categories;auds=d.audiences||{};mainOk=true;init();
  return fetch('data/county-veterans-offices.json').then(r=>r.ok?r.json():null).catch(()=>null).then(v=>{if(v){vso=v.records;const keep=$('f-county').value;fillCounties($('f-state').value,keep||q.get('county')||'');render();}});
}).catch(()=>{init();});
}());
