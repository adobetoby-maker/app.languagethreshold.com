#!/usr/bin/env python3
"""Build unpublished Japanese Foreman Master 13–15 pair-safe runtime inputs."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
SOURCE = CONTENT / 'master-translation-13-15-draft.json'
READER_SOURCE = CONTENT / 'master-original-reader-13-15-draft.json'
OUTPUT = CONTENT / 'master-runtime-pilot-13-15-ja-en.json'
COURSE_ID = 'master-construction-foreman-ja-en'
MODES = ['see', 'recall', 'hear', 'type', 'say', 'write']
BLOCKERS = {
  13: ['Qualified medical/site-safety review must verify first aid, table-saw no-use and incident-report procedures; the draft states observations only, not cause.'],
  14: ['Qualified rigging/site-safety review must verify sling, dunnage, test-lift, suspended-load and next-lift wording; source does not approve a lift plan.'],
  15: ['US 911 jurisdiction is preserved in the source speaking prompt. Qualified gas utility/site-safety review must verify radio, evacuation, machine-shutdown and public-warning wording; no rescue or gas-handling procedure is approved.'],
}
DETAILS = {
  13: {'title': 'Report an injury timeline', 'focus': 'Use observed times and completed actions; avoid inferring the injury cause or teaching unreviewed first-aid/table-saw procedures.',
       'summary': 'Give a factual incident timeline, distinguish witnessed from unwitnessed events, and route procedural questions to qualified safety personnel.',
       'role': 'A safety contact who asks what the foreman directly observed and when.',
       'openingLine': '確認した時刻と、見ていないことを分けてお伝えします。'},
  14: {'title': 'Describe a rigging near miss', 'focus': 'Use 〜ところだった for a near miss and ask neutral fact-finding questions; do not prescribe rigging or lift changes.',
       'summary': 'Hear both workers without blame, report the near miss and refer lift-plan decisions to qualified riggers.',
       'role': 'A rigger and laborer who each describe what they observed.',
       'openingLine': 'お二人が見たことを、一人ずつ聞かせてください。'},
  15: {'title': 'Report a gas smell in a US scenario', 'focus': 'Give concise, factual location and status information without guessing the cause; keep the source US 911 context.',
       'summary': 'Practice a source-based US 911/gas-utility report and short status updates; real emergency instructions require site approval.',
       'role': 'A US emergency dispatcher or utility contact asking for location and observed facts.',
       'openingLine': '場所と確認できた事実をお伝えします。'},
}

def stable_id(prefix, *parts):
    digest = hashlib.sha256('\x1f'.join(map(str, parts)).encode()).hexdigest()[:16]
    return f'{prefix}-{digest}'

def build():
    draft = json.loads(SOURCE.read_text())
    reader_draft = json.loads(READER_SOURCE.read_text())
    assert (draft['moduleId'], draft['target'], draft['native'], draft['stage']) == ('construction-foreman', 'Japanese', 'English', 'master')
    assert draft['state'] == 'translation-draft' and draft['reviewed'] is False
    assert [x['n'] for x in draft['lessons']] == [13, 14, 15]
    assert reader_draft['state'] == 'original-contextual-reader-draft' and reader_draft['reviewed'] is False
    assert (reader_draft['courseId'], reader_draft['target'], reader_draft['native']) == (COURSE_ID, 'Japanese', 'English')
    assert reader_draft['sourceEnglishSubsetSha256'] == draft['englishSubsetSHA256']
    assert [x['n'] for x in reader_draft['lessons']] == [13, 14, 15]
    readers = {x['n']: x for x in reader_draft['lessons']}
    lessons, cards, dictionary, seen = [], [], [], set()
    assert '911' in draft['lessons'][-1]['speakingJapanese'] and '119' not in draft['lessons'][-1]['speakingJapanese']
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
    print(f"Built private {COURSE_ID} Master 13–15: {len(bundle['cards'])} cards")
