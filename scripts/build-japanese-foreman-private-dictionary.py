#!/usr/bin/env python3
"""Inventory exact Japanese/English Foreman senses without publishing them."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
OUTPUT = CONTENT / 'private-dictionary-draft-ja-en.json'
RANGES = {
    'foundation': ([(1, 10)], 'foundation-construction-foreman-ja-en'),
    'core': ([(n, n + 2) for n in range(1, 31, 3)], 'construction-foreman-ja-en'),
    'master': ([(1, 3), (4, 6), (7, 9), (10, 12), (13, 15), (16, 18), (19, 20)],
               'master-construction-foreman-ja-en'),
}


def source_path(stage, first, last):
    if stage == 'foundation':
        return CONTENT / 'foundation-runtime-draft-ja-en.json'
    return CONTENT / f'{stage}-runtime-pilot-{first}-{last}-ja-en.json'


def build():
    entries = {}
    source_hashes = {}
    placements = 0
    for stage, (ranges, course_id) in RANGES.items():
        seen_lessons = []
        for first, last in ranges:
            path = source_path(stage, first, last)
            raw = path.read_bytes()
            data = json.loads(raw)
            source_hashes[path.name] = hashlib.sha256(raw).hexdigest()
            assert (data['target'], data['native'], data['pairKey'], data['courseId'],
                    data['reviewed'], data['state']) == (
                        'Japanese', 'English', 'Japanese:English', course_id,
                        False, 'private-runtime-draft'), path
            seen_lessons += [lesson['n'] for lesson in data['lessons']]
            local_dictionary = {(x['target'], x['native']): x for x in data['dictionary']}
            for lesson in data['lessons']:
                for word in lesson['words']:
                    target, native = word['es'], word['en']
                    assert target and native and target == target.strip() and native == native.strip()
                    pair = (target, native)
                    item = local_dictionary.get(pair)
                    assert item is not None, (path, lesson['n'], pair)
                    assert item['courseId'] == course_id and item['kind'] == word['kind']
                    assert item['id'].startswith('dict-ja-en-')
                    key = '\u0000'.join(pair)
                    if key not in entries:
                        entries[key] = {
                            'id': item['id'], 'target': target, 'native': native,
                            'kind': item['kind'], 'partOfSpeech': None,
                            'inflection': None, 'reviewed': False,
                            'sourceIds': [], 'occurrences': [],
                        }
                    entry = entries[key]
                    assert entry['kind'] == item['kind'], (pair, entry['kind'], item['kind'])
                    if item['id'] not in entry['sourceIds']:
                        entry['sourceIds'].append(item['id'])
                    occurrence = {'stage': stage, 'courseId': course_id,
                                  'lesson': lesson['n'], 'sourceFile': path.name,
                                  'cardId': word['cardId']}
                    assert occurrence not in entry['occurrences']
                    entry['occurrences'].append(occurrence)
                    placements += 1
        assert seen_lessons == list(range(1, {'foundation': 10, 'core': 30, 'master': 20}[stage] + 1))
    by_target = defaultdict(set)
    for entry in entries.values():
        by_target[entry['target']].add(entry['native'])
        entry['sourceIds'].sort()
        entry['occurrences'].sort(key=lambda x: (list(RANGES).index(x['stage']), x['lesson']))
    # Compute ambiguity after collecting every stage, without collapsing distinct glosses.
    for entry in entries.values():
        entry['needsSenseReview'] = len(by_target[entry['target']]) > 1
    output = {
        'schema': 1, 'state': 'private-dictionary-draft', 'reviewed': False,
        'registered': False, 'targetLanguage': 'Japanese', 'supportLanguage': 'English',
        'pairKey': 'Japanese:English', 'sourceSha256': dict(sorted(source_hashes.items())),
        'counts': {'lessons': 60, 'placements': placements, 'exactPairs': len(entries),
                   'ambiguousHeadwords': sum(len(senses) > 1 for senses in by_target.values()),
                   'missingPartOfSpeech': len(entries), 'missingInflection': len(entries)},
        'entries': sorted(entries.values(), key=lambda x: (x['target'], x['native'])),
    }
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    output = json.dumps(build(), ensure_ascii=False, indent=2) + '\n'
    if args.check:
        assert OUTPUT.read_text() == output, 'Private Foreman dictionary inventory is stale'
    else:
        OUTPUT.write_text(output)
    print('Japanese Foreman private exact-pair dictionary inventory verified')


if __name__ == '__main__':
    main()
