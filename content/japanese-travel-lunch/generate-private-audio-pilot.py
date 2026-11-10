#!/usr/bin/env python3
"""Synthesize at most twenty private Japanese Lunch clips; dry run by default."""
import argparse
import base64
import hashlib
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

COURSE = Path(__file__).resolve().parent
ROOT = COURSE.parents[1]
SCOPE = COURSE / 'private-audio-scope.json'
VOICES = {'female': 'ja-JP-Chirp3-HD-Aoede', 'male': 'ja-JP-Chirp3-HD-Charon'}
DEFAULT_OUTPUT = Path('/Users/drive/lt-audio/japanese-travel-lunch/foundation-1-pilot')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def duration_seconds(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(path)], capture_output=True, text=True, check=True)
    duration = float(result.stdout.strip())
    if not 0.1 < duration < 120:
        raise ValueError(f'Invalid MP3 duration: {path.name}')
    return round(duration, 3)


def atomic_json(path, value):
    temp = path.with_suffix(path.suffix + '.part')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true', help='Make paid synthesis requests')
    parser.add_argument('--project', help='Google Cloud billing/quota project; required for --generate')
    parser.add_argument('--limit', type=int, default=10, help='Maximum new clips, 1–20')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    if not 1 <= args.limit <= 20 or (args.generate and not args.project):
        raise SystemExit('Use --limit 1–20; paid synthesis also requires --project')
    if args.output.resolve().is_relative_to(ROOT.resolve()):
        raise SystemExit('Private MP3s must stay outside the repository')
    subprocess.run(['python3', str(COURSE / 'build-private-audio-scope.py'), '--check'], check=True, capture_output=True, text=True)
    scope = json.loads(SCOPE.read_text())
    if scope['locale'] != 'ja-JP' or scope['voices'] != VOICES or scope['reviewed'] is not False or scope['listeningReviewed'] is not False:
        raise ValueError('Wrong audio scope identity or review state')
    lesson = 'foundation-travel-lunch:1:ja-en:'
    selected = [(key, value) for key, value in scope['texts'].items() if any(ref.startswith(lesson) for ref in value['occurrences'])]
    selected.sort(key=lambda item: (0 if any(ref.startswith(lesson+'card:') for ref in item[1]['occurrences']) else 1, min(int(ref.rsplit(':', 1)[1]) for ref in item[1]['occurrences'] if ref.startswith(lesson+'card:')) if any(ref.startswith(lesson+'card:') for ref in item[1]['occurrences']) else 999, item[0]))
    selected = selected[:5]
    if len(selected) != 5:
        raise ValueError('Expected five Foundation 1 pilot texts')
    manifest_path = args.output / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {'schema': 1, 'course': 'japanese-travel-lunch', 'lessonId': 'foundation-travel-lunch:1:ja-en', 'locale': 'ja-JP', 'voices': VOICES, 'sourceSHA256': scope['normalizedTextSHA256'], 'listeningReviewed': False, 'clips': {}}
    if (manifest['course'] != 'japanese-travel-lunch' or manifest['lessonId'] != 'foundation-travel-lunch:1:ja-en' or manifest['locale'] != 'ja-JP' or manifest['voices'] != VOICES or manifest['sourceSHA256'] != scope['normalizedTextSHA256'] or manifest['listeningReviewed'] is not False):
        raise ValueError('Existing manifest identity, source, or review state mismatch')
    if set(manifest['clips']) - {key for key, _ in selected}:
        raise ValueError('Existing manifest contains out-of-scope clips')
    jobs = []
    for key, value in selected:
        for gender, voice in VOICES.items():
            name = 'ja-lunch-f1-' + sha(key.encode())[:20] + '-' + gender + '.mp3'
            existing = manifest['clips'].get(key, {}).get(gender)
            path = args.output / name
            if existing:
                if existing.get('name') == name and existing.get('voice') == voice and existing.get('spokenText') == value['spokenText'] and existing.get('listeningReviewed') is False and path.is_file() and sha(path.read_bytes()) == existing.get('sha256') and duration_seconds(path) == existing.get('durationSeconds'):
                    continue
                raise ValueError(f'Existing clip invalid; do not overwrite: {name}')
            jobs.append((key, value, gender, voice, name))
    existing_count = len(selected)*2 - len(jobs)
    jobs = jobs[:args.limit]
    print(json.dumps({'sourceSHA256': scope['normalizedTextSHA256'], 'selectedTexts': len(selected), 'existingClips': existing_count, 'plannedClips': len(jobs), 'plannedCharacters': sum(len(job[1]['spokenText']) for job in jobs), 'paidSynthesis': args.generate}, ensure_ascii=False), flush=True)
    if not args.generate:
        return
    os.umask(0o077)
    args.output.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'], capture_output=True, text=True, check=True).stdout.strip()
    for key, value, gender, voice, name in jobs:
        payload = {'input': {'text': value['spokenText']}, 'voice': {'languageCode': 'ja-JP', 'name': voice}, 'audioConfig': {'audioEncoding': 'MP3'}}
        request = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize', data=json.dumps(payload).encode(), headers={'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'x-goog-user-project': args.project})
        for attempt in range(3):
            try:
                response = json.load(urllib.request.urlopen(request, timeout=75))
                data = base64.b64decode(response['audioContent'])
                if len(data) <= 500:
                    raise ValueError('Empty MP3')
                path = args.output / name
                temp = path.with_suffix('.part')
                temp.write_bytes(data)
                measured = duration_seconds(temp)
                temp.replace(path)
                manifest['clips'].setdefault(key, {})[gender] = {'name': name, 'voice': voice, 'locale': 'ja-JP', 'displayText': value['displayText'], 'spokenText': value['spokenText'], 'bytes': len(data), 'sha256': sha(data), 'durationSeconds': measured, 'listeningReviewed': False}
                atomic_json(manifest_path, manifest)
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError(f'Synthesis HTTP {error.code}') from None
                time.sleep(2**attempt)
    print(f"Saved {len(jobs)} private MP3s under {args.output}; listeningReviewed remains false")


if __name__ == '__main__':
    main()
