// Browser checks for the help map: the map follows the filters and sets them, the list beside it works by keyboard,
// "Use my location" finds the state and county inside the page, phones fit, and without JavaScript the old paths remain.
// Outside requests (the OpenStreetMap pictures) are blocked here, so only this site's own files load.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),TYPES={'.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
 const server=http.createServer((req,res)=>{let f=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(f.endsWith('/'))f+='index.html';try{res.setHeader('Content-Type',TYPES[path.extname(f)]||'text/html');res.end(fs.readFileSync(path.join(root,f)))}catch{res.statusCode=404;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{})});
 const base='http://127.0.0.1:'+server.address().port+'/';
 const open=async(ctx,pg)=>{const p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await p.goto(base+pg);await p.waitForLoadState('networkidle');p.errs=errs;return p;};
 const settle=p=>p.waitForTimeout(400);
 try{
  // Ohio: every county drawn and listed; the list sets the county filter, by mouse and by keyboard
  const ctx=await browser.newContext({viewport:{width:1280,height:900}});
  let p=await open(ctx,'local-help.html?state=OH');
  assert(await p.isVisible('#statemap')&&await p.isVisible('#map-wrap'),'map shows for a state');
  assert.equal(await p.locator('#map-wrap .leaflet-overlay-pane path').count(),88,'88 Ohio counties drawn');
  assert.equal(await p.locator('#map-list button.maphit').count(),88,'88 counties listed beside the map');
  assert.equal(await p.textContent('#map-list-h'),'Counties on the map');
  assert((await p.textContent('#map-back'))==='See all states');
  // a way to pick a county, not a ranking (owner direction, November 23, 2026): one fill for every county, no counts anywhere on the map
  assert.equal(await p.locator('#map-legend').count(),0,'no shading legend');
  const fills=await p.$$eval('#map-wrap .leaflet-overlay-pane path',ps=>[...new Set(ps.map(x=>x.getAttribute('fill')+'/'+x.getAttribute('fill-opacity')))]);
  assert.equal(fills.length,1,'every county has the same fill until one is chosen: '+fills.join(', '));
  assert(!/\d/.test(await p.textContent('#statemap')),'the map, its list and its notes state no counts');
  await p.locator('#map-wrap .leaflet-overlay-pane path').nth(10).hover();await settle(p);
  const tip=await p.textContent('.leaflet-tooltip');assert(tip&&!/\d|program/i.test(tip),'county tooltip names the county only: '+tip);
  await p.locator('#map-list button.maphit',{hasText:'Delaware'}).first().click();await settle(p);
  assert.equal(await p.inputValue('#f-county'),'Delaware','choosing a county in the list filters the directory');
  assert(new URL(p.url()).searchParams.get('county')==='Delaware'&&(await p.textContent('#results')).includes('Delaware County Board'),'the list below follows');
  assert.equal(await p.locator('#map-list button.maphit[aria-pressed=true]').textContent(),'Delaware'+await p.locator('#map-list button.maphit[aria-pressed=true] .mh-sub').textContent(),'the chosen county is marked pressed');
  assert(await p.locator('#map-list button.maphit').count()<88,'the map zooms to the county and the list shows the counties in view');
  assert.equal(await p.textContent('#map-back'),'Show all of Ohio');
  await p.click('#map-back');await settle(p);assert.equal(await p.inputValue('#f-county'),'','back to the whole state');
  const first=p.locator('#map-list button.maphit').first();await p.keyboard.press('Shift');await first.focus();
  assert.equal(await p.evaluate(()=>{const cs=getComputedStyle(document.activeElement);return cs.outlineStyle+' '+cs.outlineWidth;}),'solid 3px','focused list button shows a ring');
  const firstName=await first.locator('.mh-name').textContent();await p.keyboard.press('Enter');await settle(p);
  assert.equal(await p.inputValue('#f-county'),firstName,'Enter on a list button chooses the county');
  const sizes=await p.$$eval('#map-list button.maphit',bs=>bs.map(b=>b.getBoundingClientRect().height));assert(sizes.every(h=>h>=44),'list buttons are easy to tap');
  // the county menu still drives the map
  await p.selectOption('#f-county','Franklin');await settle(p);assert.equal(await p.getAttribute('#map-list button.maphit[aria-pressed=true] >> nth=0','aria-pressed'),'true');
  assert.deepEqual(p.errs,[],'no script errors');
  // no state: every state and territory drawn; choosing one in the list sets the state
  p=await open(ctx,'local-help.html');
  assert.equal(await p.locator('#map-wrap .leaflet-overlay-pane path').count(),56,'every state, D.C. and territory drawn');
  assert(await p.isHidden('#map-back')&&!/\d/.test(await p.textContent('#statemap')),'no counts on the national map or its list');
  await p.locator('#map-list button.maphit',{hasText:'Kentucky'}).click();await settle(p);
  assert.equal(await p.inputValue('#f-state'),'KY','choosing a state in the list sets the state');assert((await p.textContent('#map-h')).includes('Kentucky'));
  assert.equal(await p.evaluate(()=>localStorage.length+sessionStorage.length),0,'nothing stored');
  // a territory has its municipios or districts too
  p=await open(ctx,'local-help.html?state=PR');assert(await p.isVisible('#map-wrap'));assert.equal(await p.locator('#map-list button.maphit').count(),78,'Puerto Rico municipios');
  await ctx.close();

  // Use my location: found inside the page, on the local help page and from the home page
  const here=await browser.newContext({viewport:{width:1280,height:900},geolocation:{latitude:39.9612,longitude:-82.9988},permissions:['geolocation']});
  p=await open(here,'local-help.html?category=equipment');await p.click('#map-locate');await p.waitForFunction(()=>document.getElementById('f-county').value!=='');
  assert.equal(await p.inputValue('#f-state'),'OH');assert.equal(await p.inputValue('#f-county'),'Franklin','Columbus is in Franklin County');
  assert.equal(await p.inputValue('#f-cat'),'equipment','other choices stay');assert((await p.textContent('#map-status')).includes('Franklin County, Ohio'));
  p=await open(here,'index.html');assert(await p.isVisible('#home-map')&&await p.isVisible('#map-locate'),'home map and location button show with JavaScript');
  assert.equal(await p.locator('#home-map .leaflet-overlay-pane path').count(),56);assert.equal(await p.locator('.tilemap a.tile').count(),51,'the state squares stay beside the map');
  await Promise.all([p.waitForURL(/local-help\.html\?state=OH&county=Franklin$/),p.click('#map-locate')]);
  await here.close();
  const away=await browser.newContext({geolocation:{latitude:48.8566,longitude:2.3522},permissions:['geolocation']});
  p=await open(away,'local-help.html');await p.click('#map-locate');await p.waitForFunction(()=>/not in a U\.S\. state/.test(document.getElementById('map-status').textContent));
  assert.equal(await p.inputValue('#f-state'),'','a location abroad changes nothing');await away.close();
  const no=await browser.newContext({permissions:[]});p=await open(no,'local-help.html');await p.click('#map-locate');
  await p.waitForFunction(()=>/not shared/.test(document.getElementById('map-status').textContent));await no.close();

  // phones: the map and its list fit a 320 px screen, light and dark
  for(const scheme of ['light','dark']){const ph=await browser.newContext({viewport:{width:320,height:700},colorScheme:scheme});
   for(const pg of ['local-help.html?state=TX','local-help.html','index.html']){p=await open(ph,pg);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),pg+' fits a 320 px screen ('+scheme+')');}
   await ph.close();}

  // reduced motion: the map does not animate
  const rm=await browser.newContext({reducedMotion:'reduce'});p=await open(rm,'local-help.html?state=OH');
  assert(!(await p.getAttribute('#map-wrap','class')).includes('leaflet-fade-anim'),'no map animation');
  const moving=await browser.newContext();const pm=await open(moving,'local-help.html?state=OH');assert((await pm.getAttribute('#map-wrap','class')).includes('leaflet-fade-anim'),'animation is on otherwise');await moving.close();await rm.close();

  // without JavaScript: the state squares and the menus, no empty map
  const nojs=await browser.newContext({javaScriptEnabled:false});p=await nojs.newPage();await p.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await p.goto(base+'index.html');assert(await p.isHidden('.homemapcol')&&await p.isVisible('.tilemap a.tile >> nth=0'),'home: squares, no map');
  await p.goto(base+'local-help.html');assert(await p.isHidden('#statemap'),'local help: no empty map');await nojs.close();
  console.log('PASS help map browser: counties drawn and listed, list and menu set each other by mouse and keyboard, states and territories, Use my location at home and abroad, 320 px phones in light and dark, reduced motion and no-JavaScript paths.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
