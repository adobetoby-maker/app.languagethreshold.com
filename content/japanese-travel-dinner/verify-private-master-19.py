#!/usr/bin/env python3
"""Validate the source-pinned, unreleased Japanese Dinner Master 19 candidate."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DRAFT = Path(__file__).with_name('master-19-private-draft.json')
doc = json.loads(DRAFT.read_text())
source = doc['source']
for path_key, hash_key in (('masterPath', 'masterSHA256'), ('contentPath', 'contentSHA256')):
    path = ROOT / source[path_key]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == source[hash_key], path
curriculum = json.loads((ROOT / source['masterPath']).read_text())['lessons'][18]
passage = json.loads((ROOT / source['contentPath']).read_text())['lessons']['19']['passage']
lesson = doc['lessons'][0]
assert (doc['pairKey'], doc['locale'], lesson['stableId']) == (
    'Japanese:English', 'ja-JP', 'master-travel-dinner:19:ja-en')
assert (doc['reviewed'], doc['registered'], doc['readyForLearner'], doc['audio'], lesson['reviewed']) == (
    False, False, False, 'none', False)
assert (lesson['sourceTitleEnglish'], lesson['sourceObjectiveEnglish'], lesson['sourceSpeakingEnglish']) == (
    curriculum['title'], curriculum['objective'], curriculum['speaking'])
assert len(lesson['cards']) == len(curriculum['words']) == 23
assert [(row['en'], row['kind']) for row in lesson['cards']] == [
    (row['en'], row['kind']) for row in curriculum['words']]
assert len(lesson['reader']) == len(passage['native']) == 18
assert [row['en'] for row in lesson['reader']] == passage['native']
assert len(lesson['forms']) == 5
assert set(lesson['modes']) == {'see', 'recall', 'hear', 'type', 'say', 'write'}
for mode in lesson['modes'].values():
    card = curriculum['words'][mode['sourceCard'] - 1]
    assert mode['cueEnglish'] == card['en']
assert lesson['speaking']['wordBank'] == [row['ja'] for row in lesson['cards']]
assert all(row.get('readingKana') and not re.search(r'[\u3400-\u9fff]', row['readingKana']) for row in lesson['cards'])
for row in lesson['cards'] + lesson['reader']:
    assert row.get('ja') and row.get('en')
assert '24名' in lesson['reader'][1]['ja']
assert '30名' in lesson['reader'][9]['ja']
assert '20時30分' in ''.join(row['ja'] for row in lesson['reader'])
assert '21時' in ''.join(row['ja'] for row in lesson['reader'])
assert '23時30分' in ''.join(row['ja'] for row in lesson['reader'])
assert '長い' in lesson['cards'][5]['ja']
assert 'こしつ' == lesson['cards'][0]['readingKana']
print('Japanese Dinner Master 19 private source/identity/gate checks passed')
