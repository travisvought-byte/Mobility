// Visual layer (November 20, 2026): icons, jump tiles, contact buttons and dark mode. Tiles carried listing counts until
// November 23, 2026, when the owner asked that no page state counts of listings.
// Checks that the pictures only repeat what the words say, that the counts match what each page lists,
// that nothing new is loaded from outside the site, and that the dark colors meet WCAG AA.
const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const css=fs.readFileSync('assets/site.css','utf8');
const doc=f=>new JSDOM(fs.readFileSync(f,'utf8')).window.document;
const decorative=(svg,where)=>{assert.equal(svg.getAttribute('aria-hidden'),'true',where+' icon is hidden from screen readers');assert.equal(svg.getAttribute('focusable'),'false',where);
 assert.equal(svg.querySelectorAll('title,text').length,0,where+' icon carries no text of its own');assert(!svg.querySelector('[href],[src]'),where+' icon loads nothing');};

// home page: every need has one icon, and the words are unchanged
const home=doc('index.html'),needs=[...home.querySelectorAll('#needgrid > li > a')];
assert.equal(needs.length,16);
for(const a of needs){const s=a.querySelectorAll('svg.ic');assert.equal(s.length,1,'one icon on '+a.textContent);decorative(s[0],'need '+a.textContent);assert(a.textContent.trim().length>5,'need keeps its words');}
assert(needs[0].textContent.startsWith('Crisis or safety help'),'crisis stays first and its label is unchanged');

// state pages: one tile per group, its count equals the listings the group shows, and every group heading has its icon
let pages=0,tiles=0;
for(const f of fs.readdirSync('states').filter(f=>f.endsWith('.html')&&f!=='index.html')){
 const d=doc('states/'+f),nav=d.querySelector('nav.toc.tiles');assert(nav,f+' jump tiles');
 const links=[...nav.querySelectorAll('a')],secs=[...d.querySelectorAll('main > section[id]')].filter(s=>s.querySelector(':scope > h2.cat-h'));
 assert.equal(links.length,secs.length,f+' one tile per group of programs');
 links.forEach((a,i)=>{
  const sec=d.getElementById(a.getAttribute('href').slice(1));assert.equal(sec,secs[i],f+' tiles follow the page order');
  const label=a.querySelector('.tl').textContent,h2=sec.querySelector('h2');assert.equal(h2.textContent,label,f+' tile names its group exactly');
  const shown=sec.querySelectorAll(':scope > .grid > article.card').length+sec.querySelectorAll(':scope > ul.statelist > li').length;
  assert(!a.querySelector('.tn')&&!/\d/.test(a.textContent),f+' '+label+' tile states no count of listings (owner rule, November 23, 2026)');assert(shown>0,f+' '+label+' group lists programs');
  decorative(a.querySelector('svg.tic'),f+' tile '+label);decorative(h2.querySelector('svg.hic'),f+' heading '+label);tiles++;
 });
 pages++;
}
assert.equal(pages,56,'every state, D.C. and territory page');

// contact buttons: the Call link still dials the number its words show (phone-links.cjs checks every one), and the icons are CSS masks drawn from this file
assert(/\.card \.contact a\[href\^="tel:"\]\{--ci:var\(--i-phone\)\}/.test(css)&&/--i-phone:url\("data:image\/svg\+xml,/.test(css),'call icon is drawn in the stylesheet');
assert(/@media\(forced-colors:active\)\{\.card \.contact a::before\{display:none\}/.test(css),'icons step aside in Windows high contrast mode');

// nothing new from outside: no web fonts, no imports, no outside images in any stylesheet
for(const f of fs.readdirSync('assets').filter(f=>f.endsWith('.css'))){const t=fs.readFileSync('assets/'+f,'utf8');
 assert(!/@import|@font-face|url\(\s*["']?(https?:)?\/\//i.test(t),f+' loads nothing from outside the site');}

// motion: smooth scrolling and hover lifts stop for visitors who ask for reduced motion
assert(/@media\(prefers-reduced-motion:reduce\)\{html\{scroll-behavior:auto\}\*\{transition:none!important;animation:none!important\}\}/.test(css),'reduced motion turns off every transition');

// dark mode: follows the device setting, screen only, and its colors meet WCAG AA
const dark=css.slice(css.indexOf('@media screen and (prefers-color-scheme:dark){'));assert(dark.length>100,'dark mode block');
assert(/:root\{color-scheme:light dark\}/.test(css),'form controls follow the color scheme');
const v={};for(const m of dark.match(/:root\{([^}]*)\}/)[1].matchAll(/--([a-z-]+):(#[0-9a-f]{6})/g))v[m[1]]=m[2];
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.03928?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const ratio=(a,b)=>{const[x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
const link=dark.match(/a\{color:(#[0-9a-f]{6})\}/)[1];
for(const [fg,bg] of [['ink','paper'],['ink','card'],['ink','tint'],['muted','paper'],['muted','card'],['muted','tint'],['head','card'],['head','paper'],['icon','icon-bg']])
 assert(ratio(v[fg],v[bg])>=4.5,`dark ${fg} on ${bg}: ${ratio(v[fg],v[bg]).toFixed(2)}`);
for(const bg of ['paper','card','tint'])assert(ratio(link,v[bg])>=4.5,'dark links on '+bg);
assert(ratio(v.focus,v.paper)>=3&&ratio(v.focus,v.card)>=3,'dark focus ring stands out');
// light focus ring: darker than the old gold, so it shows on the cream page and on white cards
const lf=css.match(/:root\{--focus:(#[0-9a-f]{6})/)[1];assert(ratio(lf,'#f5f3ed')>=3&&ratio(lf,'#ffffff')>=3&&ratio(lf,'#e8eeea')>=3,'light focus ring contrast');
for(const f of ['assets/disability-advocacy.css','assets/mobility-routes.css','assets/ads.css'])assert(/prefers-color-scheme:dark/.test(fs.readFileSync(f,'utf8')),f+' has dark colors too');
// printing stays black on white
assert(!/@media\s*\(prefers-color-scheme:dark\)/.test(css),'dark mode is limited to screens');

console.log(`PASS visual: 16 home icons, ${tiles} jump tiles on ${pages} state pages, each naming a group that lists programs and stating no count, decorative icons only, no outside fonts or images, reduced motion, dark mode contrast.`);
