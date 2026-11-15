import json,hashlib
from pathlib import Path
p=Path(__file__).parent
s=json.loads((p/'source-lesson.json').read_text()); c=json.loads((p/'candidate.json').read_text())
assert c['lessonKey']=='core:4' and c['stage']=='core' and c['n']==4
assert len(c['words'])==len(s['words'])==18
assert len(c['reader'])==len(s['passage']['native'])==len(s['passage']['target'])==9
for i,(x,y) in enumerate(zip(c['words'],s['words']),1):
 assert x['id']==f'core:4:word:{i}' and x['en']==y['en'] and x['es']==y['es'] and x['fr']
for i,(x,en,es) in enumerate(zip(c['reader'],s['passage']['native'],s['passage']['target']),1):
 assert x['id']==f'core:4:line:{i}' and x['en']==en and x['es']==es and x['fr']
assert [m['mode'] for m in c['modes']]==['See','Recall','Hear','Type','Say','Write']
for m in c['modes']:
 assert m['promptEnglish'] and m['targetFrench']
 mid=m.get('cardId') or m.get('lineId'); assert mid in {f'core:4:word:{i}' for i in range(1,19)}|{f'core:4:line:{i}' for i in range(1,10)}
for mode in ['Hear','Say']:
 m=next(x for x in c['modes'] if x['mode']==mode); assert m['blocked'] and m['scriptOnly']
assert next(x for x in c['modes'] if x['mode']=='See')['expectedEnglish']=='scrambled eggs'
assert next(x for x in c['modes'] if x['mode']=='Hear')['expectedEnglish']=='I want two scrambled eggs, please.'
assert len(c['contextualForms'])>=4 and c['speaking']['goals']
for x in c['contextualForms']: assert x['sourceLink']['id'] in {f'core:4:word:{i}' for i in range(1,19)}|{f'core:4:line:{i}' for i in range(1,10)}
for flag in ['reviewed','registered','audioRegistered','progressEnabled','learnerAvailable']: assert c[flag] is False
assert all(v is False for v in c['gates'].values())
print('PASS: 18 exact cards, 9 exact Reader pairs, stable IDs, 6 linked modes, closed gates')
