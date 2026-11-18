#!/usr/bin/env python3
"""Rebuild inert Japanese Roofing Master lesson source-decision packet."""
import hashlib,json,subprocess,sys
from pathlib import Path
N=8
ROOT=Path(__file__).resolve().parents[4]
HERE=Path(__file__).resolve().parent
ARCHIVE='content/review-archive/french-japanese-2026-11-15/japanese-roofing/master-7-9-draft.json'
INDEX=1
FILES={'curriculum':'src/data/master-roofing-curriculum.ts','lessonContent':'public/lesson-content/es/master-roofing.json','archivedDraft':ARCHIVE}
JS=r"""
import {build} from 'esbuild';
const b=await build({entryPoints:['src/data/master-roofing-curriculum.ts'],bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const l=m.MASTER_ROOFING_LESSONS[7];
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
CARD_HOLDS={1: 'Japanese 雷 can mean thunder or lightning; confirm the precise source lightning sense.', 4: 'The source gloss conflates lightning strike and electric shock; preserve the physical hazard accurately.', 5: 'Wet surface is a roof-access hazard in context; confirm precise Japanese trade wording.', 11: 'Manufacturer-warranty condition requires an identified roofing product/system.', 15: 'Lightning-work refusal is a safety instruction requiring qualified source and trade review.', 16: 'Skipping underlayment and warranty consequences depend on the specified system.', 19: 'Temporary tarp work must not imply access during lightning or premature reentry.', 20: 'Roof-access command needs a site-specific authorization and safe reentry decision.', 21: 'Absolute safety command needs a qualified trade and register decision.'}
READER_HOLDS={4: 'Homeowner requests omission of underlayment; preserve this as a refused request, not a recommendation.', 6: 'Lightning and wet-roof work refusal is safety-critical; review source intensity and natural Japanese.', 7: 'Lightning strike fatality and electric-shock wording need exact physical and clinical senses.', 9: 'Manufacturer warranty condition cannot be universal without a specified product/system.', 10: 'The source predicts a future leak and greater expense; review the categorical claim.', 11: 'Tarp placement and return after the storm require a safe-access sequence not specified in source.', 12: 'Friday finish is conditional on forecast; archived Japanese must not guarantee the date.', 14: 'Do not leave metal tools on the roof, but retrieval timing and storm procedure are unspecified.', 15: 'The foreman claims personal responsibility; legal/contract authority varies by locale.', 16: 'Safety rule and command to Kevin require qualified jobsite register and authority review.'}
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
 'curriculumAdaptationNote':'The source portrays an unsafe homeowner request to keep working in rain and omit underlayment. Preserve Rogelio’s refusal and the order of lightning/wet-roof risk, warranty explanation, proposed tarp after the storm and conditional Friday finish. Do not present the tarp, metal-tool instruction, reentry timing, manufacturer warranty or personal liability as universal jobsite directions without an identified system and qualified safety/product/contract review. The lightning-strike card conflates electrical injury and strike terminology. Grammar and Spanish verbs are pinned separately. No selected learner/audio text or progress identity is created.','audioScript':None,'reviewGates':{k:False for k in ['qualifiedJapanese','qualifiedRoofing','dictionarySenses','sourceDecision','audioListening','learnerRuntime','scoring','offline','savedProgress','browserAcceptance','v4Acceptance']},
 'reviewed':False,'registered':False,'audioRegistered':False}
out=json.dumps(p,ensure_ascii=False,indent=2)+'\n';target=HERE/'packet.json'
if '--check' in sys.argv:
 assert target.read_text()==out,'packet drifted from current source or archive';print(f'PASS Japanese Roofing Master {N} packet build --check')
else:
 target.write_text(out);print(target)
