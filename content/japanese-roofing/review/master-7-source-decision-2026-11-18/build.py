#!/usr/bin/env python3
"""Rebuild inert Japanese Roofing Master lesson source-decision packet."""
import hashlib,json,subprocess,sys
from pathlib import Path
N=7
ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).resolve().parent
ARCHIVE='content/review-archive/french-japanese-2026-11-15/japanese-roofing/master-7-9-draft.json'
INDEX=0
FILES={'curriculum':'src/data/master-roofing-curriculum.ts','lessonContent':'public/lesson-content/es/master-roofing.json','archivedDraft':ARCHIVE}
JS=r"""
import {build} from 'esbuild';
const b=await build({entryPoints:['src/data/master-roofing-curriculum.ts'],bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const l=m.MASTER_ROOFING_LESSONS[6];
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
CARD_HOLDS={1: 'Insurance adjuster has a specialized Japanese role/sense requiring locale review.', 4: 'Impact mark/hail hit is an observed roof condition; confirm trade term.', 5: 'Test square is a hail-assessment sampling area, not a generic experiment.', 6: 'Insurance claim sense needs contextual Japanese term.', 8: 'Granule loss on a shingle requires specific roofing terminology.', 11: 'Roof slope means one face of the roof, not merely any roof surface.', 12: 'Scope of work needs insurance/contract sense.', 14: 'Square foot is a unit; preserve numerical measurements.', 16: 'Twelve hits in one test square is scene evidence, not a general threshold.', 17: 'Granule-loss claim needs source and roofing review.', 18: 'Marking hail impacts with chalk needs inspection/safety context.', 19: 'Counted impacts depend on observation, not an automatic coverage decision.', 21: 'Agreement on scope is not authorization or insurer coverage approval.'}
READER_HOLDS={2: 'Adjuster arrives to review the Ortiz family claim; insurance role and claim sense need review.', 3: 'Roof access with the adjuster requires site-specific fall-protection review.', 4: 'Dents along the gutter are observations, not proof of covered damage.', 5: 'Ten-by-ten-foot test square and roof-slope measurement must remain exact.', 6: 'Marking each hit needs trade/inspection and roof-access review.', 7: 'Chalk circles distinguish marked observations from a claim decision.', 8: 'Twelve hits and granule loss are scene observations; do not imply an automatic insurance threshold.', 9: 'North-side count is the adjusters question, not an established finding.', 10: 'Wind-direction explanation is the characters inference and needs source fidelity.', 11: 'Square-foot measurements must retain the unit and numerical meaning.', 13: 'The west and north area measurements are 1,200 and 800 square feet, respectively.', 14: 'Insurer-stated replacement/repair scope is attributed to the company, not the crew.', 15: 'Scope question includes the gutter; agreement is not a coverage guarantee.', 16: 'Adjuster promises report note and insurer copy; preserve who sends the report.'}
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
 'curriculumAdaptationNote':"The source records a Tuesday-night hailstorm, a Thursday 10:00 Ortiz-family claim inspection, west-side gutter dents, a 10-by-10-foot test square, twelve marked hits west and three north, granule loss, 1,200 versus 800 square feet, and the insurer's replacement/repair scope including a gutter question. Keep observations, the crew's wind inference, the adjuster's insurer attribution and the report-copy promise distinct. The scene is not a general hail threshold or coverage rule. Roof access, impact marking, terminology, measurements, insurance/contract scope and Japanese register need qualified review before scored text or audio. Five verbs and grammar examples are pinned separately; archived forms and mode labels are conditional evidence. No learner or saved-progress identity is created.",'audioScript':None,'reviewGates':{k:False for k in ['qualifiedJapanese','qualifiedRoofing','dictionarySenses','sourceDecision','audioListening','learnerRuntime','scoring','offline','savedProgress','browserAcceptance','v4Acceptance']},
 'reviewed':False,'registered':False,'audioRegistered':False}
out=json.dumps(p,ensure_ascii=False,indent=2)+'\n';target=HERE/'packet.json'
if '--check' in sys.argv:
 assert target.read_text()==out,'packet drifted from current source or archive';print(f'PASS Japanese Roofing Master {N} packet build --check')
else:
 target.write_text(out);print(target)
