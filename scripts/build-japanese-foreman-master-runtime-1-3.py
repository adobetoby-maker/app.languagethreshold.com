#!/usr/bin/env python3
"""Build unpublished Japanese Foreman Master 1–3 pair-safe runtime inputs."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
SOURCE = CONTENT / 'master-translation-1-3-draft.json'
OUTPUT = CONTENT / 'master-runtime-pilot-1-3-ja-en.json'
COURSE_ID = 'master-construction-foreman-ja-en'
MODES = ['see', 'recall', 'hear', 'type', 'say', 'write']
DISPUTED_ENGLISH = 'If the mat sits too low, water reaches the steel.'
BLOCKER = ('Master 2 garage-deck/deicing-water source concern: the English claim that a lower '
           'rebar mat lets water reach steel may be technically wrong for exposure from above. '
           'Qualified structural/concrete review must resolve English and Japanese before release.')
DETAILS = {
  1: {'title': 'Explain why shores stay', 'focus': 'Sequence まず → その後 → ですから and explain that site-specific engineer approval controls shore removal.',
      'summary': 'Explain why shores remain, answer a new carpenter’s question, then request a teach-back.',
      'role': 'A new carpenter who asks why the shores cannot yet be removed.', 'answers': ['スラブ', '支柱', '構造技術者']},
  2: {'title': 'Check the specified concrete cover', 'focus': 'Explain plan-specific cover, chairs and measurement. Do not teach the disputed water/rebar-height claim as fact.',
      'summary': 'Use the structural sheet to explain cover and chairs, check measurements, and ask the trainee to teach back the approved procedure.',
      'role': 'A trainee who asks about rebar chairs and the cover shown on the structural sheet.', 'answers': ['かぶり厚さ', '鉄筋用チェア', '構造図']},
  3: {'title': 'Teach a harness inspection sequence', 'focus': 'Use 〜前に for timing and 〜たら/〜場合 for conditional damage and escalation; follow the qualified site procedure.',
      'summary': 'Guide a new worker through pre-use inspection, correct missed checks, then request a teach-back.',
      'role': 'A new worker practicing a site-approved harness and lanyard inspection.', 'answers': ['点検', '縫い目', '破損']},
}

def stable_id(prefix, *parts):
    digest = hashlib.sha256('\x1f'.join(map(str, parts)).encode()).hexdigest()[:16]
    return f'{prefix}-{digest}'

def build():
    draft = json.loads(SOURCE.read_text())
    assert (draft['moduleId'], draft['target'], draft['native'], draft['stage']) == ('construction-foreman', 'Japanese', 'English', 'master')
    assert draft['state'] == 'translation-draft' and draft['reviewed'] is False
    assert [x['n'] for x in draft['lessons']] == [1, 2, 3]
    lessons, cards, dictionary, seen = [], [], [], set()
    for source in draft['lessons']:
        n = source['n']; detail = DETAILS[n]
        lesson_id = f'{COURSE_ID}:lesson:{n}'
        words = []
        for term in source['terms']:
            pair = (term['ja'], term['en'])
            card_id = stable_id('card-ja-en', COURSE_ID, *pair)
            words.append({'es': pair[0], 'en': pair[1], 'kind': term['kind'], 'cardId': card_id})
            if pair not in seen:
                seen.add(pair)
                cards.append({'id': card_id, 'courseId': COURSE_ID, 'target': pair[0], 'native': pair[1], 'kind': term['kind'], 'firstLesson': n})
                dictionary.append({'id': stable_id('dict-ja-en', COURSE_ID, *pair), 'courseId': COURSE_ID, 'target': pair[0], 'native': pair[1], 'kind': term['kind'], 'firstLesson': n})
        phrases = [x for x in source['terms'] if x['kind'] == 'phrase' and x['en'] != DISPUTED_ENGLISH]
        assert len(phrases) == 8 - (n == 2)
        sentences = [{'target': x['ja'], 'native': x['en']} for x in phrases]
        checks = []
        for line, answer in zip(sentences, detail['answers']):
            assert line['target'].count(answer) == 1, (n, answer)
            checks.append({'prompt': line['target'].replace(answer, '____', 1), 'hint': line['native'], 'answer': answer,
                           'explanation': f'{answer} appears in this lesson’s source phrase.'})
        grammar_examples = [{'es': ja, 'en': en} for ja, en in zip(source['grammarExamplesJapanese'], source['grammarExamplesEnglish'])]
        assert len(grammar_examples) == 2
        lessons.append({'id': lesson_id, 'n': n, 'title': detail['title'], 'objective': source['objectiveEnglish'],
                        'sourceObjective': source['objectiveEnglish'], 'words': words, 'modes': MODES,
                        'reader': {'id': f'reader-{lesson_id}', 'title': detail['title'], 'state': 'phrase-sequence-draft', 'sentences': sentences},
                        'grammar': {'focus': detail['focus'], 'teachingJapanese': source['grammarTeachingJapanese'],
                                    'teachingNotesEnglish': source['teachingNotesEnglish'], 'examples': grammar_examples},
                        'speaking': {'id': f'speak-{lesson_id}', 'summary': detail['summary'],
                                     'sourceSpeakingJapanese': source['speakingJapanese'], 'openingLine': phrases[0]['ja'],
                                     'partnerRole': detail['role'], 'locale': 'ja-JP'},
                        'checks': checks, 'technicalSourceBlockers': [BLOCKER] if n == 2 else [], 'reviewed': False})
    return {'version': 1, 'state': 'private-runtime-draft', 'reviewed': False, 'courseId': COURSE_ID,
            'sourceModuleId': 'construction-foreman', 'baseModuleId': 'construction-foreman',
            'target': 'Japanese', 'native': 'English', 'pairKey': 'Japanese:English', 'locale': 'ja-JP',
            'sourceEnglishSubsetSha256': draft['englishSubsetSHA256'], 'lessons': lessons,
            'cards': cards, 'dictionary': dictionary}

if __name__ == '__main__':
    bundle = build()
    OUTPUT.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + '\n')
    print(f"Built private {COURSE_ID} Master 1–3: {len(bundle['cards'])} cards")
