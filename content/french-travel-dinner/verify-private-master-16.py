#!/usr/bin/env python3
"""Fail closed on French Dinner Master 16 source, identity, and learner gates."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
draft = json.loads((ROOT / 'content/french-travel-dinner/master-16-private-draft.json').read_text())
source = draft['source']
for path_key, hash_key in (('curriculumPath', 'curriculumSHA256'), ('passagePath', 'passageSHA256')):
    assert hashlib.sha256((ROOT / source[path_key]).read_bytes()).hexdigest() == source[hash_key]
original = json.loads((ROOT / source['curriculumPath']).read_text())['lessons'][15]
passage = json.loads((ROOT / source['passagePath']).read_text())['lessons']['16']['passage']
assert len(draft['lessons']) == 1
lesson = draft['lessons'][0]
assert lesson['n'] == 16 and lesson['stableId'] == 'master-travel-dinner:16:fr-en'
assert (lesson['sourceTitleEnglish'], lesson['sourceObjectiveEnglish'], lesson['sourceSpeakingEnglish']) == (original['title'], original['objective'], original['speaking'])
assert lesson['title'] == original['title'] and lesson['objective'] == original['objective']
assert [(c['en'], c['kind']) for c in lesson['cards']] == [(c['en'], c['kind']) for c in original['words']]
assert [x['en'] for x in lesson['reader']] == passage['native']
assert len(lesson['cards']) == 23 and len(lesson['reader']) == 18 and len(lesson['forms']) == 5
assert set(lesson['modes']) == {'see', 'recall', 'hear', 'type', 'say', 'write'}
for mode in lesson['modes'].values():
    assert mode['cueEnglish'] == original['words'][mode['sourceCard'] - 1]['en']
assert all(c['fr'].strip() for c in lesson['cards'])
assert all(lesson['modes'][mode]['sourceCard'] >= 1 for mode in lesson['modes'])
assert all(lesson['modes'][mode]['cueEnglish'] == original['words'][lesson['modes'][mode]['sourceCard'] - 1]['en'] for mode in lesson['modes'])
assert all(line['fr'].strip() for line in lesson['reader'])
assert draft['pairKey'] == 'French:English' and draft['locale'] == 'fr-FR'
assert draft['reviewed'] is False and draft['registered'] is False and draft['readyForLearner'] is False and draft['audio'] == 'none'
assert lesson['reviewed'] is False
print('French Dinner Master 16 private source/identity/gate checks passed')

assert 'trois exemplaires' in ' '.join(x['fr'] for x in lesson['reader'])
assert '60 euros' in ' '.join(x['fr'] for x in lesson['reader'])
assert '10 jours ouvrés' in ' '.join(x['fr'] for x in lesson['reader'])
assert 'vendredi par courriel' in ' '.join(x['fr'] for x in lesson['reader'])
assert 'passeport' in ' '.join(x['fr'] for x in lesson['reader'])
