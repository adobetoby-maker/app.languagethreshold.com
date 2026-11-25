#!/usr/bin/env python3
import json,hashlib
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'master-15-form-source-reconciliation-2026-11-24.json').read_text())
for pin in p['source'].values():assert hashlib.sha256((root/pin['path']).read_bytes()).hexdigest()==pin['sha256'],pin['path']
def read(k):return json.loads((root/p['source'][k]['path']).read_text())
def pointer(obj,s):
 for k in s.strip('/').split('/'):obj=obj[int(k)] if isinstance(obj,list) else obj[k]
 return obj
curr=read('curriculum')['lessons'][14];reader=read('reader')['lessons']['15']['passage'];old=read('priorCandidate');five=read('fiveFormProposal')['lessons'][0];seven=read('sevenFormProposal');modes=read('modes')['activities'];cross=next(x for x in read('legacyCrosswalk')['lessons'] if x['number']==15);stable='master-travel-lunch:15:ja-en';assert p['stableId']==old['stableId']==five['stableId']==seven['stableId']==stable
assert len(p['formGroups'])==7 and sum(len(g['variants']) for g in p['formGroups'])==12
shared=[];extra=[];ids=[]
for g in p['formGroups']:
 kind,n=g['sourceRef'][len(stable)+1:].split(':');i=int(n)-1;s=curr['words'][i] if kind=='card' else {'en':reader['native'][i],'es':reader['target'][i]};prior=old['cards' if kind=='card' else 'reader'][i]
 assert (g['sourceEnglish'],g['sourceSpanish'])==(s['en'],s['es']) and g['oneBasedPosition']==i+1 and g['zeroBasedIndex']==i
 assert g['selectedJapanese'] is g['selectedVariant'] is g['audioScript'] is None and g['reviewed'] is False;ids.append(g['id']);faces=[]
 for v in g['variants']:
  f=pointer(json.loads((root/v['path']).read_text()),v['jsonPointer']);assert f['english']==s['en'] and f['japanese']==prior['ja']
  assert hashlib.sha256(f['english'].encode()).hexdigest()==v['englishSha256'] and hashlib.sha256(f['japanese'].encode()).hexdigest()==v['japaneseSha256'] and hashlib.sha256(f['explanation'].encode()).hexdigest()==v['explanationSha256']
  assert v['selectedJapanese'] is v['selectedVariant'] is v['audioScript'] is None and v['reviewed'] is False;faces.append((f['english'],f['japanese']))
 if len(faces)==2:assert len(set(faces))==1 and g['japaneseAndEnglishFaceIdenticalAcrossVariants'] is True;shared.append(g['sourceRef'])
 else:extra.append(g['sourceRef'])
assert len(ids)==len(set(ids))==7
assert shared==[stable+':card:'+str(n) for n in [17,19,20,21,23]] and extra==[stable+':card:22',stable+':reader:18']
e=p['emergencyNumberSourceEvidence'];assert e['sourceCard']['english']==curr['words'][9]['en']=='911' and e['sourceCard']['priorJapanese']==old['cards'][9]['ja']=='911番';assert e['sourceReader']['english']==reader['native'][11] and '911' in reader['native'][11]
for key in ['cards','reader']:assert e['legacy119CrosswalkEvidence'][key]==[x for x in cross[key] if '119' in x['legacyEnglish'] or '119' in x['legacyJapanese']];assert all(x['matchState']=='unmatched' for x in e['legacy119CrosswalkEvidence'][key])
a=p['downstreamAudit'];assert a['sharedFormRefs']==shared and a['sevenFormOnlyRefs']==extra
assert [x['sourceRef'] for x in a['modes']]==[x['sourceRef'] for x in modes] and all(x['readyForLearner'] is False for x in a['modes'])
assert a['directEmergencyNumberModeRefs']==[]
assert a['fiveFormEmergencySpeakingObjective']==five['speakingObjectives'][2] and a['sevenFormEmergencySpeakingObjective']==seven['speakingObjectives'][4]
assert p['selectedJapanese'] is p['selectedFormVariant'] is p['audioScript'] is None and p['reviewed'] is False and all(x is False for x in p['gates'].values())
assert p['aiAssistance']['newCalls']==0 and p['aiAssistance']['qualifiedApproval'] is False
print('PASS10pinned source/prior files;5shared exact faces+2additional refs;12existing form variant pointers;911vs119/unmatched evidence;atomic mode/form/Reader/dict/saved-item audit;nulls/closed gates')
