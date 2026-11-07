#!/usr/bin/env python3
"""Derive private Japanese contextual form drills from authored grammar examples."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
OUTPUT = CONTENT / 'private-form-practice-ja-en.json'
STAGES = ('foundation', 'core', 'master')
COURSES = {
    'foundation': 'foundation-construction-foreman-ja-en',
    'core': 'construction-foreman-ja-en',
    'master': 'master-construction-foreman-ja-en',
}


def source_files(stage):
    if stage == 'foundation':
        return [CONTENT / 'foundation-runtime-draft-ja-en.json']
    files = list(CONTENT.glob(f'{stage}-runtime-pilot-*-ja-en.json'))
    return sorted(files, key=lambda path: int(path.stem.split('-')[3]))


def stable_id(*parts):
    return 'form-ja-en-' + hashlib.sha256('\0'.join(map(str, parts)).encode()).hexdigest()[:16]


def build():
    lessons = []
    hashes = {}
    for stage in STAGES:
        numbers = []
        for path in source_files(stage):
            raw = path.read_bytes()
            hashes[path.name] = hashlib.sha256(raw).hexdigest()
            source = json.loads(raw)
            assert (source['state'], source['reviewed'], source['pairKey'],
                    source['target'], source['native'], source['courseId']) == (
                        'private-runtime-draft', False, 'Japanese:English',
                        'Japanese', 'English', COURSES[stage]), path
            for lesson in source['lessons']:
                n = lesson['n']
                numbers.append(n)
                examples = lesson['grammar']['examples']
                assert len(examples) == 2, (path, n)
                forms = []
                for ordinal, example in enumerate(examples, 1):
                    target, english = example['es'], example['en']
                    assert target and english and target == target.strip() and english == english.strip()
                    forms.append({
                        'id': stable_id(COURSES[stage], n, ordinal, target, english),
                        'sourceOrdinal': ordinal,
                        'target': target,
                        'english': english,
                        'practice': ['recognize-meaning', 'produce-target'],
                        'reviewed': False,
                    })
                lessons.append({
                    'stage': stage, 'courseId': COURSES[stage], 'lesson': n,
                    'sourceLessonId': lesson['id'], 'sourceFile': path.name,
                    'focus': lesson['grammar']['focus'], 'forms': forms,
                    'reviewed': False,
                })
        assert numbers == list(range(1, {'foundation': 10, 'core': 30, 'master': 20}[stage] + 1))
    return {
        'schema': 1, 'state': 'private-form-practice-draft', 'reviewed': False,
        'registered': False, 'pairKey': 'Japanese:English',
        'targetLanguage': 'Japanese', 'supportLanguage': 'English',
        'practiceModel': 'contextual-japanese-form',
        'note': 'Whole authored Japanese sentence forms; no Spanish person/endings table or generated conjugations.',
        'sourceSha256': dict(sorted(hashes.items())),
        'counts': {'lessons': len(lessons), 'forms': sum(len(x['forms']) for x in lessons)},
        'lessons': lessons,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = json.dumps(build(), ensure_ascii=False, indent=2) + '\n'
    if args.check:
        assert OUTPUT.read_text() == data, 'Private Japanese Foreman form practice is stale'
    else:
        OUTPUT.write_text(data)
    print('Private Japanese Foreman form practice verified')


if __name__ == '__main__':
    main()
