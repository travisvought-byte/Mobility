// Text-only, low-data edition (owner direction, November 25, 2026: serve people on slow or costly connections).
// Every country in data/world.json has lite/<slug>.html: no scripts, stylesheets, iframes or pictures (only the 1x1
// visit counter), small enough for 2G, canonical to the full country page, every listing with the number it dials, and a
// ready-made SMS and WhatsApp message carrying the emergency number. Full country pages and world.html link to it, and
// lite pages stay out of the sitemap.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const W=JSON.parse(fs.readFileSync('data/world.json','utf8'));
const sm=fs.readFileSync('sitemap.xml','utf8');
assert(!sm.includes('/lite/'),'lite pages are not in the sitemap');
const read=f=>fs.readFileSync(f,'utf8');
const check=(f,limit)=>{
 const t=read(f);
 assert(Buffer.byteLength(t)<=limit,f+' is small');
 for(const bad of ['<script','<iframe','<video','rel="stylesheet"'])assert(!t.includes(bad),f+' has no '+bad);
 const d=new JSDOM(t).window.document;
 assert.equal(d.documentElement.lang,'en');
 assert.equal(d.querySelectorAll('h1').length,1,f+' one h1');
 const imgs=[...d.querySelectorAll('img')];
 assert(imgs.length===1&&imgs[0].alt===''&&imgs[0].src.startsWith('https://vhg-guide.goatcounter.com/count?p=/mobilitytalk.org/lite/'),f+' only the counter image');
 return d;
};
const idx=check('lite/index.html',24000);
assert.equal(idx.querySelector('link[rel=canonical]').href,'https://mobilitytalk.org/world.html');
for(const c of W.countries){
 const f='lite/'+c.slug+'.html',d=check(f,16000);
 assert(idx.querySelector(`a[href="${c.slug}.html"]`),'lite index links '+c.slug);
 assert.equal(d.querySelector('link[rel=canonical]').href,'https://mobilitytalk.org/countries/'+c.slug+'.html');
 assert(d.querySelector(`.em a[href="tel:${c.emergency.number}"]`),c.code+' emergency number near the top');
 for(const r of c.resources){
  assert(d.body.textContent.includes(r.name),f+' lists '+r.id);
  if(r.phone)assert(d.querySelector(`a[href="tel:${r.dial}"]`),f+' calls '+r.id);
 }
 const sms=d.querySelector('a[href^="sms:?&body="]'),wa=d.querySelector('a[href^="https://wa.me/?text="]');
 assert(sms&&wa,f+' has SMS and WhatsApp links');
 for(const a of [sms,wa]){
  const text=decodeURIComponent(a.getAttribute('href').split(/body=|text=/)[1]);
  assert(text.includes('Emergency: '+c.emergency.number),f+' message carries the emergency number');
  assert(text.includes('https://mobilitytalk.org/lite/'+c.slug+'.html'),f+' message carries the page address');
  assert(text.length<=320,f+' message fits in two SMS');
 }
 const full=new JSDOM(read('countries/'+c.slug+'.html')).window.document;
 assert(full.querySelector(`a[href="../lite/${c.slug}.html"]`),c.slug+' full page links its text-only version');
}
assert(new JSDOM(read('world.html')).window.document.querySelector('a[href="lite/index.html"]'),'world.html links the text-only list');
console.log('lite: '+W.countries.length+' text-only country pages OK');
