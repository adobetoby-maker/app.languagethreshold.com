#!/usr/bin/env python3
"""Verify redesigned Master 10–12 provenance, new pairs, and draft gates."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(path):return json.loads((ROOT/path).read_text())
def sha(path):return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
D='content/french-basics/master-10-12-redesign-draft.json'
d=load(D);src=d['source'];m=load(src['curriculumMap'])
assert (d['target'],d['native'],d['moduleId'],d['stage'])==('French','English','french-basics','master')
assert d['reviewed'] is False and d['registered'] is False and d['state']=='redesigned-authored-draft'
for path,key in ((src['curriculumMap'],'curriculumMapSha256'),(src['legacySpanishCourse'],'legacySpanishCourseSha256'),(src['legacySpanishPractice'],'legacySpanishPracticeSha256'),(src['priorRedesign'],'priorRedesignSha256')):
 assert src[key]==sha(path),(path,key)
legacy=load(src['legacySpanishPractice'])
prior=load(src['priorRedesign'])
prior_1_3=load('content/french-basics/master-1-3-redesign-draft.json')
prior_4_6=load('content/french-basics/master-4-6-redesign-draft.json')
practice=load('src/data/spanish-basics-practice.json')
old_en={line for stage in ('foundation-spanish-basics','spanish-basics','master-spanish-basics') for lesson in practice[stage].values() for line in lesson['reading']['native']}
assert [x['n'] for x in d['lessons']]==[10,11,12]
all_new_en=[]
for x in d['lessons']:
 n=x['n'];plan=m['lessons'][n-1]
 assert x['stableLessonKey']==plan['stableLessonKey']==f'master-french-basics:{n}'
 assert x['objective']==plan['proposedObjectiveEnglish']
 assert x['prerequisites']==plan['prerequisites']
 assert x['locale']=='fr-FR'
 assert all(x[field] for field in ('title','focus','scene','grammar','speaking','reading','words','checks'))
 assert x['grammar']['explanation'].strip() and x['grammar']['caution'].strip()
 speaking=x['speaking']; assert speaking['role'] and speaking['opening'] and len(speaking['objectives'])>=4 and speaking['complication'] and speaking['closure']
 assert len(x['words'])==20 and [w['order'] for w in x['words']]==list(range(1,21))
 assert [w['kind'] for w in x['words']]==['term']*8+['phrase']*12
 assert len({w['fr'] for w in x['words']})==20
 assert all(w['fr'].strip() and w['en'].strip() for w in x['words'])
 r=x['reading'];assert len(r['target'])==len(r['native'])==12
 assert [w['fr'] for w in x['words'][8:]]==r['target']
 assert [w['en'] for w in x['words'][8:]]==r['native']
 assert x['dialogue']==[f'{fr}|{en}' for fr,en in zip(r['target'],r['native'])]
 assert all(len(fr)>=40 and len(en)>=35 for fr,en in zip(r['target'],r['native']))
 assert not set(r['native'])&old_en,(n,set(r['native'])&old_en)
 assert not set(r['native'])&set(legacy['master-spanish-basics'][str(n)]['reading']['native'])
 assert not set(r['native'])&{line for prior_lesson in prior['lessons'] for line in prior_lesson['reading']['native']}
 assert not set(r['native'])&{line for prior_lesson in prior_1_3['lessons'] for line in prior_lesson['reading']['native']}
 assert not set(r['native'])&{line for prior_lesson in prior_4_6['lessons'] for line in prior_lesson['reading']['native']}
 assert len(x['checks'])==5
 assert {'recall','write','listening','comprehension','application'}=={c['type'] for c in x['checks']}
 for c in x['checks']:
  assert c['prompt'].strip() and c['answer'].strip()
  if c['type']=='listening':
   assert any(c['audioText'] in line for line in r['target']) and c['locale']=='fr-FR' and c['voiceStatus']=='script-only; no recorded audio'
  if c['type']=='write':assert any(c['answer'].casefold() in line.casefold() for line in r['target'])
 all_new_en+=r['native']
assert len(all_new_en)==len(set(all_new_en))==36
print('French 101 Master 10–12 redesign: 60 cards, 36 new aligned French/English Reader pairs, stable IDs, source hashes and no earlier English-line reuse; review/runtime/audio pending')
