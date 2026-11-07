#!/usr/bin/env python3
"""Pair/source and release-gate checks for private Japanese Foreman Master 7–9."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/build-japanese-foreman-master-runtime-7-9.py'
spec = importlib.util.spec_from_file_location('foreman_master_builder', SCRIPT)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
source = json.loads(builder.SOURCE.read_text())
bundle = json.loads(builder.OUTPUT.read_text())
assert bundle == builder.build(), 'generated bundle is stale'
assert bundle['state'] == 'private-runtime-draft' and bundle['reviewed'] is False
assert bundle['courseId'] == 'master-construction-foreman-ja-en'
assert bundle['courseId'] != 'construction-foreman-ja-en'
assert bundle['sourceEnglishSubsetSha256'] == source['englishSubsetSHA256']
assert bundle['pairKey'] == 'Japanese:English' and bundle['locale'] == 'ja-JP'
assert [x['n'] for x in bundle['lessons']] == [7, 8, 9]
all_pairs = set()
for lesson, src in zip(bundle['lessons'], source['lessons']):
    n = src['n']
    assert lesson['id'] == f"{bundle['courseId']}:lesson:{n}"
    assert lesson['reviewed'] is False
    assert lesson['objective'] == src['objectiveEnglish']
    assert lesson['modes'] == builder.MODES
    assert [(x['es'], x['en'], x['kind']) for x in lesson['words']] == [(x['ja'], x['en'], x['kind']) for x in src['terms']]
    for term in src['terms']:
        all_pairs.add((term['ja'], term['en']))
    expected_reader = [(x['ja'], x['en']) for x in src['terms'] if x['kind'] == 'phrase' and x['en'] not in builder.EXCLUDED_READER_ENGLISH[n]]
    assert lesson['reader']['state'] == 'phrase-sequence-draft'
    assert [(x['target'], x['native']) for x in lesson['reader']['sentences']] == expected_reader
    assert [(x['es'], x['en']) for x in lesson['grammar']['examples']] == list(zip(src['grammarExamplesJapanese'], src['grammarExamplesEnglish']))
    assert lesson['speaking']['sourceSpeakingJapanese'] == src['speakingJapanese']
    assert lesson['speaking']['locale'] == 'ja-JP'
    assert len(lesson['checks']) == 3
    for check, sentence in zip(lesson['checks'], lesson['reader']['sentences']):
        assert check['prompt'].replace('____', check['answer'], 1) == sentence['target']
        assert check['hint'] == sentence['native']
    assert lesson['technicalSourceBlockers'] == builder.BLOCKERS[n]
    assert len(lesson['reader']['sentences']) == 8 - len(builder.EXCLUDED_READER_ENGLISH[n])
    assert all(x['native'] not in builder.EXCLUDED_READER_ENGLISH[n] for x in lesson['reader']['sentences'])
assert {(x['target'], x['native']) for x in bundle['cards']} == all_pairs
assert {(x['target'], x['native']) for x in bundle['dictionary']} == all_pairs
assert len({x['id'] for x in bundle['cards']}) == len(bundle['cards'])
assert len({x['id'] for x in bundle['dictionary']}) == len(bundle['dictionary'])
print('Japanese Foreman Master 7–9 private runtime exact-pair/source checks passed')
