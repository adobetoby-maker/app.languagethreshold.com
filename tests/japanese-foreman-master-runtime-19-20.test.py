#!/usr/bin/env python3
"""Pair/source and release-gate checks for private Japanese Foreman Master 19–20."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/build-japanese-foreman-master-runtime-19-20.py'
spec = importlib.util.spec_from_file_location('foreman_master_builder', SCRIPT)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
source = json.loads(builder.SOURCE.read_text())
reader_source = json.loads(builder.READER_SOURCE.read_text())
bundle = json.loads(builder.OUTPUT.read_text())
assert bundle == builder.build(), 'generated bundle is stale'
assert bundle['state'] == 'private-runtime-draft' and bundle['reviewed'] is False
assert bundle['courseId'] == 'master-construction-foreman-ja-en'
assert bundle['courseId'] != 'construction-foreman-ja-en'
assert bundle['sourceEnglishSubsetSha256'] == source['englishSubsetSHA256']
assert reader_source['sourceEnglishSubsetSha256'] == source['englishSubsetSHA256']
assert bundle['pairKey'] == 'Japanese:English' and bundle['locale'] == 'ja-JP'
assert [x['n'] for x in bundle['lessons']] == [19, 20]
all_pairs = set()
for lesson, src, reader in zip(bundle['lessons'], source['lessons'], reader_source['lessons']):
    n = src['n']
    assert lesson['id'] == f"{bundle['courseId']}:lesson:{n}"
    assert lesson['reviewed'] is False
    assert lesson['objective'] == src['objectiveJapanese']
    assert lesson['sourceObjective'] == src['objectiveEnglish']
    assert lesson['sourceTitleJapanese'] == src['titleJapanese']
    assert lesson['modes'] == builder.MODES
    assert [(x['es'], x['en'], x['kind']) for x in lesson['words']] == [(x['ja'], x['en'], x['kind']) for x in src['terms']]
    for term in src['terms']:
        all_pairs.add((term['ja'], term['en']))
    expected_reader = [(x['target'], x['native']) for x in reader['sentences']]
    assert lesson['reader']['state'] == 'original-contextual-draft'
    assert [(x['target'], x['native']) for x in lesson['reader']['sentences']] == expected_reader
    assert len(expected_reader) == 8
    assert [(x['es'], x['en']) for x in lesson['grammar']['examples']] == list(zip(src['grammarExamplesJapanese'], src['grammarExamplesEnglish']))
    assert lesson['speaking']['sourceSpeakingJapanese'] == src['speakingJapanese']
    assert lesson['speaking']['locale'] == 'ja-JP'
    assert len(lesson['checks']) == 3
    assert [x['answer'] for x in lesson['checks']] == reader['checkAnswers']
    for check in lesson['checks']:
        assert any(check['prompt'].replace('____', check['answer'], 1) == sentence['target']
                   and check['hint'] == sentence['native'] for sentence in lesson['reader']['sentences'])
    assert lesson['technicalSourceBlockers'] == builder.BLOCKERS[n]
assert {(x['target'], x['native']) for x in bundle['cards']} == all_pairs
assert {(x['target'], x['native']) for x in bundle['dictionary']} == all_pairs
assert len({x['id'] for x in bundle['cards']}) == len(bundle['cards'])
assert len({x['id'] for x in bundle['dictionary']}) == len(bundle['dictionary'])
print('Japanese Foreman Master 19–20 private runtime exact-pair/source checks passed')
