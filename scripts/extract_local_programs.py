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
CATS={'ramps_home':'Ramps & home modification','equipment':'Equipment, repair & assistive technology','independent_living':'Independent living centers','navigation':'Aging & disability navigation','funding':'Coverage & funding','transportation':'Rides & transportation','rights_legal':'Rights, advocacy & legal help','veterans':'Veterans benefits help (VA housing grants)','dd_board':'Developmental disability agencies','peer_support':'Peer support groups','crisis':'Crisis, safety & mental health','benefits':'Income, benefits & health coverage','daily_living':'In-home help, food & daily living','housing':'Housing help','work_school':'Work, school & training','children':'Babies, children & school','sensory':'Vision, hearing & communication'}
# Who a program is mainly for. Records with no tag serve people with any disability.
AUDIENCES={'mobility':'Mobility or physical disability','blind':'Blind or low vision','deaf':'Deaf or hard of hearing','deafblind':'DeafBlind','idd':'Intellectual or developmental disability','autism':'Autism','brain_injury':'Brain injury or stroke','mental_health':'Mental health condition','chronic':'ALS, MS, Parkinson\u2019s and similar conditions','children':'Children, youth and families','older':'Older adults','veterans':'Veterans'}
# U.S. territories listed in the directory and on their own pages (the law finder and letter builder cover the 50 states and D.C. only)
from build_mobility_routes import TERRITORIES
PLACES={**STATES,**TERRITORIES}
# States that really do have a county with the state's own name; everywhere else a service area equal to the state name means statewide
SAME_NAME_COUNTY={'AR','HI','ID','IA','NY','OK','UT','DC'}
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
    counties=[x for x in sa if x and x.lower() not in {'statewide','national','federal'} and not x.lower().startswith('all ') and not (state not in SAME_NAME_COUNTY and x.lower()==(PLACES.get(state) or '').lower())]
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
# Hand-checked direct contact details (data/contact-overrides.json): fill empty fields only, never overwrite a contact a record already has
_ov=json.load(open(ROOT/'data/contact-overrides.json'))
for rid,o in _ov['overrides'].items():
    r=out.get(rid)
    if not r: print('contact override: no record',rid); continue
    for k in ('phone','phone_note','email','web','contact_how'):
        if o.get(k) and not r.get(k): r[k]=o[k]
    if o.get('constraints_replace'): r['constraints']=list(o['constraints_replace'])
    r['contact_checked_on']=_ov['checked_on']
# Medicaid rides have no public line: members call the number on their card
for r in out.values():
    if 'nemt' in r['id'] and r['category']=='transportation' and not (r.get('phone') or r.get('email') or r.get('web') or r.get('contact_how')):
        r['contact_how']='Call the member services number printed on your Medicaid card.'
# What kind of page the record's main link points to, so the page can label it honestly (reserve "Official page" for the organization itself)
from urllib.parse import urlparse
NEWS_HOSTS={'daytondailynews.com','abc6onyourside.com','waupacanow.com','kffhealthnews.org','chausa.org','whio.com'}
DIR_HOSTS={'napsa-now.org','ilru.org','homemods.org','hmin.homemods.org','findhelp.org','api.thegrantmap.com','thegrantmap.com','seniorsmobility.org','nashia.org','askjan.org','christopherreeve.org','texvet.org','ohamvets.org','macvc.net','floridavets.org','ccam-tac.org','ohioaging.org','aucd.org','nysnavigator.org','seniornavigator.org','cap4kids.org','benefits.gov','fundingfla.org','legalaidtx.org','ectacenter.org','familyvoices.org','nasadhh.org','at3center.net'}
def link_kind(r):
    web=r.get('web');t=web if web and web.startswith('https://') else r.get('url')
    if not t or not t.startswith('http'): return None
    h=urlparse(t).netloc.lower().removeprefix('www.')
    if h in NEWS_HOSTS or re.search(r'(^|\.)(news|tribune|gazette)',h): return 'news'
    if h in DIR_HOSTS or re.search(r'(^|[.-])211([.-]|$)|^search\.|findhelp|\.benefits\.',h): return 'directory'
    if h.startswith('codes.') or 'law.cornell.edu' in h or h.endswith('regulations.gov'): return 'rule'
    if h=='facebook.com' or h.endswith('.facebook.com'): return 'social'
    if t==web: return 'official'
    if h.endswith(('.gov','.mil','.us')) or '.state.' in h: return 'gov'
    return 'source'
