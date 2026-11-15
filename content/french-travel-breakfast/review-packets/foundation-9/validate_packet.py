import json,hashlib
from pathlib import Path
p=Path(__file__).parent
x=json.loads((p/'owner-review-packet.json').read_text())
s=json.loads((p/'source-course-full.json').read_text())['lessons'][8]
r=json.loads((p/'source-reader-full.json').read_text())['lessons']['9']['passage']
assert x['stableLessonKey']=='foundation:9' and x['pair']=='fr-en'
assert all(x[k] is False for k in ('reviewed','registered','audioRegistered','audioListeningReviewed','readyForLearner','learnerRuntimeEnabled','audioPlaybackEnabled','progressEnabled'))
assert x['ownerOnlyCandidate'] is True
assert x['projectionStatus'].startswith('CONDITIONAL')
assert x['speakingObjectives']==[s['speaking']]
assert all('cueFrench' in m and m['modelFrench'] in m['cueFrench'] for m in x['modes'])
assert {m['modelEnglish'] for m in x['modes']} == {'the change','Could you bring me the bill, please?','Can you give me a glass of water?','Please bring me more cream.','Keep the change.','Anna: In cash, here are 200 pesos.'}
for short,canonical in [('haiku','claude-haiku-5-5'),('opus','claude-opus-5-5'),('fable','claude-fable-5-2')]:
 d=json.loads((p/f'{short}-output.json').read_text())
 assert d['is_error'] is False and canonical in d['modelUsage'] and d['modelUsage'][canonical]['canonicalModel']==canonical
assert hashlib.sha256((p/'source-course-full.json').read_bytes()).hexdigest()==x['sourceCourseSha256']
assert hashlib.sha256((p/'source-reader-full.json').read_bytes()).hexdigest()==x['sourceReaderSha256']
assert len(x['cards'])==len(s['words']) and len(x['reader'])==len(r['native'])
for i,(c,w) in enumerate(zip(x['cards'],s['words']),1):
 assert c['id']==f'foundation:9:word:{i}' and c['kind']==w['kind'] and c['english']==w['en'] and c['spanishSource']==w['es']
for i,(line,en,es) in enumerate(zip(x['reader'],r['native'],r['target']),1):
 assert line['id']==f'foundation:9:line:{i}' and line['english']==en and line['spanishSource']==es
assert set(m['mode'] for m in x['modes'])=={'see','recall','hear','type','say','write'}
lookup={v['id']:v for v in x['cards']+x['reader']}
for m in x['modes']:
 assert m['lessonKey']=='foundation:9' and m['readyForLearner'] is False and m['recordedAudioRequired'] is False
 assert m['sourceRef'] in lookup and m['modelEnglish']==lookup[m['sourceRef']]['english'] and m['modelFrench']==lookup[m['sourceRef']]['french']
assert 5<=len(x['forms'])<=6
for form in x['forms']:
 line=lookup[form['sourceRef']]
 assert line in x['reader'] and form['englishPrompt']==line['english'] and form['frenchAnswer']==line['french']
assert x['speakingSourceEnglish']==s['speaking']
assert x['sourceVerbParadigms']==json.loads((p/'source-reader-full.json').read_text())['lessons']['9']['verbs']
assert x['frenchVerbParadigmsAuthored'] is bool(x['frenchVerbParadigms'])
if x['frenchVerbParadigmsAuthored']:
 assert len(x['frenchVerbParadigms'])==len(x['sourceVerbParadigms'])
 assert [v['sourceInfinitive'] for v in x['frenchVerbParadigms']]==[v['infinitive'] for v in x['sourceVerbParadigms']]
 assert all(set(v['forms'])=={'je','tu','il','nous','vous','ils'} for v in x['frenchVerbParadigms'])
assert not any(t in ' '.join(v['french'] for v in x['cards']+x['reader']) for t in ['Lyon','Grenoble'])
print('PASS: exact pinned source English/Spanish and verb source, stable IDs, card/Reader counts, forms, six exact-pair modes, closed gates')
