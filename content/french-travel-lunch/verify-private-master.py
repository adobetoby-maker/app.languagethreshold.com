#!/usr/bin/env python3
"""Validate private French Lunch Master drafts against the pinned Spanish source."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DRAFTS = (
    ROOT / 'content/french-travel-lunch/master-1-5-draft.json',
    ROOT / 'content/french-travel-lunch/master-6-10-draft.json',
    ROOT / 'content/french-travel-lunch/master-11-15-draft.json',
    ROOT / 'content/french-travel-lunch/master-16-20-draft.json',
)
MODES = ('see', 'recall', 'hear', 'type', 'say', 'write')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(draft, source_bytes, expected_numbers):
    require((draft.get('schema'), draft.get('courseId'), draft.get('stageId'),
             draft.get('targetLanguage'), draft.get('nativeLanguage'),
             draft.get('pairKey'), draft.get('locale'), draft.get('state'),
             draft.get('reviewed'), draft.get('registered'),
             draft.get('readyForLearner'), draft.get('audio')) ==
            (1, 'travel-lunch', 'master-travel-lunch', 'French', 'English',
             'French:English', 'fr-FR', 'partial-authored-draft', False,
             False, False, 'none'), 'Wrong pair, stage, or release gate')
    require(draft['source']['path'] == 'src/data/core60/es/master-travel-lunch.json' and
            draft['source']['sha256'] == hashlib.sha256(source_bytes).hexdigest(),
            'Spanish Master source changed')
    source = json.loads(source_bytes)
    require((source.get('module'), source.get('language'),
             source.get('nativeLanguage'), len(source.get('lessons', []))) ==
            ('master-travel-lunch', 'Spanish', 'English', 20),
            'Spanish Master source shape changed')
    lessons = draft['lessons']
    require([lesson['n'] for lesson in lessons] == list(expected_numbers),
            'Master lesson sequence changed')
    totals = {'cards': 0, 'readerTurns': 0, 'modeActivities': 0}
    for lesson in lessons:
        n = lesson['n']
        original = source['lessons'][n-1]
        require(lesson['stableId'] == f'master-travel-lunch:{n}:fr-en',
                f'Master {n}: wrong progress identity')
        require((lesson['sourceTitleEnglish'], lesson['sourceObjectiveEnglish'],
                 lesson['sourceSpeakingEnglish']) ==
                (original['title'], original['objective'], original['speaking']),
                f'Master {n}: source purpose changed')
        require(lesson.get('reviewed') is False,
                f'Master {n}: unsupported review')
        require(all(isinstance(lesson[key], str) and lesson[key].strip()
                    for key in ('title', 'objective', 'focus', 'scene')),
                f'Master {n}: missing teaching field')
        cards, reader = lesson['cards'], lesson['reader']
        speaking, modes = lesson['speaking'], lesson['modes']
        require(len(cards) >= 15 and len(reader) >= 8 and set(modes) == set(MODES),
                f'Master {n}: cards, Reader, or modes incomplete')
        require(all(card['kind'] in ('term', 'phrase') and
                    card['fr'].strip() and card['en'].strip() for card in cards),
                f'Master {n}: incomplete card')
        card_text = {card['fr'] for card in cards}
        require(len(card_text) == len(cards), f'Master {n}: duplicate card text')
        require(all(line['speaker'].strip() and line['fr'].strip() and
                    line['en'].strip() for line in reader),
                f'Master {n}: incomplete aligned Reader')
        require(all(speaking[key].strip() for key in
                    ('role', 'partnerRole', 'opening', 'goal', 'closure')) and
                len(speaking['wordBank']) >= 6 and
                set(speaking['wordBank']).issubset(card_text),
                f'Master {n}: speaking bank not owned by lesson')
        cues = set()
        for mode in MODES:
            activity = modes[mode]
            ref = activity['sourceCard']
            require(type(ref) is int and 1 <= ref <= len(cards) and
                    activity['cueEnglish'].strip() and
                    activity['responseKind'] ==
                    ('open' if mode in ('say', 'write') else 'fixed'),
                    f'Master {n}: invalid {mode} activity')
            require(activity['cueEnglish'] not in cues,
                    f'Master {n}: repeated activity cue')
            cues.add(activity['cueEnglish'])
        totals['cards'] += len(cards)
        totals['readerTurns'] += len(reader)
        totals['modeActivities'] += len(modes)
    return {'lessons': len(lessons), **totals, 'reviewed': False, 'registered': False}


if __name__ == '__main__':
    drafts = [json.loads(path.read_text()) for path in DRAFTS]
    source_bytes = (ROOT / drafts[0]['source']['path']).read_bytes()
    results = [validate(draft, source_bytes, range(1 + 5 * index, 6 + 5 * index))
               for index, draft in enumerate(drafts)]
    lessons = [lesson for draft in drafts for lesson in draft['lessons']]
    require([lesson['n'] for lesson in lessons] == list(range(1, 1 + len(lessons))),
            'Master lessons are not contiguous')
    require(len({lesson['stableId'] for lesson in lessons}) == len(lessons),
            'Master lesson IDs overlap')
    print(json.dumps({'lessons': len(lessons),
                      'cards': sum(result['cards'] for result in results),
                      'readerTurns': sum(result['readerTurns'] for result in results),
                      'modeActivities': sum(result['modeActivities'] for result in results),
                      'reviewed': False, 'registered': False}))
