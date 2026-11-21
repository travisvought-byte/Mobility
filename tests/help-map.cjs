// The help map (November 21, 2026): real state and county outlines over OpenStreetMap on the home page and the
// local help page. Checks the outline files, that every county the directory names can be shaded, that Leaflet is
// served from this site, that the map loads nothing else from outside and stores nothing, and that the privacy
// page says where the map pictures come from.
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=f=>fs.readFileSync(f,'utf8'),json=f=>JSON.parse(read(f));
const nk=x=>String(x==null?'':x).toLowerCase().replace(/\bsaint\b/g,'st').replace(/[^a-z0-9]/g,'');

// outlines: every state, D.C. and territory, each with its counties
const states=json('data/geo/states.json').states,codes=states.map(s=>s.id);
const help=read('local-help.html'),names=JSON.parse(help.match(/<script type="application\/json" id="state-data">([^<]*)<\/script>/)[1]);
assert.deepEqual(codes.slice().sort(),Object.keys(names).sort(),'an outline for every state, D.C. and territory in the directory');
let counties=0;
for(const s of states){
 assert(Array.isArray(s.b)&&s.b.length===4&&s.b[0]<s.b[2]&&s.b[1]<s.b[3],s.id+' box');
 assert(s.p.length&&s.p.every(poly=>poly.every(r=>r.length>=4&&r.every(p=>p.length===2&&p[1]>-15&&p[1]<72&&p[0]>-190&&p[0]<180))),s.id+' outline is longitude and latitude');
 const g=json('data/geo/'+s.id+'.json');assert.equal(g.state,s.id);assert(g.counties.length>0,s.id+' has counties');
 for(const c of g.counties){assert(c.n&&c.p.length,s.id+' county '+c.n);counties++;}
 assert.equal(new Set(g.counties.map(c=>c.n)).size,g.counties.length,s.id+' county names are unique (independent cities are named "… City")');
}
assert(counties>3200,'about 3,200 counties and county equivalents');
assert(json('data/geo/OH.json').counties.length===88,'Ohio has 88 counties');
assert(json('data/geo/AK.json').b[0]<-180,'the western Aleutians sit on the American side of the map');

// every county a listing names can be shaded on the map (Falls Church, Virginia is too small for these outlines;
// it stays in the County menu, which also lists names from the listings)
const recs=json('data/local-programs.json').records.concat(json('data/county-veterans-offices.json').records);
const miss=new Set();
for(const r of recs){if(r.scope!=='counties')continue;
 const known=new Set(json('data/geo/'+r.state+'.json').counties.flatMap(c=>[c.n].concat(c.a||[])).map(nk));
 for(const c of r.counties)if(!known.has(nk(c)))miss.add(r.state+':'+c);}
assert.deepEqual([...miss].filter(m=>!/^VA:Falls Church( City)?$/.test(m)),[],'county names in listings match the map');

// Leaflet is served from this site, before the map script, on both pages; no CDN
for(const f of ['assets/vendor/leaflet.js','assets/vendor/leaflet.css'])assert(fs.statSync(f).size>10000,f);
assert(/Leaflet 1\.9\.4/.test(read('assets/vendor/leaflet.js')),'Leaflet 1.9.4');
const home=read('index.html');
for(const [f,t] of [['index.html',home],['local-help.html',help]]){
 const a=t.indexOf('assets/vendor/leaflet.js'),b=t.indexOf('assets/help-map.js');assert(a>0&&b>a,f+' loads Leaflet, then the map');
 assert(t.includes('<link rel="stylesheet" href="assets/vendor/leaflet.css">'),f+' map styles');
 assert(!/unpkg\.com|cdn\.jsdelivr|cdnjs/.test(t),f+' loads no map code from a CDN');
 assert(/OpenStreetMap, which sees which area you look at\. <a href="privacy\.html#map">Privacy<\/a>/.test(t),f+' says where the map pictures come from, beside the map');
}
assert(help.indexOf('assets/help-map.js')<help.indexOf('assets/local-help.js'),'map script is ready before the directory draws');
// keyboard and screen reader path: a list beside the map, a region label, and the no-JavaScript fallbacks
assert(/id="map-wrap" class="map-wrap" role="region" aria-label="Map of[^"]*listed next to the map\."/.test(help)&&/<ul id="map-list" class="maphits">/.test(help),'list beside the map');
assert(/<section id="statemap"[^>]*hidden>/.test(help),'the map section stays hidden until the map can draw');
assert(/<div class="homemapcol" hidden>/.test(home)&&(home.match(/<a class="tile"/g)||[]).length===51,'home keeps the 51 state squares; the map column shows only with JavaScript');
assert(/<button type="button" id="map-locate" hidden>Use my location<\/button>/.test(home),'home location button appears only with the map');

// the map script: OpenStreetMap pictures and this site's own files only, nothing stored, location used in the page
const js=read('assets/help-map.js');
assert.deepEqual([...new Set(js.match(/https:\/\/[a-z.]+/g))].sort(),['https://leafletjs.com','https://tile.openstreetmap.org','https://www.openstreetmap.org'].sort(),'only OpenStreetMap is contacted (and credited)');
assert(!/localStorage|sessionStorage|document\.cookie|XMLHttpRequest|sendBeacon/.test(js),'stores and sends nothing');
assert(/fetch\(u\)/.test(js)&&/'data\/geo\/'/.test(js),'fetches only the outline files');
assert(/getCurrentPosition/.test(js)&&!/watchPosition/.test(js),'asks for the location once, when the button is pressed');
assert(/prefers-reduced-motion: reduce/.test(js),'no map animation when reduced motion is asked for');
assert(/scrollWheelZoom: false/.test(js),'the page keeps scrolling over the map until it is used');

// privacy
const priv=read('privacy.html');
assert(/<h2 id="map">Maps<\/h2>/.test(priv)&&/tile\.openstreetmap\.org/.test(priv)&&/sees your IP address/.test(priv)&&/never stored or sent/.test(priv),'privacy page explains the map pictures and the location button');
assert(/privacy\.html#map/.test(read('about.html')),'about page points to the map privacy notes');
console.log(`PASS help map: outlines for ${states.length} states and territories and ${counties} counties, every listed county shadeable, Leaflet served from this site, OpenStreetMap the only outside source and disclosed, nothing stored, list and no-JavaScript fallbacks.`);
