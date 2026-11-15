import hashlib
import json
from pathlib import Path

P = Path(__file__).parent
SOURCE_FILE = Path('/Users/drive/git-backups/lt-french-dinner-master19-2026-11-13/public/lesson-content/es/travel-breakfast.json')
source_bytes = SOURCE_FILE.read_bytes()
assert hashlib.sha256(source_bytes).hexdigest() == (P / 'source-sha256.txt').read_text().strip()
source = json.loads(source_bytes)['lessons']['14']
assert source == json.loads((P / 'source.json').read_text())
candidate = json.loads((P / 'candidate.json').read_text())
old = json.loads((P / 'private-475-lesson.json').read_text())

assert len(candidate['cards']) == len(source['words']) == len(old['words']) == 18
for index, (card, word, old_word) in enumerate(zip(candidate['cards'], source['words'], old['words']), 1):
    assert card['id'] == f'core:14:word:{index}'
    assert card['supportEnglish'] == word['en'] == old_word['en']
    assert card['sourceSpanish'] == word['es']
    assert card['kind'] == word['kind'] == old_word['kind']
    assert card['targetFrench'].strip()

assert len(candidate['reader']) == len(source['passage']['native']) == len(source['passage']['target']) == 9
for index, (line, en, es, old_en) in enumerate(zip(candidate['reader'], source['passage']['native'], source['passage']['target'], old['passage']['english']), 1):
    assert line['id'] == f'core:14:line:{index}'
    assert line['supportEnglish'] == en == old_en
    assert line['sourceSpanish'] == es
    assert line['targetFrench'].strip()

assert len(candidate['forms']) == len(source['verbs']) == 5
for form, verb in zip(candidate['forms'], source['verbs']):
    assert form['sourceSpanishInfinitive'] == verb['infinitive']
    assert form['supportEnglish'] == verb['example']['native']
    assert all(form[field].strip() for field in ('frenchInfinitive', 'frenchExample', 'explanationEnglish'))

assert [mode['mode'] for mode in candidate['modes']] == ['See', 'Recall', 'Hear', 'Type', 'Say', 'Write']
cards_by_id = {card['id']: card for card in candidate['cards']}
assert len(cards_by_id) == 18
assert len({mode['sourceCardId'] for mode in candidate['modes']}) == 6
for mode in candidate['modes']:
    assert mode['sourceCardId'] in cards_by_id
    assert mode['targetFrench'] == cards_by_id[mode['sourceCardId']]['targetFrench']
    assert mode['promptEnglish'].strip()
assert candidate['modes'][2]['audioPending'] is True
assert candidate['modes'][2]['scriptOnly'] is True
assert candidate['modes'][4]['audioPending'] is True
assert candidate['speaking']['openingSpeaker'] == 'waitress'
assert candidate['speaking']['openingFrench'].strip()
assert len(candidate['speaking']['objectivesEnglish']) >= 3
assert candidate['speaking']['closingFrench'].strip()
assert all(value is False for value in candidate['gates'].values())
assert set(candidate['gates']) >= {
    'learnerVisible', 'audioApproved', 'progressTracking', 'reviewApproved',
    'released', 'reviewed', 'registered', 'learnerRegistered', 'audioRegistered',
    'listeningReviewed', 'playbackEnabled', 'scoringEnabled', 'progressWritesEnabled'
}
print('PASS: pinned source, exact ordered cards and Reader, stable IDs, five forms, six linked activities, speaking, closed gates')
