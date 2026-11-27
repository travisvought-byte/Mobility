// Privacy page, advertising section and ad slots (2026-11-19).
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process'),{JSDOM}=require('jsdom');
const doc=f=>new JSDOM(fs.readFileSync(f,'utf8')).window.document;
const pages=[...fs.readdirSync('.').filter(f=>f.endsWith('.html')&&!/^google[0-9a-f]{16}\.html$/.test(f)),...fs.readdirSync('states').filter(f=>f.endsWith('.html')).map(f=>'states/'+f)];

// ---- privacy page: exists, dated, accurate about the counter, the host and ads, and linked from every footer
{const d=doc('privacy.html'),t=d.querySelector('main').textContent.replace(/\s+/g,' ');
 assert(/November 23, 2026/.test(d.querySelector('header').textContent),'privacy page is dated');
 assert(/GoatCounter/.test(t)&&/without cookies/.test(t)&&/does not store the IP address/.test(t),'visit counter described');
 assert(/not the part after a question mark/.test(t),'query strings are not counted, as the counter is set up');
 const gc=fs.readFileSync('index.html','utf8');assert(/data-goatcounter="https:\/\/vhg-guide\.goatcounter\.com\/count"/.test(gc)&&/location\.pathname/.test(gc)&&/u\.origin\+u\.pathname/.test(gc),'the counter setup the privacy page describes is the one on the pages');
 assert(d.querySelector('a[href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"]'),'GitHub privacy statement linked');
 assert(/Nothing you type or choose on this site is saved or sent/.test(t),'same promise as the front page');
 for(const u of ['https://adssettings.google.com','https://policies.google.com/technologies/ads','https://policies.google.com/technologies/partner-sites','https://optout.aboutads.info'])assert(d.querySelector(`a[href="${u}"]`),'ad choice link '+u);
 assert(d.getElementById('ads')&&/labeled “Advertisement”/.test(t)&&/This site shows ads/.test(t),'advertising section');
 assert(/Google AdSense/.test(t)&&/only non-personalized ads/.test(t)&&/can set its own cookies/.test(t),'names Google AdSense, non-personalized ads and its cookies');
 assert(!/do not set cookies or store anything/.test(t),'no longer says the pages set no cookies at all');
 assert(/do not sell personal information/.test(t)&&/children under 13/.test(t),'no sale, not for children');
 assert(d.querySelector('a[href^="mailto:travis@vethomeguard.org"]'),'existing contact route');
 for(const a of d.querySelectorAll('a[target="_blank"]'))assert(/new tab/.test(a.textContent+a.nextSibling?.textContent),'new-tab links say so');
 assert(fs.readFileSync('sitemap.xml','utf8').includes('<loc>https://mobilitytalk.org/privacy.html</loc>'),'privacy page in the sitemap');
 for(const f of pages){const links=[...doc(f).querySelectorAll('footer a')].filter(a=>/(^|\/)privacy\.html$/.test(a.getAttribute('href')));assert.equal(links.length,1,f+' footer links to the privacy page once');}
 const ab=doc('about.html').getElementById('privacy-h').closest('section');assert(/GoatCounter/.test(ab.textContent)&&ab.querySelector('a[href="privacy.html"]'),'about page privacy section names the counter and points to the privacy page');}

// ---- partner page: advertising kept separate from nonprofit sponsorship; promises unchanged
{const d=doc('partner.html'),ad=d.getElementById('advertising'),sp=d.getElementById('sponsor');
 assert(ad&&sp&&(sp.compareDocumentPosition(ad)&4),'advertising section follows sponsorship');
 const t=ad.textContent;
 assert(/separate from the nonprofit sponsorships/.test(t)&&/labeled “Advertisement\.?”/.test(t)&&/reviewed before it runs/.test(t)&&/misleading/.test(t)&&/in crisis/.test(t)&&/never change what is listed or the order/.test(t),'ground rules');
 assert(/mobility equipment/.test(t)&&/accessible travel/.test(t)&&/home modification/.test(t)&&/disability services/.test(t),'who can advertise');
 assert(!/\$\s?\d/.test(t)&&!/Veteran Home Guardians|501\(c\)/.test(t),'no prices and no word on who receives ad income');
 assert(ad.querySelector('a[href^="mailto:travis@vethomeguard.org"]'),'existing contact route');
 assert(/Thanks are acknowledgments only/.test(sp.textContent)&&/received by Veteran Home Guardians/.test(sp.textContent),'sponsorship wording unchanged');}

