// Every Call link must dial the number it shows (November 18, 2026 audit: extensions were run into the number
// and "800-75-SEALS" dialed 80075). Also checks the browser scripts build call links the same way, and that no
// agency is listed twice in one state.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pages=[...fs.readdirSync('.').filter(f=>f.endsWith('.html')),...fs.readdirSync('states').filter(f=>f.endsWith('.html')).map(f=>path.join('states',f))];
const KEY='22233344455566677778889999';
function expected(shown){ // what a person would dial from the number as printed
 const m=shown.split(/\s*(?:ext\.?|extension|x)\s*(?=\d)/i);
 const d=m[0].toUpperCase().replace(/[A-Z]/g,c=>KEY[c.charCodeAt(0)-65]).replace(/[^0-9+]/g,'');
 return 'tel:'+d+(m.length>1?','+m[1].replace(/\D/g,''):'');
}
let n=0;
for(const f of pages){
 const s=fs.readFileSync(f,'utf8');
 for(const m of s.matchAll(/<a href="(tel:[^"]*)"[^>]*>([^<]*)</g)){
  const [,href,text]=m;n++;
  assert(/^tel:(\+\d{6,15}|\d{3}|\d{10}|1\d{10})(,\d{1,6})?$/.test(href),f+': call link '+href+' is not a dialable number');
  const shown=text.replace(/^(Call|Llamar al|Dial)\s+/i,'').trim();
  if(/\d{3}.*\d{4}/.test(shown))assert.equal(href,expected(shown),f+': "'+text+'" dials '+href);
 }
}
assert(n>3000,'call links checked: '+n);
// The browser scripts use the same rule
for(const [file,re] of [['assets/local-help.js',/function tel\(p\)\{.*?\}\n/],['assets/mobility-routes.js',/const tel=p=>\{.*?\};\n/]]){
 const src=fs.readFileSync(file,'utf8').match(re);assert(src,file+' has a tel helper');
 const tel=new Function(src[0]+';return tel;')();
 for(const [p,want] of [['845-452-3913 ext. 105','tel:8454523913,105'],['800-75-SEALS','tel:8007573257'],['(614) 292-7721','tel:6142927721'],['988','tel:988'],['1-800-582-7277','tel:18005827277']])assert.equal(tel(p),want,file+' '+p);
}
// No agency listed twice in one state
const recs=JSON.parse(fs.readFileSync('data/local-programs.json','utf8')).records,seen=new Map();
for(const r of recs){if(r.state==='US')continue;const k=r.state+'|'+r.name.toLowerCase().replace(/\W+/g,'');assert(!seen.has(k),'listed twice: '+r.id+' and '+seen.get(k));seen.set(k,r.id);}
for(const id of ['md-at-act','ri-at-act','ky-hearing','nc-relay'])assert(!recs.some(r=>r.id===id),id+' is merged into the agency listing');
const ri=recs.find(r=>r.id==='ri-atap');assert.equal(ri.phone,'(401) 871-1145','Rhode Island ATAP keeps the phone from the merged listing');
console.log('PASS phone links: '+n+' call links dial the number shown (extensions after a pause, lettered numbers as digits), browser scripts match, no agency listed twice in a state.');
