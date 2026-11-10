#!/usr/bin/env python3
"""Screen private FR-001 MP3 signal; never approve or register course audio."""

import argparse
import array
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import hashlib
import html
import json
import math
from pathlib import Path
import subprocess

from importlib.util import module_from_spec, spec_from_file_location

ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path('/Users/drive/lt-audio/french-pronunciation')
SUMMARY = ROOT / 'docs/french-program/fr-001-private-full-audio-signal-screen.json'
PRIVATE_REPORT = AUDIO / 'signal-screen-2026-11-10.json'
PRIVATE_SHEET = AUDIO / 'signal-listening-review-2026-11-10.html'
SAMPLE_RATE = 16000
THRESHOLD = 0.006


def verifier():
    path = ROOT / 'scripts/verify-french-pronunciation-full-audio.py'
    spec = spec_from_file_location('french_full_audio', path)
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def signal(path):
    decoded = subprocess.run(
        ['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', str(path), '-ac', '1',
         '-ar', str(SAMPLE_RATE), '-f', 's16le', '-acodec', 'pcm_s16le', '-'],
        capture_output=True, check=True,
    ).stdout
    samples = array.array('h')
    samples.frombytes(decoded)
    if not samples:
        raise ValueError(f'Empty decoded MP3: {path}')
    peak = total = active = clipped = 0
    first = last = None
    for index, sample in enumerate(samples):
        value = abs(sample) / 32768
        peak = max(peak, value)
        total += value * value
        if value >= THRESHOLD:
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
    batch, key, gender, clip = job
    path = AUDIO / batch / clip['name']
    raw = path.read_bytes()
    if len(raw) != clip['bytes'] or hashlib.sha256(raw).hexdigest() != clip['sha256']:
        raise ValueError(f'MP3 byte/hash mismatch: {path}')
    metrics = signal(path)
    issues = []
    if metrics['peak'] < 0.02 or metrics['rms'] < 0.004:
        issues.append('very-quiet')
    if metrics['activeSeconds'] < 0.08:
        issues.append('little-active-signal')
    if metrics['clippedFraction'] > 0.001:
        issues.append('possible-clipping')
    if metrics['leadingSilenceSeconds'] > 1 or metrics['trailingSilenceSeconds'] > 1:
        issues.append('long-edge-silence')
    return {'batch': batch, 'textSha256': key, 'text': clip['spokenText'],
            'gender': gender, 'voice': clip['voice'], 'filename': clip['name'],
            'sha256': clip['sha256'], 'issues': issues, 'signal': metrics}


def build(workers):
    full = verifier()
    coverage = full.build_report()
    if coverage['batchTextVoiceClips'] != 1778 or coverage['listeningReviewed'] is not False:
        raise ValueError('Full-course coverage or review state changed')
    jobs = []
    manifest_hashes = {}
    for batch in coverage['batches']:
        directory = Path(batch['directory'])
        raw = (directory / 'manifest.json').read_bytes()
        manifest_hashes[directory.name] = hashlib.sha256(raw).hexdigest()
        manifest = json.loads(raw)
        if manifest['listeningReviewed'] is not False or manifest['registered'] is not False:
            raise ValueError(f'Private review gate changed: {directory.name}')
        for key, voices in manifest['clips'].items():
            for gender, clip in voices.items():
                if clip['listeningReviewed'] is not False:
                    raise ValueError(f'Clip review gate changed: {directory.name}/{clip["name"]}')
                jobs.append((directory.name, key, gender, clip))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = list(pool.map(screen, jobs))
    flags = [row for row in results if row['issues']]
    counts = Counter(issue for row in flags for issue in row['issues'])
    summary = {'schema': 1, 'moduleId': 'french-sound-like-a-native',
               'pairKey': 'French:English', 'scope': 'private-decoded-signal-screen',
               'manifestSha256ByBatch': manifest_hashes,
               'filesDecoded': len(results), 'flaggedFiles': len(flags),
               'issueCounts': dict(sorted(counts.items())),
               'privateReport': str(PRIVATE_REPORT), 'privateReviewSheet': str(PRIVATE_SHEET),
               'listeningReviewed': False, 'runtimeRegistered': False}
    return summary, flags


def sheet(flags):
    rows = []
    for row in flags:
        path = AUDIO / row['batch'] / row['filename']
        metrics = row['signal']
        rows.append('<section><h2 lang="fr">' + html.escape(row['text']) + '</h2><p>' +
                    html.escape(row['voice']) + ' · ' + html.escape(', '.join(row['issues'])) +
                    '</p><audio controls preload="none" src="' +
                    html.escape(path.as_uri(), quote=True) + '"></audio><p>Leading ' +
                    str(metrics['leadingSilenceSeconds']) + ' s; trailing ' +
                    str(metrics['trailingSilenceSeconds']) + ' s; peak ' + str(metrics['peak']) +
                    '; RMS ' + str(metrics['rms']) + '.</p></section>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>French pronunciation signal review</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:1rem}'
            'section{border:1px solid #aaa;border-radius:10px;padding:1rem;margin:1rem 0}'
            'audio{width:100%;max-width:420px}</style><h1>French pronunciation signal review</h1>'
            '<p>Signal flags are listening priorities, not pronunciation judgments or approvals. '
            'All audio remains private and unregistered.</p>' + ''.join(rows) + '</html>\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--workers', type=int, default=4)
    parser.add_argument('--check-report', action='store_true')
    args = parser.parse_args()
    if not 1 <= args.workers <= 8:
        raise SystemExit('--workers must be 1–8')
    summary, flags = build(args.workers)
    encoded = json.dumps(summary, ensure_ascii=False, indent=2) + '\n'
    if args.check_report:
        assert SUMMARY.read_text() == encoded, 'Committed signal summary is stale'
    else:
        SUMMARY.write_text(encoded)
        PRIVATE_REPORT.write_text(json.dumps({**summary, 'flags': flags}, ensure_ascii=False, indent=2) + '\n')
        PRIVATE_SHEET.write_text(sheet(flags))
    print(json.dumps({key: summary[key] for key in ('filesDecoded', 'flaggedFiles', 'issueCounts')}, ensure_ascii=False))
