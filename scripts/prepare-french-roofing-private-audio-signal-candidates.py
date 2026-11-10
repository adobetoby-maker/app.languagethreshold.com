#!/usr/bin/env python3
"""Make private, source-pinned repair candidates for Roofing signal flags."""

import argparse
import base64
import hashlib
import html
import json
import os
from pathlib import Path
from runpy import run_path
import subprocess
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/Users/drive/lt-audio/french-roofing/full-course-2026-11-09')
OUTPUT = Path('/Users/drive/lt-audio/french-roofing/signal-candidates-2026-11-09')
SIGNAL = run_path(str(ROOT / 'scripts/audit-french-roofing-private-audio-signal.py'))['signal']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def plan():
    manifest_bytes = (SOURCE / 'manifest.json').read_bytes()
    signal_bytes = (SOURCE / 'signal-screen-2026-11-09.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    report = json.loads(signal_bytes)
    if (report['manifestSha256'] != sha(manifest_bytes) or report['filesDecoded'] != 2762 or
            report['flaggedFiles'] != 11 or manifest['textReviewed'] or
            manifest['listeningReviewed'] or manifest['registered']):
        raise ValueError('Private source identity or signal report changed')
    jobs = []
    for row in report['flags']:
        clip = manifest['clips'][row['textSha256']]['voices'][row['gender']]
        original = SOURCE / clip['name']
        if (clip['text'], clip['voice'], clip['listeningReviewed'], sha(original.read_bytes())) != (
                row['text'], row['voice'], False, clip['sha256']):
            raise ValueError('Original clip differs from source-pinned signal flag')
        if row['issues'] == ['long-edge-silence']:
            kind = 'trim-edge-silence'
        elif set(row['issues']) == {'very-quiet', 'little-active-signal'}:
            kind = 'same-text-retake'
        else:
            raise ValueError(f'Unplanned signal flag: {row["filename"]}')
        jobs.append((row, clip, original, kind))
    return manifest_bytes, signal_bytes, jobs


def retake(text, voice, token):
    payload = {'input': {'text': text}, 'voice': {'languageCode': 'fr-FR', 'name': voice},
               'audioConfig': {'audioEncoding': 'MP3'}}
    request = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize',
        data=json.dumps(payload, ensure_ascii=False).encode(),
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json',
                 'x-goog-user-project': 'workerbee-494003'})
    with urllib.request.urlopen(request, timeout=75) as response:
        return base64.b64decode(json.load(response)['audioContent'])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true')
    args = parser.parse_args()
    manifest_bytes, signal_bytes, jobs = plan()
    paid = [row for row, _, _, kind in jobs if kind == 'same-text-retake']
    print(json.dumps({'signalFlags': len(jobs), 'trims': len(jobs)-len(paid),
                      'retakes': len(paid), 'paidCharacters': sum(len(row['text']) for row in paid),
                      'nominalRetakeUSD': round(sum(len(row['text']) for row in paid) * 0.00003, 5),
                      'paidSynthesis': args.generate}, ensure_ascii=False), flush=True)
    if not args.generate:
        return
    if OUTPUT.exists():
        raise FileExistsError(OUTPUT)
    os.umask(0o077)
    OUTPUT.mkdir(parents=True)
    token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'],
                           capture_output=True, text=True, check=True).stdout.strip()
    candidates = []
    for row, clip, original, kind in jobs:
        target = OUTPUT / (Path(clip['name']).stem + '-candidate.mp3')
        before = SIGNAL(original)
        if kind == 'trim-edge-silence':
            start = max(0, round(before['leadingSilenceSeconds'] - 0.35, 3))
            end = round(before['durationSeconds'] - max(0, before['trailingSilenceSeconds'] - 0.35), 3)
            subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', str(original),
                            '-af', f'atrim=start={start}:end={end},asetpts=PTS-STARTPTS',
                            '-codec:a', 'libmp3lame', '-q:a', '2', str(target)], check=True)
        else:
            target.write_bytes(retake(row['text'], row['voice'], token))
        after = SIGNAL(target)
        if (after['durationSeconds'] <= 0.1 or after['clippedFraction'] > 0.001 or
            kind == 'trim-edge-silence' and (
                after['leadingSilenceSeconds'] >= 1 or after['trailingSilenceSeconds'] >= 1 or
                after['activeSeconds'] < before['activeSeconds'] - 0.03)):
            raise ValueError(f'Candidate failed active-speech check: {target.name}')
        candidates.append({'kind': kind, 'textSha256': row['textSha256'], 'text': row['text'],
                           'voice': row['voice'], 'gender': row['gender'],
                           'originalFile': clip['name'], 'originalSha256': clip['sha256'],
                           'candidateFile': target.name, 'candidateSha256': sha(target.read_bytes()),
                           'before': before, 'after': after, 'listeningReviewed': False})
    result = {'schema': 1, 'state': 'private-signal-candidates', 'pairKey': 'French:English',
              'sourceManifestSha256': sha(manifest_bytes), 'sourceSignalReportSha256': sha(signal_bytes),
              'textReviewed': False, 'listeningReviewed': False, 'registered': False,
              'candidates': candidates}
    (OUTPUT / 'manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    rows = []
    for item in candidates:
        rows.append('<section><h2 lang="fr">' + html.escape(item['text']) + '</h2><p>' +
                    html.escape(item['voice']) + ' — ' + item['kind'] + '</p><p>Original</p>' +
                    '<audio controls preload="none" src="../full-course-2026-11-09/' +
                    html.escape(item['originalFile'], quote=True) + '"></audio><p>Candidate</p>' +
                    '<audio controls preload="none" src="' + html.escape(item['candidateFile'], quote=True) +
                    '"></audio></section>')
    (OUTPUT / 'review.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Roofing audio candidates</title>'
        '<style>body{font:18px system-ui;max-width:850px;margin:auto;padding:1rem}audio{width:100%}'
        'section{border:1px solid #aaa;border-radius:10px;padding:1rem;margin:1rem 0}</style>'
        '<h1>Private Roofing audio candidates</h1><p>Original course clips remain unchanged. '
        'Listen to each candidate before selecting a replacement.</p>' + ''.join(rows) + '</html>\n')
    print(json.dumps({'candidates': len(candidates), 'output': str(OUTPUT)}))


if __name__ == '__main__':
    main()
