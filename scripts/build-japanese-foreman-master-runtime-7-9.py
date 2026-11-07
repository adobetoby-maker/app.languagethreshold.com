#!/usr/bin/env python3
"""Build unpublished Japanese Foreman Master 7–9 pair-safe runtime inputs."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
SOURCE = CONTENT / 'master-translation-7-9-draft.json'
READER_SOURCE = CONTENT / 'master-original-reader-7-9-draft.json'
OUTPUT = CONTENT / 'master-runtime-pilot-7-9-ja-en.json'
COURSE_ID = 'master-construction-foreman-ja-en'
MODES = ['see', 'recall', 'hear', 'type', 'say', 'write']
BLOCKERS = {
  7: ['Insurance-adjuster reporting and plumbing/mitigation terms require qualified US-site review. Do not imply dehumidifiers guarantee mold prevention.'],
  8: ['US fall-protection/OSHA and tied-off language requires qualified safety review. Foreman cannot authorize guardrail removal; HVAC base and crane-plan claims require site approval.'],
  9: ['Masonry plumb/straightedge measurements, responsibility and dismantling before mortar hardens need qualified masonry/site review.'],
}
DETAILS = {
  7: {'title': 'Report a weekend leak accurately', 'focus': 'Give sourced times, quantities and locations; distinguish documented observations from mitigation outcomes.',
      'summary': 'Tell an adjuster what was recorded, where materials were damaged, and which report and invoices are available.',
      'role': 'An insurance adjuster who asks for exact times, locations and records.',
      'openingLine': '確認済みの記録から順にご説明します。'},
  8: {'title': 'Keep the guardrail in place', 'focus': 'Use a polite refusal and safer plan; do not authorize removal or specify unapproved fall-protection procedure.',
      'summary': 'Explain that the guardrail stays and route lifting and fall-protection plans through qualified site safety personnel.',
      'role': 'An owner representative who asks for an HVAC lift while a guardrail is in place.',
      'openingLine': 'その変更はここで決めず、安全担当者に確認します。'},
  9: {'title': 'Give masonry feedback clearly', 'focus': 'Use measured observations and direct but respectful feedback; qualified personnel decide any corrective work.',
      'summary': 'Tell the mason what was measured, request course-by-course checking, and arrange a follow-up inspection.',
      'role': 'A mason who receives direct feedback and confirms the next measurement.',
      'openingLine': '測定記録を一緒に確認しましょう。'},
}

def stable_id(prefix, *parts):
    digest = hashlib.sha256('\x1f'.join(map(str, parts)).encode()).hexdigest()[:16]
    return f'{prefix}-{digest}'

def build():
    draft = json.loads(SOURCE.read_text())
    reader_draft = json.loads(READER_SOURCE.read_text())
    assert (draft['moduleId'], draft['target'], draft['native'], draft['stage']) == ('construction-foreman', 'Japanese', 'English', 'master')
    assert draft['state'] == 'translation-draft' and draft['reviewed'] is False
    assert [x['n'] for x in draft['lessons']] == [7, 8, 9]
    assert reader_draft['state'] == 'original-contextual-reader-draft' and reader_draft['reviewed'] is False
    assert (reader_draft['courseId'], reader_draft['target'], reader_draft['native']) == (COURSE_ID, 'Japanese', 'English')
    assert reader_draft['sourceEnglishSubsetSha256'] == draft['englishSubsetSHA256']
    assert [x['n'] for x in reader_draft['lessons']] == [7, 8, 9]
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
        lessons.append({'id': lesson_id, 'n': n, 'title': reader['title'], 'objective': source['objectiveEnglish'],
                        'sourceObjective': source['objectiveEnglish'], 'words': words, 'modes': MODES,
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
    print(f"Built private {COURSE_ID} Master 7–9: {len(bundle['cards'])} cards")
