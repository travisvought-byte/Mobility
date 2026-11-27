const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const pages=fs.readdirSync('.').filter(f=>f.endsWith('.html')&&!/^google[0-9a-f]{16}\.html$/.test(f)); // Search Console ownership file is not a page
assert(pages.length>=7);
for(const f of pages){
 const d=new JSDOM(fs.readFileSync(f,'utf8')).window.document;
 assert.equal(d.documentElement.lang,['espanol.html','vehiculos-adaptados.html','equipo-medico-gratis.html','incapacidad-seguro-social.html','cuidador-familiar-pagado.html','modificaciones-hogar.html','vivienda-discapacidad.html','empleo-discapacidad.html'].includes(f)?'es':'en',f+' lang');assert(d.querySelector('meta[name=viewport]'),f+' viewport');assert(d.title.length>5,f+' title');assert(d.querySelector('meta[name=description]'),f+' description');
 assert.equal(d.querySelectorAll('h1').length,1,f+' needs exactly one h1');
 if(f!=='404.html'){const c=d.querySelector('link[rel=canonical]');assert(c&&c.href.startsWith('https://mobilitytalk.org/'),f+' canonical');assert(d.querySelector('meta[property="og:title"]'),f+' og:title');assert.equal(d.querySelectorAll('link[rel=canonical]').length,1);assert.equal(d.querySelectorAll('meta[property="og:title"]').length,1);}
 for(const el of d.querySelectorAll('[href],[src]')){
  const u=el.getAttribute('href')||el.getAttribute('src');
  if(/^(https?:|mailto:|tel:|sms:|#|data:)/.test(u)||u.startsWith('./?'))continue;
  const file=decodeURIComponent(u.split(/[?#]/)[0].replace(/^\//,'')||'index.html');
  assert(fs.existsSync(path.join('.',file)),f+' links to missing '+u);
 }
 for(const a of d.querySelectorAll('a[href^="#"]')){const id=a.getAttribute('href').slice(1);if(id)assert(d.getElementById(id),f+' missing anchor #'+id);}
 for(const img of d.querySelectorAll('img'))assert(img.hasAttribute('alt'),f+' img alt');
 assert(!/vethomeguard\.org\/\?state=undefined/.test(fs.readFileSync(f,'utf8')));
}
for(const f of ['index.html','local-help.html','ramps-home-access.html','mobility-rights.html','mobility-independence.html','disability-advocacy.html']){const d=new JSDOM(fs.readFileSync(f,'utf8')).window.document;assert.equal(d.querySelectorAll('.featured-org:not(.featured-org--also)').length,1,f+' features MIF once');assert(d.querySelector('.featured-org a[href="https://themif.org/donate/"]'),f+' donate link');assert(/Mobility Independence Foundation/.test(d.querySelector('.featured-org:not(.featured-org--also)').textContent));const lu=d.querySelectorAll('.featured-org--also');assert.equal(lu.length,['index.html','local-help.html','mobility-rights.html','disability-advocacy.html'].includes(f)?1:0,f+' Light Upon Light block count');if(lu.length){assert(/Light Upon Light/.test(lu[0].textContent)&&/Everett, Washington/.test(lu[0].textContent),f+' Light Upon Light text');assert(lu[0].querySelector('a[href="https://www.luul.org/"]'),f+' Light Upon Light link');assert(!/@|grade|ranking|Everett Station/i.test(lu[0].textContent),f+' keeps private pilot details and contacts out');assert.equal(lu[0].hasAttribute('hidden'),f!=='index.html',f+' Washington-only reveal');if(f!=='index.html')assert(lu[0].compareDocumentPosition(d.querySelector('.featured-org:not(.featured-org--also)'))&4||f==='mobility-rights.html'||f==='disability-advocacy.html',f+' Light Upon Light leads MIF');}}
assert(fs.readFileSync('CNAME','utf8').trim()==='mobilitytalk.org');
assert(fs.readFileSync('sitemap.xml','utf8').includes('https://mobilitytalk.org/local-help.html'));assert(fs.readFileSync('robots.txt','utf8').includes('Sitemap: https://mobilitytalk.org/sitemap.xml'));
console.log('PASS site: '+pages.length+' pages have one h1, canonical and social tags, working internal links and anchors, CNAME, sitemap and robots.');

// partner page
{const fs2=require('node:fs'),{JSDOM:J}=require('jsdom');
 const html=fs2.readFileSync('partner.html','utf8'),js=fs2.readFileSync('assets/partner.js','utf8');
 assert(!/veteranhomeguardians@gmail\.com/i.test(html+js),'private email stays out of partner page');
 assert(!/\b\d{1,2}\s?%/.test(html),'partner page states no unapproved percentage');
 assert(!/localStorage|sessionStorage|document\.cookie/.test(js),'partner script stores nothing');
 for(const f of ['index.html','local-help.html','mobility-rights.html','disability-advocacy.html','ramps-home-access.html','mobility-independence.html','partner.html'])assert(fs2.readFileSync(f,'utf8').includes('>Partner with us</a>'),f+' links to partner page');
 assert(/\$250/.test(html)&&/\$1,000/.test(html)&&/\$2,500/.test(html),'three sponsor levels');
 assert(/No paid placement/.test(html)&&/No commissions/.test(html),'no paid placement or commission promise');assert(!/receive a share|referral partner|share of what/i.test(html),'no commission-style referral offer');assert(fs2.readFileSync('local-help.html','utf8').includes('id="handout-link"'),'finder links to the handout');
 const run=async(q)=>{const dom=new J(html,{url:'https://mobilitytalk.org/partner.html'+q,runScripts:'outside-only'}),w=dom.window,d=w.document;w.eval(js);return {w,d};};
 (async()=>{
  let {w,d}=await run('');
  assert.equal(d.getElementById('share-state').options.length,52,'whole site plus 51 jurisdictions');
  assert.equal(d.getElementById('share-link').value,'https://mobilitytalk.org/');
  d.getElementById('share-state').value='WA';d.getElementById('share-state').dispatchEvent(new w.Event('change'));
  assert.equal(d.getElementById('share-link').value,'https://mobilitytalk.org/local-help.html?state=WA','state link');assert.equal(d.getElementById('share-handout').getAttribute('href'),'handout.html?state=WA','handout link follows the state');
  const n=d.getElementById('ref-name');n.value='Pat <b>Smith</b> & Co.';n.dispatchEvent(new w.Event('input'));
  assert.equal(d.getElementById('ref-link').value,'https://mobilitytalk.org/partner.html?ref=Pat-b-Smith-b-Co.','referral code is cleaned');
  assert(!d.getElementById('sponsor-mail').href.includes('referred'),'no referral without a link');
  assert(fs2.existsSync('assets/paypal-vhg-qr.png')&&fs2.statSync('assets/paypal-vhg-qr.png').size<120000,'QR image present and light');const qi=d.querySelector('.qr img');assert(qi&&/Veteran Home Guardians/.test(qi.alt)&&qi.getAttribute('src')==='assets/paypal-vhg-qr.png','QR has descriptive alt text');assert(!/Travis Vought/.test(qi.alt+d.querySelector('.qr').textContent),'QR block shows no personal name');
  const pay=d.getElementById('give-paypal');
  assert(!pay.hidden&&pay.href==='https://www.paypal.com/donate?business=veteranhomeguardians%40gmail.com&no_recurring=0&item_name=Mobility%20Talk%20gift%20to%20Veteran%20Home%20Guardians&currency_code=USD','PayPal donate link follows PayPal URL format');
  assert.equal(pay.target,'_blank','PayPal opens in a new tab');
  assert(/Give another way/.test(d.getElementById('give-fallback').textContent),'email route stays as a second option');
  ({w,d}=await run('?ref=Podcast%20One%3Cscript%3E'));
  const href=decodeURIComponent(d.getElementById('sponsor-mail').href);
  assert(href.includes('referred by Podcast-One-script')&&!href.includes('<'),'sponsor email credits the cleaned referral');
  assert(!d.getElementById('ref-note').hidden,'referral note shown');
  console.log('PASS partner page: sponsor levels, cleaned referral links, state links, no stored data, no private email, no unapproved percentage, nav link on every page.');
 })().catch(e=>{console.error(e);process.exit(1);});
}

// printable handout
{const fs3=require('node:fs'),{JSDOM:J3}=require('jsdom');
 const html=fs3.readFileSync('handout.html','utf8'),js=fs3.readFileSync('assets/handout.js','utf8'),data=JSON.parse(fs3.readFileSync('data/local-programs.json','utf8'));
 assert(!/localStorage|sessionStorage|document\.cookie/.test(js),'handout stores nothing');
 assert(!/veteranhomeguardians@gmail\.com/i.test(html+js),'private email stays out of handout');
 (async()=>{
  const states=Object.keys(JSON.parse(html.match(/id="state-data">(.*?)<\/script>/s)[1]));
  const terrs=Object.keys(JSON.parse(html.match(/id="territory-data">(.*?)<\/script>/s)[1]));
  assert.deepEqual(terrs,['AS','GU','MP','PR','VI'],'handout lists the five territories');
  for(const st of [...states,...terrs]){
   const dom=new J3(html,{url:'https://mobilitytalk.org/handout.html?state='+st,runScripts:'outside-only'}),w=dom.window,d=w.document;
   w.fetch=async()=>({ok:true,json:async()=>data});w.eval(js);await new Promise(r=>setTimeout(r,10));
   const a=[...d.querySelectorAll('#sheet-state .sheet-item')],b=[...d.querySelectorAll('#sheet-us .sheet-item')];
   assert(a.length>=6&&a.length<=12,st+' has 6 to 12 statewide contacts, got '+a.length);
   assert(b.length>=5,st+' lists national hotlines');
   for(const it of [...a,...b])assert(/Phone: [\d(\-+ )]+/.test(it.textContent),st+' every item has a phone number: '+it.textContent.slice(0,60));
   assert(!d.getElementById('sheet').hidden,st+' sheet shown');
   assert(!/http:\/\//.test(d.getElementById('sheet').textContent),st+' no insecure links shown');
   const terr=terrs.includes(st),foot=d.getElementById('sheet-foot').textContent,h=d.getElementById('sheet-us-h').textContent;
   assert.equal(d.getElementById('h-state').value,st,st+' chosen from the link');
   for(const it of d.querySelectorAll('.sheet-desc'))assert(!/\b(the|in) (U\.S|D\.C)\.$/.test(it.textContent),st+' description not cut at an abbreviation: '+it.textContent);
   if(terr){assert(/ask whether each one serves/.test(h)&&!/county/.test(foot)&&/territory-wide/.test(d.getElementById('h-status').textContent),st+' territory wording');
     if(st==='VI'||st==='MP')assert(/help in the /.test(d.getElementById('sheet-title').textContent),st+' reads "in the ..."');}
   else assert(/Anywhere in the United States/.test(h)&&/county-level/.test(foot),st+' state wording');
  }
  {const dom=new J3(html,{url:'https://mobilitytalk.org/handout.html',runScripts:'outside-only'}),d=dom.window.document;dom.window.fetch=async()=>({ok:true,json:async()=>data});dom.window.eval(js);
   const g=[...d.querySelectorAll('#h-state optgroup')].map(x=>x.label+':'+x.children.length);assert.deepEqual(g,['States and D.C.:51','U.S. territories:5'],'states and territories are grouped in the menu');}
  const dom=new J3(html,{url:'https://mobilitytalk.org/handout.html',runScripts:'outside-only'}),w=dom.window,d=w.document;
  w.fetch=async()=>({ok:true,json:async()=>data});w.eval(js);await new Promise(r=>setTimeout(r,10));
  assert(d.getElementById('sheet').hidden&&d.getElementById('h-print').disabled,'no sheet until a state is chosen');
  console.log('PASS handout: all 51 jurisdictions and the five territories give 6-12 contacts with phones plus national hotlines, territories grouped with their own wording, secure links only, no stored data.');
 })().catch(e=>{console.error(e);process.exit(1);});
}
