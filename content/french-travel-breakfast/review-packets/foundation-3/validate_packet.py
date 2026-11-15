import json,hashlib
from pathlib import Path
p=Path(__file__).parent
x=json.loads((p/'owner-review-packet.json').read_text())
s=json.loads((p/'source-course-full.json').read_text())['lessons'][2]
r=json.loads((p/'source-reader-full.json').read_text())['lessons']['3']['passage']
assert x['stableLessonKey']=='foundation:3' and x['pair']=='fr-en'
assert all(x[k] is False for k in ('reviewed','registered','audioRegistered','audioListeningReviewed'))
assert hashlib.sha256((p/'source-course-full.json').read_bytes()).hexdigest()==x['sourceCourseSha256']
assert hashlib.sha256((p/'source-reader-full.json').read_bytes()).hexdigest()==x['sourceReaderSha256']
assert len(x['cards'])==len(s['words'])==14 and len(x['reader'])==len(r['native'])==9
for i,(c,w) in enumerate(zip(x['cards'],s['words']),1):
 assert c['id']==f'foundation:3:word:{i}' and c['kind']==w['kind'] and c['english']==w['en'] and c['spanishSource']==w['es']
for i,(line,en,es) in enumerate(zip(x['reader'],r['native'],r['target']),1):
 assert line['id']==f'foundation:3:line:{i}' and line['english']==en and line['spanishSource']==es
assert set(m['mode'] for m in x['modes'])=={'see','recall','hear','type','say','write'}
lookup={v['id']:v for v in x['cards']+x['reader']}
for m in x['modes']:
 assert m['lessonKey']=='foundation:3' and m['readyForLearner'] is False and m['recordedAudioRequired'] is False
 assert m['sourceRef'] in lookup
 assert m['modelEnglish']==lookup[m['sourceRef']]['english'] and m['modelFrench']==lookup[m['sourceRef']]['french']
for form in x['forms']:
 line=lookup[form['sourceRef']]
 assert line in x['reader'] and form['englishPrompt']==line['english'] and form['frenchAnswer']==line['french']
assert 'Oaxaca' in x['reader'][0]['french'] and 'chilaquiles' in x['reader'][6]['french']
assert 'prêt(e)' not in str(x['cards']+x['reader']) and 'prêt à commander' in x['reader'][5]['french']
assert not any(t in ' '.join(v['french'] for v in x['cards']+x['reader']) for t in ['Lyon','brioche'])
print('PASS: exact pinned source English/Spanish, stable IDs, 14/9, five Reader forms, six exact-pair modes, closed gates')

assert all(x[k] is False for k in ('readyForLearner','learnerRuntimeEnabled','audioPlaybackEnabled','progressEnabled'))
