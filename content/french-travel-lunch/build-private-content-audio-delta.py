#!/usr/bin/env python3
"""Inventory exact French Lunch passage text absent from the recorded source scope."""
import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path

import importlib.util

DIR = Path(__file__).resolve().parent
def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SCOPE_MODULE = load(DIR / 'verify-private-audio-scope.py', 'french_lunch_audio_scope')
SOURCE_FILES = SCOPE_MODULE.SOURCES
EXPECTED = SCOPE_MODULE.EXPECTED
CANDIDATES = {
    'foundation': 'foundation-lesson-content-candidate.json',
    'core': 'core-lesson-content-candidate.json',
    'master': 'master-lesson-content-candidate.json',
}
OUTPUT = DIR / 'content-audio-delta-candidate.json'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    source_scope = SCOPE_MODULE.build()
    require(json.loads((DIR / 'audio-scope-candidate.json').read_text()) == source_scope,
            'Pinned source audio scope changed')
    recorded_scope = set()
    for filenames in SOURCE_FILES.values():
        for filename in filenames:
            for lesson in json.loads((DIR / filename).read_text())['lessons']:
                recorded_scope.update(card['fr'] for card in lesson['cards'])
                recorded_scope.update(turn['fr'] for turn in lesson['reader'])
    require(len(recorded_scope) == source_scope['uniqueTexts'], 'Source text count changed')

    candidate_hashes = {}
    stages = {}
    new_occurrences = defaultdict(list)
    all_ids = set()
    total_placements = 0
    covered_placements = 0
    for stage, filename in CANDIDATES.items():
        path = DIR / filename
        candidate_hashes[filename] = sha(path)
        candidate = json.loads(path.read_text())
        require(candidate['language'] == 'French' and candidate['nativeLanguage'] == 'English'
                and candidate['reviewed'] is False and candidate['registered'] is False,
                f'{filename}: pair or release gate changed')
        require(set(candidate['lessons']) == {str(n) for n in range(1, EXPECTED[stage] + 1)},
                f'{filename}: lesson coverage changed')
        placements = covered = 0
        for number in range(1, EXPECTED[stage] + 1):
            lesson = candidate['lessons'][str(number)]
            stable_id = f'{stage}-travel-lunch:{number}:fr-en'
            require(lesson['stableId'] == stable_id and stable_id not in all_ids,
                    f'{filename}: lesson identity changed')
            all_ids.add(stable_id)
            lines = lesson['passage']['target']
            require(isinstance(lines, list) and lines and all(isinstance(line, str) and line.strip() for line in lines),
                    f'{stable_id}: missing passage text')
            for line in lines:
                placements += 1
                if line in recorded_scope:
                    covered += 1
                else:
                    new_occurrences[line].append(stable_id)
        stages[stage] = {'lessons': EXPECTED[stage], 'passagePlacements': placements,
                         'sourceCoveredPlacements': covered,
                         'newPlacements': placements - covered}
        total_placements += placements
        covered_placements += covered
    new_texts = sorted(new_occurrences)
    characters = sum(len(line) for line in new_texts)
    return {
        'schema': 1, 'courseId': 'travel-lunch', 'pairKey': 'French:English', 'locale': 'fr-FR',
        'scope': 'passage-lines-absent-from-source-cards-and-reader',
        'sourceAudioScopeSha256': sha(DIR / 'audio-scope-candidate.json'),
        'candidateSha256': candidate_hashes,
        'voices': source_scope['voices'], 'stages': stages,
        'passagePlacements': total_placements,
        'sourceCoveredPlacements': covered_placements,
        'newPlacements': total_placements - covered_placements,
        'newUniqueTexts': len(new_texts),
        'proposedTwoVoiceClips': 2 * len(new_texts),
        'newUniqueCharacters': characters,
        'proposedTwoVoiceCharacters': 2 * characters,
        'texts': [{'text': line, 'textSha256': hashlib.sha256(line.encode()).hexdigest(),
                   'lessonIds': sorted(set(new_occurrences[line]))} for line in new_texts],
        'recordingsBundled': False, 'textReviewed': False,
        'listeningReviewed': False, 'registered': False,
    }


if __name__ == '__main__':
    result = build()
    if sys.argv[1:] == ['--write']:
        OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    elif sys.argv[1:] == ['--check']:
        require(json.loads(OUTPUT.read_text()) == result, 'Pinned passage audio delta differs from source')
    else:
        raise SystemExit('Usage: build-private-content-audio-delta.py --write|--check')
    print(json.dumps({key: result[key] for key in ('passagePlacements', 'sourceCoveredPlacements',
          'newPlacements', 'newUniqueTexts', 'proposedTwoVoiceClips', 'proposedTwoVoiceCharacters')}))
