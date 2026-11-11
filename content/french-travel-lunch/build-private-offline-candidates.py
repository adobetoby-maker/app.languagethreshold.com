#!/usr/bin/env python3
"""Build fail-closed French Lunch text-pack candidates; never install them."""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

COURSE = Path(__file__).resolve().parent
SOURCE = COURSE / 'private-runtime-candidate.json'
OUTPUT = COURSE / 'private-offline'
STAGES = {'foundation': (10, 'foundation-travel-lunch-fr'),
          'core': (30, 'travel-lunch'),
          'master': (20, 'master-travel-lunch-fr')}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()


def require(value, message):
    if not value:
        raise ValueError(message)


def source():
    path = COURSE / 'build-private-runtime-candidate.py'
    spec = importlib.util.spec_from_file_location('french_lunch_private_runtime', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    expected = module.build()
    raw = SOURCE.read_bytes()
    require(json.loads(raw) == expected, 'Private runtime candidate is stale')
    require((expected['pairKey'], expected['registration'], expected['reviewed'],
             expected['audioListeningReviewed'], expected['lessonCount']) ==
            ('French:English', 'disabled', False, False, 60),
            'Private runtime pair, coverage or release gate changed')
    dictionary_raw = (COURSE / 'dictionary-candidate.json').read_bytes()
    dictionary = json.loads(dictionary_raw)
    require(expected['dictionarySha256'] == sha(dictionary_raw) and
            dictionary['pairKey'] == 'French:English' and dictionary['reviewed'] is False,
            'Private dictionary source or review state changed')
    return raw, expected, dictionary_raw, dictionary


def artifacts(stage, source_raw, candidate, dictionary_raw, dictionary):
    count, module_id = STAGES[stage]
    lessons = [lesson for lesson in candidate['lessons'] if lesson['moduleId'] == module_id]
    require(len(lessons) == count and [lesson['lessonNumber'] for lesson in lessons] ==
            list(range(1, count + 1)), f'{stage}: incomplete stage')
    require(all(lesson['reviewed'] is False and lesson['readyForLearner'] is False
                for lesson in lessons), f'{stage}: lesson release gate changed')
    dictionary_ids = {card['dictionaryId'] for lesson in lessons for card in lesson['cards']}
    dictionary_entries = [entry for entry in dictionary['entries'] if entry['id'] in dictionary_ids]
    require(len(dictionary_entries) == len(dictionary_ids) and
            all(entry['reviewed'] is False and entry['runtimeRegistered'] is False
                for entry in dictionary_entries), f'{stage}: dictionary entry changed')
    pack_id = f'{"travel-lunch" if stage == "core" else stage + "-travel-lunch"}-fr-en'
    progress = f'private:French:English:{module_id}:fr-en'
    source_digest = sha(source_raw)
    pack = {'schema': 1, 'state': 'private-unreleased-candidate',
            'releaseEnabled': False, 'reviewed': False, 'registered': False,
            'audioFilesIncluded': False, 'deviceVoiceIncluded': False,
            'aiConversationOffline': False, 'packId': pack_id,
            'moduleId': module_id, 'pairKey': 'French:English',
            'target': 'French', 'native': 'English', 'locale': 'fr-FR',
            'sourceSha256': source_digest, 'progressScopeCandidate': progress,
            'lessons': lessons, 'dictionaryEntries': dictionary_entries,
            'dictionarySourceSha256': sha(dictionary_raw)}
    content = encoded(pack)
    digest = sha(content)
    filename = f'{pack_id}-{digest}.json'
    manifest = {'schema': 1, 'state': 'private-unreleased-candidate',
                'releaseEnabled': False, 'workerAllowlistEnabled': False,
                'appAssetInventory': None, 'installationStatus': 'not-installed',
                'packId': pack_id, 'moduleId': module_id, 'pairKey': 'French:English',
                'target': 'French', 'native': 'English', 'locale': 'fr-FR',
                'lessonCount': count,
                'cardCount': sum(len(lesson['cards']) for lesson in lessons),
                'dictionaryEntryCount': len(dictionary_entries),
                'dictionarySourceSha256': sha(dictionary_raw),
                'sourceSha256': source_digest,
                'content': {'file': filename, 'sha256': digest,
                            'bytes': len(content), 'routeCandidate': None},
                'cacheNamespaceCandidate': f'private:French:English:{pack_id}:{digest}',
                'progressScopeCandidate': progress}
    return {filename: content,
            f'{pack_id}.manifest.json': encoded(manifest) + b'\n'}


def main():
    require(sys.argv[1:] in (['--write'], ['--check']),
            'Usage: build-private-offline-candidates.py --write|--check')
    writing = sys.argv[1] == '--write'
    raw, candidate, dictionary_raw, dictionary = source()
    expected = {}
    for stage in STAGES:
        expected.update(artifacts(stage, raw, candidate, dictionary_raw, dictionary))
    if writing:
        OUTPUT.mkdir(exist_ok=True)
        require(not any(path.name not in expected for path in OUTPUT.iterdir()),
                'Unexpected private offline file; refusing to remove it')
        for filename, data in expected.items():
            (OUTPUT / filename).write_bytes(data)
    else:
        require(OUTPUT.is_dir() and {path.name for path in OUTPUT.iterdir()} == set(expected),
                'Private offline pack inventory changed')
        for filename, data in expected.items():
            require((OUTPUT / filename).read_bytes() == data,
                    f'Private offline pack changed: {filename}')
    print(json.dumps({'packs': len(STAGES), 'lessons': 60,
                      'bytes': sum(len(data) for data in expected.values()),
                      'releaseEnabled': False, 'workerAllowlistEnabled': False}))


if __name__ == '__main__':
    main()
