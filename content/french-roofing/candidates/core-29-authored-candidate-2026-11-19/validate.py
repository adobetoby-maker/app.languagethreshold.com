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

assert {r['sourceAnchor'] for r in p['candidateRows']}==set(anchors)
assert len(p['candidateRows'])==len(anchors)
assert p['sourceObjectiveEnglish']==s['sourceObjectiveEnglish'] and p['sourceSpeakingEnglish']==s['sourceSpeakingEnglish']
assert p['sourceObjectiveCompletionStatus'].startswith('held')
assert all(x['sourceAnchors'] for x in p['activities']+p['forms'])
assert p['speaking']['heldDependent'] is True and set(p['speaking']['heldDecisionRefs'])==held
assert len(p['speaking']['partnerCuesEnglish'])==len(p['speaking']['expectedLearnerTurnsEnglish'])==len(p['speaking']['partnerCueSupportFrench'])==len(p['speaking']['expectedLearnerTurnsFrench'])==3
assert len(p['speaking']['turnSequenceEnglish'])==7
for d in p['dictionaryMappings']:
 assert d['registered'] is False and d['contextEnglishInternalOnly'] is True
 assert d['sourceSpanishEvidence']==anchors[d['sourceAnchor']]['sourceSpanish']
for t in p.get('terminologyProposals',[]):
 assert t['sourceAnchor'] in held and t['candidateFrenchOptions']
 assert t['sourceSpanishEvidence']==anchors[t['sourceAnchor']]['sourceSpanish']
 assert t['selectedFrench'] is t['audioScript'] is t['selectedOption'] is None
 assert t['reviewed'] is t['registered'] is False
if p['lessonId']=='core-roofing:30:fr-en':assert p['sourceObjectiveLanguageConflict']['selectedReplacementObjective'] is None

# Speaking reconciliation contract 2026-11-25


sp=p['speaking']
assert len(sp['partnerCuesEnglish'])==len(sp['partnerCueSupportFrench'])==len(sp['expectedLearnerTurnsEnglish'])==len(sp['expectedLearnerTurnsFrench'])==3
assert sp['candidateOpeningFrench'] and len(sp['turnSequenceEnglish'])==7
assert len(sp['expectedAllLearnerTurnsEnglish'])==len(sp['expectedAllLearnerTurnsFrench'])==4
assert sp['expectedAllLearnerTurnsEnglish'][0]==sp['candidateOpeningEnglish']
assert p['sourceObjectiveEnglish']==s['sourceObjectiveEnglish'] and p['sourceSpeakingEnglish']==s['sourceSpeakingEnglish']
assert p['sourceObjectiveCompletionStatus']=='held; lexical subset does not satisfy the source work objective'
assert sp['sourceSpeakingCompletionStatus'].startswith('held and incomplete')
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

assert len(sp['turnSequenceFrench'])==7
assert [t['text'] for t in sp['turnSequenceFrench'][1::2]]==sp['partnerCueSupportFrench']
assert [t['text'] for t in sp['turnSequenceFrench'][2::2]]==sp['expectedLearnerTurnsFrench']

assert sp['turnSequenceFrench'][0]=={'speaker':'learner','text':sp['candidateOpeningFrench']}
assert sp['turnSequenceEnglish'][-1]['speaker']=='learner'
assert sp['turnSequenceEnglish'][-1]['text'].endswith(sp['closureEnglish'])
assert sp['turnSequenceFrench'][-1]['text'].endswith(sp['closureFrench'])

for noun in sp['sourceTextProvenance']:
 row=next(r for r in s['cards']+s['reader'] if r['id']==noun['sourceAnchor'])
 assert noun['exactSourceEnglish']==row.get('english',row.get('sourceEnglish'))

assert sp['sourceMissionOpenQuestionPointers']==['/sourceDecisionQuestions/'+str(i) for i in range(len(s['sourceDecisionQuestions']))]
assert sp['learnerRoleFrench'] and sp['partnerRoleFrench']

for dependency in sp['openSourceQuestionDependencies']:
 q=s['sourceDecisionQuestions'][dependency['sourceQuestion']-1]
 assert dependency['dependencyType'] in ('direct','inferred')
 if dependency['dependencyType']=='direct':assert set(dependency['affectedUsedAnchors']) <= set(q['affectedIds'])
 else:assert not set(dependency['affectedUsedAnchors']).intersection(q['affectedIds'])

for entry in sp['sourceTextProvenance']:
 row=next(r for r in s['cards']+s['reader'] if r['id']==entry['sourceAnchor'])
 assert entry['sourceKind']==row.get('kind','reader')

for evidence in sp['candidateLevelHoldEvidence']:
 row=next(r for r in p['candidateRows'] if r['sourceAnchor']==evidence['sourceAnchor'])
 assert row['hold']==evidence['exactCandidateHold'] and row['hold']
 assert not any(evidence['sourceAnchor'] in q['affectedIds'] for q in s['sourceDecisionQuestions'])

for d in sp['openSourceQuestionDependencies']:
 assert d['sourceQuestionOrdinal1Based']==d['sourceQuestion'] and d['sourceQuestionIndex0Based']==d['sourceQuestion']-1
 assert d['listedInAffectedIds']==(d['dependencyType']=='direct')
assert sp['inferredDependenciesNonExhaustive'] is True
