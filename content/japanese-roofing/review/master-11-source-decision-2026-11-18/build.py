#!/usr/bin/env python3
"""Rebuild inert Japanese Roofing Master lesson source-decision packet."""
import hashlib,json,subprocess,sys
from pathlib import Path
N=11
ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).resolve().parent
ARCHIVE='content/review-archive/french-japanese-2026-11-15/japanese-roofing/master-10-11-draft.json'
INDEX=1
FILES={'curriculum':'src/data/master-roofing-curriculum.ts','lessonContent':'public/lesson-content/es/master-roofing.json','archivedDraft':ARCHIVE}
JS=r"""
import {build} from 'esbuild';
const b=await build({entryPoints:['src/data/master-roofing-curriculum.ts'],bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const l=m.MASTER_ROOFING_LESSONS[10];
process.stdout.write(JSON.stringify({n:l.n,title:l.title,objective:l.objective,speaking:l.steps[2].instruction,words:l.words,grammar:l.grammar,lessonType:l.lessonType,block:l.block}));
"""
source=json.loads(subprocess.check_output(['node','--input-type=module','-e',JS],cwd=ROOT,text=True))
content=json.loads((ROOT/FILES['lessonContent']).read_text())['lessons'][str(N)]
archive=json.loads((ROOT/ARCHIVE).read_text())['lessons'][INDEX]
assert source['n']==archive['n']==N and archive['stableId']==f'master-roofing:{N}:ja-en'
assert source['title']==archive['titleEnglish'] and source['objective']==archive['sourceEnglishObjective']
assert source['speaking']==archive['sourceEnglishSpeaking']
assert len(source['words'])==len(archive['cards'])
passage=content['passage'];assert len(passage['target'])==len(passage['native'])==len(archive['reader'])
CARD_HOLDS={1: 'Heat-wave threshold and locale are unspecified in the isolated card; preserve the source scene rather than infer a universal cutoff.', 2: 'Heat exhaustion is a distinct clinical term; qualified Japanese/clinical review must check 熱疲労 against the lesson context.', 3: 'Heatstroke is a distinct emergency term; qualified Japanese/clinical review must check 熱射病 and urgency.', 5: 'Water-break interval is a scene-specific plan, not a universal schedule.', 7: 'Electrolytes appear in the source plan; do not imply they replace water or an individual medical assessment.', 16: 'Six-to-two schedule depends on work conditions and locale; preserve the exact hours without universalizing.', 19: 'Dizziness reporting is a direct source instruction; confirm Japanese register and symptom wording.', 20: 'Without risks is an absolute promise in the source; hold for qualified safety/source decision.', 21: 'Give it your all could conflict with the heat-safety message; assess register and intent.', 22: 'Archived 社長 narrows sir/boss to company president; source does not establish that title.'}
READER_HOLDS={1: 'The source says over 100 degrees without naming a scale; archive adds Fahrenheit. Resolve locale/temperature unit before selection.', 6: 'The six-to-two schedule is a source commitment in this scene, not universal heat-safety timing.', 7: 'Cold water and electrolytes are source commitments; assess precise Japanese meaning and avoid substituting one for the other.', 8: 'Hourly shade/water break is the source plan, not a universal rule.', 9: 'Hydration is not optional in the source, but do not convert this scene into generic clinical advice.', 10: 'Dizziness instruction to new hire Kevin requires precise symptom and reporting language.', 11: 'The source lists dizziness, headache, nausea and heavy sweating as heat-exhaustion signs; qualified clinical/Japanese review is required.', 12: 'Heatstroke is named as an emergency with 911 in the source; confirm site locale and Japanese clinical term before scored use.', 13: 'Without risks and on-time finish are absolute promises; preserve source meaning while flagging safety/claim review.', 15: 'Give it your all may counter the earlier heat-rest instruction; resolve tone in context.', 16: 'The Friday completion assurance is a source claim, not guaranteed by the revised schedule.'}
cards=[]
for i,(word,old) in enumerate(zip(source['words'],archive['cards'],strict=True),1):
 assert word['en']==old['en'] and word['kind']==old['kind']
 cards.append({'id':f'master-roofing:{N}:ja-en:card:{i}','legacySourceRef':f'master-roofing:{N}:ja-en:cards:{i}',
 'sourceSpanish':word['es'],'sourceEnglish':word['en'],'sourceNoteSpanish':word.get('note'),'kind':word['kind'],
 'selectedJapanese':None,'candidateJapanese':None if i in CARD_HOLDS else old['ja'],'archivedJapanese':old['ja'],
 'archivedEnglish':old['en'],'reviewNote':CARD_HOLDS.get(i),'reviewed':False})
reader=[]
for i,(es,en,old) in enumerate(zip(passage['target'],passage['native'],archive['reader'],strict=True),1):
 assert old['en']==en
 reader.append({'id':f'master-roofing:{N}:ja-en:line:{i}','legacySourceRef':f'master-roofing:{N}:ja-en:reader:{i}',
 'sourceSpanish':es,'sourceEnglish':en,'selectedJapanese':None,'candidateJapanese':None if i in READER_HOLDS else old['ja'],
 'archivedJapanese':old['ja'],'archivedEnglish':old['en'],'reviewNote':READER_HOLDS.get(i),'reviewed':False})
assert set(archive['modes'])=={'see','recall','hear','type','say','write'}
p={'schema':1,'kind':'inert-source-review','pair':{'target':'Japanese','native':'English'},'stageId':'master-roofing',
 'lessonId':f'master-roofing:{N}:ja-en','source':{name:{'path':path,'sha256':hashlib.sha256((ROOT/path).read_bytes()).hexdigest()} for name,path in FILES.items()},
 'sourceEnglishTitle':source['title'],'sourceEnglishObjective':source['objective'],'sourceEnglishSpeaking':source['speaking'],
 'sourceSpanishReaderTitle':passage['title'],'sourceLessonType':source['lessonType'],'sourceBlock':source['block'],
 'sourceGrammar':source['grammar'],'sourceVerbExamples':content['verbs'],'candidateObjective':archive['objective'],
 'candidateFocus':archive['focus'],'archivedForms':archive['forms'],'archivedSpeaking':archive['speaking'],
 'cards':cards,'reader':reader,'archivedModeLabels':{k:{'label':v,'authoredPromptTargetPair':False,'readyForLearner':False} for k,v in archive['modes'].items()},
 'curriculumAdaptationNote':'The source presents a heat-wave week at a school roof, a six-to-two revised schedule, water/electrolytes and hourly shade breaks, symptom reporting, heatstroke emergency language and a Friday deadline. The source says more than 100 degrees but does not identify the scale; archived Japanese adds Fahrenheit. Hold clinical terminology, emergency number locale, break/schedule claims and absolute no-risk/on-time promises for qualified source, Japanese and domain review. The lesson must teach heat exhaustion and heatstroke directly, without erasing either term. Grammar and five Spanish verbs are pinned separately. No selected learner/audio text or progress identity is created.','audioScript':None,'reviewGates':{k:False for k in ['qualifiedJapanese','qualifiedRoofing','dictionarySenses','sourceDecision','audioListening','learnerRuntime','scoring','offline','savedProgress','browserAcceptance','v4Acceptance']},
 'reviewed':False,'registered':False,'audioRegistered':False}
out=json.dumps(p,ensure_ascii=False,indent=2)+'\n';target=HERE/'packet.json'
if '--check' in sys.argv:
 assert target.read_text()==out,'packet drifted from current source or archive';print(f'PASS Japanese Roofing Master {N} packet build --check')
else:
 target.write_text(out);print(target)
