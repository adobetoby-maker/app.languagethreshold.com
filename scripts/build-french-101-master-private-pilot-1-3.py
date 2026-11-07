#!/usr/bin/env python3
"""Derive an unregistered French 101 Master 1–3 runtime fixture from redesigned drafts."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFT_PATH = 'content/french-basics/master-1-3-redesign-draft.json'
OVERLAY_PATH = 'content/french-basics/master-1-3-language-support-overrides.json'
OUT_PATH = 'content/french-basics/private-runtime-master-1-3.json'

def load(path): return json.loads((ROOT / path).read_text())
def sha(path): return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()

draft, overlay = load(DRAFT_PATH), load(OVERLAY_PATH)
assert (draft['target'], draft['native'], draft['moduleId'], draft['stage'], draft['reviewed'], draft['registered']) == ('French', 'English', 'french-basics', 'master', False, False)
assert (overlay['schema'], overlay['target'], overlay['native'], overlay['reviewed']) == (1, 'French', 'English', False)
assert [x['n'] for x in draft['lessons']] == [1, 2, 3]
assert [x['lesson'] for x in overlay['cautionOverrides']] == [1, 2, 3]
assert [x['lesson'] for x in overlay['stageSelection']] == [1, 2, 3]
for path_key, hash_key in [('legacySpanishEnglishSource', 'legacySpanishEnglishSourceSha256'), ('legacyFrenchDraft', 'legacyFrenchDraftSha256')]:
    assert sha(draft['source'][path_key]) == draft['source'][hash_key]
assert sha(draft['source']['curriculumMap']) == draft['source']['curriculumMapSha256']
lessons, support = [], []
for source in draft['lessons']:
    n = source['n']
    assert source['stableLessonKey'] == f'master-french-basics:{n}'
    cards = [{'target': w['fr'], 'native': w['en'], 'kind': w['kind']} for w in source['words']]
    assert [w['order'] for w in source['words']] == list(range(1, 21))
    assert [w['kind'] for w in source['words']] == ['term'] * 8 + ['phrase'] * 12
    reader = source['reading']
    assert len(reader['target']) == len(reader['native']) == 12
    assert [(w['fr'], w['en']) for w in source['words'][8:]] == list(zip(reader['target'], reader['native']))
    dialogue = []
    for row in source['dialogue']:
        target, native = row.split('|')
        dialogue.append({'target': target.strip(), 'native': native.strip()})
    assert len(dialogue) >= 5 and all(x['target'] and x['native'] for x in dialogue)
    assert {x['type'] for x in source['checks']} == {'recall', 'write', 'listening', 'comprehension', 'application'}
    assert all(c.get('locale') == 'fr-FR' and c.get('voiceStatus') == 'script-only; no recorded audio' for c in source['checks'] if c['type'] == 'listening')
    source_grammar = source['grammar']
    grammar = json.loads(json.dumps(source_grammar))
    caution = overlay['cautionOverrides'][n - 1]
    assert grammar['caution'] == caution['from']
    grammar['caution'] = caution['to']
    selection = overlay['stageSelection'][n - 1]
    indexes = selection['readerLineIndexes']
    assert 6 <= len(indexes) <= 8 and len(indexes) == len(set(indexes)) and all(0 <= index < 12 for index in indexes)
    supplemental = [dict(row, kind='term') for row in selection['supplementalTerms']]
    stage_cards = cards[:8] + supplemental + [cards[8 + index] for index in indexes]
    assert 12 <= sum(x['kind'] == 'term' for x in stage_cards) <= 16
    assert len({x['target'].casefold() for x in stage_cards}) == len(stage_cards)
    stage_words = [{'es': w['target'], 'en': w['native'], 'kind': w['kind']} for w in stage_cards]
    lesson = {'n': n, 'title': source['title'], 'objective': source['objective'], 'speaking': source['speaking']['role'],
        'focus': source['focus'], 'words': stage_words,
        'grammar': {'focus': source['focus'], 'examples': [{'es': row['target'], 'en': row['native']} for row in dialogue[:2]]},
        'lessonType': ['People', 'Document', 'Case'][n - 1], 'block': 'A'}
    lessons.append(lesson)
    support.append({'n': n, 'stableLessonKey': source['stableLessonKey'], 'prerequisites': source['prerequisites'],
        'cards': cards, 'stageCardIndexes': list(range(8)) + [8 + i for i in indexes],
        'stageCards': stage_cards, 'supplementalCards': supplemental,
        'backlogCards': [cards[8 + i] for i in range(12) if i not in indexes], 'reader': reader, 'dialogue': dialogue, 'grammarNotes': grammar, 'sourceGrammarNotes': source_grammar,
        'checks': source['checks'], 'speaking': source['speaking'], 'recordedAudio': False,
        'modes': {'see': {'readerLineCount': 12}, 'recall': {'cardCount': len(stage_cards)},
                  'hear': {'scriptCount': 12, 'recordedAudio': False}, 'type': {'cardCount': len(stage_cards)},
                  'say': {'speakingBrief': source['speaking'], 'recordedAudio': False}, 'write': {'cardCount': len(stage_cards)}}})
result = {'privatePilot': True, 'registered': False, 'reviewed': False, 'audioStatus': 'script-only; no recorded audio',
    'target': 'French', 'native': 'English', 'draftPath': DRAFT_PATH, 'draftSha256': sha(DRAFT_PATH),
    'supportOverlayPath': OVERLAY_PATH, 'supportOverlaySha256': sha(OVERLAY_PATH), 'source': draft['source'],
    'masterStageFragment': {'version': 1, 'stage': 'master', 'module': 'master-french-basics',
        'baseModule': 'french-basics', 'language': 'French', 'nativeLanguage': 'English',
        'headline': 'French 101 Master 20 private pilot', 'threshold': 'Handle longer French conversations, documents and decisions.',
        'reviewed': False, 'lessons': lessons}, 'support': support}
(ROOT / OUT_PATH).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f'Wrote {OUT_PATH}: {len(lessons)} unregistered Master lessons, {sum(len(x["cards"]) for x in support)} cards, {sum(len(x["reader"]["target"]) for x in support)} Reader pairs')
