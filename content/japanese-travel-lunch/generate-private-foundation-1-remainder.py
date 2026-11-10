#!/usr/bin/env python3
"""Generate the non-pilot Foundation 1 Japanese Lunch audio, privately and resumably."""

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
AUDIO = Path('/Users/drive/lt-audio/japanese-travel-lunch')
PILOT = AUDIO / 'foundation-1-pilot'
DEFAULT_OUTPUT = AUDIO / 'foundation-1-remainder-2026-11-10'
SCOPE = COURSE / 'private-audio-scope.json'
VOICES = {'female': 'ja-JP-Chirp3-HD-Aoede', 'male': 'ja-JP-Chirp3-HD-Charon'}
LESSON = 'foundation-travel-lunch:1:ja-en'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def duration(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                             '-of', 'default=noprint_wrappers=1:nokey=1', str(path)],
                            capture_output=True, text=True, check=True)
    seconds = round(float(result.stdout.strip()), 3)
    assert 0.1 < seconds < 120
    return seconds


def save(path, value):
    temp = path.with_suffix('.part')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)


def selected_scope():
    subprocess.run(['python3', str(COURSE / 'build-private-audio-scope.py'), '--check'],
                   check=True, capture_output=True, text=True)
    scope = json.loads(SCOPE.read_text())
    assert scope['locale'] == 'ja-JP' and scope['voices'] == VOICES
    assert scope['reviewed'] is scope['listeningReviewed'] is scope['registered'] is False
    prefix = LESSON + ':'
    selected = [(text, value) for text, value in scope['texts'].items()
                if any(ref.startswith(prefix) for ref in value['occurrences'])]
    selected.sort(key=lambda item: (0 if any(ref.startswith(prefix + 'card:') for ref in item[1]['occurrences']) else 1,
                                    min((int(ref.rsplit(':', 1)[1]) for ref in item[1]['occurrences']
                                         if ref.startswith(prefix + 'card:')), default=999), item[0]))
    assert len(selected) == 23
    pilot_bytes = (PILOT / 'manifest.json').read_bytes()
    pilot = json.loads(pilot_bytes)
    assert pilot['course'] == 'japanese-travel-lunch' and pilot['lessonId'] == LESSON
    assert pilot['locale'] == 'ja-JP' and pilot['voices'] == VOICES
    assert pilot['sourceSHA256'] == scope['normalizedTextSHA256']
    assert pilot['listeningReviewed'] is True and len(pilot['clips']) == 5
    assert set(pilot['clips']) == {text for text, _ in selected[:5]}
    for text, genders in pilot['clips'].items():
        assert set(genders) == set(VOICES)
        for gender, clip in genders.items():
            path = PILOT / clip['name']
            data = path.read_bytes()
            assert sha(data) == clip['sha256'] and len(data) == clip['bytes']
            assert clip['voice'] == VOICES[gender] and clip['listeningReviewed'] is True
    return scope, sha(pilot_bytes), selected[5:]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true', help='Make paid synthesis requests')
    parser.add_argument('--project', help='Google Cloud quota/billing project')
    parser.add_argument('--limit', type=int, default=36, help='Maximum new clips, 1–36')
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    assert 1 <= args.limit <= 36
    if args.generate and not args.project:
        parser.error('--generate requires --project')
    if args.output.resolve().is_relative_to(ROOT.resolve()):
        parser.error('Private MP3s must stay outside the repository')
    scope, pilot_sha, remainder = selected_scope()
    assert len(remainder) == 18
    manifest_path = args.output / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {
        'schema': 1, 'course': 'japanese-travel-lunch', 'lessonId': LESSON,
        'part': 'non-pilot-remainder', 'locale': 'ja-JP', 'voices': VOICES,
        'sourceSHA256': scope['normalizedTextSHA256'], 'acceptedPilotManifestSHA256': pilot_sha,
        'listeningReviewed': False, 'registered': False, 'clips': {},
    }
    assert manifest['course'] == 'japanese-travel-lunch' and manifest['lessonId'] == LESSON
    assert manifest['part'] == 'non-pilot-remainder' and manifest['locale'] == 'ja-JP'
    assert manifest['voices'] == VOICES and manifest['sourceSHA256'] == scope['normalizedTextSHA256']
    assert manifest['acceptedPilotManifestSHA256'] == pilot_sha
    assert manifest['listeningReviewed'] is manifest['registered'] is False
    assert set(manifest['clips']).issubset({text for text, _ in remainder})
    jobs = []
    for text, value in remainder:
        for gender, voice in VOICES.items():
            name = f"ja-lunch-f1-rem-{sha((text + '\0' + voice).encode())[:24]}-{gender}.mp3"
            old = manifest['clips'].get(text, {}).get(gender)
            if old:
                data = (args.output / old['name']).read_bytes()
                assert old['name'] == name and old['voice'] == voice
                assert old['spokenText'] == value['spokenText'] and old['displayText'] == value['displayText']
                assert old['listeningReviewed'] is False
                assert sha(data) == old['sha256'] and len(data) == old['bytes']
                assert duration(args.output / name) == old['durationSeconds']
            else:
                jobs.append((text, value, gender, voice, name))
    jobs = jobs[:args.limit]
    print(json.dumps({'lessonId': LESSON, 'acceptedPilotClips': 10,
                      'remainderTexts': 18, 'existingRemainderClips': sum(len(x) for x in manifest['clips'].values()),
                      'plannedClips': len(jobs), 'plannedCharacters': sum(len(x[1]['spokenText']) for x in jobs),
                      'paidSynthesis': args.generate}, ensure_ascii=False), flush=True)
    if not args.generate:
        return
    os.umask(0o077)
    args.output.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'],
                           capture_output=True, text=True, check=True).stdout.strip()
    for text, value, gender, voice, name in jobs:
        payload = {'input': {'text': value['spokenText']},
                   'voice': {'languageCode': 'ja-JP', 'name': voice},
                   'audioConfig': {'audioEncoding': 'MP3'}}
        request = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize',
                                         data=json.dumps(payload).encode(),
                                         headers={'Authorization': 'Bearer ' + token,
                                                  'Content-Type': 'application/json',
                                                  'x-goog-user-project': args.project})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=75) as response:
                    data = base64.b64decode(json.load(response)['audioContent'])
                assert len(data) > 500
                path = args.output / name
                temp = path.with_suffix('.part')
                temp.write_bytes(data)
                measured = duration(temp)
                temp.replace(path)
                manifest['clips'].setdefault(text, {})[gender] = {
                    'name': name, 'voice': voice, 'locale': 'ja-JP',
                    'displayText': value['displayText'], 'spokenText': value['spokenText'],
                    'bytes': len(data), 'sha256': sha(data), 'durationSeconds': measured,
                    'listeningReviewed': False,
                }
                save(manifest_path, manifest)
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError(f'Synthesis HTTP {error.code}') from None
                time.sleep(2 ** attempt)
    print(f"Saved {len(jobs)} private MP3s; listeningReviewed remains false")


if __name__ == '__main__':
    main()
