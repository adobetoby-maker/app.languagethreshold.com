#!/usr/bin/env python3
import hashlib,json,subprocess,sys
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'context-alternative.json').read_text());pin=p['mainSource'];assert hashlib.sha256((root/pin['path']).read_bytes()).hexdigest()==pin['sha256']
assert p['stableLessonKey']=='master-japanese-basics:14' and p['pair']=={'target':'Japanese','native':'English'}
ids=[];expected=['form-ja-en-6e3080062b60d00a','form-ja-en-5a8711b33c9b3218','form-ja-en-e2fe935c347bd01c'];assert [s['sourcePromptId'] for s in p['slots']]==expected
for s,f in zip(p['slots'],p['canonicalFormEvidence']):
 assert s['sourcePromptId']==f['id'] and (s['learnerTargetJapanese'],s['learnerTargetEnglish'])==(f['japaneseAnswer'],f['englishPrompt'])
 assert s['contextEnglish'] and s['partnerPromptJapanese'] and s['partnerPromptEnglish'] and s['explanationJapanese'] and s['explanationEnglish'];assert s['selectedJapanese'] is s['audioScript'] is None and s['reviewed'] is False;ids.append(s['id'])
assert [s['promptProvenance'] for s in p['slots']]==['exact-source','exact-source','authored-scaffold'];assert [s['partnerSourceTurnOneBased'] for s in p['slots']]==[2,5,None]
assert p['slots'][1]['leadInLearnerLines'][0]['sourceDialogueTurnOneBased']==6
assert p['slots'][2]['partnerPromptJapanese']=='それから どう しましたか。'
s=p['speaking'];assert s['stableLessonKey']==p['stableLessonKey'];assert s['learnerRoleEnglish']!=s['partnerRoleEnglish']!=p['preservedPriorEvidence']['partnerRole'];assert len(s['objectivesEnglish'])==3 and len(s['phases'])==3 and len(s['preClosureNarration'])==3
assert s['openingSpeaker']==s['closureSpeaker']=='learner';assert s['openingSourceTurnOneBased']==1 and s['closureSourceExtensionOneBased']==4 and s['closureProvenance']=='exact-source-extension'
assert s['selectedJapanese'] is s['audioScript'] is None and s['reviewed'] is False;ids.append(s['id']);assert len(ids)==len(set(ids))==4
assert all(v is False for v in p['gates'].values()) and p['selectedJapanese'] is p['audioScript'] is None and p['reviewed'] is False
assert len(p['patchTargets'])==4 and all(x['selected'] is False for x in p['patchTargets'])
m=json.loads((h/'ai-assistance-metadata.json').read_text());assert m['qualifiedApproval'] is False
for role,model in [('haiku','claude-haiku-5-5'),('opus','claude-opus-5-5'),('fable','claude-fable-5-2')]:assert m[role]['safeMode'] is True and model in m[role]['actualModelUsage'] and m[role]['isError'] is False
print('PASS3bilingual context slots/canonical form IDs and targets;explicit roles/phases/lead-in/target-language closure;nulls/falsegates/actualmetadata')
if '--private-pr' in sys.argv:
 blobs={}
 for k,pin in p['privateSource'].items():
  b=subprocess.run(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root,capture_output=True,check=True).stdout;assert hashlib.sha256(b).hexdigest()==pin['sha256'];blobs[k]=b
 master=json.loads(blobs['master'])['lessons'][13];ext=json.loads(blobs['extensions'])['14'];forms=next(x for x in json.loads(blobs['forms'])['lessons'] if x['lesson']==14)['prompts'];support=json.loads(blobs['support'])['support']['14'];mission=json.loads(blobs['missions'])['lessons'][3]
 assert p['preservedPriorEvidence']=={'partnerRole':support['partnerRole'],'authoredSpeakingMission':support['authoredSpeakingMission']}
 for slot in p['slots']:
  f=next(x for x in forms if x['id']==slot['sourcePromptId']);assert f in p['canonicalFormEvidence'];assert master['dialogue'][f['sourceDialogueTurn']-1]==slot['learnerTargetJapanese']+'|'+slot['learnerTargetEnglish']
  if slot['promptProvenance']=='exact-source':assert master['dialogue'][slot['partnerSourceTurnOneBased']-1]==slot['partnerPromptJapanese']+'|'+slot['partnerPromptEnglish']
  for line in slot.get('leadInLearnerLines',[]):assert master['dialogue'][line['sourceDialogueTurnOneBased']-1]==line['japanese']+'|'+line['english'] and line['selectedJapanese'] is line['audioScript'] is None and line['reviewed'] is False
 assert master['dialogue'][0]==s['openingJapanese']+'|'+s['openingEnglish'];assert ext[3]==s['closureJapanese']+'|'+s['closureEnglish'];assert s['complicationEnglish']==mission['complication']
 for line in s['preClosureNarration']:assert ext[line['sourceExtensionTurnOneBased']-1]==line['japanese']+'|'+line['english'] and line['selectedJapanese'] is line['audioScript'] is None and line['reviewed'] is False
 assert s['wordBankJapanese']==[x.split('|')[0] for x in master['terms']]
 assert p['generatorMappingEvidence']['speakingBuilderStatement'] in blobs['speakingBuilder'].decode() and p['generatorMappingEvidence']['previewBuilderStatement'] in blobs['previewBuilder'].decode()
 print('PASS7immutable private-source pins,exact3targets/2questions/lead-in/opening/4finalturns/wordbank and actual generator-role defect')
else:print('Use --private-pr after fetching immutable#488 revision for full external source/generator verification; default makes no private runtime or source-execution claim.')
