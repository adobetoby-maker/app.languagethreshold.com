#!/usr/bin/env python3
"""Build unpublished Japanese Foreman Master 16–18 pair-safe runtime inputs."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
SOURCE = CONTENT / 'master-translation-16-18-draft.json'
OUTPUT = CONTENT / 'master-runtime-pilot-16-18-ja-en.json'
COURSE_ID = 'master-construction-foreman-ja-en'
MODES = ['see', 'recall', 'hear', 'type', 'say', 'write']
EXCLUDED_READER_ENGLISH = {
  16: {"Under our safety plan, it's checked before every shift.",
       'The results are written in the log and on the tag.',
       "Would you like to see the scaffold erectors' training certificates?",
       'Nobody goes up until the competent person checks and signs it.',
       "Guys, don't go up on this section until further notice."},
  17: {'Due to the missing pump truck, 4 hours of work were lost.',
       'Therefore, the pour was rescheduled for tomorrow.'},
  18: {'This is Miguel Rojas, the foreman on the duplex job.',
       'Team, the inspection moved to tomorrow, from 8 to 12.'},
}
BLOCKERS = {
  16: ['Qualified scaffold-safety review must confirm US competent-person role, company inspection frequency, officer title, parts and tag scheme; source grammar examples carry provisional safety claims.'],
  17: ['Qualified project/contract review must confirm pump/dispatch, downtime, owner and log terminology; source English objective says Spanish, but Japanese-adapted objective is used.'],
  18: ['Qualified permit/inspection and construction review must confirm insulation inspection, permit office, duplex and drywall-sub terms; arrival window cannot be presented as confirmed.'],
}
DETAILS = {
  16: {'title': 'Present scaffold records to a safety officer', 'focus': 'Use formal Japanese for factual records; do not infer OSHA frequency, credential authority or tag approval.',
       'summary': 'Show a safety officer where records are kept and note a missing signature without interpreting regulatory compliance.',
       'role': 'A safety compliance officer who asks to see the inspection record.',
       'answers': ['点検記録簿', '署名', '是正措置']},
  17: {'title': 'Write a factual pump-delay log', 'focus': 'Use ため, しかし, また and なお to separate observed events from unverified causes and commitments.',
       'summary': 'Report the pump no-show, calls, work completed and notified contact in a Japanese daily-log style.',
       'role': 'A project manager who asks which facts and notifications are documented.',
       'answers': ['ポンプ車', '配車センター', '生コン工場']},
  18: {'title': 'Request a new inspection time', 'focus': 'Distinguish a live phone request, voicemail and crew chat; do not imply a proposed arrival window is confirmed.',
       'summary': 'Ask the scheduler about an arrival window, leave a named voicemail and send a concise crew update after confirmation.',
       'role': 'A city scheduling contact who can confirm a new inspection window.',
       'answers': ['到着予定時間帯', '10時前', '確認番号']},
}

def stable_id(prefix, *parts):
    digest = hashlib.sha256('\x1f'.join(map(str, parts)).encode()).hexdigest()[:16]
    return f'{prefix}-{digest}'

def build():
    draft = json.loads(SOURCE.read_text())
    assert (draft['moduleId'], draft['target'], draft['native'], draft['stage']) == ('construction-foreman', 'Japanese', 'English', 'master')
    assert draft['state'] == 'translation-draft' and draft['reviewed'] is False
    assert [x['n'] for x in draft['lessons']] == [16, 17, 18]
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
    print(f"Built private {COURSE_ID} Master 16–18: {len(bundle['cards'])} cards")
