#!/usr/bin/env python3
"""Independently verify current source, archived evidence, stable IDs and closed gates."""
import hashlib,json,subprocess
from pathlib import Path
N=3
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
p=json.loads((HERE/'packet.json').read_text())
assert p['kind']=='inert-source-review' and p['lessonId']==f'master-roofing:{N}:ja-en'
assert p['stageId']=='master-roofing' and p['pair']=={'target':'Japanese','native':'English'}
for pin in p['source'].values(): assert hashlib.sha256((ROOT/pin['path']).read_bytes()).hexdigest()==pin['sha256']
JS=r"""
import {build} from 'esbuild';const b=await build({entryPoints:['src/data/master-roofing-curriculum.ts'],bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const l=m.MASTER_ROOFING_LESSONS[2];process.stdout.write(JSON.stringify({n:l.n,title:l.title,objective:l.objective,speaking:l.steps[2].instruction,words:l.words,grammar:l.grammar,lessonType:l.lessonType,block:l.block}));
"""
s=json.loads(subprocess.check_output(['node','--input-type=module','-e',JS],cwd=ROOT,text=True))
c=json.loads((ROOT/p['source']['lessonContent']['path']).read_text())['lessons'][str(N)]
a=json.loads((ROOT/p['source']['archivedDraft']['path']).read_text())['lessons'][2]
assert s['n']==a['n']==N and a['stableId']==p['lessonId']
assert (p['sourceEnglishTitle'],p['sourceEnglishObjective'],p['sourceEnglishSpeaking'])==(s['title'],s['objective'],s['speaking'])
assert p['sourceGrammar']==s['grammar'] and p['sourceLessonType']==s['lessonType'] and p['sourceBlock']==s['block']
assert p['sourceVerbExamples']==c['verbs'] and p['sourceSpanishReaderTitle']==c['passage']['title']
assert len(p['cards'])==len(s['words'])==len(a['cards'])
for i,(row,word,old) in enumerate(zip(p['cards'],s['words'],a['cards'],strict=True),1):
 assert row['id']==f'master-roofing:{N}:ja-en:card:{i}' and row['legacySourceRef']==f'master-roofing:{N}:ja-en:cards:{i}'
 assert (row['sourceSpanish'],row['sourceEnglish'],row['kind'],row['sourceNoteSpanish'])==(word['es'],word['en'],word['kind'],word.get('note'))
 assert row['archivedJapanese']==old['ja'] and row['archivedEnglish']==old['en']
 assert row['selectedJapanese'] is None and row['reviewed'] is False
 if row['reviewNote']:assert row['candidateJapanese'] is None
assert len(p['reader'])==len(c['passage']['target'])==len(c['passage']['native'])==len(a['reader'])
for i,(row,es,en,old) in enumerate(zip(p['reader'],c['passage']['target'],c['passage']['native'],a['reader'],strict=True),1):
 assert row['id']==f'master-roofing:{N}:ja-en:line:{i}' and row['legacySourceRef']==f'master-roofing:{N}:ja-en:reader:{i}'
 assert (row['sourceSpanish'],row['sourceEnglish'])==(es,en)
 assert (row['archivedJapanese'],row['archivedEnglish'])==(old['ja'],old['en'])
 assert row['selectedJapanese'] is None and row['reviewed'] is False
 if row['reviewNote']:assert row['candidateJapanese'] is None
assert p['archivedForms']==a['forms']
assert p['audioScript'] is None and p['reviewed'] is False and p['registered'] is False and p['audioRegistered'] is False
assert p['reviewGates'] and all(v is False for v in p['reviewGates'].values())
assert set(p['archivedModeLabels'])=={'see','recall','hear','type','say','write'}
assert all(not v['authoredPromptTargetPair'] and not v['readyForLearner'] for v in p['archivedModeLabels'].values())
print(f"PASS Japanese Roofing Master {N}: {len(p['cards'])} cards, {len(p['reader'])} Reader lines, current source, IDs, closed gates")
