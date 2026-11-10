#!/usr/bin/env python3
"""Screen private French Roofing MP3 signal without approving any clip."""

import argparse
import array
from concurrent.futures import ThreadPoolExecutor
import hashlib
import html
import json
import math
from pathlib import Path
from runpy import run_path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/Users/drive/lt-audio/french-roofing/full-course-2026-11-09')
VERIFY = run_path(str(ROOT / 'scripts/verify-french-roofing-private-hd-audio.py'))['verify']
SAMPLE_RATE = 16000
SILENCE_THRESHOLD = 0.006


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def signal(path):
    decoded = subprocess.run(
        ['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', str(path), '-ac', '1',
         '-ar', str(SAMPLE_RATE), '-f', 's16le', '-acodec', 'pcm_s16le', '-'],
        capture_output=True, check=True,
    ).stdout
    samples = array.array('h')
    samples.frombytes(decoded)
    if not samples:
        raise ValueError(f'Empty decoded MP3: {path.name}')
    peak = total = active = clipped = 0
    first = last = None
    for index, sample in enumerate(samples):
        value = abs(sample) / 32768
        peak = max(peak, value)
        total += value * value
        if value >= SILENCE_THRESHOLD:
            active += 1
            if first is None:
                first = index
            last = index
        if value >= 0.999:
            clipped += 1
    count = len(samples)
    return {
        'durationSeconds': round(count / SAMPLE_RATE, 3),
        'peak': round(peak, 5),
        'rms': round(math.sqrt(total / count), 5),
        'activeSeconds': round(active / SAMPLE_RATE, 3),
        'leadingSilenceSeconds': round((first if first is not None else count) / SAMPLE_RATE, 3),
        'trailingSilenceSeconds': round((count - last - 1 if last is not None else count) / SAMPLE_RATE, 3),
        'clippedFraction': round(clipped / count, 6),
    }


def screen(job):
    output, key, text, gender, clip = job
    path = output / clip['name']
    raw = path.read_bytes()
    if len(raw) != clip['bytes'] or sha(raw) != clip['sha256']:
        raise ValueError(f'MP3 byte/hash mismatch before signal screen: {path.name}')
    result = signal(path)
    issues = []
    if result['peak'] < 0.02 or result['rms'] < 0.004:
        issues.append('very-quiet')
    if result['activeSeconds'] < 0.08:
        issues.append('little-active-signal')
    if result['clippedFraction'] > 0.001:
        issues.append('possible-clipping')
    if result['leadingSilenceSeconds'] > 1 or result['trailingSilenceSeconds'] > 1:
        issues.append('long-edge-silence')
    return {'textSha256': key, 'text': text, 'gender': gender, 'voice': clip['voice'],
            'filename': clip['name'], 'issues': issues, 'signal': result}


def audit(workers, output=OUTPUT):
    coverage = VERIFY(False, output)
    if coverage['verifiedClips'] != 2762 or coverage['sourceTexts'] != 1381:
        raise ValueError('Full-course source or audio coverage changed')
    manifest_bytes = (output / 'manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    if (manifest['textReviewed'], manifest['listeningReviewed'], manifest['registered']) != (False, False, False):
        raise ValueError('Private audio review gate changed')
    jobs = []
    for key, row in manifest['clips'].items():
        for gender in ('female', 'male'):
            clip = row['voices'][gender]
            if clip['listeningReviewed'] is not False:
                raise ValueError('Individual clip review gate changed')
            jobs.append((output, key, row['text'], gender, clip))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = list(pool.map(screen, jobs))
    flags = [row for row in results if row['issues']]
    return {'schema': 1, 'course': 'French Roofing',
            'scope': 'private-decoded-signal-screen', 'manifestSha256': sha(manifest_bytes),
            'sourceInventorySha256': coverage['sourceInventorySha256'],
            'filesDecoded': len(results), 'flaggedFiles': len(flags), 'flags': flags,
            'listeningReviewed': False, 'registered': False}


def review_sheet(report):
    rows = []
    for row in report['flags']:
        metrics = row['signal']
        rows.append('<section><h2 lang="fr">' + html.escape(row['text']) + '</h2><p>' +
                    html.escape(row['voice']) + ' · ' + html.escape(', '.join(row['issues'])) +
                    '</p><audio controls preload="none" src="' + html.escape(row['filename'], quote=True) +
                    '"></audio><p>Peak ' + str(metrics['peak']) + '; RMS ' + str(metrics['rms']) +
                    '; active ' + str(metrics['activeSeconds']) + ' s.</p></section>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>French Roofing signal review</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:1rem}'
            'section{border:1px solid #aaa;border-radius:10px;padding:1rem;margin:1rem 0}'
            'audio{width:100%;max-width:420px}</style><h1>French Roofing signal review</h1>'
            '<p>Automated signal flags are listening priorities, not pronunciation judgments or approvals. '
            'The course audio remains private and unregistered.</p>' + ''.join(rows) + '</html>\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--workers', type=int, default=4)
    parser.add_argument('--audio-root', type=Path, default=OUTPUT)
    parser.add_argument('--report', type=Path)
    parser.add_argument('--review-sheet', type=Path)
    args = parser.parse_args()
    if not 1 <= args.workers <= 8:
        raise SystemExit('--workers must be 1–8')
    report = audit(args.workers, args.audio_root)
    report_path = args.report or args.audio_root / 'signal-screen-2026-11-09.json'
    review_path = args.review_sheet or args.audio_root / 'signal-review-2026-11-09.html'
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    review_path.write_text(review_sheet(report))
    print(json.dumps({key: report[key] for key in ('filesDecoded', 'flaggedFiles')}, ensure_ascii=False))
