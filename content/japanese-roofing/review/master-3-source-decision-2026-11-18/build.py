#!/usr/bin/env python3
"""Rebuild inert Japanese Roofing Master lesson source-decision packet."""
import hashlib,json,subprocess,sys
from pathlib import Path
N=3
ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).resolve().parent
ARCHIVE='content/review-archive/french-japanese-2026-11-15/japanese-roofing/master-1-3-draft.json'
INDEX=2
FILES={'curriculum':'src/data/master-roofing-curriculum.ts','lessonContent':'public/lesson-content/es/master-roofing.json','archivedDraft':ARCHIVE}
JS=r"""
import {build} from 'esbuild';
const b=await build({entryPoints:['src/data/master-roofing-curriculum.ts'],bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const l=m.MASTER_ROOFING_LESSONS[2];
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
CARD_HOLDS={2: 'Confirm product-specific nailing zone and manufacturer pattern before scoring placement.', 3: 'Nail pattern varies by product and site conditions; preserve manufacturer dependency.', 4: 'Overdriven nail diagnosis and correction need qualified roofing review.', 5: 'High nail diagnosis and correction need qualified roofing review.', 12: 'Flush nail-head position must match selected product instructions.', 14: 'Placement command needs product-specific nailing zone and safe gun procedure.', 15: 'Do not score gun-depth correction before qualified tool/product review.', 16: 'Air-pressure adjustment depends on tool and product instructions.', 17: 'High-nail removal and replacement need product-specific repair instructions.'}
READER_HOLDS={2: 'Nail-gun handling instruction requires qualified tool/safety review.', 4: 'Nailing zone and pattern are manufacturer-specific.', 6: 'High-nail removal and replacement are product-specific.', 7: 'Hole sealing method must follow the actual selected product instructions.', 9: 'Flush target needs manufacturer/product confirmation.', 10: 'Wind uplift consequence is plausible but product/installation context matters.', 11: 'Air-pressure change is tool/product-specific.', 14: 'Gun direction is safety-critical; preserve meaning and qualified review.'}
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
 'curriculumAdaptationNote':'The scene teaches supportive correction of nail placement. Preserve the source distinction between high and overdriven nails, the product-specific nailing zone/pattern, hole sealing according to product instructions, and nail-gun handling. Do not turn the fictional tool adjustments into universal scored instructions. Archived Japanese is evidence only; grammar and five Spanish verbs are pinned separately. No selected learner/audio text or progress identity is created.','audioScript':None,'reviewGates':{k:False for k in ['qualifiedJapanese','qualifiedRoofing','dictionarySenses','sourceDecision','audioListening','learnerRuntime','scoring','offline','savedProgress','browserAcceptance','v4Acceptance']},
 'reviewed':False,'registered':False,'audioRegistered':False}
out=json.dumps(p,ensure_ascii=False,indent=2)+'\n';target=HERE/'packet.json'
if '--check' in sys.argv:
 assert target.read_text()==out,'packet drifted from current source or archive';print(f'PASS Japanese Roofing Master {N} packet build --check')
else:
 target.write_text(out);print(target)
