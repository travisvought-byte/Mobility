#!/usr/bin/env python3
"""Build data/local-programs.json from a checkout of vhg-veteran-resident-guide.

Usage: python3 scripts/extract_local_programs.py PATH_TO_GUIDE_CHECKOUT
Keeps each record's own review date and verification status. Never invents contacts.
"""
import glob,json,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
GUIDE=Path(sys.argv[1]) if len(sys.argv)>1 else None
if not GUIDE or not GUIDE.is_dir(): sys.exit(__doc__)
STATE_BY_NAME={}
sys.path.insert(0,str(ROOT/'scripts'))
from build_mobility_routes import STATES
for c,n in STATES.items(): STATE_BY_NAME[n.lower()]=c
CATS={'ramps_home':'Ramps & home modification','equipment':'Equipment, repair & assistive technology','independent_living':'Independent living centers','navigation':'Aging & disability navigation','funding':'Coverage & funding','rights_legal':'Rights, advocacy & legal help','veterans':'Veterans benefits help (VA housing grants)','dd_board':'Developmental disabilities county boards'}
def classify(r):
    t=(r['name']+' '+(r.get('description') or '')+' '+r['program_id']).lower(); n=r['name'].lower(); pid=r['program_id'].lower()
    if re.search(r'-cil-|independent living (center|resource|services|options|resources)|center for independent|center for independence',n+' '+pid): return 'independent_living'
    if re.search(r'ramp|home modif|home adapt|adapted housing|structural alteration|housing adaptation|hisa|\bsah\b|\bsha\b|temporary residence|home repair|access to home|accessibility modif',n+' '+pid) and not re.search(r'ombuds',n): return 'ramps_home'
    if re.search(r'independent living|\bcil\b|-cil-',n+' '+pid): return 'independent_living'
    if re.search(r'assistive tech|at ohio|lending|device|loan|reuse|equipment|kats|faast|indata|wheelchair|mobility',t) and not re.search(r'waiver|medicaid',n): return 'equipment'
    if re.search(r'disability rights|protection and advocacy|protection & advocacy|legal|law center|legal aid|advocacy|rights',n+' '+pid): return 'rights_legal'
    if re.search(r'waiver|medicaid|financ|home choice|benefit|choice|options|funding|pension|compensation',t): return 'funding'
    return 'navigation'
def want(r):
    ns=r.get('needs_supported') or []
    n=r['name'].lower()
    if re.search(r'ombud|bingo|nursing home|facility|care compare',n+' '+r['program_id'].lower()): return False
    if 'equipment_home_accessibility' in ns: return True
    if re.search(r'disability rights|protection and advocacy|protection & advocacy|independent living|legal aid|legal services|legal assistance',n): return True
    return False
def norm(r,state,src):
    sa=r.get('service_area') or []
    counties=[x for x in sa if x and x.lower() not in {'statewide','national','federal'} and not x.lower().startswith('all ')]
    scope='national' if state=='US' else ('counties' if counties else 'statewide')
    pc=r.get('public_contact') or {}; v=r.get('verification') or {}
    cat=classify(r)
    return {'id':r['program_id'],'name':r['name'],'org':r.get('organization'),'state':state,'scope':scope,'counties':counties,'category':cat,'description':r.get('description'),'next_step':r.get('next_step'),'constraints':[c for c in (r.get('constraints') or []) if c],'phone':pc.get('phone'),'phone_note':pc.get('phone_label'),'email':pc.get('email'),'web':pc.get('web_route'),'url':r.get('official_url'),'reviewed_on':v.get('last_reviewed_on'),'record_status':v.get('record_status'),'origin':src}
out={}
def add(rec):
    if rec['id'] in out and (out[rec['id']].get('phone') or not rec.get('phone')): return
    out[rec['id']]=rec
files=sorted(glob.glob(str(GUIDE/'data/public/*.json')))
for p in files:
    name=Path(p).name
    try:d=json.load(open(p))
    except Exception:continue
    if not isinstance(d,list):continue
    for r in d:
        if isinstance(r,dict) and 'program_id' in r and want(r):
            s=r.get('state'); st='US' if (s in (None,'shared') or (r.get('service_area') or [''])[0] in ('National','federal')) else s
            if st=='US' or len(st)==2: add(norm(r,st,'data/public/'+name))
# Ohio: prototype data has no state field
for r in json.load(open(GUIDE/'prototype-data.json')):
    if 'program_id' in r and want(r) and not r['program_id'].endswith('-vso'):
        sa=[x.lower() for x in (r.get('service_area') or [])]
        st='US' if any(x in ('federal',) for x in sa) or r['program_id'].startswith('va-') else 'OH'
        add(norm(r,st,'prototype-data.json'))
