#!/usr/bin/env python3
"""Create private, source-pinned candidates for French Breakfast signal flags."""

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
SOURCE = Path('/Users/drive/lt-audio/french-travel-breakfast/full-course-2026-11-09')
OUTPUT = Path('/Users/drive/lt-audio/french-travel-breakfast/signal-candidates-2026-11-09')
GENERATOR = run_path(str(ROOT / 'scripts/generate-french-travel-breakfast-private-hd-audio.py'))
SIGNAL = run_path(str(ROOT / 'scripts/audit-french-travel-breakfast-private-audio-signal.py'))['signal']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def inputs():
    inventory, inventory_sha = GENERATOR['source']()
    manifest_bytes = (SOURCE / 'manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    report_bytes = (SOURCE / 'signal-screen-2026-11-09.json').read_bytes()
    report = json.loads(report_bytes)
    if (manifest['sourceInventorySha256'] != inventory_sha or
            report['manifestSha256'] != sha(manifest_bytes) or
            report['sourceInventorySha256'] != inventory_sha or
            report['filesDecoded'] != 3216 or report['flaggedFiles'] != 8):
        raise ValueError('Source inventory, manifest, or signal report changed')
    if (manifest['textReviewed'], manifest['listeningReviewed'], manifest['registered']) != (False, False, False):
        raise ValueError('Private full-course review gate changed')
    jobs = []
    for row in report['flags']:
        clip = manifest['clips'][row['textSha256']]['voices'][row['gender']]
        if (clip['name'], clip['text'], clip['voice'], clip['listeningReviewed']) != (
                row['filename'], row['text'], row['voice'], False):
            raise ValueError('Signal flag does not match a private exact-text clip')
        original = SOURCE / clip['name']
        if sha(original.read_bytes()) != clip['sha256']:
            raise ValueError(f'Original clip bytes changed: {original.name}')
        if row['issues'] == ['long-edge-silence'] and row['signal']['trailingSilenceSeconds'] > 1:
            kind = 'trim-trailing-silence'
        elif set(row['issues']) == {'very-quiet', 'little-active-signal'}:
            kind = 'same-text-retake'
        else:
            raise ValueError(f'Unplanned signal issue: {row["filename"]}')
        jobs.append((row, clip, original, kind))
    return inventory, manifest_bytes, report_bytes, jobs


def synthesize(text, voice, project, token):
    payload = {'input': {'text': text}, 'voice': {'languageCode': 'fr-FR', 'name': voice},
               'audioConfig': {'audioEncoding': 'MP3'}}
    request = urllib.request.Request(
        'https://texttospeech.googleapis.com/v1/text:synthesize',
        data=json.dumps(payload, ensure_ascii=False).encode(),
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json',
                 'x-goog-user-project': project},
    )
    with urllib.request.urlopen(request, timeout=75) as response:
        return base64.b64decode(json.load(response)['audioContent'])


def review_sheet(candidates):
    rows = []
    for item in candidates:
        original = html.escape(item['originalFile'], quote=True)
        candidate = html.escape(item['candidateFile'], quote=True)
        rows.append('<section><h2 lang="fr">' + html.escape(item['text']) + '</h2><p>' +
                    html.escape(item['voice']) + ' · ' + html.escape(item['kind']) +
                    '</p><p>Original</p><audio controls preload="none" src="../full-course-2026-11-09/' + original +
                    '"></audio><p>Candidate</p><audio controls preload="none" src="' + candidate +
                    '"></audio><p>Peak ' + str(item['before']['peak']) + ' → ' + str(item['after']['peak']) +
                    '; active signal ' + str(item['before']['activeSeconds']) + ' → ' +
                    str(item['after']['activeSeconds']) + ' s; trailing silence ' +
                    str(item['before']['trailingSilenceSeconds']) + ' → ' +
                    str(item['after']['trailingSilenceSeconds']) + ' s.</p></section>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>French Breakfast signal candidates</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:1rem}'
            'section{border:1px solid #aaa;border-radius:10px;padding:1rem;margin:1rem 0}'
            'audio{width:100%;max-width:420px}</style><h1>French Breakfast signal candidates</h1>'
            '<p>Private listening comparisons. Original course recordings are unchanged; '
            'signal strength alone does not approve pronunciation.</p>' + ''.join(rows) + '</html>\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project')
    parser.add_argument('--generate', action='store_true')
    args = parser.parse_args()
    inventory, manifest_bytes, report_bytes, jobs = inputs()
    paid = [row for row, _, _, kind in jobs if kind == 'same-text-retake']
    plan = {'signalFlags': len(jobs), 'trims': len(jobs) - len(paid),
            'paidRetakes': len(paid), 'paidCharacters': sum(len(row['text']) for row in paid),
            'nominalRetakeUSD': round(sum(len(row['text']) for row in paid) * 0.00003, 5),
            'paidSynthesis': args.generate}
    print(json.dumps(plan, ensure_ascii=False), flush=True)
    if not args.generate:
        return
    if args.project != 'workerbee-494003':
        raise ValueError('Use the project pinned for the accepted French pilot')
    if OUTPUT.exists():
        raise FileExistsError(f'Candidate folder already exists: {OUTPUT}')
    os.umask(0o077)
    OUTPUT.mkdir(parents=True)
    token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'],
                           capture_output=True, text=True, check=True).stdout.strip()
    candidates = []
    for row, clip, original, kind in jobs:
        candidate = OUTPUT / (Path(clip['name']).stem + '-candidate.mp3')
        if kind == 'trim-trailing-silence':
            end = round(row['signal']['durationSeconds'] -
                        (row['signal']['trailingSilenceSeconds'] - 0.35), 3)
            subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', str(original),
                            '-af', f'atrim=end={end},asetpts=PTS-STARTPTS',
                            '-codec:a', 'libmp3lame', '-q:a', '2', str(candidate)], check=True)
        else:
            candidate.write_bytes(synthesize(row['text'], row['voice'], args.project, token))
        before = SIGNAL(original)
        after = SIGNAL(candidate)
        if (after['durationSeconds'] <= 0.1 or after['clippedFraction'] > 0.001 or
                kind == 'trim-trailing-silence' and (
                    after['trailingSilenceSeconds'] >= 1 or
                    after['activeSeconds'] < before['activeSeconds'] - 0.03)):
            raise ValueError(f'Candidate failed signal preservation: {candidate.name}')
        candidates.append({'kind': kind, 'textSha256': row['textSha256'], 'text': row['text'],
                           'gender': row['gender'], 'voice': row['voice'],
                           'originalFile': clip['name'], 'originalSha256': clip['sha256'],
                           'candidateFile': candidate.name, 'candidateSha256': sha(candidate.read_bytes()),
                           'candidateBytes': candidate.stat().st_size, 'before': before, 'after': after,
                           'listeningReviewed': False})
    result = {'schema': 1, 'state': 'private-signal-candidates', 'pairKey': 'French:English',
              'sourceInventorySha256': json.loads(manifest_bytes)['sourceInventorySha256'],
              'sourceManifestSha256': sha(manifest_bytes), 'sourceSignalReportSha256': sha(report_bytes),
              'textReviewed': False, 'listeningReviewed': False, 'registered': False,
              'candidates': candidates}
    (OUTPUT / 'manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    (OUTPUT / 'review.html').write_text(review_sheet(candidates))
    print(json.dumps({'candidates': len(candidates), 'output': str(OUTPUT)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
