#!/usr/bin/env python3
import json,hashlib,subprocess,sys
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'teaching-alternatives.json').read_text());blobs={}
for k,pin in p['mainSource'].items():
 b=(root/pin['path']).read_bytes();assert hashlib.sha256(b).hexdigest()==pin['sha256'];blobs[k]=json.loads(b)
assert p['pair']=={'target':'Japanese','native':'English'} and [x['lessonNumber'] for x in p['lessons']]==[18,19,20]
ids=[];counts={'activities':0,'forms':0,'speaking':0}
for l in p['lessons']:
 n=l['lessonNumber'];master=blobs['master']['lessons'][n-1];ext=blobs['extensions'][str(n)];texts={k:[line.split('|') for line in v] for k,v in [('dialogue',master['dialogue']),('extension',ext)]};alljapanese={x[0] for v in texts.values() for x in v}
 assert l['stableLessonKey']==f'master-japanese-basics:{n}';assert len(l['activities'])==6 and {a['mode'] for a in l['activities']}=={'see','recall','hear','type','say','write'} and len({a['targetJapanese'] for a in l['activities']})==6
 for a in l['activities']:
  ja,en=texts[a['sourceKind']][a['sourceTurnOneBased']-1];assert (a['targetJapanese'],a['targetEnglish'])==(ja,en);assert a['promptEnglish'] and a['targetSpeakerRoleEnglish'] and a['learnerPracticeRoleEnglish'];assert a['selectedJapanese'] is a['audioScript'] is None and a['reviewed'] is False;ids.append(a['id']);counts['activities']+=1
  assert a['hearScriptCandidateJapanese']==(ja if a['mode']=='hear' else None)
  if a['mode']=='hear':assert len(set(a['hearOptionsJapanese']))==3 and ja in a['hearOptionsJapanese'] and set(a['hearOptionsJapanese'])<=alljapanese
 assert len(l['forms'])==3
 for f in l['forms']:
  ev=f['canonicalFormEvidence'];assert f['sourcePromptId']==ev['id'] and f['exampleJapanese']==ev['japaneseAnswer'];assert master['dialogue'][ev['sourceDialogueTurn']-1]==ev['japaneseAnswer']+'|'+ev['englishPrompt'];assert f['explanationJapanese'] and f['explanationEnglish'];assert f['selectedJapanese'] is f['audioScript'] is None and f['reviewed'] is False;ids.append(f['id']);counts['forms']+=1
 s=l['speaking'];assert s['stableLessonKey']==l['stableLessonKey'];assert len(s['objectivesEnglish'])==3;assert s['learnerRoleEnglish']!=s['partnerRoleEnglish']!=l['preservedPriorPartnerRole'];assert s['wordBankJapanese']==[x.split('|')[0] for x in master['terms']]
 for name in ['opening','closure']:
  ja,en=texts[s[name+'SourceKind']][s[name+'SourceTurnOneBased']-1];assert (s[name+'Japanese'],s[name+'English'])==(ja,en);assert s[name+'Speaker']
 assert s['selectedJapanese'] is s['audioScript'] is None and s['reviewed'] is False;ids.append(s['id']);counts['speaking']+=1
 assert l['selectedJapanese'] is l['audioScript'] is None and l['reviewed'] is False and l['proposedFieldMappings']['selected'] is False
assert len(ids)==len(set(ids))==30
assert p['lessons'][0]['activities'][4]['targetSpeakerRoleEnglish']=='Listener'
x=p['lessons'][1]['speaking']['preClosingLearnerLine'];assert x['japanese']+'|'+x['english']==blobs['master']['lessons'][18]['dialogue'][6]
for l in p['lessons']:
 for a in l['activities']:
  assert a['sourceTurnOneBased']==l['preservedPriorModes'][a['mode']]['turn'] and a['preservedPriorCue']==l['preservedPriorModes'][a['mode']]
  if a['mode']=='hear':
   src=blobs['master']['lessons'][l['lessonNumber']-1]['dialogue']+blobs['extensions'][str(l['lessonNumber'])]
   assert len(a['hearOptionsEnglish'])==3
   assert all(j+'|'+e in src for j,e in zip(a['hearOptionsJapanese'],a['hearOptionsEnglish']))
assert p['selectedJapanese'] is p['audioScript'] is None and p['reviewed'] is False and all(x is False for x in p['gates'].values())
m=json.loads((h/'ai-assistance-metadata.json').read_text());assert m['qualifiedApproval'] is False
for role,model in [('haiku','claude-haiku-5-5'),('opus','claude-opus-5-5'),('fable','claude-fable-5-2')]:assert m[role]['safeMode'] is True and model in m[role]['actualModelUsage'] and m[role]['isError'] is False
print('PASS18exact bilingual mode pairs/3parallel Hear optionsets/9canonical forms/3source-linked role-closure missions/30unique IDs/nulls/closed gates/actualmetadata')
if '--private-pr' in sys.argv:
 private={}
 for k,pin in p['privateSource'].items():
  b=subprocess.run(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root,capture_output=True,check=True).stdout;assert hashlib.sha256(b).hexdigest()==pin['sha256'];private[k]=b
 forms=json.loads(private['forms'])['lessons'];support=json.loads(private['support'])['support']
 for l in p['lessons']:
  n=l['lessonNumber'];f=next(x for x in forms if x['lesson']==n)['prompts'];s=support[str(n)]
  assert l['preservedPriorPartnerRole']==s['partnerRole'] and l['preservedPriorMission']==s['authoredSpeakingMission']
  assert l['preservedPriorModes']==json.loads(private['modes'])['lessons'][n-1]['modes']
  for x in l['forms']:assert x['canonicalFormEvidence']==next(z for z in f if z['id']==x['sourcePromptId'])
 assert "support['partnerRole'] = entry['role']" in private['builder'].decode() and 'next.partnerRole = authored.role;' in private['preview'].decode()
 print('PASS6immutable private pins/9stableform identities/3preserved missions and actual learner-role→partner-role generator defect')
else:print('Use --private-pr with fetched immutable#488 revision to reverify private form/mission/generator provenance. Main target/source checks above are independent.')
