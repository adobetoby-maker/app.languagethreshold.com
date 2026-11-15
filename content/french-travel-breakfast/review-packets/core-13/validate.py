import hashlib
import json
from pathlib import Path

p = Path(__file__).parent
source = json.loads((p / 'source.json').read_text())
candidate = json.loads((p / 'candidate.json').read_text())
assert len(source['words']) == len(candidate['cards']) == 18
assert len(source['passage']['native']) == len(source['passage']['target']) == len(candidate['reader']) == 9
for i, (item, original) in enumerate(zip(candidate['cards'], source['words']), 1):
    assert item['id'] == f'core:13:word:{i}'
    assert (item['supportEnglish'], item['sourceSpanish'], item['kind']) == (original['en'], original['es'], original['kind'])
    assert item['targetFrench'].strip()
for i, (item, en, es) in enumerate(zip(candidate['reader'], source['passage']['native'], source['passage']['target']), 1):
    assert item['id'] == f'core:13:line:{i}'
    assert (item['supportEnglish'], item['sourceSpanish']) == (en, es)
    assert item['targetFrench'].strip()
assert len(source['verbs']) == len(candidate['forms']) == 5
for item, original in zip(candidate['forms'], source['verbs']):
    assert item['sourceSpanishInfinitive'] == original['infinitive']
    assert item['supportEnglish'] == original['example']['native']
    assert all(item[k].strip() for k in ('frenchInfinitive', 'frenchExample', 'explanationEnglish'))
assert [x['mode'] for x in candidate['modes']] == ['See', 'Recall', 'Hear', 'Type', 'Say', 'Write']
by_id = {x['id']: x for x in candidate['cards']}
for item in candidate['modes']:
    assert item['sourceCardId'] in by_id
    assert item['frenchTarget'] == by_id[item['sourceCardId']]['targetFrench']
    assert item['prompt'].strip()
for name in ('Hear', 'Say'):
    item = next(x for x in candidate['modes'] if x['mode'] == name)
    assert item['audioPending'] is True and item['scriptOnly'] is True
assert candidate['speaking']['openingSpeaker'] == 'cook'
assert candidate['speaking']['openingFrench'].strip()
assert {'traveler', 'cook'} <= set(candidate['speaking']['roles'])
assert len(candidate['speaking']['objectivesEnglish']) >= 3
expected_gates = {'learnerVisible','audioApproved','progressTracking','reviewApproved','released','reviewed','registered','learnerRegistered','audioRegistered','listeningReviewed','playbackEnabled','scoringEnabled','progressWritesEnabled'}
assert set(candidate['gates']) == expected_gates
assert all(value is False for value in candidate['gates'].values())
current = Path('/Users/drive/git-backups/lt-french-dinner-master19-2026-11-13/public/lesson-content/es/travel-breakfast.json')
assert hashlib.sha256(current.read_bytes()).hexdigest() == (p / 'source-sha256.txt').read_text().strip()
print('PASS Core 13 source/card/Reader/ID/form/mode/speaking/gate structural parity; linguistic review remains open')
