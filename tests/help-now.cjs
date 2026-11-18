// Every page carries the suicide and homelessness help block exactly once, as the last thing inside <main>
// and directly above the footer (owner direction, November 17, 2026). The urgent strip names shelter help too.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const skip=f=>/^google[0-9a-f]{16}\.html$/.test(f); // Search Console ownership file is not a page
const pages=[...fs.readdirSync('.').filter(f=>f.endsWith('.html')&&!skip(f)),...fs.readdirSync('states').filter(f=>f.endsWith('.html')).map(f=>'states/'+f)];
assert(pages.length>=70,'expected every root and state page, found '+pages.length);
const LINKS=['tel:988','sms:988','tel:211','tel:18774243838'];
for(const f of pages){
 const html=fs.readFileSync(f,'utf8'),d=new JSDOM(html).window.document,blocks=d.querySelectorAll('aside.help-now');
 assert.equal(blocks.length,1,f+' needs exactly one help block');
 const b=blocks[0],text=b.textContent,es=f==='espanol.html';
 for(const href of LINKS)assert.equal(b.querySelectorAll('a[href="'+href+'"]').length,1,f+' help block links '+href+' once');
 assert(text.includes('988')&&text.includes('211')&&text.includes('1-877-424-3838'),f+' help block names each number');
 if(es){
  assert(text.startsWith('¿Necesita ayuda ahora?')&&/suicidio/.test(text)&&/dormir esta noche/.test(text),f+' Spanish wording');
  assert(!/Need help now|homeless services/.test(text),f+' has no English wording in the block');
  // the Spanish block names only what a page written for Spanish speakers says: no HUD tool, no "press" instructions
  assert.equal(b.querySelectorAll('a[href^="https:"]').length,0,f+' Spanish block has no English-only tool link');
 }else{
  assert(text.startsWith('Need help now?')&&/Thinking about suicide/.test(text)&&/No safe place to sleep tonight/.test(text),f+' wording');
  assert(/dial 988, then press 1/.test(text)&&/press 6 for homeless services/.test(text)&&/24 hours a day/.test(text),f+' instructions');
  assert.equal(b.querySelectorAll('a[href="https://www.hud.gov/findshelter"]').length,1,f+' links the Find Shelter tool');
 }
 assert.equal(b.getAttribute('aria-label'),es?'¿Necesita ayuda ahora?':'Need help now?',f+' block is labeled');
 // inside <main>, after everything else in it except a footer written inside <main>
 const main=d.querySelector('main');assert(main&&main.contains(b),f+' help block sits inside main');
 const next=b.nextElementSibling;assert(next===null||next.tagName==='FOOTER',f+' help block is the last thing before the footer');
 const foot=d.querySelector('footer');if(foot)assert(b.compareDocumentPosition(foot)&4,f+' help block comes before the footer');
 // styles are inline, so the block reads the same on pages that do not load site.css
 assert(/background:#fff/.test(b.getAttribute('style'))&&/color:#1b1b1b/.test(b.getAttribute('style')),f+' block carries its own colors');
 // a page whose footer does not print keeps the block off the printed sheet as well
 assert.equal(b.classList.contains('no-print'),!!(foot&&foot.classList.contains('no-print')),f+' print rule matches the footer');
 assert.equal((html.match(/<!--help-->/g)||[]).length,1,f+' one help marker, so a rebuild replaces rather than repeats it');
}
// the urgent strip, where a page has one in English, also says where to turn with no place to sleep
let strips=0;
for(const f of pages){
 if(f==='espanol.html')continue;
 const d=new JSDOM(fs.readFileSync(f,'utf8')).window.document,u=d.querySelector('aside.urgent');
 if(!u)continue;strips++;
 assert(u.querySelector('a[href="tel:988"]')&&u.querySelector('a[href="sms:988"]'),f+' strip keeps 988');
 assert(u.querySelector('a[href="tel:211"]')&&u.querySelector('a[href="tel:18774243838"]'),f+' strip names 211 and the homeless veterans line');
 assert(/No safe place to sleep tonight\?/.test(u.textContent)&&/press 6 for homeless services/.test(u.textContent),f+' strip shelter wording');
 const h=[...u.querySelectorAll('a')].find(a=>/category=housing/.test(a.getAttribute('href')));assert(h,f+' strip links shelter and housing help');
 const target=h.getAttribute('href').split('?')[0];assert(fs.existsSync(path.join(path.dirname(f),target)),f+' strip housing link resolves');
 if(f.startsWith('states/')&&f!=='states/index.html')assert(/state=[A-Z]{2}&category=housing/.test(h.getAttribute('href')),f+' strip housing link keeps the state');
}
assert(strips>=60,'urgent strips checked: '+strips);
// the directory holds the records the strip and the block point to
const recs=JSON.parse(fs.readFileSync('data/local-programs.json','utf8')).records,byId=new Map(recs.map(r=>[r.id,r]));
assert.equal(byId.get('us-988-lifeline').phone,'988');assert.equal(byId.get('us-emergency-shelter').phone,'211');
assert.equal(byId.get('us-homeless-veterans-call-center').phone,'1-877-424-3838');
assert(recs.some(r=>r.state==='US'&&r.category==='housing'),'the housing link leads to at least one national record');
// the Spanish page lists both shelter lines as cards, each with the evidence that a page in Spanish sends readers there,
// so every number in its help block is backed by a record the page names
{const src=JSON.parse(fs.readFileSync('data/ayuda-espanol.json','utf8')),sec=src.sections.find(s=>s.id==='refugio');
 assert(sec&&src.sections.indexOf(sec)===1,'shelter help comes right after the crisis lines on the Spanish page');
 assert.deepEqual(sec.items.map(i=>i.record),['us-emergency-shelter','us-homeless-veterans-call-center']);
 for(const it of sec.items){assert(/samhsa\.gov\/encuentra-apoyo/.test(it.evidence)&&/2026-11-17/.test(it.evidence),'dated Spanish-language source for '+it.record);assert(/en inglés/.test(it.link_label),'English-only site is labeled for '+it.record);}
 assert(/intérprete/.test(sec.items[1].text),'says to ask for an interpreter where Spanish service is not stated');
 const d=new JSDOM(fs.readFileSync('espanol.html','utf8')).window.document,s=d.querySelector('section[aria-labelledby="refugio-h"]');
 assert(s&&s.querySelector('a[href="tel:211"]')&&s.querySelector('a[href="tel:18774243838"]')&&s.querySelectorAll('article.card').length===2,'Spanish shelter section is on the page');}
console.log('PASS help now: '+pages.length+' pages carry one help block (988, 211, Find Shelter, homeless veterans line) above the footer, Spanish on the Spanish page; '+strips+' urgent strips name shelter help.');
