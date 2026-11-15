import hashlib
import json
from pathlib import Path

P = Path(__file__).parent
S = json.loads((P / 'source.json').read_text())
C = json.loads((P / 'candidate.json').read_text())
assert C['id'] == 'core:12'
assert C['sourceRef']['path'] == 'public/lesson-content/es/travel-breakfast.json'
assert C['sourceRef']['revision'] == '1de396fdf4ca35a146908a5647a98e6615803572'
assert C['sourceRef']['lessonKey'] == '12'
assert C['priorDraftRef']['commit'] == '5cc469f5a54828c48238ccdf411238ed2e3e2c08'
assert len(C['cards']) == len(S['words']) == 18
assert len(C['reader']) == len(S['passage']['native']) == len(S['passage']['target']) == 9
for i, (card, source) in enumerate(zip(C['cards'], S['words']), 1):
    assert card['id'] == f'core:12:word:{i}'
    assert (card['supportEnglish'], card['sourceSpanish'], card['kind']) == (source['en'], source['es'], source['kind'])
    assert card['targetFrench'].strip()
for i, (line, en, es) in enumerate(zip(C['reader'], S['passage']['native'], S['passage']['target']), 1):
    assert line['id'] == f'core:12:line:{i}'
    assert (line['supportEnglish'], line['sourceSpanish']) == (en, es)
    assert line['targetFrench'].strip()
assert len(C['forms']) == len(S['verbs']) == 5
for form, source in zip(C['forms'], S['verbs']):
    assert form['sourceSpanishInfinitive'] == source['infinitive']
    assert form['supportEnglish'] == source['example']['native']
    assert all(form[key].strip() for key in ('frenchInfinitive', 'frenchExample', 'explanationEnglish'))
assert [mode['mode'] for mode in C['modes']] == ['See', 'Recall', 'Hear', 'Type', 'Say', 'Write']
cards = {card['id']: card for card in C['cards']}
assert len({mode['sourceCardId'] for mode in C['modes']}) == 6
for mode in C['modes']:
    assert mode['sourceCardId'] in cards
    assert mode['frenchTarget'] == cards[mode['sourceCardId']]['targetFrench']
    assert mode['prompt'].strip()
    assert mode['audioPending'] == (mode['mode'] in ('Hear', 'Say'))
assert C['modes'][2]['scriptOnly'] is True
assert C['speaking']['openingSpeaker'] == 'learner'
roles = {role if isinstance(role, str) else role['id'] for role in C['speaking']['roles']}
assert 'waitress' in roles and 'learner' in roles
assert len(C['speaking']['objectivesEnglish']) >= 5
assert all(value is False for value in C['gates'].values())
assert set(C['gates']) == {'learnerVisible','audioApproved','progressTracking','reviewApproved','released','reviewed','registered','learnerRegistered','audioRegistered','listeningReviewed','playbackEnabled','scoringEnabled','progressWritesEnabled'}
repo_source = Path('/Users/drive/git-backups/lt-french-dinner-master19-2026-11-13/public/lesson-content/es/travel-breakfast.json')
assert hashlib.sha256(repo_source.read_bytes()).hexdigest() == (P / 'source-sha256.txt').read_text().strip()
assert C['sourceRef']['sha256'] == (P / 'source-sha256.txt').read_text().strip()
print('PASS: Core 12 source-exact 18 cards/9 Reader, stable IDs, five forms, six linked modes, speaking, closed gates')
