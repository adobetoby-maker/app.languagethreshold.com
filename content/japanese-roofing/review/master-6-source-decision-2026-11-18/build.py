#!/usr/bin/env python3
"""Rebuild inert Japanese Roofing Master lesson source-decision packet."""
import hashlib,json,subprocess,sys
from pathlib import Path
N=6
ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).resolve().parent
ARCHIVE='content/review-archive/french-japanese-2026-11-15/japanese-roofing/master-4-6-draft.json'
INDEX=2
FILES={'curriculum':'src/data/master-roofing-curriculum.ts','lessonContent':'public/lesson-content/es/master-roofing.json','archivedDraft':ARCHIVE}
JS=r"""
import {build} from 'esbuild';
const b=await build({entryPoints:['src/data/master-roofing-curriculum.ts'],bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const l=m.MASTER_ROOFING_LESSONS[5];
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
CARD_HOLDS={10: 'Architectural-shingle product term and equivalence with another brand need roofing/Japanese review.', 11: 'Three-tab shingle differs from the contracted architectural product; confirm Japanese product term.', 18: 'Same durability but heavier is a supplier claim, not established product equivalence.', 21: 'Source labels this phrase informal; archived Japanese is polite and needs register review.'}
READER_HOLDS={5: 'Source says would be a four-day delay; preserve conditional timing, not certainty.', 6: 'Another-brand architectural shingle at the same price is a supplier product claim.', 7: 'Equal durability, higher weight and similar color require product/specification review.', 8: 'Contract distinguishes architectural from three-tab; Japanese product terms and authority need review.', 9: 'Spec-sheet comparison must precede a substitute decision; confirm workflow and term.', 10: 'Mrs. Díaz is a female homeowner; archived Japanese loses the source honorific and gender context.', 11: 'Source address Maam is omitted in the archived Japanese; customer register needs review.', 12: 'Next-day delivery depends on homeowner approval and supplier availability; hold promise wording.', 13: 'Text approval and revised invoice may not complete contract authorization in every locale.', 16: 'Underlayment and drip-edge sequencing requires roofing/product review.', 17: 'Source is an informal crew request; archived Japanese changes register and adds carrying.'}
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
 'curriculumAdaptationNote':"The source's Thursday factory delivery is uncertain; a same-price architectural-shingle substitute from another brand is a supplier claim, not verified equivalence. Rogelio rejects three-tab under the contract, requests the spec sheet, consults Mrs. Díaz, receives text approval and a new invoice, then re-sequences underlayment and drip edge. Preserve conditional delivery, heavier-versus-durable comparison, product identity, source register and homeowner authorization. Roofing product/contract and Japanese review are needed before scored text or audio. Five source verbs and grammar examples remain pinned separately; archived forms and mode labels are conditional evidence. No learner or saved-progress identity is created.",'audioScript':None,'reviewGates':{k:False for k in ['qualifiedJapanese','qualifiedRoofing','dictionarySenses','sourceDecision','audioListening','learnerRuntime','scoring','offline','savedProgress','browserAcceptance','v4Acceptance']},
 'reviewed':False,'registered':False,'audioRegistered':False}
out=json.dumps(p,ensure_ascii=False,indent=2)+'\n';target=HERE/'packet.json'
if '--check' in sys.argv:
 assert target.read_text()==out,'packet drifted from current source or archive';print(f'PASS Japanese Roofing Master {N} packet build --check')
else:
 target.write_text(out);print(target)
