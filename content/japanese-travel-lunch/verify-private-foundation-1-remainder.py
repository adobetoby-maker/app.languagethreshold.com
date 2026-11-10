#!/usr/bin/env python3
"""Verify private Foundation 1 remainder and prepare a listening worksheet."""

import argparse
import array
import hashlib
import html
import importlib.util
import json
import math
import subprocess
from pathlib import Path

COURSE = Path(__file__).resolve().parent
ROOT = COURSE.parents[1]
AUDIO = Path('/Users/drive/lt-audio/japanese-travel-lunch/foundation-1-remainder-2026-11-10')
OUTPUT = COURSE / 'private-foundation-1-remainder-evidence.json'
SHEET = AUDIO / 'listening-review.html'
VOICES = {'female': 'ja-JP-Chirp3-HD-Aoede', 'male': 'ja-JP-Chirp3-HD-Charon'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def source():
    spec = importlib.util.spec_from_file_location('foundation1_remainder', COURSE / 'generate-private-foundation-1-remainder.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.selected_scope()


def signal(path):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', str(path),
                          '-ac', '1', '-ar', '16000', '-f', 's16le', '-acodec', 'pcm_s16le', '-'],
                         capture_output=True, check=True).stdout
    samples = array.array('h')
    samples.frombytes(raw)
    assert samples
    values = [abs(value) / 32768 for value in samples]
    active = [i for i, value in enumerate(values) if value >= 0.006]
    result = {'durationSeconds': round(len(samples) / 16000, 3),
              'peak': round(max(values), 5),
              'rms': round(math.sqrt(sum(x * x for x in values) / len(values)), 5),
              'activeSeconds': round(len(active) / 16000, 3),
              'leadingSilenceSeconds': round((active[0] if active else len(samples)) / 16000, 3),
              'trailingSilenceSeconds': round((len(samples) - active[-1] - 1 if active else len(samples)) / 16000, 3),
              'clippedFraction': round(sum(x >= 0.999 for x in values) / len(values), 6)}
    flags = []
    if result['peak'] < 0.02 or result['rms'] < 0.004:
        flags.append('very-quiet')
    if result['activeSeconds'] < 0.08:
        flags.append('little-active-signal')
    if result['clippedFraction'] > 0.001:
        flags.append('possible-clipping')
    if result['leadingSilenceSeconds'] > 1 or result['trailingSilenceSeconds'] > 1:
        flags.append('long-edge-silence')
    return result, flags


def build():
    scope, pilot_sha, selected = source()
    manifest_bytes = (AUDIO / 'manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    assert manifest['course'] == 'japanese-travel-lunch'
    assert manifest['lessonId'] == 'foundation-travel-lunch:1:ja-en'
    assert manifest['locale'] == 'ja-JP' and manifest['voices'] == VOICES
    assert manifest['sourceSHA256'] == scope['normalizedTextSHA256']
    assert manifest['acceptedPilotManifestSHA256'] == pilot_sha
    assert manifest['listeningReviewed'] is manifest['registered'] is False
    assert set(manifest['clips']) == {text for text, _ in selected} and len(selected) == 18
    rows = []
    for text, value in selected:
        clips = manifest['clips'][text]
        assert set(clips) == set(VOICES)
        for gender, voice in VOICES.items():
            clip = clips[gender]
            path = AUDIO / clip['name']
            data = path.read_bytes()
            assert clip['displayText'] == value['displayText'] and clip['spokenText'] == value['spokenText']
            assert clip['locale'] == 'ja-JP' and clip['voice'] == voice
            assert clip['listeningReviewed'] is False
            assert len(data) == clip['bytes'] and sha(data) == clip['sha256']
            measured, flags = signal(path)
            assert abs(measured['durationSeconds'] - clip['durationSeconds']) <= 0.024
            rows.append({'text': text, 'gender': gender, 'voice': voice, 'file': clip['name'],
                         'sha256': clip['sha256'], 'bytes': clip['bytes'],
                         'durationSeconds': clip['durationSeconds'], 'signal': measured,
                         'signalFlags': flags, 'listeningReviewed': False})
    assert len(rows) == 36
    return {'schema': 1, 'course': 'japanese-travel-lunch', 'pairKey': 'Japanese:English',
            'lessonId': 'foundation-travel-lunch:1:ja-en', 'state': 'private-unreviewed-remainder',
            'sourceScopeSHA256': sha((COURSE / 'private-audio-scope.json').read_bytes()),
            'acceptedPilotManifestSHA256': pilot_sha, 'remainderManifestSHA256': sha(manifest_bytes),
            'distinctRemainderTexts': 18, 'clipsVerified': len(rows),
            'signalFlaggedClips': sum(bool(x['signalFlags']) for x in rows),
            'listeningReviewed': False, 'registered': False, 'webPublished': False,
            'nativeBundled': False, 'clips': rows}


def sheet(report):
    rows = []
    for row in report['clips']:
        rows.append('<section><h2 lang="ja">' + html.escape(row['text']) + '</h2><p>' +
                    html.escape(row['gender']) + ' · ' + html.escape(row['voice']) +
                    '</p><audio controls preload="none" src="' + html.escape(row['file'], quote=True) +
                    '"></audio><p>Signal flags: ' +
                    html.escape(', '.join(row['signalFlags']) or 'none') + '</p></section>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>Japanese Lunch F1 remainder review</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:24px}'
            'section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:16px 0}'
            'audio{width:100%}</style><h1>Japanese Lunch · Foundation 1 remainder</h1>'
            '<p>36 private recordings beyond the accepted pilot. Listen before approval; no clip here is released.</p>' +
            ''.join(rows) + '</html>\n')


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
    print(json.dumps({key: report[key] for key in ('distinctRemainderTexts', 'clipsVerified',
                                                   'signalFlaggedClips', 'listeningReviewed')}))


if __name__ == '__main__':
    main()
