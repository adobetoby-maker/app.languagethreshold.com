#!/usr/bin/env python3
"""Build unpublished Japanese Foreman Master 10–12 pair-safe runtime inputs."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
SOURCE = CONTENT / 'master-translation-10-12-draft.json'
OUTPUT = CONTENT / 'master-runtime-pilot-10-12-ja-en.json'
COURSE_ID = 'master-construction-foreman-ja-en'
MODES = ['see', 'recall', 'hear', 'type', 'say', 'write']
EXCLUDED_READER_ENGLISH = {
  10: {'If the drawing confirms it, the drain goes in before the tray.'},
  11: {"Nobody will work on Sunday; you'll get your day off.",
       "Tomorrow I'll bring 2 more people to help in the lobby.",
       "We're going to make it, and we're going to do it right.",
       "Fernanda, thanks for telling me; I'll talk to the manager today.",
       "If you stay, I'll talk to the office about your training."},
  12: {'Until we have the certificate, nobody uses the elevator.',
       "I understand the tenants' move-in depends on this, Mr. Lozano."},
}
BLOCKERS = {
  10: ['MEP coordinator must verify drawing title and installation sequence. The conditional drain-before-tray line is not approved design instruction.'],
  11: ['Project manager/HR and local labor authority must verify hours, time off, staffing and training commitments; none is a real-world promise or labor-law advice.'],
  12: ['Qualified elevator/building-code specialist must identify the exact certificate, inspector role and jurisdictional rule before teaching use restrictions or move-in consequences.'],
}
DETAILS = {
  10: {'title': 'Compare two ceiling drawings', 'focus': 'Report each subcontractor account and compare drawing dates; a proposed installation sequence requires MEP approval.',
       'summary': 'Ask two sub leads for their drawing dates, compare conflicts and route the proposed sequence to an MEP coordinator.',
       'role': 'Two sub leads who used different coordination drawings.',
       'answers': ['ケーブルラック', '排水管', '図面']},
  11: {'title': 'Hear a tired crew fairly', 'focus': 'Acknowledge fatigue and listen to concerns without promising unapproved hours, time off, staffing or training.',
       'summary': 'Listen to a tired crew and a worker considering departure, then take commitments to the authorized manager and HR.',
       'role': 'A tired crew member who raises workload and training concerns.',
       'answers': ['疲れ', '信頼', '辞め']},
  12: {'title': 'Explain an elevator inspection delay', 'focus': 'Adjust Japanese register for different listeners while deferring certificate and use decisions to qualified officials.',
       'summary': 'Explain a changed inspection date clearly to a worker, owner, superintendent and inspector without inventing certificate requirements.',
       'role': 'An owner or inspector who asks for a confirmed update and next contact.',
       'answers': ['エレベーター', '検査日', '新しい日程']},
}

def stable_id(prefix, *parts):
    digest = hashlib.sha256('\x1f'.join(map(str, parts)).encode()).hexdigest()[:16]
    return f'{prefix}-{digest}'

def build():
    draft = json.loads(SOURCE.read_text())
    assert (draft['moduleId'], draft['target'], draft['native'], draft['stage']) == ('construction-foreman', 'Japanese', 'English', 'master')
    assert draft['state'] == 'translation-draft' and draft['reviewed'] is False
    assert [x['n'] for x in draft['lessons']] == [10, 11, 12]
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
    print(f"Built private {COURSE_ID} Master 10–12: {len(bundle['cards'])} cards")
