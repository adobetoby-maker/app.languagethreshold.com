#!/usr/bin/env python3
"""Prepare private exact-text SSML retakes for flagged French verb-form clips."""
import argparse
import base64
import hashlib
import html
import importlib.util
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = Path('/Users/drive/lt-audio/french-travel-lunch/content-supplement')
OUT = PRIVATE / 'retake-candidates'
PROJECT = 'project-91661021-fb2d-4524-b9f'


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SIGNAL = load(ROOT / 'scripts/audit-japanese101-audio-signal.py', 'french_lunch_retake_signal')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def require(value, message):
    if not value:
        raise ValueError(message)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--volume', choices=('+12dB', '+8dB', '+3dB'), default='+12dB')
    parser.add_argument('--only-clipped', action='store_true')
    parser.add_argument('--only-midrange', action='store_true')
    args = parser.parse_args()
    manifest_bytes = (PRIVATE / 'manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    report = json.loads((PRIVATE / 'signal-screen.json').read_text())
    require(report['manifestSha256'] == digest(manifest_bytes) and
            report['scope'] == 'supplement' and report['listeningReviewed'] is False and
            manifest['quotaProject'] == PROJECT and manifest['registered'] is False,
            'Source manifest or signal report changed')
    flags = report['flags']
    if args.only_clipped:
        require(args.volume == '+3dB', 'Clipped retakes use +3dB')
        prior = json.loads((OUT / 'retakes.json').read_text())
        clipped = {row['sourceName'] for row in prior['candidates']
                   if row['candidateSignal']['clippedFraction'] > 0.001}
        flags = [flag for flag in flags if flag['name'] in clipped]
    if args.only_midrange:
        require(args.volume == '+8dB' and not args.only_clipped,
                'Midrange retakes use +8dB')
        plus3 = json.loads((OUT / 'retakes-plus3db.json').read_text())
        unresolved = {row['sourceName'] for row in plus3['candidates']
                      if row['signalImproved'] is False}
        flags = [flag for flag in flags if flag['name'] in unresolved]
    if not args.generate:
        print(json.dumps({'flaggedSourceClips': len(flags),
                          'submittedTextCharacters': sum(len(flag['text']) for flag in flags),
                          'quotaProject': PROJECT, 'paidSynthesis': False}))
        return
    os.umask(0o077)
    OUT.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'],
                           capture_output=True, text=True, check=True).stdout.strip()
    rows = []
    for flag in flags:
        source = PRIVATE / flag['name']
        require(digest(source.read_bytes()) == flag['sha256'], 'Source recording changed')
        text = flag['text']
        voice = flag['voice']
        ssml = f'<speak><prosody rate="slow" volume="{args.volume}">{html.escape(text)}</prosody></speak>'
        suffix = args.volume[1:-2].join(('plus', 'db'))
        target = OUT / f'{source.stem}-ssml-slow-{suffix}.mp3'
        if not target.exists():
            payload = {'input': {'ssml': ssml},
                       'voice': {'languageCode': 'fr-FR', 'name': voice},
                       'audioConfig': {'audioEncoding': 'MP3'}}
            request = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize',
                data=json.dumps(payload, ensure_ascii=False).encode(),
                headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json',
                         'x-goog-user-project': PROJECT})
            for attempt in range(3):
                try:
                    data = base64.b64decode(json.load(urllib.request.urlopen(request, timeout=75))['audioContent'])
                    require(len(data) > 500, 'Empty retake')
                    temp = target.with_suffix('.part')
                    temp.write_bytes(data)
                    temp.replace(target)
                    break
                except urllib.error.HTTPError as error:
                    if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                        raise RuntimeError(f'Retake synthesis HTTP {error.code}') from None
                    time.sleep(2 ** attempt)
        data = target.read_bytes()
        measured = SIGNAL.decode(target)
        improved = measured['peak'] >= 0.02 and measured['rms'] >= 0.004 and \
            measured['activeSeconds'] >= 0.08 and measured['clippedFraction'] <= 0.001 and \
            measured['leadingSilenceSeconds'] <= 1 and measured['trailingSilenceSeconds'] <= 1
        rows.append({'sourceName': flag['name'], 'sourceSHA256': flag['sha256'],
                     'candidateName': target.name, 'candidateSHA256': digest(data),
                     'bytes': len(data), 'text': text, 'voice': voice,
                     'locale': 'fr-FR', 'synthesisInput': ssml,
                     'sourceSignal': flag['signal'], 'candidateSignal': measured,
                     'signalImproved': improved, 'listeningReviewed': False,
                     'installed': False})
        print(json.dumps({'source': flag['name'], 'signalImproved': improved}), flush=True)
    result = {'schema': 1, 'scope': 'supplement', 'quotaProject': PROJECT,
              'manifestSha256': report['manifestSha256'], 'candidates': rows,
              'listeningReviewed': False, 'installed': False}
    report_name = 'retakes.json' if args.volume == '+12dB' else f'retakes-{suffix}.json'
    (OUT / report_name).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'candidateCount': len(rows),
                      'signalImproved': sum(row['signalImproved'] for row in rows)}))


if __name__ == '__main__':
    main()
