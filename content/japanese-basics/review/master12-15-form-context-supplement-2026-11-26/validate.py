#!/usr/bin/env python3
import json,hashlib,subprocess,re
from pathlib import Path
h=Path(__file__).resolve().parent;root=h.parents[3];p=json.loads((h/'context-explanations.json').read_text())
def raw(pin):
 b=subprocess.check_output(['git','show',pin['gitRevision']+':'+pin['path']],cwd=root);assert hashlib.sha256(b).hexdigest()==pin['sha256'];return b
closed=lambda x:x['selectedJapanese'] is x['audioScript'] is None and x['reviewed'] is False
assert p['pair']=={'target':'Japanese','native':'English'} and closed(p) and all(z is False for z in p['gates'].values())
checkpoint=json.loads(raw(p['checkpointPin']));private={z['path'].rsplit('/',1)[1]:json.loads(raw(z)) for z in p['privateSourcePins']}
for pin in p['unchangedPriorPins']:
 b=raw(pin);assert (root/pin['path']).read_bytes()==b,'Prior/source values changed: '+pin['path']
master=private['master.json']['lessons'];extensions=private['master-extensions.json'];original=private['private-form-practice-master-1-10-ja-en.json']['lessons']+private['private-form-practice-master-11-20-ja-en.json']['lessons'];expected=checkpoint['missingContextualFormExplanations'][12:18]
assert [z['sourcePromptId'] for z in p['forms']]==[z['sourcePromptId'] for z in expected] and len(p['forms'])==6
ids=[]
for row,gap in zip(p['forms'],expected):
 n=gap['lesson'];assert row['lessonNumber']==n and row['stableLessonKey']==gap['stableLessonKey'];f=next(z for l in original if l['lesson']==n for z in l['prompts'] if z['id']==row['sourcePromptId']);assert row['canonicalFormEvidence']==f and row['sourceGapEvidence']==gap
 assert closed(row) and row['contextEnglish'] and row['practicePromptEnglish'] and row['practiceRoleEnglish'];assert row['explanationJapanese'] and row['explanationEnglish'];assert not re.search('[\u3400-\u4dbf\u4e00-\u9fff]',row['explanationJapanese']);ids.append(row['id'])
 for key in ['contextExample','sourceContextBefore','sourceContextAfter']:
  if not row.get(key):continue
  x=row[key];assert closed(x);faces=master[n-1]['dialogue'] if x['sourceKind']=='dialogue' else extensions[str(n)];assert x['japanese']+'|'+x['english']==faces[x['sourceTurnOneBased']-1]
 ex=row['contextExample'];assert ex['sourceKind']=='dialogue' and ex['sourceTurnOneBased']==f['sourceDialogueTurn'] and ex['japanese']==f['japaneseAnswer'] and ex['english']==f['englishPrompt']
assert len(ids)==len(set(ids))==6
previous=[r for pin in p['previousSupplementPins'] for r in json.loads(raw(pin))['forms']];assert p['previouslySupplementedFormIds']==[z['sourcePromptId'] for z in previous]==[z['sourcePromptId'] for z in checkpoint['missingContextualFormExplanations'][:12]];assert not set(p['previouslySupplementedFormIds']) & {z['sourcePromptId'] for z in p['forms']}
remaining=checkpoint['missingContextualFormExplanations'][18:];assert p['remainingUnexplainedSourcePromptIds']==[z['sourcePromptId'] for z in remaining];assert p['checkpointGapCount']==23 and p['additionalExplanationsProvided']==6 and p['remainingAdditionalExplanationGapCount']==len(remaining)==5 and p['cumulativeSupplementalExplanationCount']==18 and p['cumulativeContextualExplanationCoverage']==78
meta=json.loads((h/'ai-assistance-metadata.json').read_text());assert meta['qualifiedApproval'] is False
for k,model in [('haiku','claude-haiku-5-5'),('opus','claude-opus-5-5'),('fable','claude-fable-5-2')]:assert meta[k]['safeMode'] is True and model in meta[k]['actualModelUsage'] and meta[k]['isError'] is False
print('PASS6additive explanations/canonical IDs+faces/source contexts/fullkana/6unique review IDs;9prior files byte-exact;18of23gaps supplemented/5remaining;actual metadata/allnullfalse/no runtime change')
