#!/usr/bin/env python3
"""Build a strict-text, source-only audit of archived Japanese Breakfast Foundation drafts."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CURRICULUM = ROOT / 'src/data/core60/es/foundation-travel-breakfast.json'
READER = ROOT / 'public/lesson-content/es/foundation-travel-breakfast.json'
DRAFT = ROOT / 'content/review-archive/french-japanese-2026-11-15/japanese-breakfast/foundation-1-10-draft.json'
OUT = HERE / 'source-objective-audit.json'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    source = json.loads(CURRICULUM.read_text())['lessons']
    reader = json.loads(READER.read_text())['lessons']
    draft_root = json.loads(DRAFT.read_text())
    assert draft_root['reviewed'] is False and draft_root['registered'] is False
    assert draft_root['audio'] == 'none' and draft_root['state'] == 'authored-draft-partial'
    draft = draft_root['lessons']
    assert len(source) == len(draft) == len(reader) == 10
    rows = []
    for n in range(1, 11):
        s, d, r = source[n - 1], draft[n - 1], reader[str(n)]['passage']
        assert s['n'] == d['n'] == n
        assert d['stableId'] == f'foundation-travel-breakfast:{n}:ja-en'
        assert d['sourceEnglishObjective'] == s['objective']
        assert sorted(d['modes']) == ['hear', 'recall', 'say', 'see', 'type', 'write']
        assert len(r['target']) == len(r['native'])
        source_words = [w['en'] for w in s['words']]
        draft_words = [w['en'] for w in d['cards']]
        source_reader = r['native']
        draft_reader = [line['en'] for line in d['reader']]
        rows.append({
            'n': n, 'stableId': d['stableId'], 'sourceObjective': s['objective'],
            'draftObjective': d['objective'], 'sourceFocus': s['focus'], 'draftFocus': d['focus'],
            'sourceCardEnglish': source_words, 'draftCardEnglish': draft_words,
            'exactCardEnglishAnywhere': sum(word in source_words for word in draft_words),
            'sourceReaderEnglish': source_reader, 'draftReaderEnglish': draft_reader,
            'exactReaderEnglishAnywhere': sum(line in source_reader for line in draft_reader),
            'draftModeNames': sorted(d['modes']),
            'draftSpeakingPresent': bool(d.get('speaking')),
            'disposition': 'original Japanese scene; source objective pinned, card/Reader semantics need qualified comparison',
        })
    return {
        'schema': 1, 'pairKey': 'Japanese:English', 'stage': 'foundation',
        'sourceCurriculumSha256': digest(CURRICULUM), 'sourceReaderSha256': digest(READER),
        'archivedDraftSha256': digest(DRAFT), 'reviewed': False, 'registered': False,
        'learnerReady': False, 'audioRegistered': False, 'progressEnabled': False,
        'comparisonKind': 'strict exact English text overlap; zero overlap does not establish semantic failure',
        'lessons': rows,
    }


def main():
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + '\n'
    if '--check' in sys.argv:
        assert OUT.read_text() == rendered, 'source audit is stale'
        print('PASS Japanese Breakfast Foundation 1–10 source-objective audit')
    else:
        OUT.write_text(rendered)
        print(f'Wrote {OUT}')


if __name__ == '__main__':
    main()
