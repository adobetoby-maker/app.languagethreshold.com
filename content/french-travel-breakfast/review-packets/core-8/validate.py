import json, pathlib
r=pathlib.Path(__file__).parent
s=json.loads((r/'source.json').read_text()); c=json.loads((r/'candidate.json').read_text())
assert len(c['cards'])==len(s['words'])==18
assert len(c['reader'])==len(s['passage']['native'])==9
for i,(a,b) in enumerate(zip(c['cards'],s['words']),1):
 assert a['id']==f'core:8:word:{i}' and a['supportEnglish']==b['en'] and a['kind']==b['kind'],(i,a,b)
 assert a['targetFrench'].strip() and a['sourceSpanish']==b['es']
for i,(a,b) in enumerate(zip(c['reader'],s['passage']['native']),1):
 assert a['id']==f'core:8:line:{i}' and a['supportEnglish']==b,(i,a,b)
 assert a['targetFrench'].strip() and a['sourceSpanish']==s['passage']['target'][i-1]
assert len(c['forms'])==len(s['verbs'])==5
assert [x['sourceVerb'] for x in c['forms']]==[x['infinitive'] for x in s['verbs']]
assert {m['mode'] for m in c['modes']}=={'See','Recall','Hear','Type','Say','Write'}
lookup={x['id']:x['targetFrench'] for x in c['cards']+c['reader']}
for m in c['modes']:
 k=m.get('sourceCardId',m.get('sourceLineId'));assert k in lookup and m['targetFrench']==lookup[k],m
 assert m['promptEnglish'].strip()
assert next(m for m in c['modes'] if m['mode']=='Hear').get('audioPending') is True
assert c['speaking']['openingFrench'].strip() and len(c['speaking']['objectivesEnglish'])>=3
assert c['gates']=={'reviewed':False,'learnerRegistered':False,'audioRegistered':False,'listeningReviewed':False,'playbackEnabled':False,'progressEnabled':False}
print('PASS: 18 exact source-English cards, 9 aligned Reader lines, 5 forms, 6 source-linked modes, false gates')
