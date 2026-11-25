#!/usr/bin/env python3
import json,hashlib
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'master-16-fever-timeline-alternatives-2026-11-24.json').read_text())
for pin in p['source'].values():assert hashlib.sha256((root/pin['path']).read_bytes()).hexdigest()==pin['sha256'],pin['path']
c=json.loads((root/p['source']['curriculum']['path']).read_text())['lessons'][15];rd=json.loads((root/p['source']['reader']['path']).read_text())['lessons']['16']['passage'];old=json.loads((root/p['source']['priorCandidate']['path']).read_text());der=json.loads((root/p['source']['priorDerived']['path']).read_text());stable='master-travel-lunch:16:ja-en';assert p['stableId']==old['stableId']==der['lessonId']==stable
rows={}
for i,x in enumerate(c['words'],1):rows[stable+f':card:{i}']={'en':x['en'],'es':x['es'],'prior':old['cards'][i-1]['ja']}
for i,(en,es) in enumerate(zip(rd['native'],rd['target']),1):rows[stable+f':reader:{i}']={'en':en,'es':es,'prior':old['reader'][i-1]['ja']}
assert [r['sourceRef'] for r in p['rows']]==[stable+':card:20',stable+':reader:11',stable+':reader:12'];ids=[]
for r in p['rows']:
 s=rows[r['sourceRef']];assert (r['sourceEnglish'],r['sourceSpanish'],r['preservedJapaneseDraft'])==(s['en'],s['es'],s['prior']);assert r['oneBasedPosition']==r['zeroBasedIndex']+1 and len(r['alternatives'])==2
 assert r['selectedJapanese'] is r['selectedAlternative'] is r['audioScript'] is None and r['reviewed'] is False;ids.append(r['id'])
 for x in r['alternatives']:assert x['candidateJapanese'] and x['selectedJapanese'] is x['audioScript'] is None and x['reviewed'] is False;ids.append(x['id'])
assert len(p['dictionary'])==6 and len(p['forms'])==5
for d in p['dictionary']:
 assert d['headword'] and d['glossJapanese'] and d['senseJapanese'];assert all(ref in rows for ref in d['sourceRefs']);assert d['selectedJapanese'] is d['audioScript'] is None and d['reviewed'] is False;ids.append(d['id'])
for f in p['forms']:
 assert f['exampleEnglish'].lower() in rows[f['sourceRef']]['en'].lower() and f['explanationJapanese'];assert f['selectedJapanese'] is f['audioScript'] is None and f['reviewed'] is False;ids.append(f['id'])
assert len(ids)==len(set(ids))==20
assert p['selectedJapanese'] is p['selectedTimeline'] is p['audioScript'] is None and p['reviewed'] is False and all(x is False for x in p['gates'].values())
a=p['downstreamAudit'];assert a['directTimelineModeRefs']==[] and a['directTimelineExistingFormRefs']==[]
assert a['allExistingFormSourceRefs']==[f['sourceRef'] for f in der['forms']]
assert a['priorSpeakingObjective']==der['speakingObjectives'][3] and a['priorSourceConflict']==der['sourceConflict']
assert a['relatedClinicalModeEvidence']==[x for x in der['activities'] if x['sourceRef']==stable+':card:7']
assert all(x['sourceRef']!=stable+':card:20' for x in der['activities'])
m=json.loads((h/'master-16-fever-timeline-alternatives-2026-11-24.metadata.json').read_text());assert m['qualifiedApproval'] is False
for role,model in [('haiku','claude-haiku-5-5'),('opus','claude-opus-5-5'),('fable','claude-fable-5-2')]:assert m[role]['safeMode'] is True and model in m[role]['actualModelUsage'] and m[role]['isError'] is False
print('PASS source/prior hashes;3exact faces6held alternatives6direct dictionary5forms20unique IDs;atomic downstream audit;null selections/audio/false gates;actual CLI metadata')
