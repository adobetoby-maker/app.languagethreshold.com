import json, hashlib
from pathlib import Path
p=Path(__file__).resolve().parent
s=json.loads((p/'source.json').read_text());a=json.loads((p/'private-packet.json').read_text())
source_path=Path('/Users/drive/git-backups/lt-french-dinner-master19-2026-11-13/public/lesson-content/es/travel-breakfast.json')
assert hashlib.sha256(source_path.read_bytes()).hexdigest()==a['sourceSha256']
assert a['lessonId']=='core:7' and a['stage']=='core' and a['lessonNumber']==7
assert len(a['cards'])==len(s['words'])==16
for i,(x,y) in enumerate(zip(a['cards'],s['words']),1):
 assert x['id']==f'core:7:word:{i}' and x['en']==y['en'] and x['es']==y['es'] and x['kind']==y['kind'] and x['fr'].strip()
assert len(a['reader'])==len(s['passage']['native'])==len(s['passage']['target'])==9
for i,x in enumerate(a['reader'],1):
 assert x['id']==f'core:7:line:{i}' and x['english']==s['passage']['native'][i-1] and x['spanish']==s['passage']['target'][i-1] and x['french'].strip()
assert len(a['forms'])==4
assert [f['sourceInfinitiveSpanish'] for f in a['forms']]==[v['infinitive'] for v in s['verbs']]
for f,v in zip(a['forms'],s['verbs']):assert f['exampleEnglish']==v['example']['native'] and f['exampleFrench'].strip()
assert {x['mode'] for x in a['modes']}=={'See','Recall','Hear','Type','Say','Write'}
for x in a['modes']:
 assert x['id']==f"core:7:mode:{x['mode'].lower()}"
 assert x['sourceEnglish']==a['cards'][x['sourceCardIndex']]['en']
 assert x['targetFrench']==a['cards'][x['sourceCardIndex']]['fr']
 assert x['instructionEnglish'].strip()
 assert x['scriptOnly'] is (x['mode'] in ('Hear','Say'))
assert len(a['speaking']['objectivesEnglish'])>=3
assert all(v is False for v in a['gates'].values()) and len(a['gates'])==8
assert a['reviewed'] is False and a['registered'] is False and a['audioRegistered'] is False and a['listeningReviewed'] is False
assert 'Lyon' not in json.dumps(a,ensure_ascii=False) and 'tartines' not in json.dumps(a,ensure_ascii=False)
print('PASS: source SHA, 16 exact bilingual cards, 9 aligned Reader lines, four source-linked forms, six authored exact-card modes, stage-local IDs, false gates')
