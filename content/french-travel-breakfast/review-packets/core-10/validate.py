import json, pathlib
p=pathlib.Path(__file__).parent
s=json.loads((p/'source.json').read_text())
c=json.loads((p/'candidate.json').read_text())
assert c['draftLessonKey']=='core:10' and c['stage']=='core' and c['n']==10
assert len(c['cards'])==len(s['words'])==16
assert len(c['reader'])==len(s['passage']['native'])==len(s['passage']['target'])==8
for i,(a,b) in enumerate(zip(c['cards'],s['words']),1):
 assert a['id']==f'core:10:word:{i}' and a['supportEnglish']==b['en'] and a['sourceSpanish']==b['es'] and a['kind']==b['kind'],(i,a,b)
 assert a['targetFrench'].strip()
for i,(a,e,sp) in enumerate(zip(c['reader'],s['passage']['native'],s['passage']['target']),1):
 assert a['id']==f'core:10:line:{i}' and a['supportEnglish']==e and a['sourceSpanish']==sp,(i,a,e,sp)
 assert a['targetFrench'].strip()
assert len(c['forms'])==len(s['verbs'])==5
assert [x['sourceVerb'] for x in c['forms']]==[x['infinitive'] for x in s['verbs']]
for f in c['forms']:
 assert f['id']==f"core:10:form:{f['sourceVerb']}" and f['forms']['vous'] and f['exampleFrench'] and f['explanationEnglish']
assert [m['mode'] for m in c['modes']]==['See','Recall','Hear','Type','Say','Write']
lookup={x['id']:x['targetFrench'] for x in c['cards']+c['reader']}
for i,m in enumerate(c['modes'],1):
 assert m['id']==f'core:10:mode:{i}'
 k=m.get('sourceCardId',m.get('sourceLineId'))
 assert k in lookup and m['targetFrench']==lookup[k] and m['promptEnglish'].strip(),m
h=c['modes'][2]
assert h['audioPending'] is True and h['displayWhenAudioPending'] is False
assert c['speaking']['openingFrench'].strip() and len(c['speaking']['objectivesEnglish'])>=3
assert c['gates']=={'reviewed':False,'learnerRegistered':False,'audioRegistered':False,'listeningReviewed':False,'playbackEnabled':False,'progressEnabled':False}
assert 'wife' not in json.dumps(c['speaking']).lower() and 'mother-in-law' not in json.dumps(c['speaking']).lower()
print('PASS: 16 exact source-English/Spanish cards, 8 aligned Reader lines, 5 forms, 6 source-linked modes, stable IDs, false gates')
