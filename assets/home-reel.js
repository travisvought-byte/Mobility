/* Home page reel: swipe, buttons or arrow keys move between slides. It plays on its own only when the visitor has not
   asked for reduced motion, pauses while the pointer or keyboard focus is in it, and has a Pause button. Nothing is saved. */
(function(){
  'use strict';
  var track=document.getElementById('reel-track');if(!track)return;
  var slides=track.querySelectorAll('.reel-slide'),n=slides.length;
  var prev=document.getElementById('reel-prev'),next=document.getElementById('reel-next');
  var count=document.getElementById('reel-count'),play=document.getElementById('reel-play');
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timer=null,playing=false,held=false;
  function current(){
    var best=0,dist=Infinity,left=track.scrollLeft;
    for(var i=0;i<n;i++){var d=Math.abs(slides[i].offsetLeft-track.offsetLeft-left);if(d<dist){dist=d;best=i;}}
    return best;
  }
  function pos(i){return slides[i].offsetLeft-track.offsetLeft;}
  function show(i){count.textContent=(i+1)+' of '+n;}
  // target is the slide a button, arrow key or the timer asked for. If something stops the scroll part way
  // (the browser settling the snap, a layout change), settle() finishes the move so the count and the slide agree.
  var target=-1,t;
  function settle(){
    var c=current();
    if(target>=0&&c!==target){c=target;target=-1;track.scrollTo({left:pos(c),behavior:'auto'});}
    else target=-1;
    show(c);
  }
  function go(i){
    i=(i+n)%n;target=i;
    track.scrollTo({left:pos(i),behavior:reduce?'auto':'smooth'});
    show(i);clearTimeout(t);t=setTimeout(settle,900);
  }
  function tick(){if(!held)go(current()+1);}
  function setPlaying(on){
    playing=on;clearInterval(timer);timer=on?setInterval(tick,8000):null;
    play.textContent=on?'Pause':'Play';play.setAttribute('aria-pressed',on?'true':'false');
  }
  prev.addEventListener('click',function(){go(current()-1);});
  next.addEventListener('click',function(){go(current()+1);});
  track.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'){e.preventDefault();go(current()+1);}
    else if(e.key==='ArrowLeft'){e.preventDefault();go(current()-1);}
  });
  track.addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(settle,150);});
  // a swipe, drag or wheel is the visitor's own choice: follow it rather than finishing an earlier move
  ['pointerdown','touchstart','wheel'].forEach(function(ev){track.addEventListener(ev,function(){target=-1;},{passive:true});});
  play.hidden=false;
  play.addEventListener('click',function(){setPlaying(!playing);});
  ['mouseenter','focusin','pointerdown'].forEach(function(ev){track.parentNode.addEventListener(ev,function(){held=true;});});
  ['mouseleave','focusout'].forEach(function(ev){track.parentNode.addEventListener(ev,function(){held=false;});});
  setPlaying(!reduce);
})();
