#!/usr/bin/env python3
"""Verify source-pinned Japanese Dinner Core 26 with release gates closed."""

import hashlib
import json
import re
import runpy
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MODES = {'see', 'recall', 'hear', 'type', 'say', 'write'}
KANJI = re.compile(r'[\u3400-\u9fff]')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    runpy.run_path(str(HERE / 'verify-private-core-1-25.py'))['main']()
    previous = json.loads((HERE / 'core-16-18-draft.json').read_text())
    draft = json.loads((HERE / 'core-26-draft.json').read_text())
    source = previous['source']
    require(draft['source'] == source, 'Core source pins differ')
    plan_raw = (ROOT / source['planPath']).read_bytes()
    content_raw = (ROOT / source['contentPath']).read_bytes()
    require(hashlib.sha256(plan_raw).hexdigest() == source['planSHA256'] and
            hashlib.sha256(content_raw).hexdigest() == source['contentSHA256'],
            'Spanish Dinner source changed')
    plan = plan_raw.decode()
    plan_lessons = re.findall(r'lesson\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"',
                             plan[plan.index('id: "travel-dinner"'):], re.DOTALL)
    content = json.loads(content_raw)['lessons']
    require((draft['courseId'], draft['stageId'], draft['pairKey'], draft['locale']) ==
            ('travel-dinner', 'travel-dinner', 'Japanese:English', 'ja-JP'), 'Pair changed')
    require((draft['reviewed'], draft['registered'], draft['readyForLearner'], draft['audio']) ==
            (False, False, False, 'none'), 'Release gate changed')
    require(len(draft['lessons']) == 1, 'Expected exactly Core 26')
    lesson = draft['lessons'][0]
    require((lesson['n'], lesson['stableId'], lesson['reviewed']) ==
            (26, 'travel-dinner:26:ja-en', False), 'Core 26 stable ID or review gate')
    require(tuple(lesson[k] for k in ('sourceTitleEnglish', 'sourceObjectiveEnglish',
                                      'sourceSpeakingEnglish')) == plan_lessons[25],
            'Core 26 source plan changed')
    require(len(content['26']['words']) >= 15 and
            len(content['26']['passage']['target']) == len(content['26']['passage']['native']) >= 7,
            'Core 26 source incomplete')
    require(all(lesson[k].strip() for k in ('title', 'objective', 'focus', 'scene')),
            'Core 26 teaching incomplete')
    require(len(lesson['forms']) >= 2 and all(
            all(form.get(k, '').strip() for k in ('base', 'polite', 'question', 'meaning'))
            for form in lesson['forms']), 'Core 26 forms incomplete')
    cards, reader, speaking = lesson['cards'], lesson['reader'], lesson['speaking']
    require(20 <= len(cards) <= 28 and 8 <= len(reader) <= 12, 'Core 26 cards/Reader count')
    card_texts = [card['ja'] for card in cards]
    require(len(set(card_texts)) == len(card_texts), 'Core 26 duplicate cards')
    require(all(card.get('ja', '').strip() and card.get('en', '').strip() and
                card.get('kind') in ('term', 'phrase') and
                (not KANJI.search(card['ja']) or card.get('readingKana', '').strip())
                for card in cards), 'Core 26 invalid card or kana')
    require(all(all(turn.get(k, '').strip() for k in ('speaker', 'ja', 'en'))
                for turn in reader), 'Core 26 Reader incomplete')
    require(all(speaking.get(k, '').strip() for k in
                ('role', 'partnerRole', 'opening', 'goal', 'closure')) and
            speaking['goal'] == lesson['sourceSpeakingEnglish'] and
            len(speaking['wordBank']) >= 6 and
            all(word in card_texts for word in speaking['wordBank']),
            'Core 26 speaking incomplete')
    require(set(lesson['modes']) == MODES and
            len({mode['sourceCard'] for mode in lesson['modes'].values()}) == 6,
            'Core 26 mode inventory')
    for name, mode in lesson['modes'].items():
        index = mode['sourceCard'] - 1
        require(mode.get('cueEnglish', '').strip() and 0 <= index < len(cards) and
                mode['cueEnglish'] == cards[index]['en'] and
                mode['responseKind'] == ('open' if name in ('say', 'write') else 'fixed'),
                f'Core 26 invalid {name} mode')
    require([turn['en'] for turn in reader] == content['26']['passage']['native'],
            'Core 26 Reader English diverged from source')
    joined = ' '.join(turn['ja'] for turn in reader)
    require(all(term in joined for term in ('セビリア', 'クララ', 'マルコ', '乾杯', '友情', '主催者', 'シェフ')),
            'Core 26 source facts incomplete')
    print('Japanese Dinner Core 1–26: source-pinned private drafts valid; reviewed:false, registered:false')


if __name__ == '__main__':
    main()
