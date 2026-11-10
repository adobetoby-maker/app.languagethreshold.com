#!/usr/bin/env python3
"""Pin five exact Foundation 2–3 strings for private listening review."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCOPE = ROOT / 'docs/japanese-program/foreman-exact-audio-scope-2026-11-08.json'
OUTPUT = ROOT / 'docs/japanese-program/foreman-private-audio-pilot-foundation-2-3.json'
TEXTS = [
    ('foundation:2', 'フィート'),
    ('foundation:2', 'メジャーで壁の長さを測ってください。'),
    ('foundation:3', '大工'),
    ('foundation:3', '私はこの現場の職長です。'),
    ('foundation:3', 'コンクリートはまだ固まっていません。'),
]


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def build():
    raw = SCOPE.read_bytes()
    scope = json.loads(raw)
    assert scope['moduleId'] == 'construction-foreman'
    assert scope['pairKey'] == 'Japanese:English' and scope['locale'] == 'ja-JP'
    index = {row['text']: row for row in scope['texts']}
    assert len(TEXTS) == len(set(text for _, text in TEXTS)) == 5
    rows = []
    for lesson, text in TEXTS:
        row = index[text]
        assert any(o['draftLessonKey'] == lesson for o in row['occurrences'])
        assert sha(text.encode()) == row['sha256']
        rows.append(row)
    strings = [text for _, text in TEXTS]
    return {
        'schema': 1, 'state': 'private-audio-pilot-unsynthesized',
        'moduleId': 'construction-foreman', 'pairKey': 'Japanese:English',
        'locale': 'ja-JP', 'draftLessonKeys': ['foundation:2', 'foundation:3'],
        'sourceFilesSHA256': scope['sourceFilesSHA256'],
        'sourceInventorySha256': sha(raw),
        'reviewed': False, 'recordingsGenerated': False,
        'listeningReviewed': False, 'registered': False,
        'counts': {'uniqueExactTexts': 5, 'twoVoiceClips': 10,
                   'unicodeCharactersPerVoice': sum(map(len, strings))},
        'exactTextSha256': sha('\n'.join(strings).encode()), 'texts': rows,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    encoded = json.dumps(build(), ensure_ascii=False, indent=2) + '\n'
    if args.check:
        assert OUTPUT.read_text() == encoded, 'Foreman F2–3 audio pilot is stale'
    else:
        OUTPUT.write_text(encoded)
    print('Japanese Foreman Foundation 2–3 private pilot verified')


if __name__ == '__main__':
    main()
