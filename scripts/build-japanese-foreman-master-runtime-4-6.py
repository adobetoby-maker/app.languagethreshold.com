#!/usr/bin/env python3
"""Build unpublished Japanese Foreman Master 4–6 pair-safe runtime inputs."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
SOURCE = CONTENT / 'master-translation-4-6-draft.json'
OUTPUT = CONTENT / 'master-runtime-pilot-4-6-ja-en.json'
COURSE_ID = 'master-construction-foreman-ja-en'
MODES = ['see', 'recall', 'hear', 'type', 'say', 'write']
EXCLUDED_READER_ENGLISH = {
  4: {
    'You have to put on the respirator before opening the bags.',
    'After placing it, it has to be kept moist per the data sheet.',
  },
  5: {
    'We could remove it and backfill with compacted material, as the engineer specifies.',
    'Another option would be to move the footing, if the engineer approves it.',
  },
  6: {
    'Elena, if we wait, the interior finishes will start later.',
    "Meanwhile, we're going to cover the openings with plastic.",
  },
}
BLOCKERS = {
  4: ['Actual product data sheet and SDS must determine water, working/curing time and respiratory protection; no values or respirator type are approved here. Grout/masonry specialist review required.'],
  5: ['US septic/drain-field, spread-footing, agency and change-order wording uses provisional Japanese equivalents; engineer and jurisdiction specialists must verify procedures before release.'],
  6: ['Supplier delivery estimate alone does not establish schedule effects; project manager must confirm. Window substitution requires architect written approval; protection and performance details need trade review.'],
}
DETAILS = {
  4: {'title': 'Read the grout data sheet', 'focus': 'Use 〜前に and 〜必要があります to identify actions from the actual product data sheet and SDS; do not invent water, time or PPE specifications.',
      'summary': 'Read the actual product documents with a mason, locate mixing and safety directions, and confirm unresolved specifications before work.',
      'role': 'A mason who asks where the data sheet specifies mixing water, time and safety precautions.',
      'answers': ['データシート', '練り混ぜ水', '指示']},
  5: {'title': 'Report an unexpected tank', 'focus': 'Use 〜ていたとき to report a discovery and conditionals for options awaiting engineer and jurisdiction approval.',
      'summary': 'Tell the homeowner what was found, explain the work is paused in that location, and describe options only as pending specialist review.',
      'role': 'A homeowner who asks what the discovery means for the footing and cost.',
      'answers': ['浄化槽', 'フーチング', '記録']},
  6: {'title': 'Compare window delivery options', 'focus': 'Use 〜より and 〜見込みです for sourced estimates; separate an unapproved substitute from confirmed schedule changes.',
      'summary': 'Compare supplier estimates with a project manager, request a compliance check and architect written approval before any substitution.',
      'role': 'A project manager who asks for sourced lead times, compliance information and an approval path.',
      'answers': ['納入業者', '代替品', '書面']},
}

def stable_id(prefix, *parts):
    digest = hashlib.sha256('\x1f'.join(map(str, parts)).encode()).hexdigest()[:16]
    return f'{prefix}-{digest}'

def build():
    draft = json.loads(SOURCE.read_text())
    assert (draft['moduleId'], draft['target'], draft['native'], draft['stage']) == ('construction-foreman', 'Japanese', 'English', 'master')
    assert draft['state'] == 'translation-draft' and draft['reviewed'] is False
    assert [x['n'] for x in draft['lessons']] == [4, 5, 6]
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
        phrases = [x for x in source['terms'] if x['kind'] == 'phrase' and x['en'] not in EXCLUDED_READER_ENGLISH[n]]
        assert len(phrases) == 8 - len(EXCLUDED_READER_ENGLISH[n])
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
                        'checks': checks, 'technicalSourceBlockers': BLOCKERS[n], 'reviewed': False})
    return {'version': 1, 'state': 'private-runtime-draft', 'reviewed': False, 'courseId': COURSE_ID,
            'sourceModuleId': 'construction-foreman', 'baseModuleId': 'construction-foreman',
            'target': 'Japanese', 'native': 'English', 'pairKey': 'Japanese:English', 'locale': 'ja-JP',
            'sourceEnglishSubsetSha256': draft['englishSubsetSHA256'], 'lessons': lessons,
            'cards': cards, 'dictionary': dictionary}

if __name__ == '__main__':
    bundle = build()
    OUTPUT.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + '\n')
    print(f"Built private {COURSE_ID} Master 4–6: {len(bundle['cards'])} cards")
