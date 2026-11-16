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
  for(const page of ['know-your-rights.html','about.html','states/','states/ohio.html','states/puerto-rico.html','404.html']){await p.goto(base+page);await fits();assert.equal(await p.locator('h1').count(),1,page+' h1');}
  for(const width of [320,1280]){await p.setViewportSize({width,height:900});for(const page of ['','local-help.html?state=OH','know-your-rights.html','states/ohio.html']){await p.goto(base+page);await p.waitForLoadState('load');await fits();}}
  assert.equal(await p.evaluate(()=>localStorage.length+sessionStorage.length),0,'nothing stored');assert.deepEqual(errors,[]);
  // without JavaScript the need links, the rights page and the state pages still work
  const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),np=await plain.newPage();
  await np.goto(base);assert.equal(await np.locator('#needgrid a').first().getAttribute('href'),'local-help.html?category=crisis');assert(await np.locator('.urgent a[href="tel:988"]').isVisible());
  await np.goto(base+'know-your-rights.html');assert((await np.locator('#work').textContent()).includes('180 calendar days'));
  await np.goto(base+'states/ohio.html');assert((await np.locator('main').textContent()).includes('Ohio Adult Protective Services'));assert(await np.locator('#crisis').count()===1);
  await np.goto(base+'local-help.html');assert(await np.locator('noscript').isVisible());
  console.log('PASS front door browser: 320, 390 and 1280 pixel widths without sideways scrolling, state carried from home, focus moves to results after a need button and stays put on selects, keyboard-opened guides, no default state, no storage and no-JS paths.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
