#!/usr/bin/env python3
"""Build unpublished Japanese Foreman Master 19–20 pair-safe runtime inputs."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
SOURCE = CONTENT / 'master-translation-19-20-draft.json'
OUTPUT = CONTENT / 'master-runtime-pilot-19-20-ja-en.json'
COURSE_ID = 'master-construction-foreman-ja-en'
MODES = ['see', 'recall', 'hear', 'type', 'say', 'write']
EXCLUDED_READER_ENGLISH = {
  19: {'Hairline cracks are normal when the concrete shrinks.',
       'According to the contract, the workmanship warranty is 1 year.',
       "We'll repair it as long as the crack comes from a workmanship defect.",
       "Don't hang the shelving until the engineer confirms the load.",
       'If the wall is drilled without approval, the warranty might not cover it.'},
  20: {"Felipe, I'm not going to allow the perimeter protection to be removed.",
       'Due to the short delivery, the roof will be finished on Friday.',
       'It should be noted that the perimeter protection stayed in place all day.'},
}
BLOCKERS = {
  19: ['Qualified warranty/contract and construction specialists must verify actual coverage, one-year term, exclusions, repair/no-cost commitments, engineering authority and owner/director roles. Source grammar examples contain unapproved warranty assertions.'],
  20: ['Qualified fall-protection, harness, joist/connection, procurement and inspector review required. Supplier/worker roles are inferred; Friday completion is not an approved schedule. Source grammar contains safety instruction.'],
}
DETAILS = {
  19: {'title': 'Review turnover documents carefully', 'focus': 'Use conditional language for contract-dependent claims; do not promise coverage, repair or no-cost service without the actual agreement.',
       'summary': 'Walk through the available manual and route warranty and load questions to the authorized contract and engineering contacts.',
       'role': 'A daycare owner or director asking what the turnover documents say.',
       'answers': ['ご連絡', '書面', '維持管理マニュアル']},
  20: {'title': 'Report a difficult site day', 'focus': 'Separate observed shortages, requests and near-miss facts from unapproved safety procedures or schedule promises.',
       'summary': 'Coach a worker, document a short delivery, report a near miss and ask the inspector for the next confirmed step.',
       'role': 'A crew member, supplier contact or inspector asking for factual status.',
       'answers': ['やり方', '12本', '不足分']},
}

def stable_id(prefix, *parts):
    digest = hashlib.sha256('\x1f'.join(map(str, parts)).encode()).hexdigest()[:16]
    return f'{prefix}-{digest}'

def build():
    draft = json.loads(SOURCE.read_text())
    assert (draft['moduleId'], draft['target'], draft['native'], draft['stage']) == ('construction-foreman', 'Japanese', 'English', 'master')
    assert draft['state'] == 'translation-draft' and draft['reviewed'] is False
    assert [x['n'] for x in draft['lessons']] == [19, 20]
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
        lessons.append({'id': lesson_id, 'n': n, 'title': detail['title'], 'objective': source['objectiveJapanese'],
                        'sourceObjective': source['objectiveEnglish'], 'sourceTitle': source['titleEnglish'], 'sourceTitleJapanese': source['titleJapanese'], 'words': words, 'modes': MODES,
                        'reader': {'id': f'reader-{lesson_id}', 'title': detail['title'], 'state': 'phrase-sequence-draft', 'sentences': sentences},
                        'grammar': {'focus': detail['focus'], 'teachingJapanese': source['grammarTeachingJapanese'],
                                    'teachingNotesEnglish': source.get('teachingNotesEnglish', []), 'examples': grammar_examples},
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
    print(f"Built private {COURSE_ID} Master 19–20: {len(bundle['cards'])} cards")
