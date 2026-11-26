#!/usr/bin/env python3
"""Rebuild a deterministic source-only audit from immutable main/private git objects."""
import json,hashlib,subprocess,sys
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3]
MAIN='5670ac77a145e34a879f6a2bd2c1dc706b706d22';PRIVATE='018e69872875ae15acc7381368bac199bf61171e';base='content/japanese-basics/'
def raw(rev,path):return subprocess.check_output(['git','show',rev+':'+path],cwd=root)
def get(rev,path):return json.loads(raw(rev,path))
def pin(rev,path):return {'gitRevision':rev,'path':path,'sha256':hashlib.sha256(raw(rev,path)).hexdigest()}
mainPaths={'master':base+'master.json','extensions':base+'master-extensions.json','runtimeSupport':'src/data/japanese-basics-practice.json','curriculum':'src/data/core60/ja/master-japanese-basics.json','dictionary':'src/components/dictionary/japaneseWordData.json','pilotAudio':'src/data/japanese-101-recordings.json','runtimeAdapter':'src/data/japanese-basics.ts','readerAdapter':'src/data/japanese-basics-readers.ts','teachingSettings':'src/lib/teaching-settings.ts'}
privatePaths={'master':base+'master.json','extensions':base+'master-extensions.json','forms1To10':base+'private-form-practice-master-1-10-ja-en.json','forms11To20':base+'private-form-practice-master-11-20-ja-en.json','support':base+'private-master-practice-speaking-ja-en.json','modes':base+'private-master-20-six-mode-prompts-ja-en.json','speakingBuilder':'scripts/build-japanese101-master-speaking-candidate.py','speakingPreview':'scripts/build-japanese101-speaking-runtime-preview.mjs'}
m={k:get(MAIN,p) for k,p in mainPaths.items() if k not in ['runtimeAdapter','readerAdapter','teachingSettings']};p={k:get(PRIVATE,v) for k,v in privatePaths.items() if k not in ['speakingBuilder','speakingPreview']}
assert "support['partnerRole'] = entry['role']" in raw(PRIVATE,privatePaths['speakingBuilder']).decode();assert 'next.partnerRole = authored.role;' in raw(PRIVATE,privatePaths['speakingPreview']).decode()
assert 'lesson.stage === "master" ? 30 : n' in raw(MAIN,mainPaths['runtimeAdapter']).decode();assert 'lesson.reading.target.map' in raw(MAIN,mainPaths['readerAdapter']).decode()
forms=p['forms1To10']['lessons']+p['forms11To20']['lessons'];rows=[];reviewPins={};ids=[];gaps=[]
def closed(x):assert x['selectedJapanese'] is x['audioScript'] is None and x['reviewed'] is False
for n in range(1,21):
 group='master1' if n==1 else 'master2-4' if n<5 else 'master5-7' if n<8 else 'master8-10' if n<11 else 'master11-13' if n<14 else 'master14' if n==14 else 'master15-17' if n<18 else 'master18-20'
 rel=base+('review/master14-context-repair-2026-11-25/context-alternative.json' if n==14 else f'review/{group}-context-teaching-2026-11-25/teaching-alternatives.json')
 review=get(MAIN,rel);reviewPins[rel]=pin(MAIN,rel);assert hashlib.sha256((root/rel).read_bytes()).hexdigest()==reviewPins[rel]['sha256'];closed(review);assert all(x is False for x in review['gates'].values())
 source=p['master']['lessons'][n-1];ext=p['extensions'][str(n)];faces={'dialogue':[z.split('|') for z in source['dialogue']],'extension':[z.split('|') for z in ext]};canonical=next(z['prompts'] for z in forms if z['lesson']==n);byId={z['id']:z for z in canonical};support=p['support']['support'][str(n)];oldModes=p['modes']['lessons'][n-1]['modes'];runtime=m['runtimeSupport']['master-japanese-basics'][str(n)];cards=m['curriculum']['lessons'][n-1]['words'];dictionary=[z for z in m['dictionary'] if z.get('moduleId')=='master-japanese-basics' and f'lesson={n}&' in z.get('lessonHref','')]
 if n==14:
  row=review;activities=[];f=row['slots'];speaking=row['speaking'];explained=[z['sourcePromptId'] for z in f];evidence={z['id']:z for z in row['canonicalFormEvidence']}
  for z in f:
   closed(z);assert evidence[z['sourcePromptId']]==byId[z['sourcePromptId']];assert z['learnerTargetJapanese']==byId[z['sourcePromptId']]['japaneseAnswer'];assert z['learnerTargetEnglish']==byId[z['sourcePromptId']]['englishPrompt']
 else:
  row=next(z for z in review['lessons'] if z['lessonNumber']==n);closed(row);activities=row['activities'];f=row['forms'];speaking=row['speaking'];explained=[z['sourcePromptId'] for z in f]
  assert len(activities)==6 and {z['mode'] for z in activities}==set(oldModes)
  for z in activities:
   closed(z);assert [z['targetJapanese'],z['targetEnglish']]==faces[z['sourceKind']][z['sourceTurnOneBased']-1];assert z['promptEnglish']
   if n not in [15,16,17]:assert z['sourceKind']=='dialogue' and z['sourceTurnOneBased']==oldModes[z['mode']]['turn']
   if z['mode']=='hear':
    assert len(set(z['hearOptionsJapanese']))==3 and z['targetJapanese'] in z['hearOptionsJapanese']
    assert all(j in [a for a,b in faces['dialogue']+faces['extension']] for j in z['hearOptionsJapanese'])
    if 'hearOptionsEnglish' in z:
     assert len(z['hearOptionsEnglish'])==3;assert all([j,e] in faces['dialogue']+faces['extension'] for j,e in zip(z['hearOptionsJapanese'],z['hearOptionsEnglish']))
  for z in f:closed(z);assert z['canonicalFormEvidence']==byId[z['sourcePromptId']] and z['exampleJapanese']==byId[z['sourcePromptId']]['japaneseAnswer']
  assert row['preservedPriorPartnerRole']==support['partnerRole'] and row['preservedPriorMission']==support['authoredSpeakingMission']
 assert len(explained)==len(set(explained))==3;closed(speaking);assert speaking['wordBankJapanese']==[z.split('|')[0] for z in source['terms']];assert support['partnerRole']==support['authoredSpeakingMission']['role'];assert row['stableLessonKey']==f'master-japanese-basics:{n}'
 for z in activities+f+[speaking]:ids.append(z['id'])
 for z in canonical:
  assert z['pairKey']=='Japanese:English' and z['reviewed'] is False
  assert source['dialogue'][z['sourceDialogueTurn']-1]==z['japaneseAnswer']+'|'+z['englishPrompt']
  if z['id'] not in explained:gaps.append({'lesson':n,'stableLessonKey':f'master-japanese-basics:{n}','sourcePromptId':z['id'],'sourceKind':'dialogue','sourceTurnOneBased':z['sourceDialogueTurn'],'focus':z['focus'],'canonicalJapanese':z['japaneseAnswer'],'canonicalEnglish':z['englishPrompt'],'existingCanonicalPreserved':True,'missingScope':'new contextual bilingual explanation in these bounded repair packets; not missing canonical form','selectedJapanese':None,'audioScript':None,'reviewed':False})
 privateFaces=faces['dialogue']+faces['extension'];mainLesson=m['master']['lessons'][n-1];mainFaces=[z.split('|') for z in mainLesson['dialogue']+m['extensions'][str(n)]]
 assert runtime['reading']['target']==[j for j,e in mainFaces] and runtime['reading']['native']==[e for j,e in mainFaces];assert support['reading']['target']==[j for j,e in privateFaces] and support['reading']['native']==[e for j,e in privateFaces]
 rows.append({'lesson':n,'stableLessonKey':f'master-japanese-basics:{n}','reviewPath':rel,'reviewItemIds':[z['id'] for z in activities+f+[speaking]],'privateFormCount':len(canonical),'newContextualFormIds':explained,'unexplainedCanonicalFormIds':[z['id'] for z in canonical if z['id'] not in explained],'contextualModePairs':len(activities),'hearChoiceEvidence':([] if not activities else [{'parallelEnglishProvided':'hearOptionsEnglish' in z,'japaneseChoices':len(z['hearOptionsJapanese']),'prompt':z['promptEnglish']} for z in activities if z['mode']=='hear']),'distinctModeTargets':len({z['targetJapanese'] for z in activities}),'privateModeSourceTurns':{k:v['turn'] for k,v in oldModes.items()},'alternativeModeAnchors':[{'mode':z['mode'],'sourceKind':z['sourceKind'],'sourceTurnOneBased':z['sourceTurnOneBased'],'samePrivateModeAnchor':z['sourceKind']=='dialogue' and z['sourceTurnOneBased']==oldModes[z['mode']]['turn']} for z in activities],'privateReaderFaces':len(privateFaces),'mainReaderFaces':len(mainFaces),'privateReaderEqualsMain':privateFaces==mainFaces,'runtimeReaderEqualsMain':True,'runtimeReaderEqualsPrivate':runtime['reading']['target']==[j for j,e in privateFaces] and runtime['reading']['native']==[e for j,e in privateFaces],'privatePartnerCopiesLearnerTask':True,'runtimePartnerRole':runtime['partnerRole'],'runtimeHasPrivateAuthoredModes':bool(runtime.get('modes')),'runtimeCardCount':len(cards),'runtimeCardExplicitIdCount':sum(bool(z.get('id')) for z in cards),'scopedDictionaryRows':len(dictionary),'privateTermsWithoutExactScopedDictionaryFace':[z for z in source['terms'] if not any(v['word']==z.split('|')[0] and v['english']==z.split('|')[1] for v in dictionary)],'pilotRegistryLiteralReaderMatches':sum(j in m['pilotAudio']['entries'] for j,e in privateFaces),'selectedJapanese':None,'audioScript':None,'reviewed':False,'audioEligible':False})
