/* Printable one-page handout. Reads the public directory file; nothing typed or chosen is saved or sent. */
(function(){
  'use strict';
  var $=function(i){return document.getElementById(i);};
  var STATES=JSON.parse($('state-data').textContent);
  var ORDER=['independent_living','equipment','rights_legal','dd_board','navigation','transportation','funding','peer_support','ramps_home'];
  var NATIONAL=['us-ada-information-line','us-medicare-equipment-repair','us-ship-medicare-counseling','us-wipa-benefits-counseling','us-icanconnect','us-tsa-cares'];
  var MAX_STATE=12,PER_CAT=2,records=[],cats={};
  var sel=$('h-state');
  Object.keys(STATES).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=STATES[k];sel.appendChild(o);});
  function el(tag,text,cls){var e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
  function first(text){
    var s=String(text||'').replace(/\s+/g,' ').trim(),m=/^(.+?[.!?])(\s|$)/.exec(s);
    s=m?m[1]:s;return s.length>150?s.slice(0,147).replace(/\s+\S*$/,'')+'…':s;
  }
  function host(r){var w=r.web&&/^https:\/\//.test(r.web)?r.web:'';if(!w)return '';try{return new URL(w).hostname.replace(/^www\./,'');}catch(e){return '';}}
  function rank(r){return (r.record_status==='official_source_reviewed'?0:r.record_status==='official_search_extract_only'?1:2);}
  function item(r){
    var d=el('div',null,'sheet-item');
    d.appendChild(el('p',r.name,'sheet-name'));
    d.appendChild(el('p',first(r.description),'sheet-desc'));
    var c=[];if(r.phone)c.push('Phone: '+r.phone);var h=host(r);if(h)c.push(h);
    d.appendChild(el('p',c.join('  ·  '),'sheet-contact'));
    return d;
  }
  function pick(st){
    var pool=records.filter(function(r){return r.state===st&&r.scope==='statewide'&&r.category!=='veterans'&&r.phone;});
    var out=[];
    ORDER.forEach(function(k){
      pool.filter(function(r){return r.category===k;}).sort(function(a,b){return rank(a)-rank(b)||a.name.localeCompare(b.name);}).slice(0,PER_CAT).forEach(function(r){out.push(r);});
    });
    return out.slice(0,MAX_STATE);
  }
  function draw(){
    var st=sel.value,sheet=$('sheet');
    if(!st||!records.length){sheet.hidden=true;$('h-print').disabled=!st;return;}
    var name=STATES[st]||st;
    $('sheet-title').textContent='Mobility and disability help in '+name;
    var a=$('sheet-state');a.textContent='';pick(st).forEach(function(r){a.appendChild(item(r));});
    var b=$('sheet-us');b.textContent='';
    NATIONAL.forEach(function(id){var r=records.filter(function(x){return x.id===id;})[0];if(r&&r.phone)b.appendChild(item(r));});
    var n=a.children.length;
    $('sheet-foot').textContent='Printed from mobilitytalk.org/handout.html?state='+st+'. More programs, rules and county-level help are at mobilitytalk.org/local-help.html?state='+st+'. Confirm hours and eligibility by phone.';
    sheet.hidden=false;$('h-print').disabled=false;
    $('h-status').textContent=n?'Showing '+n+' statewide contacts for '+name+' and '+b.children.length+' national hotlines.':'No statewide phone contacts are listed for '+name+' yet. The national hotlines below still apply.';
    history.replaceState(null,'','?state='+encodeURIComponent(st));
  }
  sel.addEventListener('change',draw);
  $('h-print').addEventListener('click',function(){window.print();});
  $('h-copy').addEventListener('click',function(){
    var link='https://mobilitytalk.org/handout.html'+(sel.value?'?state='+encodeURIComponent(sel.value):'');
    var ok=function(){$('h-status').textContent='Link copied.';};
    var fail=function(){$('h-status').textContent='Copy this link: '+link;};
    if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(link).then(ok,fail);else fail();
  });
  var want=(new URLSearchParams(location.search).get('state')||'').toUpperCase();
  if(Object.prototype.hasOwnProperty.call(STATES,want))sel.value=want;
  $('h-print').disabled=!sel.value;
  fetch('data/local-programs.json').then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(d){records=d.records;cats=d.categories;draw();}).catch(function(){$('h-status').textContent='The directory could not load. Please reload, or use the local help finder.';});
})();
