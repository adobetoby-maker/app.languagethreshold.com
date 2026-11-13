#!/usr/bin/env python3
"""Derive private Japanese Lunch card/sense candidates without inferring glosses."""
import argparse
import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSE = ROOT / 'content/japanese-travel-lunch'
OUTPUT = COURSE / 'private-dictionary-candidates.json'
STAGES = {'foundation': (10, 'foundation-travel-lunch'), 'core': (30, 'travel-lunch'), 'master': (20, 'master-travel-lunch')}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def compact(value):
    return ''.join(unicodedata.normalize('NFC', value).split())


def build():
    entries = {}
    headwords = defaultdict(set)
    kinds_by_word = defaultdict(set)
    lesson_ids = set()
    source_hashes = {}
    placements = 0
    for path in sorted(COURSE.glob('*-draft.json')):
        match = re.fullmatch(r'(foundation|core|master)-(\d+)-(\d+)-draft\.json', path.name)
        if not match:
            raise ValueError(f'Unexpected lesson source: {path.name}')
        stage = match.group(1)
        raw = path.read_bytes()
        draft = json.loads(raw)
        if (draft['target'], draft['native']) != ('Japanese', 'English') or draft['reviewed'] is not False or draft['registered'] is not False:
            raise ValueError(f'Wrong pair or release state: {path.name}')
        source_hashes[str(path.relative_to(ROOT))] = sha(raw)
        for lesson in draft['lessons']:
            n = lesson['n']
            lid = f'{STAGES[stage][1]}:{n}:ja-en'
            if lesson['stableId'] != lid or lid in lesson_ids:
                raise ValueError(f'Unstable or duplicate lesson ID: {lid}')
            lesson_ids.add(lid)
            for index, card in enumerate(lesson['cards'], 1):
                japanese, english, kind = card['ja'].strip(), card['en'].strip(), card['kind']
                if not japanese or not english or kind not in {'term', 'phrase'}:
                    raise ValueError(f'Invalid authored card: {lid}:{index}')
                word_key = compact(japanese)
                english_key = english.casefold()
                key = (word_key, english_key)
                digest = sha((word_key+'\0'+english_key).encode())[:16]
                entry = entries.setdefault(key, {'id': 'ja-en-lunch-'+digest, 'word': japanese, 'english': english, 'kinds': set(), 'cardRefs': [], 'readerEvidence': []})
                if (entry['word'], entry['english']) != (japanese, english):
                    raise ValueError(f'Conflicting display form for {key}')
                entry['kinds'].add(kind)
                entry['cardRefs'].append(f'{lid}:card:{index}')
                headwords[word_key].add(english_key)
                kinds_by_word[word_key].add(kind)
                placements += 1
                if len(word_key) > 1:
                    for turn_index, turn in enumerate(lesson['reader'], 1):
                        if word_key in compact(turn['ja']):
                            evidence = {'lessonId': lid, 'readerTurn': turn_index, 'target': turn['ja'], 'english': turn['en']}
                            if evidence not in entry['readerEvidence']:
                                entry['readerEvidence'].append(evidence)
                            break
    for stage, (expected, module) in STAGES.items():
        found = {int(lid.split(':')[1]) for lid in lesson_ids if lid.startswith(module+':')}
        if found != set(range(1, expected+1)):
            raise ValueError(f'Incomplete {stage} stage')
    if len(lesson_ids) != 60 or placements != 1099:
        raise ValueError('Course/card placement count changed')
    ordered = []
    for key, entry in sorted(entries.items()):
        entry['kinds'] = sorted(entry['kinds'])
        entry['qualifiedJapaneseReviewRequired'] = True
        entry['reviewed'] = False
        entry['runtimeRegistered'] = False
        ordered.append(entry)
    ambiguous = [{'word': key, 'englishSenses': sorted(senses)} for key, senses in sorted(headwords.items()) if len(senses) > 1]
    conflicts = [{'word': key, 'kinds': sorted(kinds)} for key, kinds in sorted(kinds_by_word.items()) if len(kinds) > 1]
    return {'schema': 1, 'moduleId': 'travel-lunch', 'pairKey': 'Japanese:English', 'state': 'private-authored-card-sense-candidates', 'reviewed': False, 'runtimeRegistered': False, 'sourceLessonFiles': source_hashes, 'lessons': len(lesson_ids), 'cardPlacements': placements, 'candidatePairs': len(ordered), 'ambiguousHeadwords': ambiguous, 'classificationConflicts': conflicts, 'candidatesWithoutReaderEvidence': sum(not entry['readerEvidence'] for entry in ordered), 'entries': ordered}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    report = build()
    encoded = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text() != encoded:
            raise SystemExit('Private dictionary candidates are missing or stale')
    else:
        OUTPUT.write_text(encoded)
    print(f"Japanese Lunch dictionary: {report['lessons']} lessons, {report['cardPlacements']} card placements, {report['candidatePairs']} explicit pairs, {len(report['ambiguousHeadwords'])} ambiguous headwords, {len(report['classificationConflicts'])} classification conflicts, {report['candidatesWithoutReaderEvidence']} without Reader evidence; all unreviewed")
