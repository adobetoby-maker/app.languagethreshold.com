#!/usr/bin/env python3
"""Verify synthesized Japanese Lunch batch files and build a private listening sheet."""

import argparse
from collections import defaultdict
import hashlib
import html
import importlib.util
import json
from pathlib import Path

COURSE = Path(__file__).resolve().parent
AUDIO = Path('/Users/drive/lt-audio/japanese-travel-lunch/full-course-2026-11-10')
SCOPE = COURSE / 'private-audio-scope.json'
OUTPUT = COURSE / 'private-course-audio-batch-evidence.json'
SHEET = AUDIO / 'listening-review.html'
VOICES = {'female': 'ja-JP-Chirp3-HD-Aoede', 'male': 'ja-JP-Chirp3-HD-Charon'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def build():
    generator = load_module(COURSE / 'generate-private-course-audio.py', 'japanese_lunch_course_audio')
    signal_screen = load_module(COURSE / 'verify-private-foundation-1-remainder.py', 'japanese_lunch_signal')
    scope, prior = generator.verified_sources()
    manifest_bytes = (AUDIO / 'manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    assert manifest['course'] == 'japanese-travel-lunch'
    assert manifest['pairKey'] == 'Japanese:English' and manifest['locale'] == 'ja-JP'
    assert manifest['voices'] == VOICES and manifest['sourceSHA256'] == scope['normalizedTextSHA256']
    assert manifest['listeningReviewed'] is manifest['registered'] is False
    assert manifest['quotaProject'] == 'project-91661021-fb2d-4524-b9f'
    assert set(manifest['clips']).issubset(set(scope['texts']))
    rows = []
    for text, genders in manifest['clips'].items():
        source = scope['texts'][text]
        for gender, clip in genders.items():
            assert gender in VOICES and (text, gender) not in prior
            assert clip['voice'] == VOICES[gender] and clip['locale'] == 'ja-JP'
            assert clip['displayText'] == source['displayText'] and clip['spokenText'] == source['spokenText']
            assert clip['listeningReviewed'] is False
            path = AUDIO / clip['name']
            data = path.read_bytes()
            assert sha(data) == clip['sha256'] and len(data) == clip['bytes']
            measured, flags = signal_screen.signal(path)
            assert abs(measured['durationSeconds'] - clip['durationSeconds']) <= 0.024
            rows.append({'text': text, 'gender': gender, 'voice': clip['voice'],
                         'file': clip['name'], 'sha256': clip['sha256'],
                         'bytes': clip['bytes'], 'durationSeconds': clip['durationSeconds'],
                         'signal': measured, 'signalFlags': flags, 'listeningReviewed': False})
    assert len(rows) == len({(x['text'], x['gender']) for x in rows})
    available = prior | {(x['text'], x['gender']) for x in rows}
    assert len(available) == len(prior) + len(rows) <= scope['proposedTextVoicePairs'] == 3094
    lesson_pairs = defaultdict(set)
    for text, value in scope['texts'].items():
        for occurrence in value['occurrences']:
            parts = occurrence.split(':')
            lesson = parts[0] + ':' + parts[1]
            for gender in VOICES:
                lesson_pairs[lesson].add((text, gender))
    assert len(lesson_pairs) == 60
    lesson_coverage = {lesson: {'requiredTextVoicePairs': len(pairs),
                                'technicallyCoveredPairs': len(pairs & available),
                                'complete': pairs <= available}
                       for lesson, pairs in sorted(lesson_pairs.items())}
    return {'schema': 1, 'course': 'japanese-travel-lunch', 'pairKey': 'Japanese:English',
            'state': 'private-batch-unreviewed', 'sourceScopeSHA256': sha(SCOPE.read_bytes()),
            'sourceManifestSHA256': sha(manifest_bytes),
            'proposedCourseTextVoicePairs': 3094, 'reusedFoundation1Pairs': len(prior),
            'newBatchClipsVerified': len(rows),
            'technicallyCoveredPairs': len(prior) + len(rows),
            'pairsNotSynthesized': 3094 - len(prior) - len(rows),
            'technicallyCompleteLessons': sum(x['complete'] for x in lesson_coverage.values()),
            'lessonCoverage': lesson_coverage,
            'signalFlaggedBatchClips': sum(bool(x['signalFlags']) for x in rows),
            'listeningReviewed': False, 'textReviewed': False, 'registered': False,
            'webPublished': False, 'nativeBundled': False, 'clips': rows}


def sheet(report):
    lines = []
    for row in report['clips']:
        lines.append('<section><h2 lang="ja">' + html.escape(row['text']) + '</h2><p>' +
                     html.escape(row['gender']) + ' · ' + html.escape(row['voice']) +
                     '</p><audio controls preload="none" src="' + html.escape(row['file'], quote=True) +
                     '"></audio><p>Signal flags: ' +
                     html.escape(', '.join(row['signalFlags']) or 'none') + '</p></section>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>Japanese Lunch private batch review</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:24px}'
            'section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:16px 0}'
            'audio{width:100%}</style><h1>Japanese Lunch · Private course audio batch</h1>'
            '<p>Every clip here requires listening review. This sheet does not approve or publish audio.</p>' +
            ''.join(lines) + '</html>\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    report = build()
    encoded = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    worksheet = sheet(report)
    if args.check:
        assert OUTPUT.read_text() == encoded
        assert SHEET.read_text() == worksheet
    else:
        OUTPUT.write_text(encoded)
        SHEET.write_text(worksheet)
    print(json.dumps({k: report[k] for k in ('newBatchClipsVerified', 'technicallyCoveredPairs',
                                             'technicallyCompleteLessons',
                                             'pairsNotSynthesized', 'signalFlaggedBatchClips')}))


if __name__ == '__main__':
    main()
