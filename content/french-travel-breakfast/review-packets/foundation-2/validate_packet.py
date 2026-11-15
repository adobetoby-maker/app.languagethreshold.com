import json,hashlib,subprocess
from pathlib import Path
p=Path(__file__).parent
x=json.loads((p/'owner-review-packet.json').read_text())
s=json.loads((p/'source-lesson.json').read_text())
r=json.loads((p/'source-reader.json').read_text())
assert x['stableLessonKey']=='foundation:2' and x['pair']=='fr-en'
assert all(x[k] is False for k in ('reviewed','registered','audioRegistered','audioListeningReviewed'))
assert len(x['cards'])==len(s['words'])==16 and len(x['reader'])==len(r['native'])==9
for i,(c,w) in enumerate(zip(x['cards'],s['words']),1):
 assert c['id']==f'foundation:2:word:{i}' and c['kind']==w['kind'] and c['english']==w['en'] and c['spanishSource']==w['es']
for i,(line,en,es) in enumerate(zip(x['reader'],r['native'],r['target']),1):
 assert line['id']==f'foundation:2:line:{i}' and line['english']==en and line['spanishSource']==es
assert set(m['mode'] for m in x['modes'])=={'see','recall','hear','type','say','write'}
lookup={v['id']:v for v in x['cards']+x['reader']}
for m in x['modes']:
 assert m['lessonKey']=='foundation:2' and m['readyForLearner'] is False and m['recordedAudioRequired'] is False
 assert m['sourceRef'] in lookup
 assert m['modelEnglish']==lookup[m['sourceRef']]['english'] and m['modelFrench']==lookup[m['sourceRef']]['french']
for form in x['forms']:
 line=x['reader'][form['readerLine']-1]
 assert form['englishPrompt']==line['english'] and form['frenchAnswer']==line['french'] and form['sourceLine']==line['spanishSource']
for filename,expected in [('source-course-full.json',x['sourceCourseSha256']),('source-reader-full.json',x['sourceReaderSha256'])]:
 assert hashlib.sha256((p/filename).read_bytes()).hexdigest()==expected
assert 'Café Luna' in x['reader'][0]['french']
assert 'chilaquiles' in x['reader'][2]['french']
assert '120 pesos' in x['reader'][7]['french']
assert not any(t in ' '.join(v['french'] for v in x['cards']+x['reader']) for t in ['Café Lumière','Lyon','euros','viennoiseries'])
print('PASS: exact source English/Spanish, stable IDs, card kinds, 16/9, forms, six exact-pair modes, pinned source SHA snapshots, closed gates')

assert all(x[k] is False for k in ('readyForLearner','learnerRuntimeEnabled','audioPlaybackEnabled','progressEnabled'))
