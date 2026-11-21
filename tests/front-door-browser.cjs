// Browser checks for the all-disabilities front door: phone and desktop widths, focus after choosing a need, state carried in links, no-JavaScript paths, no storage.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');const TYPES={'.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
 const server=http.createServer((req,res)=>{let file=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(file.endsWith('/'))file+='index.html';try{res.setHeader('Content-Type',TYPES[path.extname(file)]||'text/html');res.end(fs.readFileSync(path.join(root,file)))}catch{res.statusCode=404;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});
 try{
  const base='http://127.0.0.1:'+server.address().port+'/';
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  const fits=async()=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no sideways scrolling at '+p.viewportSize().width+'px on '+p.url());
  // home: pick a state, then a need
  await p.goto(base);await fits();assert(await p.locator('.urgent').isVisible());
  // the reel: buttons move one slide, the count follows, and Pause stops it
  // landed(k): the count names slide k+1 and the track has actually stopped on that slide (the last slide stops at the end of the track)
  const landed=k=>p.waitForFunction(k=>{const t=document.getElementById('reel-track'),s=t.querySelectorAll('.reel-slide');return document.getElementById('reel-count').textContent===(k+1)+' of '+s.length&&Math.abs(t.scrollLeft-Math.min(s[k].offsetLeft-t.offsetLeft,t.scrollWidth-t.clientWidth))<3},k,{timeout:5000});
  assert.equal(await p.locator('#reel-count').textContent(),'1 of 11');await p.click('#reel-next');await landed(1);
  await p.click('#reel-prev');await landed(0);await p.click('#reel-prev');await landed(10);await p.click('#reel-next');await landed(0);
  // a move the browser cuts short (a snap settling, a layout change) still finishes, so the count never names a slide that is not showing
  await p.click('#reel-next');await p.evaluate(()=>{const t=document.getElementById('reel-track');t.scrollTo({left:t.querySelector('.reel-slide').offsetLeft-t.offsetLeft,behavior:'auto'})});await landed(1);
  // the visitor's own swipe wins over an earlier button press, and the count follows it
  await p.click('#reel-next');await p.evaluate(()=>{const t=document.getElementById('reel-track'),s=t.querySelectorAll('.reel-slide');t.dispatchEvent(new PointerEvent('pointerdown'));t.scrollTo({left:s[4].offsetLeft-t.offsetLeft,behavior:'auto'})});await landed(4);
  assert(await p.locator('#reel-play').isVisible());assert.equal(await p.locator('#reel-play').textContent(),'Pause');await p.click('#reel-play');assert.equal(await p.getAttribute('#reel-play','aria-pressed'),'false');
  {const rm=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),q=await rm.newPage();await q.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   await q.goto(base);assert.equal(await q.locator('#reel-play').textContent(),'Play','reduced motion: the reel does not play on its own');await rm.close();}
  // phones: the menu folds behind a Menu button with Español still showing; it opens, closes with Escape and gives focus back
  {const m=await browser.newContext({viewport:{width:390,height:844}}),q=await m.newPage();await q.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   for(const page of ['','states/ohio.html','local-help.html']){await q.goto(base+page);
    assert(await q.locator('.navtoggle').isVisible()&&await q.locator('#site-nav a[lang="es"]').isVisible(),page+' Menu and Español show');
    assert(!(await q.locator('#site-nav a:not([lang])').first().isVisible()),page+' other links folded');
    await q.click('.navtoggle');assert.equal(await q.getAttribute('.navtoggle','aria-expanded'),'true');assert(await q.locator('#site-nav a:not([lang])').first().isVisible(),page+' menu opens');
    await q.keyboard.press('Escape');assert.equal(await q.getAttribute('.navtoggle','aria-expanded'),'false');assert(await q.evaluate(()=>document.activeElement.classList.contains('navtoggle')),page+' focus back on Menu');}
   await q.setViewportSize({width:1280,height:900});await q.goto(base);assert(!(await q.locator('.navtoggle').isVisible())&&await q.locator('#site-nav a[href="local-help.html"]').isVisible(),'wide screens show the full menu');await m.close();}
  await p.selectOption('#need-state','TX');assert.equal(await p.locator('#needgrid a').first().getAttribute('href'),'local-help.html?category=crisis&state=TX');
  await p.locator('#needgrid a',{hasText:'Benefits and health coverage'}).click();await p.waitForSelector('#results article.card');
  assert.equal(await p.inputValue('#f-state'),'TX');assert.equal(await p.inputValue('#f-cat'),'benefits');assert((await p.locator('#results').textContent()).includes('Texas Health and Human Services'));await fits();
  // choosing a need with a button takes keyboard and screen-reader users to the list
  await p.locator('#needs button',{hasText:'Crisis or safety help'}).click();assert.equal(await p.evaluate(()=>document.activeElement.id),'results-h');
  assert((await p.locator('#results article.card h4').first().textContent()).startsWith('988 '));
  // changing a select does not move focus
  await p.locator('#f-aud').focus();await p.selectOption('#f-aud','deaf');assert.equal(await p.evaluate(()=>document.activeElement.id),'f-aud');assert((await p.locator('#status').textContent()).includes('Deaf or hard of hearing'));await fits();
  // the before-you-call guide opens with the keyboard
  await p.goto(base+'local-help.html?state=OH&category=equipment');await p.waitForSelector('#results details.prep');await p.locator('#results details.prep summary').focus();await p.keyboard.press('Enter');assert(await p.locator('#results details.prep ul').first().isVisible());
  // no state: national resources and a prompt, never another state's list
  await p.goto(base+'local-help.html');await p.waitForSelector('#results article.card');assert((await p.locator('#status').textContent()).includes('Choose your state'));assert(!(await p.locator('#results').textContent()).includes('County Board of Developmental Disabilities'));await fits();
  for(const page of ['know-your-rights.html','about.html','espanol.html','states/','states/ohio.html','states/puerto-rico.html','404.html']){await p.goto(base+page);await fits();assert.equal(await p.locator('h1').count(),1,page+' h1');}
  // Measure only after the directory has drawn its list: measuring an empty page hides real overflow and makes the check depend on timing.
  const settled=async page=>{await p.goto(base+page);await p.waitForLoadState('load');if(page.startsWith('local-help'))await p.waitForSelector('#results article.card');if(page.startsWith('handout'))await p.waitForSelector('#sheet-state .sheet-item');};
  const PAGES=['','local-help.html?state=OH','local-help.html?state=PR','local-help.html?state=TX&audience=blind','know-your-rights.html','about.html','states/ohio.html','states/','handout.html?state=OH','partner.html','espanol.html','local-help.html?state=OH&category=children','ramps-home-access.html','mobility-rights.html?state=OH&barrier=payer','disability-advocacy.html','world.html','countries/united-kingdom.html','countries/india.html','countries/kenya.html','countries/mexico.html'];
  for(const width of [320,360,1280]){await p.setViewportSize({width,height:900});for(const page of PAGES){await settled(page);await fits();}}
  // WCAG 1.4.12 text spacing: with wider letters and words (which also stands in for a wider device font) nothing may push the page sideways
  const SPACING='*{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}p{margin-bottom:2em!important}';
  for(const width of [320,390]){await p.setViewportSize({width,height:900});for(const page of PAGES){await settled(page);await p.addStyleTag({content:SPACING});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await fits();}}
  await p.setViewportSize({width:1280,height:900});
  assert.equal(await p.evaluate(()=>localStorage.length+sessionStorage.length),0,'nothing stored');assert.deepEqual(errors,[]);
  // without JavaScript the need links, the rights page and the state pages still work
  const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),np=await plain.newPage();
  // without JavaScript the full menu shows on a phone and there is no dead Menu button
  await np.goto(base);assert(await np.locator('#site-nav a[href="local-help.html"]').isVisible()&&!(await np.locator('.navtoggle').isVisible()),'no-JS phone menu shows every link');
  await np.goto(base);assert.equal(await np.locator('#needgrid a').first().getAttribute('href'),'local-help.html?category=crisis');assert(await np.locator('.urgent a[href="tel:988"]').isVisible());
  await np.goto(base+'know-your-rights.html');assert((await np.locator('#work').textContent()).includes('180 calendar days'));
  await np.goto(base+'states/ohio.html');assert((await np.locator('main').textContent()).includes('Ohio Adult Protective Services'));assert(await np.locator('#crisis').count()===1);
  await np.goto(base+'local-help.html');assert(await np.locator('noscript').isVisible());
  console.log('PASS front door browser: '+PAGES.length+' page types at 320, 360, 390 and 1280 pixels without sideways scrolling, also with WCAG text spacing applied, state carried from home, focus moves to results after a need button and stays put on selects, a phone Menu button that opens, closes and works without JavaScript, keyboard-opened guides, no default state, no storage and no-JS paths.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
