#!/usr/bin/env python3
"""Verify private dictionary candidates cite exact authored Lunch cards."""
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSE = ROOT / 'content/japanese-travel-lunch'
REPORT = json.loads((COURSE / 'private-dictionary-candidates.json').read_text())
assert REPORT['pairKey'] == 'Japanese:English'
assert REPORT['reviewed'] is False and REPORT['runtimeRegistered'] is False
assert REPORT['lessons'] == 60 and REPORT['cardPlacements'] == 1099
assert REPORT['candidatePairs'] == len(REPORT['entries']) == 955
sources = {}
for path in sorted(COURSE.glob('*-draft.json')):
    assert re.fullmatch(r'(foundation|core|master)-\d+-\d+-draft\.json', path.name)
    source = str(path.relative_to(ROOT))
    assert REPORT['sourceLessonFiles'][source] == hashlib.sha256(path.read_bytes()).hexdigest()
    draft = json.loads(path.read_text())
    for lesson in draft['lessons']:
        sources[lesson['stableId']] = lesson
assert len(sources) == 60
seen_refs = set()
by_word = defaultdict(set)
counts = Counter()
for entry in REPORT['entries']:
    assert entry['reviewed'] is False and entry['runtimeRegistered'] is False
    assert entry['qualifiedJapaneseReviewRequired'] is True
    assert entry['word'].strip() and entry['english'].strip()
    assert entry['cardRefs']
    for ref in entry['cardRefs']:
        lid, card_number = ref.rsplit(':card:', 1)
        assert ref not in seen_refs and lid in sources
        seen_refs.add(ref)
        card = sources[lid]['cards'][int(card_number) - 1]
        assert (card['ja'], card['en']) == (entry['word'], entry['english'])
        counts[lid] += 1
    for evidence in entry['readerEvidence']:
        lid = evidence['lessonId']
        turn = sources[lid]['reader'][evidence['readerTurn'] - 1]
        assert (turn['ja'], turn['en']) == (evidence['target'], evidence['english'])
    by_word[''.join(entry['word'].split())].add(entry['english'].casefold())
assert len(seen_refs) == 1099
assert all(counts[lid] == len(lesson['cards']) for lid, lesson in sources.items())
assert len([word for word, meanings in by_word.items() if len(meanings) > 1]) == len(REPORT['ambiguousHeadwords']) == 32
required = {
    ('火傷', 'burn'),
    ('エピネフリン自己注射器', 'epinephrine auto-injector'),
    ('吐き気', 'nausea'),
    ('嘔吐', 'vomiting'),
    ('発熱', 'fever'),
    ('重い貝類アレルギー', 'severe shellfish allergy'),
}
assert required <= {(entry['word'], entry['english']) for entry in REPORT['entries']}
print(f'Japanese Lunch private dictionary: {len(sources)} lessons, {len(seen_refs)} exact card refs, {len(REPORT["entries"])} explicit pairs; all review/registration flags closed')
