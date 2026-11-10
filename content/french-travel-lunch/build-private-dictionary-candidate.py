#!/usr/bin/env python3
"""Pin French Lunch card pairs and context for qualified dictionary review.

This is a private inventory, not a reviewed dictionary or runtime registration.
"""
import hashlib
import json
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

DIR = Path(__file__).resolve().parent
OUTPUT = DIR / 'dictionary-candidate.json'
SOURCES = {
    'foundation': [(1, 3), (4, 10)],
    'core': [(n, n + 4) for n in (1, 6, 11, 16, 21, 26)],
    'master': [(n, n + 4) for n in (1, 6, 11, 16)],
}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def normalize(value):
    return unicodedata.normalize('NFC', value).strip()


def key_for(*parts):
    return hashlib.sha256('\0'.join(parts).encode('utf-8')).hexdigest()[:24]


def build():
    entries = {}
    headwords = defaultdict(set)
    headword_ids = defaultdict(set)
    kinds = defaultdict(set)
    kind_ids = defaultdict(set)
    source_hashes = {}
    counts = {'foundation': 0, 'core': 0, 'master': 0}
    matched_reader = 0
    missing_reader = []
    placements = 0
    for stage, batches in SOURCES.items():
        seen = set()
        for first, last in batches:
            name = f'{stage}-{first}-{last}-draft.json'
            path = DIR / name
            raw = path.read_bytes()
            source_hashes[name] = hashlib.sha256(raw).hexdigest()
            draft = json.loads(raw)
            require((draft.get('stageId'), draft.get('pairKey'), draft.get('locale'),
                     draft.get('reviewed'), draft.get('registered'), draft.get('readyForLearner')) ==
                    (f'{stage}-travel-lunch', 'French:English', 'fr-FR', False, False, False),
                    f'{name}: pair or release gate changed')
            for lesson in draft['lessons']:
                number = lesson['n']
                lesson_id = f'{stage}-travel-lunch:{number}:fr-en'
                require(first <= number <= last and lesson['stableId'] == lesson_id
                        and lesson['reviewed'] is False and number not in seen,
                        f'{name}: lesson identity or review changed')
                seen.add(number)
                reader = [normalize(turn['fr']).casefold() for turn in lesson['reader']]
                for index, card in enumerate(lesson['cards']):
                    fr, en = normalize(card['fr']), normalize(card['en'])
                    kind = card['kind']
                    require(fr and en and kind in ('term', 'phrase'),
                            f'{lesson_id}: invalid dictionary card {index}')
                    note = normalize(card.get('note', ''))
                    pair_id = 'fr-lunch:' + key_for(fr, en, kind)
                    matching_turns = [i for i, line in enumerate(reader)
                                      if fr.casefold() in line]
                    usage = {'lessonId': lesson_id, 'cardIndex': index,
                             'lessonScene': lesson['scene'],
                             'readerTurnIndexes': matching_turns}
                    if matching_turns:
                        example = lesson['reader'][matching_turns[0]]
                        usage['readerExample'] = {'fr': example['fr'], 'en': example['en'],
                                                  'speaker': example['speaker']}
                    if note:
                        usage['sourceNote'] = note
                    entry = entries.setdefault(pair_id, {'id': pair_id, 'fr': fr,
                        'en': en, 'kind': kind, 'usages': [],
                        'reviewed': False, 'runtimeRegistered': False})
                    require((entry['fr'], entry['en'], entry['kind']) == (fr, en, kind),
                            'Truncated dictionary ID collision')
                    entry['usages'].append(usage)
                    headwords[fr.casefold()].add(en)
                    headword_ids[fr.casefold()].add(pair_id)
                    kinds[(fr.casefold(), en.casefold())].add(kind)
                    kind_ids[(fr.casefold(), en.casefold())].add(pair_id)
                    placements += 1
                    if matching_turns:
                        matched_reader += 1
                    else:
                        missing_reader.append({'lessonId': lesson_id, 'cardIndex': index,
                                               'fr': fr, 'en': en})
        counts[stage] = len(seen)
        require(seen == set(range(1, {'foundation': 10, 'core': 30, 'master': 20}[stage] + 1)),
                f'{stage}: missing lessons')
    ambiguities = [{'headword': fr, 'exactEnglishGlosses': sorted(glosses),
                    'entryIds': sorted(headword_ids[fr]),
                    'qualifiedFrenchReviewRequired': True}
                   for fr, glosses in sorted(headwords.items()) if len(glosses) > 1]
    kind_conflicts = [{'headword': fr, 'englishGloss': en, 'kinds': sorted(values),
                       'entryIds': sorted(kind_ids[(fr, en)]),
                       'qualifiedFrenchReviewRequired': True}
                      for (fr, en), values in sorted(kinds.items()) if len(values) > 1]
    return {'schema': 1, 'courseId': 'travel-lunch', 'pairKey': 'French:English',
            'locale': 'fr-FR', 'sourceSha256': source_hashes, 'stageLessons': counts,
            'cardPlacements': placements, 'uniqueExactPairKindEntries': len(entries),
            'uniqueNormalizedFrenchHeadwords': len(headwords),
            'cardPlacementsWithExactReaderSubstring': matched_reader,
            'cardPlacementsWithoutExactReaderSubstring': len(missing_reader),
            'readerSubstringGapQueue': missing_reader,
            'ambiguousHeadwordCount': len(ambiguities), 'ambiguousHeadwordQueue': ambiguities,
            'kindConflictCount': len(kind_conflicts), 'kindConflictQueue': kind_conflicts,
            'entries': sorted(entries.values(), key=lambda row: (row['fr'].casefold(), row['en'].casefold(), row['kind'])),
            'reviewed': False, 'runtimeRegistered': False}


if __name__ == '__main__':
    result = build()
    if sys.argv[1:] == ['--write']:
        OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    else:
        require(json.loads(OUTPUT.read_text()) == result,
                'Pinned dictionary candidate differs from exact source')
    print(json.dumps({key: result[key] for key in (
        'stageLessons', 'cardPlacements', 'uniqueExactPairKindEntries',
        'uniqueNormalizedFrenchHeadwords', 'cardPlacementsWithExactReaderSubstring',
        'cardPlacementsWithoutExactReaderSubstring', 'ambiguousHeadwordCount',
        'kindConflictCount', 'reviewed', 'runtimeRegistered')}))
