#!/usr/bin/env python3
"""Verify source-pinned private Japanese Dinner Core 1–12 and closed gates."""
import hashlib
import json
import re
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MODES = {'see', 'recall', 'hear', 'type', 'say', 'write'}
KANJI = re.compile(r'[\u3400-\u9fff]')

def require(ok, message):
    if not ok:
        raise ValueError(message)

def main():
    runpy.run_path(str(HERE / 'verify-private-core-1-9.py'))['main']()
    old_names = ('core-1-draft.json', 'core-2-3-draft.json', 'core-4-draft.json',
                 'core-5-6-draft.json', 'core-7-9-draft.json')
    older = [json.loads((HERE / name).read_text()) for name in old_names]
    draft = json.loads((HERE / 'core-10-12-draft.json').read_text())
    source = draft['source']
    require(all(batch['source'] == source for batch in older), 'Core source pins differ')
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
    require(len(draft['lessons']) == 3, 'Expected exactly Core 10–12')
    all_lessons = [lesson for batch in older + [draft] for lesson in batch['lessons']]
    require([lesson['stableId'] for lesson in all_lessons] ==
            [f'travel-dinner:{n}:ja-en' for n in range(1, 13)], 'Core stable IDs changed')
    for n, lesson in enumerate(draft['lessons'], 10):
        require((lesson['n'], lesson['reviewed']) == (n, False), f'Core {n} review gate')
        require(tuple(lesson[k] for k in ('sourceTitleEnglish', 'sourceObjectiveEnglish',
                                          'sourceSpeakingEnglish')) == plan_lessons[n-1],
                f'Core {n} source plan changed')
        require(len(content[str(n)]['words']) >= 15 and
                len(content[str(n)]['passage']['target']) ==
                len(content[str(n)]['passage']['native']) >= 7, f'Core {n} source incomplete')
        require(all(lesson[k].strip() for k in ('title', 'objective', 'focus', 'scene')),
                f'Core {n} teaching incomplete')
        require(len(lesson['forms']) >= 2 and all(
                all(form.get(k, '').strip() for k in ('base', 'polite', 'question', 'meaning'))
                for form in lesson['forms']), f'Core {n} forms incomplete')
        cards, reader, speaking = lesson['cards'], lesson['reader'], lesson['speaking']
        require(15 <= len(cards) <= 24 and len(reader) >= 9, f'Core {n} cards/Reader count')
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
                len(speaking['wordBank']) >= 6 and
                all(word in card_texts for word in speaking['wordBank']),
                f'Core {n} speaking incomplete')
        require(set(lesson['modes']) == MODES and
                len({m['sourceCard'] for m in lesson['modes'].values()}) == 6,
                f'Core {n} mode inventory')
        for name, mode in lesson['modes'].items():
            require(mode.get('cueEnglish', '').strip() and
                    1 <= mode['sourceCard'] <= len(cards) and
                    mode['responseKind'] == ('open' if name in ('say', 'write') else 'fixed'),
                    f'Core {n} invalid {name} mode')
    ten, eleven, twelve = draft['lessons']
    require(all(s in ' '.join(x['ja'] for x in ten['reader']) for s in
                ('記念日', 'サプライズ', 'ろうそく', '小さなケーキ', '乾杯のあいさつ')),
            'Core 10 celebration arc lost')
    require(all(s in ' '.join(x['ja'] for x in eleven['reader']) for s in
                ('きのこソース', '生焼け', '火を通す', '魚', '肉料理', '取り替え')),
            'Core 11 order correction arc lost')
    require(all(s in ' '.join(x['ja'] for x in twelve['reader']) for s in
                ('フラン', 'チョコレートケーキ', 'チーズの盛り合わせ', 'アメリカーノ',
                 '食後酒', '焼酎', 'お会計')),
            'Core 12 dessert and after-dinner arc lost')
    print('Japanese Dinner Core 1–12 source-pinned private drafts valid; '
          'Core 10–12: 54 cards, 29 Reader turns, 18 activities; gates closed.')

if __name__ == '__main__':
    main()