for r in out.values(): r['link_kind']=r.get('link_kind') or link_kind(r)
# Move existing records into the need they answer, so a blind or deaf reader, a job seeker or someone applying for benefits can find them
SENSORY_ID=re.compile(r'(^|-)nls(-|$)|-rsa-blind-agency$|icanconnect$|-tedp-phone-equipment$|-relay$|-blind$|^ohio-older-blind$|^pa-bbvs$|^pa-odhh$')
MOVE={'us-parent-centers':'children','us-ticket-to-work-find-help':'work_school','tx-twc-vr':'work_school','us-wipa-benefits-counseling':'benefits','us-ship-medicare-counseling':'benefits','us-medicare-rights-center':'benefits','us-hud-fair-housing-complaint':'housing'}
for r in out.values():
    if r['category']=='veterans': continue
    if r['id'] in MOVE: r['category']=MOVE[r['id']]
    elif r['id'].endswith('-vr-agency'): r['category']='work_school'
    elif SENSORY_ID.search(r['id']): r['category']='sensory'
def audience(r):
    """Tags for the 'Who is it for?' filter. Explicit tags on a record win; otherwise use the program family, then the name."""
    if isinstance(r.get('audience'),list): return [a for a in r['audience'] if a in AUDIENCES]
    i=r['id'];c=r['category'];n=r['name'].lower();a=set()
    if c=='veterans' or re.search(r'\bveterans?\b|^va-',n+' '+i): a.add('veterans')
    if re.search(r'icanconnect|deaf-?blind',n+' '+i): a.add('deafblind')
    elif re.search(r'(^|-)nls(-|$)|-rsa-blind-agency$|-blind$|older-blind|^pa-bbvs$',i) or re.search(r'\bblind|low[- ]vision|vision loss|visually impaired|talking[- ]book',n): a.add('blind')
    elif re.search(r'-tedp-phone-equipment$|-relay$|^pa-odhh$',i) or re.search(r'\bdeaf\b|hard[- ]of[- ]hearing|hearing loss',n): a.add('deaf')
    if c=='dd_board' or re.search(r'-dd-council$|(^|-)ucedd',i) or re.search(r'developmental disabilit|intellectual',n): a.add('idd')
    if re.search(r'\bautism',n): a.add('autism')
    if re.search(r'-tbi-state-program$|tbims',i) or re.search(r'brain injury|\bstroke\b',n): a.add('brain_injury')
    if c=='ramps_home' or re.search(r'scims',i) or re.search(r'spinal cord|paraly[sz]|amput|limb loss|wheelchair|\bramps?\b|reeve foundation|united spinal',n): a.add('mobility')
    if c!='dd_board' and re.search(r'mental health|behavioral health|psychiatric',n): a.add('mental_health')
    if re.search(r'\bals\b|muscular dystrophy|multiple sclerosis|\bms society|parkinson|epilepsy|alzheimer',n): a.add('chronic')
    if re.search(r'\bchild(ren)?\b|\byouth\b|\bkids\b|pediatric|toddler|\bparents?\b|early intervention',n): a.add('children')
    if re.search(r'\baging\b|older (adult|blind|individual|pennsylvan)|\bseniors?\b|\belder(ly|care)?\b|ageline|\bage 55|\b60\+',n): a.add('older')
    return sorted(a)
for r in out.values(): r['audience']=audience(r)
recs=sorted(out.values(),key=lambda r:(r['state']!='US',r['state'],r['category'],r['name']))
main=[r for r in recs if r['category']!='veterans'];vso=[r for r in recs if r['category']=='veterans']
meta={'schema_version':1,'built_from':'travisvought-byte/vhg-veteran-resident-guide','categories':CATS,'audiences':AUDIENCES}
json.dump({**meta,'records':main},open(ROOT/'data/local-programs.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump({**meta,'records':vso},open(ROOT/'data/county-veterans-offices.json','w'),ensure_ascii=False,separators=(',',':'))
import collections
print(len(recs),'records');print(collections.Counter(r['category'] for r in recs));print(collections.Counter(r['state'] for r in recs).most_common(60))
