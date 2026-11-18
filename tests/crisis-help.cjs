// Crisis help sits where it fits (owner direction, November 17, 2026): the urgent strip leads the pages that list
// programs, and shelter help lives in the housing listings and in the Spanish page's shelter section.
// No help block is repeated on every page, and the strip does not repeat shelter lines.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const skip=f=>/^google[0-9a-f]{16}\.html$/.test(f); // Search Console ownership file is not a page
const pages=[...fs.readdirSync('.').filter(f=>f.endsWith('.html')&&!skip(f)),...fs.readdirSync('states').filter(f=>f.endsWith('.html')).map(f=>'states/'+f)];
assert(pages.length>=70,'expected every root and state page, found '+pages.length);
let strips=0;
for(const f of pages){
 const html=fs.readFileSync(f,'utf8'),d=new JSDOM(html).window.document;
 assert.equal(d.querySelectorAll('.help-now').length,0,f+' carries no every-page help block');
 assert(!html.includes('<!--help-->'),f+' carries no help block marker');
 const u=d.querySelector('aside.urgent');if(!u)continue;strips++;
 assert(u.querySelector('a[href="tel:988"]')&&u.querySelector('a[href="sms:988"]'),f+' strip keeps the 988 call and text links');
 assert([...u.querySelectorAll('a')].some(a=>/category=crisis/.test(a.getAttribute('href'))),f+' strip links the crisis lines');
 assert(!u.querySelector('a[href="tel:211"]')&&!/sleep tonight/.test(u.textContent)&&!/category=housing/.test(u.innerHTML),f+' strip does not repeat shelter help');
}
assert(strips>=60,'urgent strips checked: '+strips);
// shelter help is in the directory, under housing, where a person looking for it will find it
const recs=JSON.parse(fs.readFileSync('data/local-programs.json','utf8')).records,byId=new Map(recs.map(r=>[r.id,r]));
assert.equal(byId.get('us-988-lifeline').phone,'988');assert.equal(byId.get('us-emergency-shelter').phone,'211');
assert.equal(byId.get('us-homeless-veterans-call-center').phone,'1-877-424-3838');
assert(recs.some(r=>r.state==='US'&&r.category==='housing'),'the housing category holds at least one national record');
// the Spanish page lists both shelter lines as cards, each with the evidence that a page in Spanish sends readers there
{const src=JSON.parse(fs.readFileSync('data/ayuda-espanol.json','utf8')),sec=src.sections.find(s=>s.id==='refugio');
 assert(sec&&src.sections.indexOf(sec)===1,'shelter help comes right after the crisis lines on the Spanish page');
 assert.deepEqual(sec.items.map(i=>i.record),['us-emergency-shelter','us-homeless-veterans-call-center']);
 for(const it of sec.items){assert(/samhsa\.gov\/encuentra-apoyo/.test(it.evidence)&&/2026-11-17/.test(it.evidence),'dated Spanish-language source for '+it.record);assert(/en inglés/.test(it.link_label),'English-only site is labeled for '+it.record);}
 assert(/intérprete/.test(sec.items[1].text),'says to ask for an interpreter where Spanish service is not stated');
 const d=new JSDOM(fs.readFileSync('espanol.html','utf8')).window.document,s=d.querySelector('section[aria-labelledby="refugio-h"]');
 assert(s&&s.querySelector('a[href="tel:211"]')&&s.querySelector('a[href="tel:18774243838"]')&&s.querySelectorAll('article.card').length===2,'Spanish shelter section is on the page');}
console.log('PASS crisis help: '+strips+' urgent strips carry 988 and the crisis-lines link; no page repeats a help block; shelter help is in the housing listings and the Spanish shelter section.');
