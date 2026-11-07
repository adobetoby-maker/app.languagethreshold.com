#!/usr/bin/env python3
"""Build unpublished Japanese Foreman Master 16–18 pair-safe runtime inputs."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
SOURCE = CONTENT / 'master-translation-16-18-draft.json'
READER_SOURCE = CONTENT / 'master-original-reader-16-18-draft.json'
OUTPUT = CONTENT / 'master-runtime-pilot-16-18-ja-en.json'
COURSE_ID = 'master-construction-foreman-ja-en'
MODES = ['see', 'recall', 'hear', 'type', 'say', 'write']
BLOCKERS = {
  16: ['Qualified scaffold-safety review must confirm US competent-person role, company inspection frequency, officer title, parts and tag scheme; source grammar examples carry provisional safety claims.'],
  17: ['Qualified project/contract review must confirm pump/dispatch, downtime, owner and log terminology; source English objective says Spanish, but Japanese-adapted objective is used.'],
  18: ['Qualified permit/inspection and construction review must confirm insulation inspection, permit office, duplex and drywall-sub terms; arrival window cannot be presented as confirmed.'],
}
DETAILS = {
  16: {'title': 'Present scaffold records to a safety officer', 'focus': 'Use formal Japanese for factual records; do not infer OSHA frequency, credential authority or tag approval.',
       'summary': 'Show a safety officer where records are kept and note a missing signature without interpreting regulatory compliance.',
       'role': 'A safety compliance officer who asks to see the inspection record.',
       'openingLine': '手元の記録をご覧ください。確認が必要な点は記録します。'},
  17: {'title': 'Write a factual pump-delay log', 'focus': 'Use ため, しかし, また and なお to separate observed events from unverified causes and commitments.',
       'summary': 'Report the pump no-show, calls, work completed and notified contact in a Japanese daily-log style.',
       'role': 'A project manager who asks which facts and notifications are documented.',
       'openingLine': '到着時刻と確認できた作業内容を分けてご報告します。'},
  18: {'title': 'Request a new inspection time', 'focus': 'Distinguish a live phone request, voicemail and crew chat; do not imply a proposed arrival window is confirmed.',
       'summary': 'Ask the scheduler about an arrival window, leave a named voicemail and send a concise crew update after confirmation.',
       'role': 'A city scheduling contact who can confirm a new inspection window.',
       'openingLine': '新しい到着予定時間帯を確認していただけますか。'},
}

def stable_id(prefix, *parts):
    digest = hashlib.sha256('\x1f'.join(map(str, parts)).encode()).hexdigest()[:16]
    return f'{prefix}-{digest}'

def build():
    draft = json.loads(SOURCE.read_text())
    reader_draft = json.loads(READER_SOURCE.read_text())
    assert (draft['moduleId'], draft['target'], draft['native'], draft['stage']) == ('construction-foreman', 'Japanese', 'English', 'master')
    assert draft['state'] == 'translation-draft' and draft['reviewed'] is False
    assert [x['n'] for x in draft['lessons']] == [16, 17, 18]
    assert reader_draft['state'] == 'original-contextual-reader-draft' and reader_draft['reviewed'] is False
    assert (reader_draft['courseId'], reader_draft['target'], reader_draft['native']) == (COURSE_ID, 'Japanese', 'English')
    assert reader_draft['sourceEnglishSubsetSha256'] == draft['englishSubsetSHA256']
    assert [x['n'] for x in reader_draft['lessons']] == [16, 17, 18]
    readers = {x['n']: x for x in reader_draft['lessons']}
    lessons, cards, dictionary, seen = [], [], [], set()
    for source in draft['lessons']:
        n = source['n']; detail = DETAILS[n]; reader = readers[n]
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
        sentences = reader['sentences']
        assert len(sentences) == 8
        assert all(x['target'].strip() and x['native'].strip() for x in sentences)
        assert not ({x['target'] for x in sentences} & {x['ja'] for x in source['terms'] if x['kind'] == 'phrase'})
        checks = []
        assert len(reader['checkAnswers']) == 3
        for answer in reader['checkAnswers']:
            matches = [line for line in sentences if line['target'].count(answer) == 1]
            assert matches, (n, answer)
            line = matches[0]
            checks.append({'prompt': line['target'].replace(answer, '____', 1), 'hint': line['native'], 'answer': answer,
                           'explanation': f'{answer} appears in this lesson’s Reader scene.'})
        grammar_examples = [{'es': ja, 'en': en} for ja, en in zip(source['grammarExamplesJapanese'], source['grammarExamplesEnglish'])]
        assert len(grammar_examples) == 2
        lessons.append({'id': lesson_id, 'n': n, 'title': reader['title'], 'objective': source['objectiveJapanese'],
                        'sourceObjective': source['objectiveEnglish'], 'sourceTitle': source['titleEnglish'], 'sourceTitleJapanese': source['titleJapanese'], 'words': words, 'modes': MODES,
                        'reader': {'id': f'reader-{lesson_id}', 'title': reader['title'], 'state': 'original-contextual-draft', 'sentences': sentences},
                        'grammar': {'focus': detail['focus'], 'teachingJapanese': source['grammarTeachingJapanese'],
                                    'teachingNotesEnglish': source.get('teachingNotesEnglish', []), 'examples': grammar_examples},
                        'speaking': {'id': f'speak-{lesson_id}', 'summary': detail['summary'],
                                     'sourceSpeakingJapanese': source['speakingJapanese'], 'openingLine': detail['openingLine'],
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
