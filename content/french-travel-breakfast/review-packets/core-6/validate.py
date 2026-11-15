import json,hashlib,pathlib
b=pathlib.Path(__file__).parent
inp=json.loads((b/'input.json').read_text());s=inp['source'];old=inp['privateDraft'];c=json.loads((b/'candidate.json').read_text())
p=pathlib.Path('/Users/drive/git-backups/lt-french-dinner-master19-2026-11-13')/inp['sourcePath']
assert hashlib.sha256(p.read_bytes()).hexdigest()==inp['sourceSha256']
assert len(c['cards'])==len(s['words'])==len(old['words'])==16
assert len(c['reader']['turns'])==len(s['passage']['native'])==8
for n,(x,y,z) in enumerate(zip(c['cards'],s['words'],old['words']),1):
 assert x['id']==z['id']==f'core:6:word:{n}'
 assert x['label']==x['sourceEnglish']==y['en']==z['sourceEnglish']==z['supportEnglish']
 assert x['targetFrench'].strip() and x['kind']==y['kind']
for n,(x,y) in enumerate(zip(c['reader']['turns'],s['passage']['native']),1):
 assert x['id']==f'core:6:line:{n}' and x['supportEnglish']==y and x['targetFrench'].strip()
assert c['reader']['turns'][7]['targetFrench']=='Je confirme seulement les ingrédients et je ne demande pas de conseil médical.'
assert 'd’après la cuisine' in c['reader']['turns'][4]['targetFrench'] or "d'après la cuisine" in c['reader']['turns'][4]['targetFrench']
ids={x['id']:x for x in c['cards']+c['reader']['turns']}
assert len(c['forms'])>=3
for f in c['forms']:
 assert f['id'].startswith('core:6:form:') and f['form'] and f['englishExplanation'] and f['cardIds']
 assert all(i in ids for i in f['cardIds'])
 assert any(f['french']==ids[i]['targetFrench'] for i in f['cardIds'])
assert list(c['modes'])==['see','recall','hear','type','say','write']
for k,v in c['modes'].items():
 assert v['id']==f'core:6:mode:{k}' and v['prompt'] and v['cardId'] in ids
 assert v['answerFrench']==ids[v['cardId']]['targetFrench']
assert c['modes']['hear'].get('playable') is False
assert len(set(x['prompt'] for x in c['modes'].values()))==6
sp=c['speaking'];assert sp['staffOpening']['french'] and sp['staffOpening']['english'] and len(sp['objectives'])>=3
for n,o in enumerate(sp['objectives'],1):
 assert o['id']==f'core:6:objective:{n}' and o['cardId'] in ids and o['targetFrench']==ids[o['cardId']]['targetFrench']
assert c['draftLessonKey']=='core:6' and c['stage']=='core' and c['n']==6
assert c['gates']=={'reviewed':False,'requiresQualifiedReview':True,'registered':False,'playbackEnabled':False,'audioEnabled':False,'progressGate':False,'qualifiedApprovalAsserted':False}
print('PASS exact source/cards/Reader/IDs/forms/six authored mode proposals/speaking/closed gates/SHA')
