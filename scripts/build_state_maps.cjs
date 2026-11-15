// Generates data/maps/<ST>.json (county outlines) from the us-atlas package.
// Run: npm i --no-save us-atlas topojson-client d3-geo && node scripts/build_state_maps.cjs
const fs=require('fs'),path=require('path');
const topo=require('topojson-client'),{geoPath}=require('d3-geo');
const us=require('us-atlas/counties-albers-10m.json');
const F={'01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY'};
const out=path.join(__dirname,'..','data','maps');fs.mkdirSync(out,{recursive:true});
const gp=geoPath().digits(1);
const feats=topo.feature(us,us.objects.counties).features;
const by={};
for(const f of feats){const st=F[String(f.id).padStart(5,'0').slice(0,2)];if(!st)continue;(by[st]=by[st]||[]).push(f);}
let total=0;
for(const [st,fs_] of Object.entries(by)){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  const counties=fs_.map(f=>{const b=gp.bounds(f);x0=Math.min(x0,b[0][0]);y0=Math.min(y0,b[0][1]);x1=Math.max(x1,b[1][0]);y1=Math.max(y1,b[1][1]);return {n:f.properties.name,d:gp(f)};}).filter(c=>c.d);
  const pad=4,vb=[x0-pad,y0-pad,x1-x0+2*pad,y1-y0+2*pad].map(v=>Math.round(v*10)/10);
  const s=JSON.stringify({state:st,viewBox:vb,counties});fs.writeFileSync(path.join(out,st+'.json'),s);total+=s.length;
}
console.log(Object.keys(by).length,'states',Math.round(total/1024),'KB total');
