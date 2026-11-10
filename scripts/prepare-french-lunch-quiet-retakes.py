#!/usr/bin/env python3
"""Create exact-text private SSML candidates for quiet French Lunch clips."""
import argparse
import base64
import hashlib
import html
import importlib.util
import json
import os
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = Path('/Users/drive/lt-audio/french-travel-lunch')
OUT = PRIVATE / 'retake-candidates'
PROJECT = 'project-91661021-fb2d-4524-b9f'


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


signal = load(ROOT / 'scripts/audit-japanese101-audio-signal.py', 'signal_screen')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true')
    args = parser.parse_args()
    report = json.loads((PRIVATE / 'signal-screen.json').read_text())
    verification = json.loads((PRIVATE / 'verification-report.json').read_text())
    if report['manifestSetSHA256'] != verification['manifestSetSHA256']:
        raise ValueError('Private source audio changed after signal screen')
    flags = [f for f in report['flags'] if 'very-quiet' in f['issues']]
    if len(flags) != 9:
        raise ValueError('Expected exactly nine quiet source clips')
    if not args.generate:
        print(json.dumps({'quietSourceClips': len(flags), 'paidSynthesis': False,
                          'quotaProject': PROJECT}))
        return
    os.umask(0o077)
    OUT.mkdir(exist_ok=True)
    token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'],
                           capture_output=True, text=True, check=True).stdout.strip()
    rows = []
    for flag in flags:
        source = PRIVATE / flag['path']
        source_data = source.read_bytes()
        if sha(source_data) != flag['sha256']:
            raise ValueError(f'Source clip changed: {source}')
        text = flag['spokenText']
        voice = flag['voice']
        ssml = f'<speak><prosody rate="slow" volume="+12dB">{html.escape(text)}</prosody></speak>'
        path = OUT / f'{source.stem}-ssml-slow-plus12db.mp3'
        if not path.exists():
            payload = {'input': {'ssml': ssml},
                       'voice': {'languageCode': 'fr-FR', 'name': voice},
                       'audioConfig': {'audioEncoding': 'MP3'}}
            request = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize',
                data=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
                headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json',
                         'x-goog-user-project': PROJECT})
            with urllib.request.urlopen(request, timeout=75) as response:
                data = base64.b64decode(json.load(response)['audioContent'])
            if len(data) < 500:
                raise ValueError('Empty retake candidate')
            path.write_bytes(data)
        data = path.read_bytes()
        measured = signal.decode(path)
        row = {'sourcePath': flag['path'], 'sourceSHA256': flag['sha256'],
               'candidatePath': str(path.relative_to(PRIVATE)),
               'candidateSHA256': sha(data), 'bytes': len(data),
               'displayText': flag['displayText'], 'spokenText': text,
               'voice': voice, 'locale': 'fr-FR', 'synthesisInput': ssml,
               'quotaProject': PROJECT, 'sourceSignal': flag['signal'],
               'candidateSignal': measured,
               'signalImproved': measured['peak'] >= 0.02 and measured['rms'] >= 0.004
                   and measured['activeSeconds'] >= 0.08
                   and measured['clippedFraction'] <= 0.001
                   and measured['leadingSilenceSeconds'] <= 1
                   and measured['trailingSilenceSeconds'] <= 1,
               'listeningReviewed': False, 'installed': False}
        rows.append(row)
        print(json.dumps({'source': flag['path'], 'candidate': row['candidatePath'],
                          'signalImproved': row['signalImproved']}), flush=True)
    result = {'schema': 1, 'courseId': 'travel-lunch',
              'manifestSetSHA256': report['manifestSetSHA256'],
              'quotaProject': PROJECT, 'candidates': rows,
              'listeningReviewed': False, 'installed': False}
    (OUT / 'quiet-retakes.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'candidateCount': len(rows),
                      'signalImproved': sum(r['signalImproved'] for r in rows)}))


if __name__ == '__main__':
    main()
