#!/usr/bin/env python3
"""Verify pinned source, every English pair, and Core 16–18 draft structure."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source_path = ROOT / 'content/french-basics/source-english-core-16-18.json'
draft_path = ROOT / 'content/french-basics/core-16-18-draft.json'
source = json.loads(source_path.read_text())
draft = json.loads(draft_path.read_text())
assert (draft['target'], draft['native'], draft['moduleId'], draft['stage']) == ('French', 'English', 'french-basics', 'core')
assert draft['reviewed'] is False and draft['state'] == 'authored-draft'
assert draft['source']['sourceSha256'] == hashlib.sha256(source_path.read_bytes()).hexdigest()
assert [lesson['n'] for lesson in source['lessons']] == [lesson['n'] for lesson in draft['lessons']] == [16, 17, 18]
for path in source['sourcePaths']:
    actual = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
    assert source['sourceSha256'][path] == draft['source']['sourceFileSha256'][path] == actual, path
core = json.loads((ROOT / 'src/data/spanish-basics-core.json').read_text())['lessons']
practice = json.loads((ROOT / 'src/data/spanish-basics-practice.json').read_text())['spanish-basics']
for english, lesson in zip(source['lessons'], draft['lessons']):
    n = english['n']
    assert english['title'] == core[n - 1]['title'] == lesson['sourceTitleEnglish']
    assert english['objective'] == core[n - 1]['objective'] == lesson['sourceObjectiveEnglish']
    assert english['words'] == core[n - 1]['words']
    assert english['reading'] == practice[str(n)]['reading']
    assert lesson['locale'] == 'fr-FR'
    assert all(lesson[field].strip() for field in ('title', 'objective', 'focus', 'scene', 'speaking', 'foundationTie'))
    assert lesson['grammar']['explanation'].strip() and lesson['grammar']['caution'].strip()
    assert len(lesson['words']) == len(english['words']) == 14
    assert [w['order'] for w in lesson['words']] == list(range(1, 15))
    for word, original in zip(lesson['words'], english['words']):
        assert word['fr'].strip() and word['en'] == original['en'] and word['kind'] == original['kind']
    assert len({word['fr'] for word in lesson['words']}) >= 13
    reading = lesson['reading']
    assert reading['sourceTitleEnglish'] == english['reading']['title']
    assert reading['native'] == english['reading']['native']
    assert len(reading['target']) == len(reading['native']) == 6
    assert all(line.strip() for line in reading['target'])
    assert [w['fr'] for w in lesson['words'] if w['kind'] == 'phrase'] == reading['target']
    assert lesson['dialogue'] == [f'{fr}|{en}' for fr, en in zip(reading['target'], reading['native'])]
    assert {'recall', 'write', 'listening', 'comprehension'} <= {check['type'] for check in lesson['checks']}
    assert len(lesson['checks']) == 5
    for check in lesson['checks']:
        assert check['prompt'].strip() and check['answer'].strip()
        if check['type'] == 'listening':
            assert check['audioText'] in reading['target'] and check['locale'] == 'fr-FR'
            assert check['voiceStatus'] == 'script-only; no recorded audio'
print('French 101 Core 16–18: 42 exact source pairs/18 exact English reading meanings pinned; structure valid; review/runtime/audio pending')
