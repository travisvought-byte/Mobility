/* Shows the Washington featured organization when Washington is the chosen state. No data is stored. */
(function(){
  var blk=document.getElementById('featured-state-wa');
  if(!blk)return;
  var sels=['f-state','route-state','start-state','compose-state'].map(function(i){return document.getElementById(i);}).filter(Boolean);
  if(!sels.length)return;
  var cur=sels[0];
  function apply(){blk.hidden=cur.value!=='WA';}
  sels.forEach(function(s){s.addEventListener('change',function(){cur=s;apply();});});
  apply();
  window.addEventListener('load',apply);
  setTimeout(apply,300);
})();
