#!/usr/bin/env python3
"""Verify private French Roofing recordings against exact lesson audio text."""

import argparse
import hashlib
import json
from pathlib import Path
from runpy import run_path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/Users/drive/lt-audio/french-roofing/full-course-2026-11-09')
GENERATOR = run_path(str(ROOT / 'scripts/generate-french-roofing-private-hd-audio.py'))
VOICES = GENERATOR['VOICES']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def duration(path):
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'default=noprint_wrappers=1:nokey=1', str(path)],
        capture_output=True, text=True, check=True,
    )
    value = round(float(result.stdout.strip()), 3)
    if not 0.1 < value < 120:
        raise ValueError(f'Invalid MP3 duration: {path.name}')
    return value


def verify(allow_partial=False):
    inventory, source_sha = GENERATOR['source']()
    manifest_path = OUTPUT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    identity = {
        'schema': 1, 'state': 'private-unreviewed-full-course-recordings',
        'pairKey': 'French:English', 'locale': 'fr-FR', 'voices': VOICES,
        'sourceInventorySha256': source_sha,
        'exactTextSha256': inventory['exactTextSha256'],
        'sourceFixtureSha256': inventory['sourceFixtureSha256'],
        'textReviewed': False, 'listeningReviewed': False, 'registered': False,
    }
    if any(manifest.get(key) != value for key, value in identity.items()):
        raise ValueError('Manifest identity, source, or review gate changed')
    rows = {row['sha256']: row for row in inventory['texts']}
    if set(manifest['clips']) - set(rows):
        raise ValueError('Manifest contains an out-of-scope text')
    checked = 0
    total_bytes = 0
    for key, record in manifest['clips'].items():
        row = rows[key]
        if record.get('text') != row['text'] or record.get('occurrences') != row['occurrences']:
            raise ValueError(f'Text or source occurrences changed: {key}')
        if set(record.get('voices', {})) - set(VOICES):
            raise ValueError(f'Unexpected voice: {key}')
        for gender, clip in record['voices'].items():
            name = f'fr-roofing-{key[:20]}-{gender}.mp3'
            path = OUTPUT / name
            data = path.read_bytes()
            if (clip.get('name'), clip.get('text'), clip.get('voice'), clip.get('locale'),
                clip.get('sha256'), clip.get('bytes'), clip.get('durationSeconds'),
                clip.get('listeningReviewed')) != (
                name, row['text'], VOICES[gender], 'fr-FR', sha(data), len(data),
                duration(path), False):
                raise ValueError(f'Recording mismatch: {name}')
            checked += 1
            total_bytes += len(data)
    expected = len(rows) * len(VOICES)
    if not allow_partial and checked != expected:
        raise ValueError(f'Incomplete private audio: {checked}/{expected}')
    lesson_texts = {key: set() for keys in inventory['stageLessons'].values() for key in keys}
    if {stage: len(keys) for stage, keys in inventory['stageLessons'].items()} != {
            'foundation': 10, 'core': 30, 'master': 20}:
        raise ValueError('Lesson stage coverage changed')
    for key, row in rows.items():
        for occurrence in row['occurrences']:
            lesson = occurrence['draftLessonKey']
            if lesson not in lesson_texts:
                raise ValueError(f'Out-of-scope lesson occurrence: {lesson}')
            lesson_texts[lesson].add(key)
    lesson_coverage = []
    for stage, keys in inventory['stageLessons'].items():
        for lesson in keys:
            expected_clips = 2 * len(lesson_texts[lesson])
            recorded_clips = sum(len(manifest['clips'].get(key, {}).get('voices', {}))
                                 for key in lesson_texts[lesson])
            lesson_coverage.append({'stage': stage, 'draftLessonKey': lesson,
                                    'exactTexts': len(lesson_texts[lesson]),
                                    'verifiedClips': recorded_clips, 'expectedClips': expected_clips,
                                    'complete': recorded_clips == expected_clips})
    if len(lesson_coverage) != 60 or any(row['exactTexts'] == 0 for row in lesson_coverage):
        raise ValueError('Incomplete lesson source coverage')
    return {'sourceTexts': len(rows), 'verifiedClips': checked, 'expectedClips': expected,
            'verifiedBytes': total_bytes, 'exactTextSha256': inventory['exactTextSha256'],
            'sourceInventorySha256': source_sha, 'listeningReviewed': False,
            'registered': False, 'completeLessons': sum(row['complete'] for row in lesson_coverage),
            'lessonCoverage': lesson_coverage}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--allow-partial', action='store_true')
    parser.add_argument('--coverage-report', type=Path)
    args = parser.parse_args()
    report = verify(args.allow_partial)
    if args.coverage_report:
        args.coverage_report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: value for key, value in report.items() if key != 'lessonCoverage'},
                     ensure_ascii=False))
