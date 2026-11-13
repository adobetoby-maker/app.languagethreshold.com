#!/usr/bin/env python3
"""Validate the source-pinned, unreleased Japanese Dinner Master 20 candidate."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DRAFT = Path(__file__).with_name('master-20-private-draft.json')
doc = json.loads(DRAFT.read_text())
source = doc['source']
for path_key, hash_key in (('masterPath', 'masterSHA256'), ('contentPath', 'contentSHA256')):
    path = ROOT / source[path_key]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == source[hash_key], path
curriculum = json.loads((ROOT / source['masterPath']).read_text())['lessons'][19]
passage = json.loads((ROOT / source['contentPath']).read_text())['lessons']['20']['passage']
lesson = doc['lessons'][0]
assert (doc['pairKey'], doc['locale'], lesson['stableId']) == (
    'Japanese:English', 'ja-JP', 'master-travel-dinner:20:ja-en')
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
joined = ''.join(row['ja'] for row in lesson['reader'])
for required in ('6時', '7時前', 'ケブランタ', 'チルカーノ', 'ピーナッツ', '厨房に確認', '別皿', '清潔なカトラリー', '5歳', 'やけどがまったくない', '記録'):
    assert required in joined, required
assert lesson['cards'][7]['ja'] == 'ピーナッツ'
assert lesson['cards'][11]['ja'] == 'やけど'
print('Japanese Dinner Master 20 private source/identity/gate checks passed')