assert len(ids)==len(set(ids))==194;assert len(gaps)==23;assert sum(z['contextualModePairs'] for z in rows)==114;assert sum(z['privateFormCount'] for z in rows)==83
extra=[base+'review/master14-form-kana-variants-2026-11-24/alternatives.json',base+'review/master14-bridge-patch-candidate-2026-11-24/fixtures.json']
manifest={'schema':1,'kind':'inert-full-master-cross-layer-checkpoint','mainSnapshot':MAIN,'privatePr':488,'pair':{'target':'Japanese','native':'English'},'mainPins':{k:pin(MAIN,v) for k,v in mainPaths.items()},'privatePins':{k:pin(PRIVATE,v) for k,v in privatePaths.items()},'reviewPins':list(reviewPins.values()),'additionalUncountedReviewPins':[pin(MAIN,z) for z in extra],'lessons':rows,'missingContextualFormExplanations':gaps,'totals':{'numberedLessonsWithSourceOnlyAlternative':20,'contextualModePairs':114,'distinctTargetsWithinLessonSummed':sum(z['distinctModeTargets'] for z in rows),'contextualFormExplanations':60,'canonicalForms':83,'additionalContextualExplanationsMissing':23,'speakingAlternatives':20,'uniqueReviewIds':194,'privateReaderFaces':sum(z['privateReaderFaces'] for z in rows),'mainReaderFaces':sum(z['mainReaderFaces'] for z in rows),'runtimeReaderMatchingPrivateLessons':sum(z['runtimeReaderEqualsPrivate'] for z in rows),'selected':0,'audioEligible':0},'deterministicAuditOnly':True,'qualifiedApproval':False,'selectedJapanese':None,'audioScript':None,'reviewed':False,'gates':{k:False for k in ['qualifiedJapanese','qualifiedSource','qualifiedDictionary','learnerRuntime','scoring','audioRegistered','listeningReviewed','offline','savedProgress','browser','v4']}}
if '--write' in sys.argv:(h/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
else:
 assert json.loads((h/'manifest.json').read_text())==manifest
 meta=json.loads((h/'audit-metadata.json').read_text());assert meta['newModelCalls']==0 and meta['qualifiedApproval'] is meta['reviewed'] is False and meta['mainSnapshot']==MAIN and meta['privateRevision']==PRIVATE
assert len(mainPaths)+len(privatePaths)+len(reviewPins)+len(extra)==27
print('PASS20source-only alternatives/114literal mode pairs/60of83canonical forms explained/23specific gaps/20speaking/194uniqueIDs/253private vs248main Reader faces/27immutablepins/allnullfalse; no release claim')
