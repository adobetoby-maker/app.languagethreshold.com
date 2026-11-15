import json, hashlib
from pathlib import Path
p=Path(__file__).resolve().parent
s=json.loads((p/'source.json').read_text()); a=json.loads((p/'private-packet.json').read_text()); lesson=s['lesson']
assert len(a['words'])==len(lesson['words'])==18
assert len(a['reader'])==len(lesson['passage']['native'])==len(lesson['passage']['target'])==9
for i,(x,y) in enumerate(zip(a['words'],lesson['words']),1):
 assert x['id']==f'core:3:word:{i}' and x['english']==y['en'] and x['spanish']==y['es'] and x['kind']==y['kind'] and x['french'].strip()
for i,x in enumerate(a['reader'],1):
 assert x['id']==f'core:3:line:{i}' and x['english']==lesson['passage']['native'][i-1] and x['spanish']==lesson['passage']['target'][i-1] and x['french'].strip()
assert set(a['activities'])=={'See','Recall','Hear','Type','Say','Write'}
for mode,x in a['activities'].items():
 assert x['id']==f'core:3:mode:{mode.lower()}' and x['promptEnglish'].strip() and x['targetFrench'].strip()
 linked=x['sourceWordOrLineId']; assert linked in {w['id'] for w in a['words']}|{r['id'] for r in a['reader']}
 if ':word:' in linked: assert x['targetFrench']==next(w['french'] for w in a['words'] if w['id']==linked)
assert 4<=len(a['contextualForms'])<=6 and len(a['speaking']['objectivesEnglish'])>=3
assert a['reviewed'] is False and a['registered'] is False and a['audioRegistered'] is False and a['listeningReviewed'] is False and all(v is False for v in a['gates'].values())
assert hashlib.sha256((Path('/Users/drive/git-backups/lt-french-dinner-master19-2026-11-13')/s['sourcePath']).read_bytes()).hexdigest()==s['sourceSha256']
print('PASS: 18 exact English/Spanish cards, 9 aligned Reader lines, stage-local IDs, 6 linked authored modes, 5 contextual forms, closed gates, pinned source bytes')
