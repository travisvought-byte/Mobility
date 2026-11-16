/* Home page: carry the chosen state into the need links. Nothing is saved or sent; the choice lives only in the links on this page. */
(function(){
  'use strict';
  var sel=document.getElementById('need-state');if(!sel)return;
  var links=document.querySelectorAll('#needgrid a[href^="local-help.html"],#whorow a[href^="local-help.html"],.urgent a[href^="local-help.html"]');
  var finder=document.getElementById('home-state');
  var page=document.getElementById('need-statepage');
  function slug(t){return String(t).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  function apply(){
    var st=sel.value;
    for(var i=0;i<links.length;i++){
      var a=links[i],u=a.getAttribute('href').split('?'),q=new URLSearchParams(u[1]||'');
      if(st)q.set('state',st);else q.delete('state');
      a.setAttribute('href',u[0]+'?'+q.toString());
    }
    // the state page card goes straight to the chosen state's own page
    if(page)page.setAttribute('href',st?'states/'+slug(sel.options[sel.selectedIndex].text)+'.html':'states/index.html');
    // keep the next-step finder below in step when it has this state (it covers the 50 states and D.C.)
    if(finder&&st&&finder.querySelector('option[value="'+st+'"]'))finder.value=st;
  }
  sel.addEventListener('change',apply);
  var want=(new URLSearchParams(location.search).get('state')||'').toUpperCase();
  if(want&&sel.querySelector('option[value="'+want+'"]'))sel.value=want;
  apply();
})();
