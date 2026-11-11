#!/usr/bin/env python3
"""Pin French Lunch lesson-content speech missing from source and passage audio."""
import hashlib
import importlib.util
import json
import sys
from collections import defaultdict
from pathlib import Path

DIR = Path(__file__).resolve().parent
OUTPUT = DIR / 'lesson-content-audio-delta-candidate.json'


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SCOPE = load(DIR / 'verify-private-audio-scope.py', 'french_lunch_source_scope')
PASSAGE = load(DIR / 'build-private-content-audio-delta.py', 'french_lunch_passage_scope')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    source_scope = SCOPE.build()
    passage_scope = PASSAGE.build()
    require(json.loads((DIR / 'audio-scope-candidate.json').read_text()) == source_scope,
            'Pinned source audio scope differs')
    require(json.loads(PASSAGE.OUTPUT.read_text()) == passage_scope,
            'Pinned passage audio scope differs')
    baseline = {row['text'] for row in passage_scope['texts']}
    sources = {}
    for stage, filenames in SCOPE.SOURCES.items():
        lessons = {}
        for filename in filenames:
            for lesson in json.loads((DIR / filename).read_text())['lessons']:
                lessons[lesson['n']] = lesson
                baseline.update(card['fr'] for card in lesson['cards'])
                baseline.update(turn['fr'] for turn in lesson['reader'])
        sources[stage] = lessons
    require(len(baseline) == source_scope['uniqueTexts'] + passage_scope['newUniqueTexts'],
            'Source/passage audio sets overlap or differ')

    missing = defaultdict(list)
    candidate_hashes = {}
    surfaces = defaultdict(lambda: {'placements': 0, 'missingPlacements': 0})
    for stage, filename in PASSAGE.CANDIDATES.items():
        path = DIR / filename
        candidate_hashes[filename] = sha(path)
        candidate = json.loads(path.read_text())
        require(candidate['language'] == 'French' and candidate['nativeLanguage'] == 'English'
                and candidate['reviewed'] is False and candidate['registered'] is False,
                f'{filename}: pair or release gate changed')
        require(set(candidate['lessons']) == {str(n) for n in range(1, SCOPE.EXPECTED[stage] + 1)},
                f'{filename}: coverage changed')
        for number in range(1, SCOPE.EXPECTED[stage] + 1):
            lesson = candidate['lessons'][str(number)]
            stable_id = f'{stage}-travel-lunch:{number}:fr-en'
            require(lesson['stableId'] == stable_id, f'{filename}: stable ID changed')
            source = sources[stage][number]

            def add(value, field):
                require(isinstance(value, str) and value.strip() and value == ' '.join(value.split()),
                        f'{stable_id}/{field}: invalid exact audio text')
                surfaces[field.split('[')[0]]['placements'] += 1
                if value not in baseline:
                    surfaces[field.split('[')[0]]['missingPlacements'] += 1
                    missing[value].append({'lessonId': stable_id, 'field': field})

            for index, value in enumerate(lesson['passage']['target']):
                add(value, f'passage[{index}]')
            for index in lesson.get('sourceCardIndices', []):
                require(1 <= index <= len(source['cards']), 'Selected source card index changed')
                text = lesson.get('sourceCardTextOverrides', {}).get(str(index), {}).get('es',
                            source['cards'][index - 1]['fr'])
                add(text, f'selectedWords[{index}]')
            for index, word in enumerate(lesson.get('supplementalWords', [])):
                add(word['es'], f'supplementalWords[{index}]')
            for index, verb in enumerate(lesson['verbs']):
                add(verb['infinitive'], f'verbs[{index}].infinitive')
                require(set(verb['forms']) == {'je', 'tu', 'il_elle_on', 'nous', 'vous', 'ils_elles'},
                        f'{stable_id}: verb paradigm changed')
                for person, value in verb['forms'].items():
                    add(value, f'verbs[{index}].forms[{person}]')
                add(verb['example']['target'], f'verbs[{index}].example')
    rows = sorted(missing)
    require(not set(rows).intersection(baseline), 'Missing audio overlaps baseline')
    characters = sum(len(text) for text in rows)
    return {
        'schema': 1, 'courseId': 'travel-lunch', 'pairKey': 'French:English', 'locale': 'fr-FR',
        'scope': 'lesson-content-words-and-verbs-absent-from-source-and-passage-audio',
        'sourceAudioScopeSha256': sha(DIR / 'audio-scope-candidate.json'),
        'passageDeltaSha256': sha(PASSAGE.OUTPUT),
        'candidateSha256': candidate_hashes,
        'voices': source_scope['voices'],
        'surfaces': dict(sorted(surfaces.items())),
        'newUniqueTexts': len(rows),
        'newUniqueCharacters': characters,
        'proposedTwoVoiceClips': 2 * len(rows),
        'proposedTwoVoiceCharacters': 2 * characters,
        'texts': [{'text': text, 'textSha256': hashlib.sha256(text.encode()).hexdigest(),
                   'lessonIds': sorted({item['lessonId'] for item in missing[text]}),
                   'occurrences': missing[text]} for text in rows],
        'recordingsBundled': False, 'textReviewed': False,
        'listeningReviewed': False, 'registered': False,
    }


if __name__ == '__main__':
    result = build()
    if sys.argv[1:] == ['--write']:
        OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    elif sys.argv[1:] == ['--check']:
        require(json.loads(OUTPUT.read_text()) == result,
                'Pinned lesson-content audio delta differs from current sources')
    else:
        raise SystemExit('Usage: build-private-lesson-content-audio-delta.py --write|--check')
    print(json.dumps({'surfaces': result['surfaces'],
                      'newUniqueTexts': result['newUniqueTexts'],
                      'proposedTwoVoiceClips': result['proposedTwoVoiceClips'],
                      'proposedTwoVoiceCharacters': result['proposedTwoVoiceCharacters']}))
