#!/usr/bin/env python3
"""Make isolated, source-pinned private retakes of quiet FR-001 audio."""

import argparse
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path('/Users/drive/lt-audio/french-pronunciation')
REPORT = AUDIO / 'signal-screen-2026-11-10.json'
SUMMARY = ROOT / 'docs/french-program/fr-001-private-full-audio-signal-screen.json'
OUTPUT = AUDIO / 'quiet-retakes-2026-11-10'
PROJECT = 'project-91661021-fb2d-4524-b9f'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def atomic_json(path, value):
    part = path.with_suffix('.json.part')
    part.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    part.replace(path)


def signal(path):
    script = ROOT / 'scripts/audit-french-pronunciation-private-audio-signal.py'
    spec = importlib.util.spec_from_file_location('french_signal', script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.signal(path)


def pending_pairs():
    report = json.loads(REPORT.read_text())
    summary = json.loads(SUMMARY.read_text())
    for key in ('manifestSha256ByBatch', 'filesDecoded', 'flaggedFiles',
                'flaggedFilesWithSignalCleanExactTextVoiceAlternative'):
        if report[key] != summary[key]:
            raise ValueError(f'Signal report differs from pinned summary: {key}')
    if report['filesDecoded'] != 1778 or report['flaggedFiles'] != 28:
        raise ValueError('Unexpected signal audit scope')
    for batch, digest in summary['manifestSha256ByBatch'].items():
        if sha((AUDIO / batch / 'manifest.json').read_bytes()) != digest:
            raise ValueError(f'Source manifest changed: {batch}')
    has_clean_alternative = {(item['flagged']['text'], item['flagged']['gender'])
                             for item in report['alternatives']}
    rows = {}
    for flag in report['flags']:
        identity = (flag['text'], flag['gender'])
        if identity in has_clean_alternative or 'very-quiet' not in flag['issues']:
            continue
        current = rows.setdefault(identity, {'text': flag['text'], 'gender': flag['gender'],
                                             'voice': flag['voice'], 'originals': []})
        if current['voice'] != flag['voice']:
            raise ValueError(f'Voice changed for {identity}')
        current['originals'].append({'batch': flag['batch'], 'sha256': flag['sha256'],
                                     'peak': flag['signal']['peak']})
    return [rows[key] for key in sorted(rows)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true', help='Issue paid Cloud TTS requests')
    parser.add_argument('--limit', type=int, default=20)
    parser.add_argument('--retry-from', type=Path,
                        help='Previous isolated retake manifest; retry only clips still quiet')
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        parser.error('--limit must be 1–20')
    os.umask(0o077)
    pairs = pending_pairs()
    if args.retry_from:
        if args.retry_from.resolve() == (args.output / 'manifest.json').resolve():
            raise ValueError('Retry output must be a new private directory')
        prior = json.loads(args.retry_from.read_text())
        if (prior['pairKey'], prior['locale'], prior['quotaProject'],
            prior['sourceSignalSummarySha256'], prior['listeningReviewed'], prior['registered']) != (
            'French:English', 'fr-FR', PROJECT, sha(SUMMARY.read_bytes()), False, False):
            raise ValueError('Previous retake manifest identity/review gate changed')
        eligible = set()
        for clip in prior['clips'].values():
            path = args.retry_from.parent / clip['name']
            if not path.is_file() or sha(path.read_bytes()) != clip['sha256']:
                raise ValueError(f'Previous retake file changed: {clip["name"]}')
            metrics = clip['signal']
            if metrics['peak'] < 0.02 or metrics['rms'] < 0.004 or metrics['activeSeconds'] < 0.08:
                eligible.add((clip['text'], clip['gender']))
        pairs = [pair for pair in pairs if (pair['text'], pair['gender']) in eligible]
    manifest_path = args.output / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {
        'schema': 1, 'pairKey': 'French:English', 'locale': 'fr-FR',
        'quotaProject': PROJECT, 'sourceSignalSummarySha256': sha(SUMMARY.read_bytes()),
        'listeningReviewed': False, 'registered': False, 'clips': {},
    }
    if (manifest['pairKey'], manifest['locale'], manifest['quotaProject'],
        manifest['sourceSignalSummarySha256'], manifest['listeningReviewed'], manifest['registered']) != (
        'French:English', 'fr-FR', PROJECT, sha(SUMMARY.read_bytes()), False, False):
        raise ValueError('Retake manifest identity/review gate changed')
    pending = []
    for pair in pairs:
        key = sha((pair['text'] + '\n' + pair['gender']).encode())
        name = f'fr-pronunciation-retake-{key[:24]}-{pair["gender"]}.mp3'
        clip = manifest['clips'].get(key)
        if clip:
            path = args.output / clip['name']
            if clip['name'] != name or clip['text'] != pair['text'] or clip['voice'] != pair['voice'] or \
                    not path.is_file() or sha(path.read_bytes()) != clip['sha256'] or \
                    clip['listeningReviewed'] is not False:
                raise ValueError(f'Existing retake mismatch: {name}')
        else:
            if (args.output / name).exists():
                raise ValueError(f'Untracked retake file: {name}')
            pending.append((key, name, pair))
    planned = pending[:args.limit]
    print(json.dumps({'quietTextVoicePairs': len(pairs), 'existingRetakes': len(pairs) - len(pending),
                      'plannedRetakes': len(planned),
                      'plannedCharacters': sum(len(pair['text']) for _, _, pair in planned),
                      'paidSynthesis': args.generate}), flush=True)
    if not args.generate or not planned:
        return
    args.output.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'],
                           capture_output=True, text=True, check=True).stdout.strip()
    for key, name, pair in planned:
        payload = {'input': {'text': pair['text']},
                   'voice': {'languageCode': 'fr-FR', 'name': pair['voice']},
                   'audioConfig': {'audioEncoding': 'MP3'}}
        request = urllib.request.Request(
            'https://texttospeech.googleapis.com/v1/text:synthesize',
            data=json.dumps(payload).encode(),
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json',
                     'x-goog-user-project': PROJECT})
        for attempt in range(3):
            try:
                response = json.load(urllib.request.urlopen(request, timeout=75))
                raw = base64.b64decode(response['audioContent'])
                if len(raw) <= 500:
                    raise ValueError('Empty MP3 response')
                path = args.output / name
                part = path.with_suffix('.part')
                part.write_bytes(raw)
                metrics = signal(part)
                part.replace(path)
                manifest['clips'][key] = {'name': name, 'text': pair['text'],
                                          'textSha256': sha(pair['text'].encode()),
                                          'voice': pair['voice'], 'gender': pair['gender'],
                                          'sha256': sha(raw), 'bytes': len(raw),
                                          'signal': metrics, 'originals': pair['originals'],
                                          'listeningReviewed': False}
                atomic_json(manifest_path, manifest)
                print(json.dumps({'text': pair['text'], 'gender': pair['gender'],
                                  'peak': metrics['peak'], 'rms': metrics['rms'],
                                  'activeSeconds': metrics['activeSeconds']}), flush=True)
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError(f'Synthesis HTTP {error.code}') from None
                time.sleep(2 ** attempt)


if __name__ == '__main__':
    main()
