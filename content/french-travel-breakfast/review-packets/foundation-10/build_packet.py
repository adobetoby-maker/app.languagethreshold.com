import json,pathlib
p=pathlib.Path(__file__).parent
s=json.load(open(p/'source-lesson.json'));r=json.load(open(p/'source-reader.json'));y=json.load(open(p/'candidate-fable.json'));meta=json.load(open(p/'source-metadata.json'))
assert len(y['frenchCards'])==len(s['words'])==15
assert len(y['frenchReader'])==len(r['passage']['native'])==9
cards=[{'id':f'foundation:10:word:{i}','kind':q['kind'],'english':q['en'],'french':f,'spanishSource':q['es']} for i,(q,f) in enumerate(zip(s['words'],y['frenchCards']),1)]
reader=[{'id':f'foundation:10:line:{i}','english':en,'french':fr,'spanishSource':es} for i,(en,fr,es) in enumerate(zip(r['passage']['native'],y['frenchReader'],r['passage']['target']),1)]
forms=[]
for q in y['forms']:
 i=q['readerLine'];v=reader[i-1]
 assert q['english']==v['english'] and q['french']==v['french'],('form',i)
 forms.append({'sourceRef':v['id'],'readerIndex':i,'englishPrompt':v['english'],'frenchAnswer':v['french'],'learnerCue':f'Put Reader line {i} into French; preserve the exact meaning and speaker.','explanation':'Unreviewed form candidate linked to the exact Reader pair.'})
modes=[]
cue_by_mode={'see':'Read the café term and identify its exact English meaning.','recall':'Recall in English what Emma asks Rosa about the ingredients.','hear':'Use this unrecorded script to identify the exact English meaning of a polite request to slow down.','type':'Type the exact English meaning of Emma’s question about a vegetarian option.','say':'Say in English that Emma does not understand Rosa.','write':'Write Rosa’s exact English list of the four ingredients.'}
for q in y['modes']:
 if q['mode']=='say': q={**q,'sourceType':'card','sourceIndex':10,'promptFrench':cards[9]['french'],'targetEnglish':cards[9]['english']}
 z=(cards if q['sourceType']=='card' else reader)[q['sourceIndex']-1]
 assert q['promptFrench']==z['french'] and q['targetEnglish']==z['english'],('mode',q['mode'])
 modes.append({'id':f"foundation:10:{q['mode']}:candidate-1",'lessonKey':'foundation:10','mode':q['mode'],'cueEnglish':cue_by_mode[q['mode']],'modelEnglish':z['english'],'modelFrench':z['french'],'sourceRef':z['id'],'delivery':'script-only' if q['mode']=='hear' else 'self-check','recordedAudioRequired':False,'readyForLearner':False})
obj={'schema':1,'purpose':'private source-aligned owner-review candidate; unqualified','course':'travel-breakfast','pair':'fr-en','stage':'foundation','lessonNumber':10,'stableLessonKey':'foundation:10','sourceMainSha':meta['main'],'sourceCourseSha256':meta['courseSHA256'],'sourceReaderSha256':meta['readerSHA256'],'sourcePr475Head':meta['private475'],'reviewed':False,'registered':False,'audioRegistered':False,'audioListeningReviewed':False,'readyForLearner':False,'learnerRuntimeEnabled':False,'audioPlaybackEnabled':False,'progressEnabled':False,'ownerOnlyCandidate':True,'projectionStatus':'private hold: source card 12 says Spanish; French-course adaptation requires owner source decision; stable progress identity and qualified French review pending','sourceVerbParadigms':r['verbs'],'frenchVerbParadigmsAuthored':True,'frenchVerbParadigms':y['frenchVerbParadigms'],'internalDomainNotes':y['internalDomainNotes'],'readerTitleFrench':y['readerTitleFrench'],'cards':cards,'reader':reader,'forms':forms,'modes':modes,'speakingSourceEnglish':s['speaking'],'speakingObjectives':y['speakingObjectives'],'sourceNotes':['Pinned source English and Spanish kept byte-identical; no source edit.','Old private #475 English Reader redesign differs on 5/9 turns and is not used here.','Card 12 preserves exact English How do you say this in Spanish?; French en espagnol translates it. En français is a separate possible French-course adaptation requiring source/owner decision.'],'qualifiedReviewResiduals':[v for v in y['qualifiedReviewResiduals'] if not v.startswith('Say mode uses card 15')] + ['Source-grounded self-check changed Say from emergency card 15 to the source speaking-task card 10; no audio or learner playback is enabled.']}
(p/'owner-review-packet.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
