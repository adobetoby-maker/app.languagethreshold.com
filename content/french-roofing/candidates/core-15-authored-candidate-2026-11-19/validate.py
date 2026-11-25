import json,hashlib
from pathlib import Path
D=Path(__file__).resolve().parent;R=D.parents[3]
p=json.loads((D/'candidate.json').read_text());s=json.loads((R/p['sourcePacket']['path']).read_text())
assert hashlib.sha256((R/p['sourcePacket']['path']).read_bytes()).hexdigest()==p['sourcePacket']['sha256']
for path,digest in s['sourceFileSha256'].items():assert hashlib.sha256((R/path).read_bytes()).hexdigest()==digest,path
anchors={r['id']:r for g in ('cards','reader') for r in s[g]}
assert p['pair']=={'target':'English','native':'French'} and p['stageId']=='core-roofing'
ids=[]
for r in p['candidateRows']:
 assert r['sourceAnchor'] in anchors and r['sourceEnglish']==anchors[r['sourceAnchor']]['sourceEnglish']
 assert r['selectedFrench'] is r['audioScript'] is None and r['reviewed'] is False
 if r['hold']:assert r['candidateFrench'] is None
 ids.append(r['id'])
assert {r['mode'] for r in p['activities']}=={'see','recall','hear','type','say','write'} and len(p['activities'])==6
held={r['sourceAnchor'] for r in p['candidateRows'] if r['hold']}
for r in p['activities']+p['forms']+[p['speaking']]:
 assert all(a in anchors for a in r['sourceAnchors']) and r['reviewed'] is False
 assert not held.intersection(r['sourceAnchors']),r['id']
 ids.append(r['id'])
for r in p['activities']:assert r['promptFrench'] and r['candidateTargetEnglish'] and r['scoringEnabled'] is False
for r in p['dictionaryMappings']:assert r['sourceAnchor'] in anchors;ids.append(r['id'])
assert len(ids)==len(set(ids)) and all(x.startswith(p['lessonId']+':') for x in ids)
assert len(p['forms'])==3 and len(p['dictionaryMappings'])==len(s['cards'])
assert p['selectedFrench'] is p['audioScript'] is None and p['reviewed'] is False and all(v is False for v in p['gates'].values())
def nested(v):
 if isinstance(v,dict):
  for a in v.get('sourceAnchors',[]):assert a in anchors,a
  for x in v.values():nested(x)
 elif isinstance(v,list):
  for x in v:nested(x)
nested(p)
print('PASS',p['lessonId'],len(p['candidateRows']),'faces, six activities, three forms, speaking/dictionary; source/IDs/held/gates')

source_kinds={r['id']:r['kind'] for r in s['cards']}
for d in p['dictionaryMappings']:
 assert d['sourceKind']==source_kinds[d['sourceAnchor']] and d['registered'] is False
for item in p['activities']+p['forms']+[p['speaking']]:
 if item.get('heldDependent'):assert set(item['heldDecisionRefs']) <= held and item['holdReason']
assert isinstance(p['speaking']['candidateOpeningEnglish'],str)
assert len(p['speaking']['partnerCuesEnglish'])==3
assert all(item['sourceAnchors'] for item in p['forms'])

assert len(p['speaking']['expectedLearnerTurnsEnglish'])==3
assert len(p['speaking']['turnSequenceEnglish'])>=7
assert all(a['candidateTargetEnglish'] for a in p['activities'])

# Speaking reconciliation contract 2026-11-25


sp=p['speaking']
assert len(sp['partnerCuesEnglish'])==len(sp['partnerCueSupportFrench'])==len(sp['expectedLearnerTurnsEnglish'])==len(sp['expectedLearnerTurnsFrench'])==3
assert sp['candidateOpeningFrench'] and len(sp['turnSequenceEnglish'])==7
assert len(sp['expectedAllLearnerTurnsEnglish'])==len(sp['expectedAllLearnerTurnsFrench'])==4
assert sp['expectedAllLearnerTurnsEnglish'][0]==sp['candidateOpeningEnglish']
assert p['sourceObjectiveEnglish']==s['sourceObjectiveEnglish'] and p['sourceSpeakingEnglish']==s['sourceSpeakingEnglish']
assert p['sourceObjectiveCompletionStatus'].startswith('held and incomplete')
assert p['gates']['qualifiedEnglish'] is False and sp['heldDependent'] is True
assert set(sp['heldDecisionRefs'])=={r['sourceAnchor'] for r in p['candidateRows'] if r['hold']}
assert any(sp['closureEnglish'] in t for t in sp['expectedLearnerTurnsEnglish'])

assert sp['turnSequenceEnglish'][0]=={'speaker':'learner','text':sp['candidateOpeningEnglish']}
assert [t['text'] for t in sp['turnSequenceEnglish'][1::2]]==sp['partnerCuesEnglish']
assert [t['text'] for t in sp['turnSequenceEnglish'][2::2]]==sp['expectedLearnerTurnsEnglish']
assert sp['expectedAllLearnerTurnsEnglish'][1:]==sp['expectedLearnerTurnsEnglish']
assert sp['expectedAllLearnerTurnsFrench']==[sp['candidateOpeningFrench']]+sp['expectedLearnerTurnsFrench']
for dependency in sp['openSourceQuestionDependencies']:
 q=s['sourceDecisionQuestions'][dependency['sourceQuestion']-1]
 assert dependency['question']==q['question']
 assert dependency['jsonPointer']=='/sourceDecisionQuestions/'+str(dependency['sourceQuestion']-1)
 assert set(dependency['affectedUsedAnchors']) <= set(sp['sourceAnchors'])
