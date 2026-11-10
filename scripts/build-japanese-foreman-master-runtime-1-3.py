#!/usr/bin/env python3
"""Build unpublished Japanese Foreman Master 1–3 pair-safe runtime inputs."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
SOURCE = CONTENT / 'master-translation-1-3-draft.json'
READER_SOURCE = CONTENT / 'master-original-reader-1-3-draft.json'
OUTPUT = CONTENT / 'master-runtime-pilot-1-3-ja-en.json'
COURSE_ID = 'master-construction-foreman-ja-en'
MODES = ['see', 'recall', 'hear', 'type', 'say', 'write']
DISPUTED_ENGLISH = 'If the mat sits too low, water reaches the steel.'
BLOCKER = ('Master 2 garage-deck/deicing-water source concern: the English claim that a lower '
           'rebar mat lets water reach steel may be technically wrong for exposure from above. '
           'Qualified structural/concrete review must resolve English and Japanese before release.')
DETAILS = {
  1: {'title': 'Explain why shores stay', 'focus': 'Sequence まず → その後 → ですから while separating known records from engineer confirmation.',
      'summary': 'Discuss what is known, what remains uncertain, and whom to ask before a decision.',
      'role': 'A new carpenter who asks what must be confirmed about the shores.',
      'openingLine': '支柱について、どの点を確認したいですか。'},
  2: {'title': 'Check the specified concrete cover', 'focus': 'Locate plan-specific cover notes; route technical interpretation to the structural engineer.',
      'summary': 'Find the relevant drawing note and identify questions for the structural engineer.',
      'role': 'A trainee who asks where the drawing specifies concrete cover.',
      'openingLine': 'この構造図のどの注記を確認しましょうか。'},
  3: {'title': 'Teach a harness inspection sequence', 'focus': 'Use 〜前に and 〜たら to ask about a checklist without prescribing an unapproved safety procedure.',
      'summary': 'Practice explaining a checklist and record unknown items for the qualified safety contact.',
      'role': 'A new worker who asks about an inspection checklist.',
      'openingLine': '点検表で分からないところはありますか。'},
}

def stable_id(prefix, *parts):
    digest = hashlib.sha256('\x1f'.join(map(str, parts)).encode()).hexdigest()[:16]
    return f'{prefix}-{digest}'

def build():
    draft = json.loads(SOURCE.read_text())
    reader_draft = json.loads(READER_SOURCE.read_text())
    assert (draft['moduleId'], draft['target'], draft['native'], draft['stage']) == ('construction-foreman', 'Japanese', 'English', 'master')
    assert draft['state'] == 'translation-draft' and draft['reviewed'] is False
    assert [x['n'] for x in draft['lessons']] == [1, 2, 3]
    assert reader_draft['state'] == 'original-contextual-reader-draft' and reader_draft['reviewed'] is False
    assert (reader_draft['target'], reader_draft['native'], reader_draft['courseId']) == ('Japanese', 'English', COURSE_ID)
    assert reader_draft['sourceEnglishSubsetSha256'] == draft['englishSubsetSHA256']
    assert [x['n'] for x in reader_draft['lessons']] == [1, 2, 3]
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
        reader = reader_draft['lessons'][n - 1]
        sentences = reader['sentences']
        source_phrase_targets = {term['ja'] for term in source['terms'] if term['kind'] == 'phrase'}
        assert 6 <= len(sentences) <= 10
        assert all(line['target'] and line['native'] and line['target'] not in source_phrase_targets for line in sentences)
        assert DISPUTED_ENGLISH not in [line['native'] for line in sentences]
        checks = []
        for answer in reader['checkAnswers']:
            line = next(line for line in sentences if answer in line['target'])
            assert line['target'].count(answer) == 1, (n, answer)
            checks.append({'prompt': line['target'].replace(answer, '____', 1), 'hint': line['native'], 'answer': answer,
                           'explanation': f'{answer} appears in this lesson’s reading.'})
        grammar_examples = [{'es': ja, 'en': en} for ja, en in zip(source['grammarExamplesJapanese'], source['grammarExamplesEnglish'])]
        assert len(grammar_examples) == 2
        lessons.append({'id': lesson_id, 'n': n, 'title': detail['title'], 'objective': source['objectiveEnglish'],
                        'sourceObjective': source['objectiveEnglish'], 'words': words, 'modes': MODES,
                        'reader': {'id': f'reader-{lesson_id}', 'title': reader['title'], 'state': 'original-contextual-draft', 'sentences': sentences},
                        'grammar': {'focus': detail['focus'], 'teachingJapanese': source['grammarTeachingJapanese'],
                                    'teachingNotesEnglish': source['teachingNotesEnglish'], 'examples': grammar_examples},
                        'speaking': {'id': f'speak-{lesson_id}', 'summary': detail['summary'],
                                     'sourceSpeakingJapanese': source['speakingJapanese'], 'openingLine': detail['openingLine'],
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
