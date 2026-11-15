import json, hashlib, pathlib
b=pathlib.Path(__file__).parent
inp=json.loads((b/'input.json').read_text());s=inp['source'];d=inp['privateDraft'];c=json.loads((b/'candidate.json').read_text())
assert len(c['cards'])==len(s['words'])==16
assert len(c['reader']['turns'])==len(s['passage']['native'])==9
for i,(x,y,z) in enumerate(zip(c['cards'],s['words'],d['words']),1):
 assert x['id']==z['id']==f'core:5:word:{i}'
 assert x['supportEnglish']==y['en']==z['supportEnglish']==z['sourceEnglish']
 assert x['targetFrench'].strip() and x['kind']==y['kind']
for i,(x,y,z) in enumerate(zip(c['reader']['turns'],s['passage']['native'],d['reader']),1):
 assert x['id']==z['id']==f'core:5:line:{i}'
 assert x['supportEnglish']==y==z['supportEnglish']
 assert x['targetFrench'].strip()
assert len(c['forms'])>=3
ids={x['id'] for x in c['cards']+c['reader']['turns']}
for f in c['forms']:
 assert f['form'] and f['explanation'] and f['contextIds']
 assert all(i in ids for i in f['contextIds'])
 assert any(f['form'].casefold() in x['targetFrench'].casefold() for x in c['cards']+c['reader']['turns'] if x['id'] in f['contextIds'])
modes=c['modes'];assert [x['mode'] for x in modes]==['See','Recall','Hear','Type','Say','Write']
for x in modes:
 card=next(y for y in c['cards'] if y['id']==x['cardId'])
 assert x['answer']==card['targetFrench'] or (x['mode']=='See' and x['answer']==card['targetFrench'])
 assert x['prompt'] and x.get('audio') is False
assert modes[2].get('playbackEnabled') is False
assert len(set(x['prompt'] for x in modes))==6
sp=c['speaking'];assert sp['id']=='core:5:speaking:1' and sp['openingFrench'] and len(sp['objectives'])>=3
for x in sp['objectives']:
 assert all(y in {z['id'] for z in c['cards']} for y in x['cardIds'])
g=c['gates'];assert g=={'reviewed':False,'requiresQualifiedReview':True,'registered':False,'playbackEnabled':False,'audioEnabled':False,'progressGate':False,'qualifiedApprovalAsserted':False}
assert c['draftLessonKey']=='core:5' and c['stage']=='core' and c['n']==5
p=pathlib.Path('/Users/drive/git-backups/lt-french-dinner-master19-2026-11-13')/inp['sourceFile']
assert hashlib.sha256(p.read_bytes()).hexdigest()==inp['currentSourceSHA256']
print('PASS exact source/cards/Reader/IDs/forms/modes/speaking/closed gates/source SHA')
