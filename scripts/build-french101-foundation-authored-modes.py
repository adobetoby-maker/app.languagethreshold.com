#!/usr/bin/env python3
"""Derive an unregistered French 101 Foundation runtime candidate with authored modes."""
import hashlib
import json
import sys
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'content/french-basics/private-runtime-foundation-1-10.json'
OUT = ROOT / 'content/french-basics/private-runtime-foundation-1-10-authored-modes.json'
MODES = ('see', 'recall', 'hear', 'type', 'say', 'write')
RANGES = ((1, 3), (4, 6), (7, 8), (9, 10))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


base = json.loads(BASE.read_text())
assert base['privatePilot'] is True and base['registered'] is False and base['reviewed'] is False
assert (base['stageFile']['language'], base['stageFile']['nativeLanguage'], base['stageFile']['reviewed']) == ('French', 'English', False)
assert [lesson['n'] for lesson in base['support']] == list(range(1, 11))
result = deepcopy(base)
result['authoredModeSources'] = []

for first, last in RANGES:
    path = ROOT / f'content/french-basics/private-foundation-{first}-{last}-mode-prompts-fr-en.json'
    fixture = json.loads(path.read_text())
    source = ROOT / fixture['sourceFile']
    assert fixture['pairKey'] == 'French:English' and fixture['reviewed'] is False and fixture['registered'] is False
    assert digest(source) == fixture['sourceSha256']
    assert [entry['lesson'] for entry in fixture['lessons']] == list(range(first, last + 1))
    result['authoredModeSources'].append({'path': str(path.relative_to(ROOT)), 'sha256': digest(path),
                                         'sourcePath': fixture['sourceFile'], 'sourceSha256': fixture['sourceSha256']})
    for entry in fixture['lessons']:
        n = entry['lesson']
        support = result['support'][n - 1]
        assert support['stableLessonKey'] == entry['stableLessonKey'] == f'foundation-french-basics:{n}'
        assert support['reader']['language'] == 'French' and support['reader']['nativeLanguage'] == 'English'
        assert set(entry['modes']) == set(MODES) == set(support['modes'])
        cards = {card['target'] for card in support['cards']}
        reader = {line['target'] for line in support['reader']['sentences']}
        for mode in MODES:
            activity = entry['modes'][mode]
            assert activity['targetText'] in (reader if mode == 'see' else cards), (n, mode, activity['targetText'])
            assert activity['prompt'].strip()
            if mode == 'hear':
                assert activity['recordedAudio'] is False and support['modes'][mode]['recordedAudio'] is False
            support['modes'][mode]['authoredPrompt'] = {'prompt': activity['prompt'], 'targetText': activity['targetText']}

assert all(all('authoredPrompt' in item['modes'][mode] for mode in MODES) for item in result['support'])
assert result['stageFile'] == base['stageFile']
assert result['registered'] is False and result['reviewed'] is False
serialized = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
if '--check' in sys.argv:
    assert OUT.read_text() == serialized, f'{OUT} needs regeneration'
else:
    OUT.write_text(serialized)
print('French 101 Foundation 1–10: 60 authored mode prompts in unregistered runtime candidate')
