#!/usr/bin/env python3
"""Join source-pinned French Lunch teaching surfaces without registering a course."""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIR = Path(__file__).resolve().parent
OUTPUT = DIR / 'private-runtime-candidate.json'
STAGES = {'foundation': (10, 'foundation-travel-lunch-fr'),
          'core': (30, 'travel-lunch'),
          'master': (20, 'master-travel-lunch-fr')}


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SOURCE = load(DIR / 'verify-private-audio-scope.py', 'french_lunch_runtime_source')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def build():
    source_scope = SOURCE.build()
    require(json.loads(SOURCE.SCOPE.read_text()) == source_scope, 'Source audio scope changed')
    dictionary_path = DIR / 'dictionary-candidate.json'
    dictionary = json.loads(dictionary_path.read_text())
    require((dictionary['pairKey'], dictionary['reviewed']) == ('French:English', False),
            'Dictionary pair or review state changed')
    source_hashes = source_scope['sourceSha256']
    require(dictionary['sourceSha256'] == source_hashes, 'Dictionary source hashes changed')
    by_usage = {}
    for entry in dictionary['entries']:
        require(entry['reviewed'] is False and entry['runtimeRegistered'] is False,
                'Dictionary entry review or registration changed')
        for usage in entry['usages']:
            key = (usage['lessonId'], usage['cardIndex'])
            require(key not in by_usage, f'Duplicate dictionary usage: {key}')
            by_usage[key] = entry

    lessons = []
    lesson_ids = set()
    source_files = []
    content_files = []
    for stage, (expected, module_id) in STAGES.items():
        content_name = f'{stage}-lesson-content-candidate.json'
        content_path = DIR / content_name
        content_raw = content_path.read_bytes()
        content = json.loads(content_raw)
        require((content['language'], content['nativeLanguage'], content['reviewed'],
                 content['registered']) == ('French', 'English', False, False),
                f'{content_name}: pair or release state changed')
        require(set(content['lessons']) == {str(i) for i in range(1, expected + 1)},
                f'{content_name}: incomplete stage')
        if stage == 'foundation':
            require(content['module'] == module_id and
                    content['sourceStageSha256'] == sha((ROOT / 'src/data/core60/fr/foundation-travel-lunch-fr.json').read_bytes()),
                    'Foundation lesson content no longer matches its stage')
        elif stage == 'core':
            require(content['module'] == module_id and
                    content['sourceCoreSha256'] == sha((ROOT / 'src/data/french-travel-lunch-core.json').read_bytes()),
                    'Core lesson content no longer matches its curriculum')
        else:
            require(content['module'] == 'master-travel-lunch' and
                    content['sourceDraftSha256'] ==
                    {filename: source_hashes[filename] for filename in SOURCE.SOURCES[stage]},
                    'Master lesson content no longer matches its draft sources')
        content_files.append({'path': str(content_path.relative_to(ROOT)), 'sha256': sha(content_raw)})
        stage_lessons = {}
        stage_sources = {}
        for filename in SOURCE.SOURCES[stage]:
            path = DIR / filename
            raw = path.read_bytes()
            require(sha(raw) == source_hashes[filename], f'{filename}: source hash changed')
            draft = json.loads(raw)
            require((draft['stageId'], draft['pairKey'], draft['locale'], draft['reviewed'],
                     draft['registered'], draft['readyForLearner'], draft['audio']) ==
                    (f'{stage}-travel-lunch', 'French:English', 'fr-FR', False, False, False, 'none'),
                    f'{filename}: pair or release state changed')
            source_files.append({'path': str(path.relative_to(ROOT)), 'sha256': sha(raw)})
            for lesson in draft['lessons']:
                number = lesson['n']
                require(number not in stage_lessons, f'{stage}: repeated lesson {number}')
                stage_lessons[number] = lesson
                stage_sources[number] = str(path.relative_to(ROOT))
        require(set(stage_lessons) == {i for i in range(1, expected + 1)},
                f'{stage}: source coverage changed')
        for number in range(1, expected + 1):
            source = stage_lessons[number]
            linked = content['lessons'][str(number)]
            stable_id = f'{stage}-travel-lunch:{number}:fr-en'
            require(source['stableId'] == linked['stableId'] == stable_id and
                    stable_id not in lesson_ids and source['reviewed'] is False,
                    f'{stable_id}: identity or review changed')
            lesson_ids.add(stable_id)
            cards = []
            for index, card in enumerate(source['cards'], 1):
                entry = by_usage.get((stable_id, index - 1))
                require(entry is not None and (entry['fr'], entry['en'], entry['kind']) ==
                        (card['fr'], card['en'], card['kind']),
                        f'{stable_id}: card {index} has no exact dictionary sense')
                cards.append({'id': f'{stable_id}:card:{index}', 'fr': card['fr'],
                              'en': card['en'], 'kind': card['kind'], 'dictionaryId': entry['id']})
            require(len(source['reader']) >= 1 and all(turn.get('fr') and turn.get('en')
                    and turn.get('speaker') for turn in source['reader']),
                    f'{stable_id}: incomplete aligned Reader')
            passage = linked['passage']
            require(len(passage['target']) == len(passage['native']) >= 1 and
                    all(isinstance(line, str) and line.strip() for line in
                        passage['target'] + passage['native']),
                    f'{stable_id}: incomplete aligned passage')
            modes = {}
            require(set(source['modes']) == {'see', 'recall', 'hear', 'type', 'say', 'write'},
                    f'{stable_id}: incomplete six-mode set')
            for mode_name, mode in source['modes'].items():
                card_index = mode['sourceCard']
                require(type(card_index) is int and 1 <= card_index <= len(cards)
                        and mode.get('cueEnglish') and mode.get('responseKind') in {'fixed', 'open'},
                        f'{stable_id}:{mode_name}: invalid activity')
                card = cards[card_index - 1]
                modes[mode_name] = {'id': f'{stable_id}:{mode_name}:private-1',
                                    'mode': mode_name, 'cueEnglish': mode['cueEnglish'],
                                    'sourceCardId': card['id'], 'modelFrench': card['fr'],
                                    'modelEnglish': card['en'],
                                    'responseKind': mode['responseKind'],
                                    'readyForLearner': False}
            speaking = source['speaking']
            require(all(speaking.get(field) for field in ('role', 'partnerRole', 'opening',
                    'goal', 'closure', 'wordBank')), f'{stable_id}: incomplete speaking scene')
            require(all(verb.get('infinitive') and verb.get('native') and
                    verb.get('forms') and verb.get('example', {}).get('target') and
                    verb['example'].get('native') for verb in linked['verbs']),
                    f'{stable_id}: incomplete verb forms')
            lessons.append({'moduleId': module_id, 'lessonNumber': number,
                            'stableId': stable_id, 'title': source['title'],
                            'objective': source['objective'], 'focus': source['focus'],
                            'scene': source['scene'], 'cards': cards,
                            'reader': source['reader'], 'speaking': speaking,
                            'modes': modes, 'passage': passage,
                            'verbs': linked['verbs'],
                            'supplementalWords': linked.get('supplementalWords', []),
                            'sourceBatch': stage_sources[number],
                            'reviewed': False, 'readyForLearner': False})
    require(len(lesson_ids) == len(lessons) == 60 and len(by_usage) == sum(
            len(lesson['cards']) for lesson in lessons), 'Card/dictionary count changed')
    return {'schema': 1, 'pairKey': 'French:English', 'courseId': 'travel-lunch',
            'locale': 'fr-FR', 'registration': 'disabled', 'reviewed': False,
            'audioListeningReviewed': False, 'lessonCount': len(lessons),
            'cardCount': sum(len(lesson['cards']) for lesson in lessons),
            'readerTurnCount': sum(len(lesson['reader']) for lesson in lessons),
            'passageLineCount': sum(len(lesson['passage']['target']) for lesson in lessons),
            'activityCount': sum(len(lesson['modes']) for lesson in lessons),
            'sourceFiles': source_files, 'contentFiles': content_files,
            'dictionarySha256': sha(dictionary_path.read_bytes()), 'lessons': lessons}


if __name__ == '__main__':
    result = build()
    encoded = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if sys.argv[1:] == ['--write']:
        OUTPUT.write_text(encoded)
    elif sys.argv[1:] == ['--check']:
        require(OUTPUT.read_text() == encoded, 'Private runtime candidate changed')
    else:
        raise SystemExit('Usage: build-private-runtime-candidate.py --write|--check')
    print(json.dumps({key: result[key] for key in ('lessonCount', 'cardCount',
          'readerTurnCount', 'passageLineCount', 'activityCount', 'registration')}))
