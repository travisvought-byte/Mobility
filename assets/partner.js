/* Partner page tools. Nothing is saved or sent: links are built in the page and copied by the visitor. */
(function(){
  'use strict';
  var BASE='https://mobilitytalk.org/',EMAIL='travis@vethomeguard.org';
  var STATES={"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","DC":"District of Columbia","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"};
  function $(id){return document.getElementById(id);}
  function clean(v){return String(v||'').trim().replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);}
  function mail(subject,body){return 'mailto:'+EMAIL+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);}
  function copy(input,status){
    var text=input.value;
    function done(ok){status.textContent=ok?'Copied. Paste it into a message, post or page.':'Press and hold the link to copy it.';}
    if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(function(){done(true);},function(){fallback();});}else fallback();
    function fallback(){input.focus();input.select();try{done(document.execCommand('copy'));}catch(e){done(false);}}
  }
  var ref=clean(new URLSearchParams(location.search).get('ref'));
  var sponsor=$('sponsor-mail');
  if(sponsor){
    sponsor.href=mail('Mobility Talk sponsorship'+(ref?' (referred by '+ref+')':''),
      'Organization or business name:\nLevel (Community $250, Supporting $1,000, Founding $2,500):\nWebsite:\n'+(ref?'\nReferred by: '+ref+'\n':''));
  }
  var note=$('ref-note');if(note&&ref){note.textContent='You arrived through a link from '+ref+'. If you sponsor, we will credit the introduction.';note.hidden=false;}
  var sel=$('share-state'),shareLink=$('share-link');
  if(sel&&shareLink){
    Object.keys(STATES).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=STATES[k];sel.appendChild(o);});
    var build=function(){shareLink.value=BASE+(sel.value?'local-help.html?state='+encodeURIComponent(sel.value):'');$('share-status').textContent='';var ho=$('share-handout');if(ho)ho.href='handout.html'+(sel.value?'?state='+encodeURIComponent(sel.value):'');};
    sel.addEventListener('change',build);build();
    $('share-copy').addEventListener('click',function(){copy(shareLink,$('share-status'));});
  }
  var name=$('ref-name'),refLink=$('ref-link');
  if(name&&refLink){
    var buildRef=function(){var c=clean(name.value);refLink.value=BASE+'partner.html'+(c?'?ref='+encodeURIComponent(c):'');$('ref-status').textContent='';};
    name.addEventListener('input',buildRef);buildRef();
    $('ref-copy').addEventListener('click',function(){copy(refLink,$('ref-status'));});
  }
  var pp=$('give-paypal');
  if(pp){
    /* PayPal donate link for Veteran Home Guardians. The account address is assembled here, not written in the page. */
    var acct=['veteranhomeguardians','gmail.com'].join('@');
    pp.href='https://www.paypal.com/donate?business='+encodeURIComponent(acct)+'&no_recurring=0&item_name='+encodeURIComponent('Mobility Talk gift to Veteran Home Guardians')+'&currency_code=USD';
    pp.hidden=false;
    var fb=$('give-fallback');if(fb){fb.textContent='Give another way (email)';fb.className='button secondary';}
  }
  document.documentElement.classList.add('js');
})();
