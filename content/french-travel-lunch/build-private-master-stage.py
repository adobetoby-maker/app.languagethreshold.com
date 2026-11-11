#!/usr/bin/env python3
"""Derive a private French Lunch Master stage from source-pinned authored lessons."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'content/french-travel-lunch'
SOURCES = [DIR / f'master-{n}-{n+4}-draft.json' for n in (1, 6, 11, 16)]
CONTENT = DIR / 'master-lesson-content-candidate.json'
SPANISH = ROOT / 'src/data/core60/es/master-travel-lunch.json'
DESTINATION = ROOT / 'src/data/core60/fr/master-travel-lunch-fr.json'

# Two source-authored, context-specific grammar examples per lesson. Indices
# refer to phrase cards in the pinned French source, not Spanish translations.
EXAMPLE_CARDS = {
    1: (15, 16), 2: (11, 12), 3: (10, 12), 4: (11, 13), 5: (10, 11),
    6: (12, 14), 7: (12, 13), 8: (10, 11), 9: (12, 15), 10: (11, 13),
    11: (12, 13), 12: (12, 13), 13: (13, 14), 14: (11, 13), 15: (14, 18),
    16: (14, 16), 17: (13, 14), 18: (13, 16), 19: (13, 15), 20: (11, 14),
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(value, message):
    if not value:
        raise ValueError(message)


def build():
    source_hashes = {}
    sources = {}
    for path in SOURCES:
        source_hashes[str(path.relative_to(ROOT))] = sha(path)
        draft = json.loads(path.read_text())
        require((draft['stageId'], draft['pairKey'], draft['locale'], draft['reviewed'],
                 draft['registered'], draft['readyForLearner']) ==
                ('master-travel-lunch', 'French:English', 'fr-FR', False, False, False),
                f'{path.name}: pair or release gate changed')
        for lesson in draft['lessons']:
            require(lesson['reviewed'] is False, f"{path.name}/{lesson['n']}: review changed")
            sources[lesson['n']] = lesson
    require(set(sources) == set(range(1, 21)), 'Master source coverage changed')
    candidate = json.loads(CONTENT.read_text())
    require(candidate['module'] == 'master-travel-lunch' and
            candidate['language'] == 'French' and candidate['nativeLanguage'] == 'English' and
            candidate['reviewed'] is False and candidate['registered'] is False and
            set(candidate['lessons']) == {str(n) for n in range(1, 21)},
            'Master content candidate identity or release gate changed')
    spanish = json.loads(SPANISH.read_text())
    require(spanish['module'] == 'master-travel-lunch' and
            spanish['language'] == 'Spanish' and len(spanish['lessons']) == 20,
            'Spanish structural baseline changed')
    lessons = []
    for number in range(1, 21):
        source = sources[number]
        content = candidate['lessons'][str(number)]
        baseline = spanish['lessons'][number - 1]
        stable_id = f'master-travel-lunch:{number}:fr-en'
        require(source['stableId'] == content['stableId'] == stable_id and
                baseline['n'] == number, f'Master {number}: lesson identity changed')
        words = []
        for index in content['sourceCardIndices']:
            require(1 <= index <= len(source['cards']), f'Master {number}: source card index changed')
            card = source['cards'][index - 1]
            override = content.get('sourceCardTextOverrides', {}).get(str(index), {})
            kind = content.get('sourceCardKindOverrides', {}).get(str(index), card['kind'])
            words.append({'es': override.get('es', card['fr']),
                          'en': override.get('en', card['en']), 'kind': kind,
                          **({'note': card['note']} if 'note' in card else {})})
        for word in content.get('supplementalWords', []):
            words.append({key: word[key] for key in ('es', 'en', 'kind')})
        examples = []
        for index in EXAMPLE_CARDS[number]:
            require(1 <= index <= len(source['cards']) and
                    source['cards'][index - 1]['kind'] == 'phrase',
                    f'Master {number}: grammar example must be a source phrase')
            card = source['cards'][index - 1]
            examples.append({'es': card['fr'], 'en': card['en']})
        lessons.append({
            'n': number, 'stableId': stable_id, 'title': source['title'],
            'objective': source['objective'], 'focus': source['focus'],
            'words': words, 'sourceCardIndices': content['sourceCardIndices'],
            'speaking': source['speaking']['goal'],
            'speakingScene': source['speaking'], 'reader': source['reader'],
            'modes': source['modes'],
            'grammar': {'focus': source['focus'], 'examples': examples},
            'sourceGrammarExampleCardIndices': list(EXAMPLE_CARDS[number]),
            'lessonType': baseline['lessonType'], 'block': baseline['block'],
        })
    return {'version': 1, 'module': 'master-travel-lunch-fr',
            'baseModule': 'travel-lunch', 'stage': 'master',
            'language': 'French', 'nativeLanguage': 'English',
            'headline': 'French Lunch Master 20',
            'threshold': 'Explain, negotiate, document and review a complex lunch in French with English support.',
            'reviewed': False, 'registered': False,
            'sourceHashes': source_hashes,
            'contentCandidateSha256': sha(CONTENT),
            'spanishStructureSha256': sha(SPANISH),
            'lessons': lessons}


if __name__ == '__main__':
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + '\n'
    if sys.argv[1:] == ['--write']:
        DESTINATION.parent.mkdir(parents=True, exist_ok=True)
        DESTINATION.write_text(rendered)
    elif sys.argv[1:] == ['--check']:
        require(DESTINATION.read_text() == rendered, 'Private French Master stage differs from sources')
    else:
        raise SystemExit('Usage: build-private-master-stage.py --write|--check')
    print(json.dumps({'stage': 'master', 'lessons': len(build()['lessons']),
                      'registered': False, 'reviewed': False}))
