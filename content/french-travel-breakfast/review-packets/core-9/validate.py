import json
from pathlib import Path

p = Path(__file__).parent
s = json.loads((p / 'source.json').read_text())
c = json.loads((p / 'candidate.json').read_text())
assert len(c['cards']) == len(s['words']) == 17
assert len(c['reader']) == len(s['passage']['native']) == 9
for i, (card, source) in enumerate(zip(c['cards'], s['words']), 1):
    assert card['id'] == f'core:9:word:{i}'
    assert card['supportEnglish'] == source['en']
    assert card['sourceSpanish'] == source['es']
    assert card['kind'] == source['kind']
    assert card['targetFrench'].strip()
for i, (line, en, es) in enumerate(zip(c['reader'], s['passage']['native'], s['passage']['target']), 1):
    assert line['id'] == f'core:9:line:{i}'
    assert line['supportEnglish'] == en
    assert line['sourceSpanish'] == es
    assert line['targetFrench'].strip()
assert len(c['forms']) == len(s['verbs']) == 5
assert [x['sourceVerb'] for x in c['forms']] == [x['infinitive'] for x in s['verbs']]
assert len(c['modes']) == 6
assert {m['mode'] for m in c['modes']} == {'See','Recall','Hear','Type','Say','Write'}
lookup = {x['id']:x['targetFrench'] for x in c['cards']}
for mode in c['modes']:
    assert mode['sourceCardId'] in lookup
    assert mode['targetFrench'] == lookup[mode['sourceCardId']]
    assert mode['promptEnglish'].strip()
assert next(x for x in c['modes'] if x['mode'] == 'Hear')['audioPending'] is True
assert c['speaking']['openingFrench'].strip() and len(c['speaking']['objectivesEnglish']) >= 3
assert c['gates'] == {'reviewed':False,'learnerRegistered':False,'audioRegistered':False,'listeningReviewed':False,'playbackEnabled':False,'progressEnabled':False}
assert c['forms'][2]['forms']['je'] == "j'ai besoin de"
print('PASS: exact cards and Reader, stable IDs, 5 forms, 6 card-linked modes, false gates')
