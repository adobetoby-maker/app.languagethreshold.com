#!/usr/bin/env python3
"""Verify source-pinned Japanese Dinner Core 1–18 with release gates closed."""

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
    runpy.run_path(str(HERE / 'verify-private-core-1-15.py'))['main']()
    previous = json.loads((HERE / 'core-13-15-draft.json').read_text())
    draft = json.loads((HERE / 'core-16-18-draft.json').read_text())
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
    require(len(draft['lessons']) == 3, 'Expected exactly Core 16–18')
    for n, lesson in enumerate(draft['lessons'], 16):
        require((lesson['n'], lesson['stableId'], lesson['reviewed']) ==
                (n, f'travel-dinner:{n}:ja-en', False), f'Core {n} stable ID or review gate')
        require(tuple(lesson[k] for k in ('sourceTitleEnglish', 'sourceObjectiveEnglish',
                                          'sourceSpeakingEnglish')) == plan_lessons[n - 1],
                f'Core {n} source plan changed')
        require(len(content[str(n)]['words']) >= 15 and
                len(content[str(n)]['passage']['target']) ==
                len(content[str(n)]['passage']['native']) >= 7,
                f'Core {n} source incomplete')
        require(all(lesson[k].strip() for k in ('title', 'objective', 'focus', 'scene')),
                f'Core {n} teaching incomplete')
        require(len(lesson['forms']) >= 2 and all(
                all(form.get(k, '').strip() for k in ('base', 'polite', 'question', 'meaning'))
                for form in lesson['forms']), f'Core {n} forms incomplete')
        cards, reader, speaking = lesson['cards'], lesson['reader'], lesson['speaking']
        require(15 <= len(cards) <= 24 and 9 <= len(reader) <= 12,
                f'Core {n} cards/Reader count')
        card_texts = [card['ja'] for card in cards]
        require(len(set(card_texts)) == len(card_texts), f'Core {n} duplicate cards')
        require(all(card.get('ja', '').strip() and card.get('en', '').strip() and
                    card.get('kind') in ('term', 'phrase') and
                    (not KANJI.search(card['ja']) or card.get('readingKana', '').strip())
                    for card in cards), f'Core {n} invalid card or kana')
        require(all(all(turn.get(k, '').strip() for k in ('speaker', 'ja', 'en'))
                    for turn in reader), f'Core {n} Reader incomplete')
        require(all(speaking.get(k, '').strip() for k in
                    ('role', 'partnerRole', 'opening', 'goal', 'closure')) and
                speaking['goal'] == lesson['sourceSpeakingEnglish'] and
                len(speaking['wordBank']) >= 6 and
                all(word in card_texts for word in speaking['wordBank']),
                f'Core {n} speaking incomplete')
        require(set(lesson['modes']) == MODES and
                len({mode['sourceCard'] for mode in lesson['modes'].values()}) == 6,
                f'Core {n} mode inventory')
        for name, mode in lesson['modes'].items():
            index = mode['sourceCard'] - 1
            require(mode.get('cueEnglish', '').strip() and
                    0 <= index < len(cards) and
                    mode['cueEnglish'] == cards[index]['en'] and
                    mode['responseKind'] == ('open' if name in ('say', 'write') else 'fixed'),
                    f'Core {n} invalid {name} mode')
    sixteen, seventeen, eighteen = draft['lessons']
    require(all(term in ' '.join(turn['ja'] for turn in sixteen['reader']) for term in
                ('ミラー', '確認番号', 'テラス', '30分')), 'Core 16 lost reservation arc')
    require(all(term in ' '.join(turn['ja'] for turn in seventeen['reader']) for term in
                ('スマートカジュアル', 'ジャケット', 'ショートパンツ', 'テラス')),
            'Core 17 lost dress-code arc')
    require(all(term in ' '.join(turn['ja'] for turn in eighteen['reader']) for term in
                ('7時', 'お子様メニュー', 'ソース', 'ナッツ', 'シェフ')),
            'Core 18 lost family/allergy arc')
    print('Japanese Dinner Core 1–18: source-pinned private drafts valid; reviewed:false, registered:false')


if __name__ == '__main__':
    main()