// ---- Google AdSense: the publisher's code on the pages that may carry an ad and the country pages, never on help pages
const ads=JSON.parse(fs.readFileSync('data/ads.json','utf8'));assert(Array.isArray(ads.ads)&&ads.ads.length===0,'no ads sold directly yet');
{const client=ads.adsense_client;assert(/^ca-pub-\d{16}$/.test(client),'AdSense publisher set');
 assert.equal(fs.readFileSync('ads.txt','utf8'),`google.com, ${client.replace('ca-','')}, DIRECT, f08c47fec0942fa0\n`,'ads.txt names the publisher');
 const countries=fs.readdirSync('countries').filter(f=>f.endsWith('.html')).map(f=>'countries/'+f);
 const yes=['index.html','know-your-rights.html','ramps-home-access.html','mobility-rights.html','mobility-independence.html','disability-advocacy.html','blind-low-vision.html','deaf-hard-of-hearing.html','service-animals.html','caregiver-respite.html','accessible-vehicles.html','free-medical-equipment.html','social-security-disability.html','accessible-travel.html','paid-family-caregiver.html','home-modifications.html','vehiculos-adaptados.html','equipo-medico-gratis.html','incapacidad-seguro-social.html','cuidador-familiar-pagado.html','modificaciones-hogar.html',...pages.filter(f=>f.startsWith('states/')&&f!=='states/index.html'),...countries];
 const no=['local-help.html','handout.html','espanol.html','404.html','about.html','partner.html','privacy.html','states/index.html','world.html','auction.html'];
 for(const f of yes){const t=fs.readFileSync(f,'utf8'),head=t.slice(0,t.indexOf('</head>'));
  assert.equal((t.match(/adsbygoogle\.js/g)||[]).length,1,f+' loads Google ad code once');
  assert(head.includes(`<meta name="google-adsense-account" content="${client}">`)&&head.includes(`adsbygoogle.js?client=${client}"`),f+' ad code in the head with the publisher');
  assert(head.indexOf('requestNonPersonalizedAds=1')>=0&&head.indexOf('requestNonPersonalizedAds=1')<head.indexOf('adsbygoogle.js'),f+' asks for non-personalized ads before the code loads');}
 for(const f of no)assert(!/adsbygoogle|google-adsense-account/.test(fs.readFileSync(f,'utf8')),f+' never loads Google ad code');
}
for(const f of [...pages,'404.html']){const t=fs.readFileSync(f,'utf8');assert(!/ad-slot|assets\/ads\.css|rel="sponsored|<!--ad-->/.test(t),f+' carries no sold ad markup while no ad is sold');}

// ---- ad slots with a fixture: run the builder's own placement on the built pages, without touching them
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ads-'));
const fx=(list,client)=>{const p=path.join(tmp,'ads-'+Math.random().toString(36).slice(2)+'.json');fs.writeFileSync(p,JSON.stringify({adsense_client:client??ads.adsense_client,ads:list}));return p;};
const run=(file,page,input)=>execFileSync('python3',['scripts/ads.py','--ads',file,'--page',page,'--today','2026-11-19'],{input:input??fs.readFileSync(page,'utf8'),encoding:'utf8',stdio:['pipe','pipe','pipe']});
const base={sponsor:'Acme Mobility',text:'Wheelchair repair in your area.',url:'https://example.com/acme'};
const ALL=fx([
 {...base,slot:'home'},
 {...base,slot:'every-topic',sponsor:'Topic Co'},
 {...base,slot:'state-ohio',sponsor:'Buckeye Lifts',image:'assets/social-card.png',alt:'Buckeye Lifts logo'},
 {...base,slot:'every-state',sponsor:'National <b>Ramps</b>'},
 {...base,slot:'every-state',sponsor:'Second state ad'},
 {...base,slot:'service-animals',sponsor:'Expired Co',end:'2026-11-18'},
 {...base,slot:'know-your-rights',sponsor:'Future Co',start:'2026-12-01'}]);
const check=(page,html,sponsor)=>{const d=new JSDOM(html).window.document,s=d.querySelectorAll('aside.ad-slot');
 assert.equal(s.length,1,page+' one ad slot');const a=s[0];
 assert.equal(a.getAttribute('aria-label'),'Advertisement',page+' labeled region');assert.equal(a.querySelector('.ad-label').textContent,'Advertisement',page+' visible label');
 const link=a.querySelector('a.ad-link');assert(link&&/\bsponsored\b/.test(link.rel)&&/\bnoopener\b/.test(link.rel),page+' rel sponsored noopener');
 assert.equal(a.querySelector('.ad-sponsor').textContent,sponsor,page+' right ad');
 assert(!a.closest('ul,ol,li,article,.card,.list,section,.urgent,.featured-org,footer,header'),page+' ad is outside lists, cards, sections and help blocks');
 assert(a.closest('main'),page+' ad is in the main region');
 const main=a.closest('main');assert(![...main.querySelectorAll('section')].some(x=>a.compareDocumentPosition(x)&4),page+' ad comes after the main content');
 assert(d.querySelector(`link[rel=stylesheet][href$="assets/ads.css"]`),page+' ad stylesheet loaded');return {d,a};};
check('index.html',run(ALL,'index.html'),'Acme Mobility');
check('mobility-rights.html',run(ALL,'mobility-rights.html'),'Topic Co');
check('service-animals.html',run(ALL,'service-animals.html'),'Topic Co'); // its own ad has ended
check('know-your-rights.html',run(ALL,'know-your-rights.html'),'Topic Co'); // its own ad has not started
{const {d,a}=check('states/ohio.html',run(ALL,'states/ohio.html'),'Buckeye Lifts');const img=a.querySelector('img');assert(img&&img.getAttribute('src')==='../assets/social-card.png'&&img.alt==='Buckeye Lifts logo','image path and alt on a state page');assert.equal(d.querySelector('link[href$="ads.css"]').getAttribute('href'),'../assets/ads.css');}
{const out=run(ALL,'states/texas.html');check('states/texas.html',out,'National <b>Ramps</b>');assert(!/<b>Ramps/.test(out),'ad text is escaped');}
// idempotent, and an emptied ad file takes the ad back out
{const once=run(ALL,'states/ohio.html'),twice=run(ALL,'states/ohio.html',once);assert.equal(once,twice,'placing an ad twice changes nothing');
 assert.equal(run(fx([]),'states/ohio.html',once),fs.readFileSync('states/ohio.html','utf8'),'an empty ad file restores the page exactly');}

// the AdSense code comes off again when the publisher is emptied, and a bad publisher stops the build
assert(!/adsbygoogle|google-adsense-account/.test(run(fx([],''),'states/ohio.html')),'an empty publisher takes Google ad code out');
assert.throws(()=>run(fx([],'pub-123'),'index.html'),undefined,'a malformed publisher stops the build');
// ---- crisis and help pages never get a slot, whatever the ad file says
const every=fx([{...base,slot:'home'},{...base,slot:'every-topic'},{...base,slot:'every-state'}]);
for(const f of ['local-help.html','handout.html','espanol.html','404.html','about.html','partner.html','privacy.html','states/index.html'])
 assert(!/ad-slot|ads\.css/.test(run(every,f)),f+' never carries an ad');
for(const slot of ['local-help','handout','espanol','crisis','404','partner'])
 assert.throws(()=>run(fx([{...base,slot}]),'index.html'),undefined,'an ad aimed at '+slot+' stops the build');
// bad data stops the build rather than showing a broken ad
assert.throws(()=>run(fx([{...base,slot:'home',url:'http://example.com/'}]),'index.html'),undefined,'https only');
assert.throws(()=>run(fx([{...base,slot:'home',image:'assets/x.png'}]),'index.html'),undefined,'image needs alt');
assert.throws(()=>run(fx([{...base,slot:'home',text:'x'.repeat(201)}]),'index.html'),undefined,'short text only');
fs.rmSync(tmp,{recursive:true,force:true});
console.log('PASS ads and privacy: privacy page dated and linked from all '+pages.length+' footers and the sitemap; advertising section apart from sponsorship; empty ad file leaves no markup; fixture ads render labeled, rel="sponsored", outside lists and after main content, one per page; crisis and help pages never take a slot.');
