import json,hashlib
from pathlib import Path
D=Path(__file__).resolve().parent;R=D.parents[3]
p=json.loads((D/'candidate.json').read_text());s=json.loads((R/p['sourcePacket']['path']).read_text())
assert hashlib.sha256((R/p['sourcePacket']['path']).read_bytes()).hexdigest()==p['sourcePacket']['sha256']
anchors={r.get('proposedId',r.get('proposedRowId')):r for g in ('cards','reader') for r in s[g]}
assert p['pair']=={'target':'English','native':'French'}
ids=[]
for r in p['candidateRows']:
 assert r['sourceAnchor'] in anchors and r['sourceEnglish']==anchors[r['sourceAnchor']]['sourceEnglish']
 assert r['selectedFrench'] is r['audioScript'] is None and r['reviewed'] is False
 if r['hold']:assert r['candidateFrench'] is None
 ids.append(r['id'])
assert {r['mode'] for r in p['activities']}=={'see','recall','hear','type','say','write'}
for r in p['activities']+p['forms']+[p['speaking']]:
 assert all(a in anchors for a in r['sourceAnchors']) and r['reviewed'] is False
 ids.append(r['id'])
for r in p['activities']:assert r['promptFrench'] and r['candidateTargetEnglish'] and r['scoringEnabled'] is False
for r in p['dictionaryMappings']:assert r['sourceAnchor'] in anchors;ids.append(r['id'])
assert len(ids)==len(set(ids)) and all(x.startswith(p['lessonId']+':') for x in ids)
assert p['selectedFrench'] is p['audioScript'] is None and p['reviewed'] is False and all(v is False for v in p['gates'].values())
print('PASS',p['lessonId'],len(p['candidateRows']),'faces, six activities, three forms, speaking, twelve dictionary mappings; source/IDs/gates')

# Speaking reconciliation contract 2026-11-24
sp=p['speaking']
assert len(sp['partnerCuesEnglish'])==len(sp['partnerCueSupportFrench'])==len(sp['expectedLearnerTurnsEnglish'])==len(sp['expectedLearnerTurnsFrench'])==3
assert sp['candidateOpeningFrench'] and len(sp['turnSequenceEnglish'])==7
assert len(sp['expectedAllLearnerTurnsEnglish'])==len(sp['expectedAllLearnerTurnsFrench'])==4
assert sp['expectedAllLearnerTurnsEnglish'][0]==sp['candidateOpeningEnglish']
assert p['sourceObjectiveEnglish']==s['sourceObjectiveEnglish'] and p['sourceSpeakingEnglish']==s['sourceSpeakingEnglish']
assert p['sourceObjectiveCompletionStatus'].startswith('held and incomplete') and p['sourceObjectiveInternalOnly'] is True
assert p['gates']['qualifiedEnglish'] is False and sp['heldDependent'] is True
assert set(sp['heldDecisionRefs'])=={r['sourceAnchor'] for r in p['candidateRows'] if r['hold']}
assert any(sp['closureEnglish'] in t for t in sp['expectedLearnerTurnsEnglish'])
