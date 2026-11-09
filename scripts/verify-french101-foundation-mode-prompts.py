#!/usr/bin/env python3
"""Check private French→English Foundation mode prompts against pinned lesson text."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = [
    (ROOT / f'content/french-basics/private-foundation-{first}-{last}-mode-prompts-fr-en.json', range(first, last + 1))
    for first, last in ((1, 3), (4, 6), (7, 8), (9, 10))
]
MODES = {'see', 'recall', 'hear', 'type', 'say', 'write'}

for path, numbers in FIXTURES:
    fixture = json.loads(path.read_text())
    assert fixture['pairKey'] == 'French:English'
    assert fixture['reviewed'] is False and fixture['registered'] is False
    source = ROOT / fixture['sourceFile']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == fixture['sourceSha256']
    draft = json.loads(source.read_text())
    assert (draft['target'], draft['native'], draft['reviewed']) == ('French', 'English', False)
    assert [item['lesson'] for item in fixture['lessons']] == list(numbers)

    for entry, lesson in zip(fixture['lessons'], draft['lessons']):
        n = entry['lesson']
        assert n == lesson['n'] and entry['stableLessonKey'] == f'foundation-french-basics:{n}'
        assert set(entry['modes']) == MODES
        words = {word['fr'] for word in lesson['words']}
        lines = {line.split('|', 1)[0] for line in lesson['dialogue']}
        prompts = set()
        for mode, activity in entry['modes'].items():
            prompt = activity['prompt'].strip()
            assert len(prompt) >= 35 and prompt not in prompts, (n, mode)
            prompts.add(prompt)
            assert activity['targetText'] in (lines if mode == 'see' else words), (n, mode, activity['targetText'])
            if mode == 'hear':
                assert activity['recordedAudio'] is False
            else:
                assert 'recordedAudio' not in activity

print('French 101 Foundation 1–10: 60 source-pinned private mode prompts; reviewed:false; registered:false')
