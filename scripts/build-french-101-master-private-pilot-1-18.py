#!/usr/bin/env python3
"""Derive an unregistered French 101 Master 1–18 runtime fixture from redesigned drafts."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFT_PATHS = ['content/french-basics/master-1-3-redesign-draft.json', 'content/french-basics/master-4-6-redesign-draft.json', 'content/french-basics/master-7-9-redesign-draft.json', 'content/french-basics/master-10-12-redesign-draft.json', 'content/french-basics/master-13-15-redesign-draft.json', 'content/french-basics/master-16-18-redesign-draft.json']
OVERLAY_PATHS = ['content/french-basics/master-1-3-language-support-overrides.json', 'content/french-basics/master-4-6-language-support-overrides.json', 'content/french-basics/master-7-9-language-support-overrides.json', 'content/french-basics/master-10-12-language-support-overrides.json', 'content/french-basics/master-13-15-language-support-overrides.json', 'content/french-basics/master-16-18-language-support-overrides.json']
OUT_PATH = 'content/french-basics/private-runtime-master-1-18.json'

def load(path): return json.loads((ROOT / path).read_text())
def sha(path): return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()

drafts = [load(path) for path in DRAFT_PATHS]
overlays = [load(path) for path in OVERLAY_PATHS]
source_rows = []
for path, draft in zip(DRAFT_PATHS, drafts):
    assert (draft['target'], draft['native'], draft['moduleId'], draft['stage'], draft['reviewed'], draft['registered']) == ('French', 'English', 'french-basics', 'master', False, False)
    for key, value in draft['source'].items():
        if key.endswith('Sha256'):
            source_path = draft['source'][key[:-6]]
            assert sha(source_path) == value
    source_rows.append({'draftPath': path, 'draftSha256': sha(path), 'source': draft['source']})
for overlay in overlays:
    assert (overlay['schema'], overlay['target'], overlay['native'], overlay['reviewed']) == (1, 'French', 'English', False)
source_lessons = [lesson for draft in drafts for lesson in draft['lessons']]
assert [x['n'] for x in source_lessons] == list(range(1, 19))
all_cautions = [row for overlay in overlays for row in overlay['cautionOverrides']]
all_selections = [row for overlay in overlays for row in overlay['stageSelection']]
all_explanations = {row['lesson']: row for overlay in overlays for row in overlay.get('explanationOverrides', [])}
assert [x['lesson'] for x in all_cautions] == list(range(1, 19))
assert [x['lesson'] for x in all_selections] == list(range(1, 19))
lessons, support = [], []
for source in source_lessons:
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
    caution = all_cautions[n - 1]
    assert grammar['caution'] == caution['from']
    grammar['caution'] = caution['to']
    if n in all_explanations:
        explanation = all_explanations[n]
        assert grammar['explanation'] == explanation['from']
        grammar['explanation'] = explanation['to']
    selection = all_selections[n - 1]
    indexes = selection['readerLineIndexes']
    assert 6 <= len(indexes) <= 8 and len(indexes) == len(set(indexes)) and all(0 <= index < 12 for index in indexes)
    terms = selection.get('termIndexes', list(range(8)))
    assert len(terms) == len(set(terms)) and all(0 <= index < 8 for index in terms)
    supplemental = [dict(row, kind='term') for row in selection['supplementalTerms']]
    stage_cards = [cards[index] for index in terms] + supplemental + [cards[8 + index] for index in indexes]
    assert 12 <= sum(x['kind'] == 'term' for x in stage_cards) <= 16
    assert len({x['target'].casefold() for x in stage_cards}) == len(stage_cards)
    stage_words = [{'es': w['target'], 'en': w['native'], 'kind': w['kind']} for w in stage_cards]
    lesson = {'n': n, 'title': source['title'], 'objective': source['objective'], 'speaking': source['speaking']['role'],
        'focus': source['focus'], 'words': stage_words,
        'grammar': {'focus': source['focus'], 'examples': [{'es': row['target'], 'en': row['native']} for row in dialogue[:2]]},
        'lessonType': ['People', 'Document', 'Case', 'People', 'Case', 'Document', 'People', 'Document', 'Case', 'People', 'Case', 'Document', 'Case', 'People', 'Document', 'Case', 'People', 'Document'][n - 1], 'block': 'A'}
    lessons.append(lesson)
    support.append({'n': n, 'stableLessonKey': source['stableLessonKey'], 'prerequisites': source['prerequisites'],
        'cards': cards, 'stageCardIndexes': terms + [8 + i for i in indexes],
        'stageCards': stage_cards, 'supplementalCards': supplemental,
        'backlogCards': [cards[i] for i in range(20) if i not in (terms + [8 + x for x in indexes])], 'reader': reader, 'dialogue': dialogue, 'grammarNotes': grammar, 'sourceGrammarNotes': source_grammar,
        'checks': source['checks'], 'speaking': source['speaking'], 'recordedAudio': False,
        'modes': {'see': {'readerLineCount': 12}, 'recall': {'cardCount': len(stage_cards)},
                  'hear': {'scriptCount': 12, 'recordedAudio': False}, 'type': {'cardCount': len(stage_cards)},
                  'say': {'speakingBrief': source['speaking'], 'recordedAudio': False}, 'write': {'cardCount': len(stage_cards)}}})
result = {'privatePilot': True, 'registered': False, 'reviewed': False, 'audioStatus': 'script-only; no recorded audio',
    'target': 'French', 'native': 'English', 'sources': source_rows, 'supportOverlays': [{'path': path, 'sha256': sha(path)} for path in OVERLAY_PATHS],
    'masterStageFragment': {'version': 1, 'stage': 'master', 'module': 'master-french-basics',
        'baseModule': 'french-basics', 'language': 'French', 'nativeLanguage': 'English',
        'headline': 'French 101 Master 20 private pilot', 'threshold': 'Handle longer French conversations, documents and decisions.',
        'reviewed': False, 'lessons': lessons}, 'support': support}
(ROOT / OUT_PATH).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f'Wrote {OUT_PATH}: {len(lessons)} unregistered Master lessons, {sum(len(x["cards"]) for x in support)} cards, {sum(len(x["reader"]["target"]) for x in support)} Reader pairs')
