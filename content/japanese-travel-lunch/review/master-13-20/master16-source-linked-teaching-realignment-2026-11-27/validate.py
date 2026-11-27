import json,hashlib,subprocess,re
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[4];p=json.loads((h/'activities.json').read_text());n=p['lesson']
def raw(pin):
 b=subprocess.check_output(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root);assert hashlib.sha256(b).hexdigest()==pin['sha256'] and (root/pin['path']).read_bytes()==b;return b
d={k:json.loads(raw(v)) for k,v in p['sourcePins'].items()};s=d['sidecar'];c=d['candidate'];ids=[]
def closed(a):assert a['selectedJapanese'] is a['audioScript'] is None and a['reviewed'] is False
for a,dep in zip(p['activities'],p['dependencies']['exactTextAudioDependencies']):
 r=c['cards' if a['sourceKind']=='card' else 'reader'][a['sourcePositionOneBased']-1];assert a['targetEnglish']==r['en'] and a['wordBankEnglish']==a['targetEnglish'].split(' ')
 if n==16:
  sr=next(x for x in s['rows'] if x['sourceRef']==a['sourceRef']);alt=next(x for x in sr['alternatives'] if x['id']==a['sourceAlternativeId']);assert a['supportJapaneseProposal']==alt['candidateJapanese']
 else:assert a['supportJapaneseProposal']==r['ja'] and ('911' in a['targetEnglish']) and ('119' not in a['targetEnglish'])
 assert a['promptEnglish'] and a['promptJapanese'] and not re.search('[\u3400-\u4dbf\u4e00-\u9fff]',a['promptJapanese']);closed(a);ids.append(a['id']);assert dep['sourceRef']==a['sourceRef'] and dep['englishSha256']==hashlib.sha256(a['targetEnglish'].encode()).hexdigest() and dep['japaneseProposalSha256']==hashlib.sha256(a['supportJapaneseProposal'].encode()).hexdigest() and dep['audioScript'] is None and dep['existingClipReuseSelected'] is False
for q in p['speaking']:
 a=next(a for a in p['activities'] if a['sourceRef']==q['sourceRef']);assert q['targetEnglish']==a['targetEnglish'] and q['supportJapaneseProposal']==a['supportJapaneseProposal'] and q['partnerReplyEnglish'] is None;closed(q);ids.append(q['id'])
if n==15:
 assert s['emergencyNumberSourceEvidence']['sourceCard']['english']=='911';assert s['emergencyNumberSourceEvidence']['legacy119CrosswalkEvidence']['reader'][0]['matchState']=='unmatched'
 for f in p['forms']:assert f['exampleEnglish']==c['reader'][11]['en'] and f['explanationEnglish'] and f['explanationJapanese'];closed(f);ids.append(f['id'])
else:assert p['existingContextualFormLinks']==[{'id':f['id'],'sourceRef':f['sourceRef'],'exampleEnglish':f['exampleEnglish']} for f in s['forms']]
assert len(p['activities'])==3 and len(p['speaking'])==1 and len(ids)==len(set(ids));closed(p);assert p['selectedSourceBranch'] is None and p['registered'] is False and all(x is False for x in p['gates'].values()) and p['dependencies']['savedItemMigrationSelected'] is False
print('PASS Lunch Master',n,':3source-exact English activities/1bounded speaking; source alternatives/forms/audio hashes pinned; sources/prior intact/allnullfalse/no invented reply.')
