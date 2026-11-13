#!/usr/bin/env python3
"""Build a disabled Japanese 101 Foundation speaking candidate from authored missions."""
from copy import deepcopy
from hashlib import sha256
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/japanese-basics/foundation.json'
PRACTICE = ROOT / 'src/data/japanese-basics-practice.json'
MISSIONS = ROOT / 'content/japanese-basics/private-foundation-speaking-missions-ja-en.json'
OUT = ROOT / 'content/japanese-basics/private-foundation-practice-speaking-ja-en.json'

def digest(path):
    return sha256(path.read_bytes()).hexdigest()

source = json.loads(SOURCE.read_text())
practice = json.loads(PRACTICE.read_text())
missions = json.loads(MISSIONS.read_text())
assert (source['target'], source['native'], source['reviewed'], source['stage']) == ('Japanese', 'English', False, 'foundation')
assert len(source['lessons']) == 10
assert (missions['pairKey'], missions['registered'], missions['reviewed']) == ('Japanese:English', False, False)
assert missions['sourceFile'] == str(SOURCE.relative_to(ROOT)) and missions['sourceSha256'] == digest(SOURCE)
assert missions['practiceFile'] == str(PRACTICE.relative_to(ROOT)) and missions['practiceSha256'] == digest(PRACTICE)
assert [entry['lesson'] for entry in missions['lessons']] == list(range(1, 11))
base = practice['foundation-japanese-basics']
assert list(map(int, base)) == list(range(1, 11))
result = {
    'pairKey': 'Japanese:English', 'registered': False, 'reviewed': False,
    'sourceFile': missions['sourceFile'], 'sourceSha256': missions['sourceSha256'],
    'practiceFile': missions['practiceFile'], 'practiceSha256': missions['practiceSha256'],
    'missionsFile': str(MISSIONS.relative_to(ROOT)), 'missionsSha256': digest(MISSIONS),
    'support': deepcopy(base),
}
for entry in missions['lessons']:
    n = entry['lesson']
    lesson = source['lessons'][n - 1]
    support = result['support'][str(n)]
    target_lines = [line.split('|', 1)[0] for line in lesson['dialogue']]
    assert entry['stableLessonKey'] == f'foundation-japanese-basics:{n}'
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

serialized = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
if '--check' in sys.argv:
    assert OUT.read_text() == serialized, f'{OUT} needs regeneration'
else:
    OUT.write_text(serialized)
print('Japanese 101 Foundation: 10 authored speaking missions in disabled exact-pair candidate')
