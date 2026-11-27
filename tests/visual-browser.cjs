// Browser checks for the visual layer: every visible line of text meets WCAG AA contrast in light and dark mode,
// phones never scroll sideways, the jump tiles and contact buttons render as buttons, and reduced motion turns transitions off.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const PAGES=['index.html','states/ohio.html','states/guam.html','states/index.html','local-help.html?state=OH','know-your-rights.html','espanol.html','blind-low-vision.html','service-animals.html','caregiver-respite.html','accessible-vehicles.html','free-medical-equipment.html','social-security-disability.html',
 'ramps-home-access.html','mobility-independence.html','mobility-rights.html?state=OH','disability-advocacy.html','partner.html','about.html','privacy.html','handout.html?state=OH','world.html','countries/canada.html'];
(async()=>{
 const root=path.resolve(__dirname,'..');const TYPES={'.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg'};
 const server=http.createServer((req,res)=>{let file=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(file.endsWith('/'))file+='index.html';try{res.setHeader('Content-Type',TYPES[path.extname(file)]||'text/html');res.end(fs.readFileSync(path.join(root,file)))}catch{res.statusCode=404;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 // PW_CHROMIUM lets a machine without Playwright's own download point at another Chromium build
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});
 const base='http://127.0.0.1:'+server.address().port+'/';let checked=0;
 try{
  for(const scheme of ['light','dark']){
   const ctx=await browser.newContext({viewport:{width:1280,height:900},colorScheme:scheme});
   for(const pg of PAGES){
    const p=await ctx.newPage();await p.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
    await p.goto(base+pg);await p.waitForLoadState('networkidle');
    const bad=await p.evaluate(()=>{
     const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const v=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return {r:v[0],g:v[1],b:v[2],a:v.length>3?v[3]:1};};
     const lum=({r,g,b})=>{const f=c=>{c/=255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b);};
     const over=(fg,bg)=>({r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a),a:1});
     // the color behind an element: stack the backgrounds up to the first solid one; a gradient or picture is skipped (the header)
     const behind=el=>{const st=[];for(let e=el;e;e=e.parentElement){const cs=getComputedStyle(e);if(cs.backgroundImage!=='none')return null;const c=parse(cs.backgroundColor);if(c&&c.a>0){st.push(c);if(c.a>=1)break;}}
      let o={r:255,g:255,b:255,a:1};for(let i=st.length-1;i>=0;i--)o=over(st[i],o);return o;};
     const out=[];let n=0;
     for(const el of document.querySelectorAll('body *')){
      if(el.closest('svg,[disabled],:disabled')||!el.checkVisibility())continue;
      if(![...el.childNodes].some(t=>t.nodeType===3&&t.textContent.trim()))continue;
      const cs=getComputedStyle(el),bg=behind(el);if(!bg)continue;n++;
      const fg=over(parse(cs.color),bg),a=lum(fg),b=lum(bg),cr=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      const size=parseFloat(cs.fontSize),large=size>=24||(+cs.fontWeight>=700&&size>=18.66);
      if(cr<(large?3:4.5))out.push(cr.toFixed(2)+' '+el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.split(' ').join('.'):'')+' "'+el.textContent.trim().slice(0,40)+'"');
     }
     return {out:[...new Set(out)],n};});
    assert.deepEqual(bad.out,[],`${pg} (${scheme}) text contrast below WCAG AA`);assert(bad.n>20,pg+' text was checked');checked+=bad.n;
    await p.close();
   }
   // phones: nothing scrolls sideways, and the jump list keeps every tile on screen
   const ph=await browser.newContext({viewport:{width:320,height:700},colorScheme:scheme}),q=await ph.newPage();await q.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   for(const pg of ['index.html','states/ohio.html','countries/canada.html']){await q.goto(base+pg);assert(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),pg+' fits a 320 px screen ('+scheme+')');}
   await q.goto(base+'states/ohio.html');
   assert(await q.evaluate(()=>[...document.querySelectorAll('.toc.tiles a')].every(a=>{const r=a.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height>=44;})),'jump tiles fit and are easy to tap ('+scheme+')');
   await ph.close();await ctx.close();
  }
  // contact buttons and tiles: real tap targets, the Call button filled, keyboard focus visible
  const ctx=await browser.newContext({viewport:{width:1280,height:900}}),p=await ctx.newPage();await p.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await p.goto(base+'states/ohio.html');
  const call=p.locator('#ramps-home .card .contact a[href^="tel:"]').first();const box=await call.boundingBox();assert(box.height>=44,'Call button is at least 44 px tall');
  const look=await call.evaluate(a=>{const cs=getComputedStyle(a),ic=getComputedStyle(a,'::before');return {bg:cs.backgroundColor,fg:cs.color,icon:ic.content!=='none'&&ic.width==='18px'};});
  assert(look.bg!=='rgba(0, 0, 0, 0)'&&look.bg!==look.fg&&look.icon,'Call is a filled button with its phone icon');
  await p.locator('.toc.tiles a').first().focus();
  const ring=await p.evaluate(()=>{const cs=getComputedStyle(document.activeElement);return cs.outlineStyle+' '+cs.outlineWidth;});assert.equal(ring,'solid 3px','focused tile shows a 3 px ring');
  await ctx.close();
  // reduced motion: transitions are off
  const rm=await browser.newContext({reducedMotion:'reduce'}),r=await rm.newPage();await r.route('**/*',x=>x.request().url().startsWith(base)?x.continue():x.abort());await r.goto(base+'states/ohio.html');
  assert.equal(await r.evaluate(()=>getComputedStyle(document.querySelector('.toc.tiles a')).transitionDuration),'0s','no movement when reduced motion is asked for');
  await rm.close();
  console.log(`PASS visual browser: ${checked} text elements on ${PAGES.length} pages meet WCAG AA in light and dark mode; 320 px phones fit; Call buttons, focus rings and reduced motion work.`);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
