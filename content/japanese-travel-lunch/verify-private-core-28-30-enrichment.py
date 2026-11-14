#!/usr/bin/env python3
"""Check Japanese Lunch Core 28–30 owner-only enrichment against its pinned draft."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PATH = Path('content/japanese-travel-lunch/private-core-28-30-enrichment.json')
payload = json.loads((ROOT / PATH).read_text())
source_path = ROOT / payload['sourcePath']
source = json.loads(source_path.read_text())
assert payload['sourcePath'] == 'content/japanese-travel-lunch/core-28-30-draft.json'
assert hashlib.sha256(source_path.read_bytes()).hexdigest() == payload['sourceSha256']
assert (payload['pairKey'], payload['reviewed'], payload['registered'], payload['readyForLearner']) == ('Japanese:English', False, False, False)
assert [l['stableId'] for l in payload['lessons']] == [f'travel-lunch:{n}:ja-en' for n in (28, 29, 30)]
for authored, lesson in zip(payload['lessons'], source['lessons'], strict=True):
    assert authored['stableId'] == lesson['stableId']
    card_ja = {card['ja'] for card in lesson['cards']}
    model_pairs = {(card['ja'], card['en']) for card in lesson['cards']} | {(turn['ja'], turn['en']) for turn in lesson['reader']}
    assert len(authored['forms']) == 3
    assert len(authored['speakingObjectives']) >= 3
    assert 4 <= len(authored['wordBank']) <= 8
    assert len(set(authored['wordBank'])) == len(authored['wordBank'])
    assert set(authored['wordBank']) <= card_ja
    for form in authored['forms']:
        assert all(form[key].strip() for key in ('label', 'japanese', 'english', 'explanation'))
        assert (form['japanese'], form['english']) in model_pairs, form['japanese']
    assert all(item.strip() for item in authored['speakingObjectives'])
print('Japanese Lunch Core 28–30 private enrichment source/identity/gate checks passed')
