import json
from pathlib import Path
p=Path(__file__).parent
x=json.loads((p/'source.json').read_text())
s=x['sourceLesson']; old=x['priorPrivateDraft']
assert old['draftLessonKey']=='core:1'
assert len(s['words'])==len(old['words'])==15
assert len(s['passage']['native'])==len(old['reader'])==9
assert [w['en'] for w in s['words']]==[w['sourceEnglish'] for w in old['words']]
assert s['passage']['native']==[r['supportEnglish'] for r in old['reader']]
assert [w['id'] for w in old['words']]==[f'core:1:word:{i}' for i in range(1,16)]
assert [r['id'] for r in old['reader']]==[f'core:1:line:{i}' for i in range(1,10)]
assert not old['reviewed'] and not old['registered']
print('PASS prior private Core1 exact source English, stable IDs, gates false')
a=json.loads((p/'candidate-haiku.json').read_text())
assert [c['id'] for c in a['cards']]==[w['id'] for w in old['words']]
assert [c['sourceEnglish'] for c in a['cards']]==[w['en'] for w in s['words']]
assert [r['id'] for r in a['reader']['lines']]==[r['id'] for r in old['reader']]
assert [r['supportEnglish'] for r in a['reader']['lines']]==s['passage']['native']
assert sorted(k['mode'].lower() for k in a['activities'])==sorted(['see','recall','hear','type','say','write'])
assert len(a['contextualForms'])==3
assert all(v is False for v in a['gates'].values())
print('PASS Haiku candidate exact English source, IDs, six activities, three forms and false gates')
a=json.loads((p/'candidate-fable.json').read_text())
assert a['draftLessonKey']=='core:1'
assert [w['id'] for w in a['words']]==[w['id'] for w in old['words']]
assert [w['sourceEnglish'] for w in a['words']]==[w['en'] for w in s['words']]
assert [w['supportEnglish'] for w in a['words']]==[w['en'] for w in s['words']]
assert [r['id'] for r in a['reader']]==[r['id'] for r in old['reader']]
assert [r['sourceSpanish'] for r in a['reader']]==s['passage']['target']
assert [r['supportEnglish'] for r in a['reader']]==s['passage']['native']
assert set(v['mode'] for v in a['activities'])=={'see','recall','hear','type','say','write'}
assert all(v is False for v in a['gates'].values()) and not a['reviewed'] and not a['registered']
assert a['requiresQualifiedReview'] is True
assert len(a['contextualForms'])==4
allids={w['id'] for w in a['words']}|{r['id'] for r in a['reader']}
assert all(set(v['linkedIds'])<=allids for v in a['activities'])
assert a['candidateModeInputs']==old['candidateModeInputs']
for v in a['activities']:
 ref=v['linkedIds'][0];row=next((z for z in a['words']+a['reader'] if z['id']==ref))
 english=row.get('sourceEnglish',row.get('supportEnglish'))
 assert v.get('promptEnglish',v.get('answerEnglish',english))==english
 assert v.get('answerFrench',v.get('promptFrench',v.get('promptFrenchAudioText',row['targetFrench'])))==row['targetFrench']
print('PASS Fable candidate exact Spanish/English source, IDs, activity links, false gates')
