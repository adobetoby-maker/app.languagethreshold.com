#!/usr/bin/env python3
"""Validate the source-pinned, unreleased Japanese Dinner Master 12 candidate."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DRAFT = Path(__file__).with_name('master-12-private-draft.json')
doc = json.loads(DRAFT.read_text())
source = doc['source']
for path_key, hash_key in (('curriculumPath', 'curriculumSHA256'), ('passagePath', 'passageSHA256')):
    path = ROOT / source[path_key]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == source[hash_key], path
curriculum = json.loads((ROOT / source['curriculumPath']).read_text())['lessons'][11]
passage = json.loads((ROOT / source['passagePath']).read_text())['lessons']['12']['passage']
lesson = doc['lessons'][0]
assert (doc['pairKey'], doc['locale'], lesson['stableId']) == (
    'Japanese:English', 'ja-JP', 'master-travel-dinner:12:ja-en')
assert (doc['reviewed'], doc['registered'], doc['readyForLearner'], doc['audio'], lesson['reviewed']) == (
    False, False, False, 'none', False)
assert (lesson['sourceTitleEnglish'], lesson['sourceObjectiveEnglish'], lesson['sourceSpeakingEnglish']) == (
    curriculum['title'], curriculum['objective'], curriculum['speaking'])
assert len(lesson['cards']) == len(curriculum['words']) == 22
assert [(row['en'], row['kind']) for row in lesson['cards']] == [
    (row['en'], row['kind']) for row in curriculum['words']]
assert len(lesson['reader']) == len(passage['native']) == 17
assert [row['en'] for row in lesson['reader']] == passage['native']
assert len(lesson['forms']) == 5
assert set(lesson['modes']) == {'see', 'recall', 'hear', 'type', 'say', 'write'}
for mode in lesson['modes'].values():
    card = curriculum['words'][mode['sourceCard'] - 1]
    assert mode['cueEnglish'] == card['en']
assert lesson['speaking']['wordBank'] == [row['ja'] for row in lesson['cards']]
for row in lesson['cards'] + lesson['reader']:
    assert row.get('ja') and row.get('en')
print('Japanese Dinner Master 12 private candidate: 22 exact-English cards, 17 aligned Reader turns, 5 forms, 6 modes, closed gates PASS')
