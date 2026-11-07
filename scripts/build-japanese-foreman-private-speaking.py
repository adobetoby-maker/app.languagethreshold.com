#!/usr/bin/env python3
"""Derive private exact-pair Foreman speaking missions from authored lessons."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
OUTPUT = CONTENT / 'private-speaking-missions-ja-en.json'
COURSES = {
    'foundation': 'foundation-construction-foreman-ja-en',
    'core': 'construction-foreman-ja-en',
    'master': 'master-construction-foreman-ja-en',
}


def sources(stage):
    if stage == 'foundation':
        return [CONTENT / 'foundation-runtime-draft-ja-en.json']
    return sorted(CONTENT.glob(f'{stage}-runtime-pilot-*-ja-en.json'),
                  key=lambda path: int(path.stem.split('-')[3]))


def build():
    missions = []
    source_hashes = {}
    for stage, course_id in COURSES.items():
        numbers = []
        for path in sources(stage):
            raw = path.read_bytes()
            source_hashes[path.name] = hashlib.sha256(raw).hexdigest()
            source = json.loads(raw)
            assert (source['state'], source['reviewed'], source['target'],
                    source['native'], source['pairKey'], source['courseId']) == (
                        'private-runtime-draft', False, 'Japanese', 'English',
                        'Japanese:English', course_id), path
            dictionary = {(item['target'], item['native']): item for item in source['dictionary']}
            for lesson in source['lessons']:
                number = lesson['n']
                numbers.append(number)
                speaking = lesson['speaking']
                assert speaking['id'] == f'speak-{course_id}:lesson:{number}'
                assert speaking['locale'] == 'ja-JP'
                assert speaking['summary'].strip() and speaking['partnerRole'].strip()
                assert speaking['openingLine'].strip()
                words = []
                for word in lesson['words']:
                    target, english = word['es'], word['en']
                    assert target.strip() and english.strip()
                    entry = dictionary[(target, english)]
                    assert entry['courseId'] == course_id
                    words.append({
                        'target': target, 'english': english,
                        'kind': word['kind'], 'cardId': word['cardId'],
                        'dictionaryId': entry['id'],
                    })
                assert len(words) >= 8, (path, number)
                missions.append({
                    'id': speaking['id'], 'stage': stage, 'courseId': course_id,
                    'lesson': number, 'sourceLessonId': lesson['id'],
                    'sourceFile': path.name, 'locale': 'ja-JP',
                    'briefEnglish': speaking['summary'],
                    'partnerRoleEnglish': speaking['partnerRole'],
                    'openingLineJapanese': speaking['openingLine'],
                    'sourceSpeakingJapanese': speaking.get('sourceSpeakingJapanese'),
                    'wordBank': words, 'reviewed': False,
                })
        assert numbers == list(range(1, {'foundation': 10, 'core': 30, 'master': 20}[stage] + 1))
    return {
        'schema': 1, 'state': 'private-speaking-missions-draft',
        'targetLanguage': 'Japanese', 'supportLanguage': 'English',
        'pairKey': 'Japanese:English', 'locale': 'ja-JP',
        'registered': False, 'reviewed': False,
        'sourceSha256': dict(sorted(source_hashes.items())),
        'counts': {'missions': len(missions),
                   'wordPlacements': sum(len(m['wordBank']) for m in missions)},
        'missions': missions,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    output = json.dumps(build(), ensure_ascii=False, indent=2) + '\n'
    if args.check:
        assert OUTPUT.read_text() == output, 'Private Foreman speaking inventory is stale'
    else:
        OUTPUT.write_text(output)
    print('Private Japanese Foreman speaking missions verified')


if __name__ == '__main__':
    main()
