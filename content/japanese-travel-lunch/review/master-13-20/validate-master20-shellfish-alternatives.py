#!/usr/bin/env python3
import json,hashlib
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'master-20-shellfish-alternatives-2026-11-24.json').read_text())
for pin in p['source'].values():assert hashlib.sha256((root/pin['path']).read_bytes()).hexdigest()==pin['sha256'],pin['path']
curr=json.loads((root/p['source']['curriculum']['path']).read_text())['lessons'][-1];prior=json.loads((root/p['source']['priorCandidate']['path']).read_text());derived=json.loads((root/p['source']['priorDerived']['path']).read_text());passage=json.loads((root/p['source']['reader']['path']).read_text())['lessons']['20']['passage']
assert p['stableId']==prior['stableId']==derived['stableId']=='master-travel-lunch:20:ja-en'
assert [x['zeroBasedIndex'] for x in p['rows']]==[6,9,16]
assert [x['oneBasedPosition'] for x in p['rows']]==[7,10,17]
ids=[]
for row in p['rows']:
 i=row['zeroBasedIndex'];s=curr['words'][i];old=prior['cards'][i]
 assert (row['sourceEnglish'],row['sourceSpanish'],row['preservedJapaneseDraft'])==(s['en'],s['es'],old['ja'])
 assert row['oneBasedPosition']==i+1 and len(row['alternatives'])==2
 ids.append(row['id'])
 for alt in row['alternatives']:
  assert alt['sourceText']==(s['en'] if alt['comparisonBranch']=='English-label' else s['es'])
  assert alt['candidateJapanese'] and alt['selectedJapanese'] is alt['audioScript'] is None and alt['reviewed'] is False
  ids.append(alt['id'])
 assert row['selectedJapanese'] is row['selectedBranch'] is row['audioScript'] is None and row['reviewed'] is False
for d in p['dictionary']:
 assert d['headword'] and d['glossJapanese'] and d['senseJapanese'];assert set(d['sourceOneBasedPositions'])<={7,10,17}
 assert d['selectedJapanese'] is d['audioScript'] is None and d['reviewed'] is False;ids.append(d['id'])
assert len(p['dictionary'])==4 and len(ids)==len(set(ids))==13
for r in p['readerDependencies']:
 i=r['zeroBasedIndex'];assert r['sourceEnglish']==passage['native'][i] and r['sourceSpanish']==passage['target'][i]
 assert r['oneBasedPosition']==i+1 and r['selectedJapanese'] is r['audioScript'] is None and r['reviewed'] is False
assert [x['zeroBasedIndex'] for x in p['readerDependencies']]==[5,8,10]
a=p['downstreamAudit'];assert [x['mode'] for x in a['affectedModes']]==['See','Recall','Hear']
for x in a['affectedModes']:
 old=next(v for v in prior['sixModes'] if v['mode']==x['mode']);assert x['zeroBasedCardIndex']==old['sourceCardIndex'];assert x['priorJapanese']==old['modelJapanese'] and x['priorEnglish']==old['modelEnglish'];assert x['readyForLearner'] is False
assert a['affectedFormIndexesZeroBased']==[2] and a['priorAffectedForm']==derived['forms'][2]
assert a['affectedWordBankCardIndexesZeroBased']==[6,9]
assert a['priorAffectedSpeakingObjective']==derived['speaking']['objectives'][2]
assert p['selectedJapanese'] is p['selectedBranch'] is p['audioScript'] is None and p['reviewed'] is False
assert all(v is False for v in p['gates'].values())
m=json.loads((h/'master-20-shellfish-alternatives-2026-11-24.metadata.json').read_text());assert m['qualifiedApproval'] is False
for role,model in [('haiku','claude-haiku-5-5'),('opus','claude-opus-5-5'),('fable','claude-fable-5-2')]:assert m[role]['safeMode'] is True and model in m[role]['actualModelUsage'] and m[role]['isError'] is False
print('PASS pinned source/prior packets;3contrasts6unselected alternatives4dictionary proposals;13unique IDs;3Reader dependencies and atomic downstream mappings;null audio/selection/closed gates;actual CLI metadata')
