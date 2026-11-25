// Machine-translated text-only pages (lite/<lang>/), owner direction November 25, 2026: one per country listed for each
// language in data/lite-languages.json, plus a language index. Each page is small and script-free, says it is a machine
// translation, is noindex, links the English text-only page (which links back), dials exactly the numbers the English page
// dials, and shares the emergency number. Every cached translation keeps the numbers, links and emails of its English.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const W=JSON.parse(fs.readFileSync('data/world.json','utf8'));
const C=JSON.parse(fs.readFileSync('data/lite-languages.json','utf8')).languages;
const T=fs.existsSync('data/lite-translations.json')?JSON.parse(fs.readFileSync('data/lite-translations.json','utf8')):{};
const read=f=>fs.readFileSync(f,'utf8');
const tok=s=>(s.match(/https?:\/\/\S+|[\w.+-]+@[\w-]+\.[\w.]+|\d+/g)||[]).map(x=>x.replace(/[.,;:)]+$/,'')).sort();
let pages=0,kept=0,total=0;
const sm=read('sitemap.xml');
assert(!sm.includes('/lite/'),'translated pages stay out of the sitemap until checked by a person');
const enIdx=new JSDOM(read('lite/index.html')).window.document;
for(const [lang,L] of Object.entries(C)){
 for(const [en,tr] of Object.entries(T[lang]||{})){
  total++;
  if(tr===null)continue;
  kept++;
  assert.deepEqual(tok(tr),tok(en),lang+' translation keeps every number and link: '+en.slice(0,60));
 }
 assert(enIdx.querySelector(`a[href="${lang}/index.html"][hreflang="${lang}"]`),'English list links the '+lang+' list');
 const idx=new JSDOM(read(`lite/${lang}/index.html`)).window.document;
 assert.equal(idx.documentElement.lang,lang);
 for(const [code,local] of Object.entries(L.countries)){
  const c=W.countries.find(x=>x.code===code);
  assert(c,lang+' lists a country in data/world.json: '+code);
  const f=`lite/${lang}/${c.slug}.html`,t=read(f);
  pages++;
  assert(Buffer.byteLength(t)<=16000,f+' is small');
  for(const bad of ['<script','<iframe','<video','rel="stylesheet"'])assert(!t.includes(bad),f+' has no '+bad);
  const d=new JSDOM(t).window.document;
  assert.equal(d.documentElement.lang,lang,f);
  if(L.dir)assert.equal(d.documentElement.dir,L.dir,f);
  assert.equal(d.querySelector('meta[name=robots]').content,'noindex',f+' is noindex');
  assert(d.querySelector('[data-mt]').textContent.includes(L.ui.mt),f+' says it is a machine translation');
  assert(d.querySelector('h1').textContent.includes(local),f+' names the country in '+lang);
  assert(idx.querySelector(`a[href="${c.slug}.html"]`),lang+' list links '+c.slug);
  assert(d.querySelector(`a[href="../${c.slug}.html"][hreflang="en"]`),f+' links the English page');
  const en=new JSDOM(read(`lite/${c.slug}.html`)).window.document;
  assert(en.querySelector(`a[href="${lang}/${c.slug}.html"][hreflang="${lang}"]`),c.slug+' English page links its '+lang+' copy');
  const dials=x=>[...x.querySelectorAll('a[href^="tel:"]')].map(a=>a.getAttribute('href')).sort();
  assert.deepEqual(dials(d),dials(en),f+' dials exactly what the English page dials');
  assert(d.querySelector(`.em a[href="tel:${c.emergency.number}"]`),f+' emergency number near the top');
  for(const r of c.resources)assert(d.body.textContent.includes(r.name),f+' keeps the name of '+r.id);
  for(const a of [d.querySelector('a[href^="sms:?&body="]'),d.querySelector('a[href^="https://wa.me/?text="]')]){
   const text=decodeURIComponent(a.getAttribute('href').split(/body=|text=/)[1]);
   assert(text.includes(c.emergency.number)&&text.includes(`https://mobilitytalk.org/lite/${lang}/${c.slug}.html`),f+' share message');
   assert(text.length<=320,f+' message fits in two SMS');
  }
  const img=[...d.querySelectorAll('img')];
  assert(img.length===1&&img[0].src.startsWith(`https://vhg-guide.goatcounter.com/count?p=/mobilitytalk.org/lite/${lang}/`),f+' only the counter image');
 }
}
console.log(`lite-i18n: ${pages} machine-translated pages in ${Object.keys(C).length} languages OK; ${kept} of ${total} cached translations in use`);
