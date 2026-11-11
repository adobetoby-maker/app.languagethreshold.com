#!/usr/bin/env python3
"""Pin speaking lines absent from the private French Lunch recording inventory."""
import hashlib
import importlib.util
import json
import sys
from collections import defaultdict
from pathlib import Path

DIR = Path(__file__).resolve().parent
OUTPUT = DIR / 'speaking-audio-delta-candidate.json'


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SOURCE = load(DIR / 'verify-private-audio-scope.py', 'french_lunch_speaking_source')
PASSAGE = load(DIR / 'build-private-content-audio-delta.py', 'french_lunch_speaking_passages')
SUPPLEMENT = load(DIR / 'build-private-lesson-content-audio-delta.py', 'french_lunch_speaking_supplement')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(value, message):
    if not value:
        raise ValueError(message)


def build():
    source = SOURCE.build()
    passage = PASSAGE.build()
    supplement = SUPPLEMENT.build()
    require(json.loads(SOURCE.SCOPE.read_text()) == source, 'Source audio scope changed')
    require(json.loads(PASSAGE.OUTPUT.read_text()) == passage, 'Passage audio delta changed')
    require(json.loads(SUPPLEMENT.OUTPUT.read_text()) == supplement, 'Supplement audio delta changed')
    baseline = {row['text'] for row in passage['texts'] + supplement['texts']}
    for files in SOURCE.SOURCES.values():
        for filename in files:
            for lesson in json.loads((DIR / filename).read_text())['lessons']:
                baseline.update(card['fr'] for card in lesson['cards'])
                baseline.update(turn['fr'] for turn in lesson['reader'])
    rows = defaultdict(list)
    placement = {'opening': 0, 'closure': 0, 'wordBank': 0, 'mode': 0}
    missing = {'opening': 0, 'closure': 0, 'wordBank': 0, 'mode': 0}
    lesson_ids = set()
    for stage, files in SOURCE.SOURCES.items():
        for filename in files:
            draft = json.loads((DIR / filename).read_text())
            require((draft['pairKey'], draft['locale'], draft['reviewed'], draft['registered'],
                     draft['readyForLearner'], draft['audio']) ==
                    ('French:English', 'fr-FR', False, False, False, 'none'),
                    f'{filename}: pair or release state changed')
            for lesson in draft['lessons']:
                lesson_id = f'{stage}-travel-lunch:{lesson["n"]}:fr-en'
                require(lesson['stableId'] == lesson_id and lesson_id not in lesson_ids
                        and lesson['reviewed'] is False, f'{lesson_id}: identity or review changed')
                lesson_ids.add(lesson_id)
                cards = [card['fr'] for card in lesson['cards']]
                surfaces = {'opening': [lesson['speaking']['opening']],
                            'closure': [lesson['speaking']['closure']],
                            'wordBank': lesson['speaking']['wordBank'],
                            'mode': [cards[mode['sourceCard'] - 1] for mode in lesson['modes'].values()]}
                for surface, texts in surfaces.items():
                    for text in texts:
                        require(isinstance(text, str) and text.strip() == text and text,
                                f'{lesson_id}: invalid {surface} text')
                        placement[surface] += 1
                        if text not in baseline:
                            missing[surface] += 1
                            rows[text].append({'lessonId': lesson_id, 'field': surface})
    require(len(lesson_ids) == 60 and placement['mode'] == 360, 'Incomplete lesson/mode set')
    require(missing['wordBank'] == missing['mode'] == 0,
            'Word-bank or mode model lacks recording coverage')
    require(not (set(rows) & baseline), 'Recorded text entered missing inventory')
    texts = [{'text': text, 'textSha256': hashlib.sha256(text.encode()).hexdigest(),
              'lessonIds': sorted({item['lessonId'] for item in rows[text]}),
              'occurrences': rows[text]} for text in sorted(rows)]
    characters = sum(len(row['text']) for row in texts)
    return {'schema': 1, 'courseId': 'travel-lunch', 'pairKey': 'French:English',
            'locale': 'fr-FR', 'scope': 'speaking-openings-and-closures-absent-from-prior-audio',
            'sourceAudioScopeSha256': sha(SOURCE.SCOPE),
            'passageDeltaSha256': sha(PASSAGE.OUTPUT),
            'supplementDeltaSha256': sha(SUPPLEMENT.OUTPUT),
            'voices': source['voices'], 'lessonCount': len(lesson_ids),
            'surfacePlacements': placement, 'missingPlacements': missing,
            'newUniqueTexts': len(texts), 'newUniqueCharacters': characters,
            'proposedTwoVoiceClips': len(texts) * 2,
            'proposedTwoVoiceCharacters': characters * 2, 'texts': texts,
            'recordingsBundled': False, 'textReviewed': False,
            'listeningReviewed': False, 'registered': False}


if __name__ == '__main__':
    result = build()
    if sys.argv[1:] == ['--write']:
        OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    elif sys.argv[1:] == ['--check']:
        require(json.loads(OUTPUT.read_text()) == result, 'Pinned speaking audio delta changed')
    else:
        raise SystemExit('Usage: build-private-speaking-audio-delta.py --write|--check')
    print(json.dumps({key: result[key] for key in ('lessonCount', 'missingPlacements',
          'newUniqueTexts', 'proposedTwoVoiceClips', 'proposedTwoVoiceCharacters')}))
