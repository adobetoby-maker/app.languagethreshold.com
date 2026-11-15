import json,hashlib,pathlib,sys
P=pathlib.Path(__file__).parent
S=json.loads((P/'source.json').read_text())
C=json.loads((P/'candidate.json').read_text())
assert len(C['cards'])==len(S['words'])==17
assert len(C['reader'])==len(S['passage']['native'])==len(S['passage']['target'])==9
for i,(x,y) in enumerate(zip(C['cards'],S['words']),1):
 assert x['id']==f'core:11:word:{i}', (i,x['id'])
 assert x['supportEnglish']==y['en'] and x['sourceSpanish']==y['es'] and x['kind']==y['kind'],i
 assert x['targetFrench'].strip(),i
for i,(x,en,es) in enumerate(zip(C['reader'],S['passage']['native'],S['passage']['target']),1):
 assert x['id']==f'core:11:line:{i}'
 assert x['supportEnglish']==en and x['sourceSpanish']==es and x['targetFrench'].strip(),i
assert len(C['forms'])==len(S['verbs'])==5
for x,y in zip(C['forms'],S['verbs']):
 assert x['sourceSpanishInfinitive']==y['infinitive'] and x['supportEnglish']==y['example']['native']
 assert all(x[k].strip() for k in ['frenchInfinitive','frenchExample','explanationEnglish'])
assert [x['mode'] for x in C['modes']]==['See','Recall','Hear','Type','Say','Write']
byid={x['id']:x for x in C['cards']}
for m in C['modes']:
 assert m['sourceCardId'] in byid
 assert m['frenchTarget']==byid[m['sourceCardId']]['targetFrench']
 assert m['prompt'].strip()
assert C['modes'][2]['audioPending'] is True and C['modes'][2]['scriptOnly'] is True
assert C['speaking']['openingSpeaker']=='barista' and C['speaking']['openingFrench'].strip()
assert len(C['speaking']['objectivesEnglish'])>=3
assert all(v is False for v in C['gates'].values())
sourcepath=pathlib.Path('/Users/drive/git-backups/lt-french-dinner-master19-2026-11-13/public/lesson-content/es/travel-breakfast.json')
assert hashlib.sha256(sourcepath.read_bytes()).hexdigest()==(P/'source-sha256.txt').read_text().strip()
print('PASS Core 11: exact source cards/Reader, stable IDs, forms, six linked modes, speaking and closed gates')