for r in json.load(open(GUIDE/'data/public/ohio-regional-referrals.json')):
    if r['program_id'] not in out: 
        rec=norm(r,'OH','data/public/ohio-regional-referrals.json'); rec['category']='navigation'; add(rec)
# Ohio county developmental disabilities boards
dd=json.load(open(GUIDE/'data/ohio-county-boards-dd.json'))
for b in dd['boards']:
    add({'id':'oh-dd-board-'+b['county'].lower().replace(' ','-'),'name':b['county']+' County Board of Developmental Disabilities','org':'Ohio Department of Developmental Disabilities (county board)','state':'OH','scope':'counties','counties':[b['county']],'category':'dd_board','description':'County board that arranges eligibility, service coordination and, for people on a DD waiver, home and vehicle adaptations.','next_step':'Call the board, ask about eligibility and service coordination, and ask what home or vehicle adaptations the waiver can fund.','constraints':[],'phone':b['phone'],'phone_note':'Main office, from the state county-board map','email':None,'web':None,'url':dd['source']['url'],'reviewed_on':dd['source']['reviewed_on'],'record_status':'official_source_reviewed','origin':'data/ohio-county-boards-dd.json'})
# County veterans offices (they help file VA SAH, SHA and HISA claims)
for p in sorted(glob.glob(str(GUIDE/'data/public/*-county-veterans-offices.json'))):
    slug=Path(p).name.replace('-county-veterans-offices.json','').replace('-',' ')
    fallback=STATE_BY_NAME.get(slug)
    for o in json.load(open(p)):
        st=o.get('state') or fallback
        if not isinstance(o,dict) or not o.get('county') or not st:continue
        org=o.get('organization') or (o['county']+' County veterans service office')
        statewide=o['county'].lower().startswith('all ') or o['county'].lower()=='statewide'
        name=org if statewide or o['county'].lower() in org.lower() else org+' ('+o['county']+' County)'
        slugc=re.sub(r'[^a-z0-9]+','-',o['county'].lower()).strip('-')
        add({'id':'vso-'+st.lower()+'-'+slugc,'name':name,'org':org,'state':st,'scope':'statewide' if statewide else 'counties','counties':[] if statewide else [o['county']],'category':'veterans','description':'Free help for veterans and survivors with VA claims and housing-adaptation grants such as SAH, SHA and HISA.','next_step':'Call and ask for help applying for a VA home adaptation grant or equipment benefit.','constraints':[],'phone':o.get('phone'),'phone_note':None,'email':o.get('email'),'web':o.get('website'),'url':o.get('source_url'),'reviewed_on':o.get('reviewed_on'),'record_status':o.get('contact_status'),'origin':'data/public/'+Path(p).name})
# Protection and Advocacy agency for every state and D.C. (NDRN list); keep the guide's richer record where one exists
ndrn=json.load(open(ROOT/'data/ndrn-protection-advocacy.json'))
def have_pa(st,name):
    n=name.lower()
    return any(r['state']==st and r['category']=='rights_legal' and (r['id']==st.lower()+'-rights' or n in r['name'].lower() or r['name'].lower() in n) for r in out.values())
for st,name,url,phone in ndrn['agencies']:
    if have_pa(st,name):continue
    add({'id':'pa-ndrn-'+st.lower(),'name':name,'org':'State Protection and Advocacy agency','state':st,'scope':'statewide','counties':[],'category':'rights_legal','description':'The federally designated Protection and Advocacy agency for people with disabilities in '+STATES[st]+'. It provides information, advocacy and legal help on disability rights.','next_step':'Call or visit the website and ask whether they can help with your situation, such as a denial, an access barrier or a rights violation, and how intake works.','constraints':[],'phone':phone,'phone_note':'First number listed by the National Disability Rights Network','email':None,'web':None,'url':url,'reviewed_on':ndrn['source']['read_on'],'record_status':'directory_listed','origin':'data/ndrn-protection-advocacy.json'})
# Hand-verified additions (data/added-programs.json); never override a guide record with the same id
for r in json.load(open(ROOT/'data/added-programs.json'))['records']:
    if r['id'] not in out: add(r)
recs=sorted(out.values(),key=lambda r:(r['state']!='US',r['state'],r['category'],r['name']))
main=[r for r in recs if r['category']!='veterans'];vso=[r for r in recs if r['category']=='veterans']
meta={'schema_version':1,'built_from':'travisvought-byte/vhg-veteran-resident-guide','categories':CATS}
json.dump({**meta,'records':main},open(ROOT/'data/local-programs.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump({**meta,'records':vso},open(ROOT/'data/county-veterans-offices.json','w'),ensure_ascii=False,separators=(',',':'))
import collections
print(len(recs),'records');print(collections.Counter(r['category'] for r in recs));print(collections.Counter(r['state'] for r in recs).most_common(60))
