import json,pathlib,hashlib
p=pathlib.Path(__file__).parent
s=json.load(open(p/'source-lesson.json'));r=json.load(open(p/'source-reader.json'));x=json.load(open(p/'owner-review-packet.json'))
assert x['stage']=='foundation' and x['lessonNumber']==10 and x['stableLessonKey']=='foundation:10'
assert x['reviewed'] is False
for k in ('registered','audioRegistered','audioListeningReviewed','readyForLearner','learnerRuntimeEnabled','audioPlaybackEnabled','progressEnabled'):
 assert x[k] is False,k
assert [y['english'] for y in x['cards']]==[y['en'] for y in s['words']]
assert [y['kind'] for y in x['cards']]==[y['kind'] for y in s['words']]
assert [y['english'] for y in x['reader']]==r['passage']['native']
assert len(x['cards'])==15 and len(x['reader'])==9
assert len(set(y['id'] for y in x['cards']+x['reader']))==24
assert set(y['mode'] for y in x['modes'])=={'see','recall','hear','type','say','write'}
byid={y['id']:y for y in x['cards']+x['reader']}
for m in x['modes']:
 y=byid[m['sourceRef']];assert m['modelEnglish']==y['english'] and m['modelFrench']==y['french'];assert m['readyForLearner'] is False
for f in x['forms']:
 y=byid[f['sourceRef']];assert y in x['reader'] and f['englishPrompt']==y['english'] and f['frenchAnswer']==y['french']
assert 'Café Luna' in x['reader'][0]['english'] and 'Café Luna' in x['reader'][0]['french']
assert 'English and Spanish' in x['reader'][1]['english']
assert 'anglais' in x['reader'][1]['french'] and 'espagnol' in x['reader'][1]['french']
assert 'chilaquiles' in x['reader'][2]['french']
assert 'tortillas' in x['reader'][6]['french'] and 'poulet' in x['reader'][6]['french']
assert x['sourceCourseSha256']==json.load(open(p/'source-metadata.json'))['courseSHA256']
assert x['sourceReaderSha256']==json.load(open(p/'source-metadata.json'))['readerSHA256']
print('PASS: 15 exact-English cards, nine Reader lines, six exact modes, forms, false gates and pinned hashes')
