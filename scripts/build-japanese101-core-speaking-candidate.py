#!/usr/bin/env python3
"""Build a disabled Japanese 101 Core speaking candidate from source-pinned missions."""
from copy import deepcopy
from hashlib import sha256
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/japanese-basics/core.json'
PRACTICE = ROOT / 'src/data/japanese-basics-practice.json'
OUT = ROOT / 'content/japanese-basics/private-core-practice-speaking-ja-en.json'
RANGES = ((1, 10), (11, 20), (21, 30))

def digest(path):
    return sha256(path.read_bytes()).hexdigest()

source = json.loads(SOURCE.read_text())
practice = json.loads(PRACTICE.read_text())
assert (source['target'], source['native'], source['reviewed'], source['stage']) == ('Japanese', 'English', False, 'core')
assert len(source['lessons']) == 30
base = practice['japanese-basics']
assert list(map(int, base)) == list(range(1, 31))
result = {
    'pairKey': 'Japanese:English', 'registered': False, 'reviewed': False,
    'sourceFile': str(SOURCE.relative_to(ROOT)), 'sourceSha256': digest(SOURCE),
    'practiceFile': str(PRACTICE.relative_to(ROOT)), 'practiceSha256': digest(PRACTICE),
    'authoredSpeakingSources': [], 'authoredSpeakingCoverage': list(range(1, RANGES[-1][1] + 1)),
    'support': deepcopy(base),
}
for first, last in RANGES:
    path = ROOT / f'content/japanese-basics/private-core-{first}-{last}-speaking-missions-ja-en.json'
    missions = json.loads(path.read_text())
    assert (missions['pairKey'], missions['registered'], missions['reviewed']) == ('Japanese:English', False, False)
    assert missions['sourceFile'] == result['sourceFile'] and missions['sourceSha256'] == result['sourceSha256']
    assert missions['practiceFile'] == result['practiceFile'] and missions['practiceSha256'] == result['practiceSha256']
    assert [entry['lesson'] for entry in missions['lessons']] == list(range(first, last + 1))
    result['authoredSpeakingSources'].append({'path': str(path.relative_to(ROOT)), 'sha256': digest(path)})
    for entry in missions['lessons']:
        n = entry['lesson']
        lesson = source['lessons'][n - 1]
        support = result['support'][str(n)]
        target_lines = [line.split('|', 1)[0] for line in lesson['dialogue']]
        assert entry['stableLessonKey'] == f'japanese-basics:{n}'
        assert entry['opening'] == target_lines[0] == support['openingLine']
        assert support['reading']['target'] == target_lines
        assert entry['role'] and len(entry['objectives']) >= 3 and len(set(entry['objectives'])) == len(entry['objectives'])
        assert entry['complication'] and entry['closure']
        support['partnerRole'] = entry['role']
        support['speaking'] = 'Role-play: ' + entry['role'] + '. ' + ' '.join(entry['objectives']) + '. ' + entry['complication'] + ' ' + entry['closure']
        support['authoredSpeakingMission'] = {
            'stableLessonKey': entry['stableLessonKey'], 'role': entry['role'], 'opening': entry['opening'],
            'objectives': entry['objectives'], 'complication': entry['complication'], 'closure': entry['closure'],
        }

assert all('authoredSpeakingMission' not in item for item in list(result['support'].values())[RANGES[-1][1]:])
serialized = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
if '--check' in sys.argv:
    assert OUT.read_text() == serialized, f'{OUT} needs regeneration'
else:
    OUT.write_text(serialized)
print(f'Japanese 101 Core 1–{RANGES[-1][1]}: authored speaking missions in disabled exact-pair candidate')
