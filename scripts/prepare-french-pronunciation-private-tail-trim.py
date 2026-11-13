#!/usr/bin/env python3
"""Prepare one private FR-001 trailing-silence trim for listening review."""

import hashlib
import html
import importlib.util
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path('/Users/drive/lt-audio/french-pronunciation')
REPORT = AUDIO / 'signal-screen-2026-11-10.json'
OUTPUT = AUDIO / 'tail-trim-2026-11-10'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def signal(path):
    script = ROOT / 'scripts/audit-french-pronunciation-private-audio-signal.py'
    spec = importlib.util.spec_from_file_location('french_signal', script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.signal(path)


def main():
    report_bytes = REPORT.read_bytes()
    report = json.loads(report_bytes)
    rows = [row for row in report['flags'] if 'long-edge-silence' in row['issues']]
    if len(rows) != 1 or rows[0]['issues'] != ['long-edge-silence']:
        raise ValueError('Unexpected long-silence scope')
    row = rows[0]
    if not 1 < row['signal']['trailingSilenceSeconds'] < 1.5 or row['signal']['leadingSilenceSeconds'] > 1:
        raise ValueError('Unexpected silence location')
    batch = row['batch']
    manifest_bytes = (AUDIO / batch / 'manifest.json').read_bytes()
    if sha(manifest_bytes) != report['manifestSha256ByBatch'][batch]:
        raise ValueError('Source manifest changed')
    manifest = json.loads(manifest_bytes)
    clip = manifest['clips'][row['textSha256']][row['gender']]
    if (clip['name'], clip['sha256'], clip['spokenText'], clip['voice'],
        clip['listeningReviewed'], manifest['listeningReviewed'], manifest['registered']) != (
        row['filename'], row['sha256'], row['text'], row['voice'], False, False, False):
        raise ValueError('Source clip or review gate changed')
    original = AUDIO / batch / clip['name']
    if sha(original.read_bytes()) != clip['sha256']:
        raise ValueError('Source MP3 changed')
    OUTPUT.mkdir(exist_ok=True)
    candidate = OUTPUT / clip['name']
    if candidate.exists():
        raise FileExistsError('Candidate already exists; inspect it before another trim')
    end = round(row['signal']['durationSeconds'] - row['signal']['trailingSilenceSeconds'] + 0.35, 3)
    subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', str(original),
                    '-af', f'atrim=end={end},asetpts=PTS-STARTPTS',
                    '-codec:a', 'libmp3lame', '-q:a', '2', str(candidate)], check=True)
    before = signal(original)
    after = signal(candidate)
    if (before != row['signal'] or after['trailingSilenceSeconds'] > 0.6 or
        after['activeSeconds'] < before['activeSeconds'] - 0.03 or
        after['peak'] < 0.02 or after['clippedFraction'] > 0.001):
        raise ValueError('Trim signal needs manual inspection')
    record = {'schema': 1, 'state': 'private-tail-trim-candidate',
              'sourceSignalReportSha256': sha(report_bytes),
              'sourceManifestSha256': sha(manifest_bytes),
              'text': row['text'], 'textSha256': row['textSha256'],
              'voice': row['voice'], 'original': str(original),
              'originalSha256': clip['sha256'], 'candidate': str(candidate),
              'candidateSha256': sha(candidate.read_bytes()), 'trimEndSeconds': end,
              'before': before, 'after': after,
              'listeningReviewed': False, 'registered': False}
    (OUTPUT / 'manifest.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    (OUTPUT / 'review.html').write_text(
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
        'content="width=device-width,initial-scale=1"><title>French pronunciation tail trim</title>'
        '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:1rem}'
        'audio{display:block;width:100%;max-width:420px;margin:1rem 0}</style>'
        '<h1>French pronunciation tail trim</h1><p>Private listening candidate only; '
        'the source recording and course manifest are unchanged.</p><h2 lang="fr">' +
        html.escape(row['text']) + '</h2><p>Original</p><audio controls src="' +
        html.escape(original.as_uri(), quote=True) + '"></audio><p>Trim candidate</p>'
        '<audio controls src="' + html.escape(candidate.as_uri(), quote=True) +
        '"></audio></html>\n')
    print(json.dumps({'candidate': str(candidate), 'beforeTrailingSeconds': before['trailingSilenceSeconds'],
                      'afterTrailingSeconds': after['trailingSilenceSeconds']}))


if __name__ == '__main__':
    main()
