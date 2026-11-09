#!/usr/bin/env python3
"""Build a disabled French 101 Master candidate with source-pinned authored modes."""
from copy import deepcopy
from hashlib import sha256
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'content/french-basics/private-runtime-master-1-20.json'
OUT = ROOT / 'content/french-basics/private-runtime-master-1-20-authored-modes.json'
RANGES = ((1, 3), (4, 6), (7, 9), (10, 12), (13, 15), (16, 18), (19, 20))
MODES = ('see', 'recall', 'hear', 'type', 'say', 'write')

def digest(path):
    return sha256(path.read_bytes()).hexdigest()

base = json.loads(BASE.read_text())
assert (base['target'], base['native'], base['registered'], base['reviewed']) == ('French', 'English', False, False)
assert [item['n'] for item in base['support']] == list(range(1, 21))
result = deepcopy(base)
result['authoredModeSources'] = []
result['authoredModeCoverage'] = list(range(1, RANGES[-1][1] + 1))

for first, last in RANGES:
    path = ROOT / f'content/french-basics/private-master-{first}-{last}-mode-prompts-fr-en.json'
    fixture = json.loads(path.read_text())
    assert fixture['pairKey'] == 'French:English'
    assert fixture['sourceFile'] == str(BASE.relative_to(ROOT)) and fixture['sourceSha256'] == digest(BASE)
    assert fixture['registered'] is False and fixture['reviewed'] is False
    assert [item['lesson'] for item in fixture['lessons']] == list(range(first, last + 1))
    result['authoredModeSources'].append({'path': str(path.relative_to(ROOT)), 'sha256': digest(path),
                                         'basePath': fixture['sourceFile'], 'baseSha256': fixture['sourceSha256']})
    for entry in fixture['lessons']:
        n = entry['lesson']
        support = result['support'][n - 1]
        assert entry['stableLessonKey'] == support['stableLessonKey'] == f'master-french-basics:{n}'
        assert set(entry['modes']) == set(MODES) == set(support['modes'])
        reader = set(support['reader']['target'])
        cards = {card['target'] for card in support['cards']}
        grammar = set(support['grammarNotes'].get('model', {}).values())
        prompts = set()
        for mode in MODES:
            activity = entry['modes'][mode]
            allowed = reader if mode == 'see' else cards | grammar
            assert activity['targetText'] in allowed, (n, mode, activity['targetText'])
            prompt = activity['prompt'].strip()
            assert len(prompt) >= 35 and prompt not in prompts
            prompts.add(prompt)
            if mode == 'hear':
                assert activity['recordedAudio'] is False and support['modes'][mode]['recordedAudio'] is False
            support['modes'][mode]['authoredPrompt'] = {'prompt': prompt, 'targetText': activity['targetText']}

assert result['masterStageFragment'] == base['masterStageFragment']
assert all('authoredPrompt' not in item['modes']['see'] for item in result['support'][RANGES[-1][1]:])
assert result['registered'] is False and result['reviewed'] is False
serialized = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
if '--check' in sys.argv:
    assert OUT.read_text() == serialized, f'{OUT} needs regeneration'
else:
    OUT.write_text(serialized)
print(f'French 101 Master 1–{RANGES[-1][1]}: {RANGES[-1][1] * len(MODES)} authored prompts in disabled Master 1–20 candidate')
