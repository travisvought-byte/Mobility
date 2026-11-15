const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const pages=fs.readdirSync('.').filter(f=>f.endsWith('.html'));
assert(pages.length>=7);
for(const f of pages){
 const d=new JSDOM(fs.readFileSync(f,'utf8')).window.document;
 assert.equal(d.documentElement.lang,'en',f+' lang');assert(d.querySelector('meta[name=viewport]'),f+' viewport');assert(d.title.length>5,f+' title');assert(d.querySelector('meta[name=description]'),f+' description');
 assert.equal(d.querySelectorAll('h1').length,1,f+' needs exactly one h1');
 if(f!=='404.html'){const c=d.querySelector('link[rel=canonical]');assert(c&&c.href.startsWith('https://mobilitytalk.org/'),f+' canonical');assert(d.querySelector('meta[property="og:title"]'),f+' og:title');assert.equal(d.querySelectorAll('link[rel=canonical]').length,1);assert.equal(d.querySelectorAll('meta[property="og:title"]').length,1);}
 for(const el of d.querySelectorAll('[href],[src]')){
  const u=el.getAttribute('href')||el.getAttribute('src');
  if(/^(https?:|mailto:|tel:|#|data:)/.test(u)||u.startsWith('./?'))continue;
  const file=decodeURIComponent(u.split(/[?#]/)[0].replace(/^\//,'')||'index.html');
  assert(fs.existsSync(path.join('.',file)),f+' links to missing '+u);
 }
 for(const a of d.querySelectorAll('a[href^="#"]')){const id=a.getAttribute('href').slice(1);if(id)assert(d.getElementById(id),f+' missing anchor #'+id);}
 for(const img of d.querySelectorAll('img'))assert(img.hasAttribute('alt'),f+' img alt');
 assert(!/vethomeguard\.org\/\?state=undefined/.test(fs.readFileSync(f,'utf8')));
}
assert(fs.readFileSync('CNAME','utf8').trim()==='mobilitytalk.org');
assert(fs.readFileSync('sitemap.xml','utf8').includes('https://mobilitytalk.org/local-help.html'));assert(fs.readFileSync('robots.txt','utf8').includes('Sitemap: https://mobilitytalk.org/sitemap.xml'));
console.log('PASS site: '+pages.length+' pages have one h1, canonical and social tags, working internal links and anchors, CNAME, sitemap and robots.');
