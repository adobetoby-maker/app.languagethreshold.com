#!/usr/bin/env python3
"""Resumable, exact-pair Japanese Lunch audio synthesis; never register playback."""

import argparse
import base64
import hashlib
import importlib.util
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
OUTPUT = AUDIO / 'full-course-2026-11-10'
SCOPE = COURSE / 'private-audio-scope.json'
VOICES = {'female': 'ja-JP-Chirp3-HD-Aoede', 'male': 'ja-JP-Chirp3-HD-Charon'}
STAGE_ORDER = {'foundation-travel-lunch': 0, 'travel-lunch': 1, 'master-travel-lunch': 2}
PRICE_PER_CHARACTER_USD = 0.00003  # Google Cloud Chirp 3 HD listed rate, 2026-11-10.


def sha(data):
    return hashlib.sha256(data).hexdigest()


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


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


def ordered_texts(scope):
    def rank(item):
        text, value = item
        places = []
        for ref in value['occurrences']:
            parts = ref.split(':')
            assert parts[0] in STAGE_ORDER and parts[1].isdigit()
            places.append((STAGE_ORDER[parts[0]], int(parts[1])))
        return (*min(places), text)
    return sorted(scope['texts'].items(), key=rank)


def verified_sources():
    subprocess.run(['python3', str(COURSE / 'build-private-audio-scope.py'), '--check'],
                   check=True, capture_output=True, text=True)
    scope = json.loads(SCOPE.read_text())
    assert scope['moduleId'] == 'travel-lunch' and scope['targetLanguage'] == 'Japanese'
    assert scope['nativeLanguage'] == 'English' and scope['locale'] == 'ja-JP'
    assert scope['voices'] == VOICES and scope['lessonCount'] == 60
    assert scope['reviewed'] is scope['registered'] is scope['listeningReviewed'] is False
    assert scope['uniqueTexts'] == 1547 and scope['proposedTextVoicePairs'] == 3094
    foundation = module(COURSE / 'generate-private-foundation-1-remainder.py', 'japanese_lunch_f1_remainder')
    _, _, remainder = foundation.selected_scope()
    assert len(remainder) == 18
    verifier = module(COURSE / 'verify-private-foundation-1-remainder.py', 'japanese_lunch_f1_verifier')
    evidence = verifier.build()
    assert evidence['clipsVerified'] == 36 and evidence['signalFlaggedClips'] == 0
    prior = set()
    for folder, expected, reviewed in ((AUDIO / 'foundation-1-pilot', 5, True),
                                       (AUDIO / 'foundation-1-remainder-2026-11-10', 18, False)):
        manifest = json.loads((folder / 'manifest.json').read_text())
        assert manifest['sourceSHA256'] == scope['normalizedTextSHA256']
        assert manifest['listeningReviewed'] is reviewed and len(manifest['clips']) == expected
        for text, genders in manifest['clips'].items():
            assert text in scope['texts'] and set(genders) == set(VOICES)
            for gender, clip in genders.items():
                assert clip['spokenText'] == scope['texts'][text]['spokenText']
                assert clip['voice'] == VOICES[gender] and clip['locale'] == 'ja-JP'
                assert clip['listeningReviewed'] is reviewed
                data = (folder / clip['name']).read_bytes()
                assert sha(data) == clip['sha256'] and len(data) == clip['bytes']
                prior.add((text, gender))
    assert len(prior) == 46
    return scope, prior


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true', help='Make paid synthesis requests')
    parser.add_argument('--project', help='Google Cloud quota/billing project')
    parser.add_argument('--limit', type=int, default=100, help='Maximum new clips, 1–200')
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    assert 1 <= args.limit <= 200
    if args.generate and not args.project:
        parser.error('--generate requires --project')
    if args.output.resolve().is_relative_to(ROOT.resolve()):
        parser.error('Private MP3s must stay outside the repository')
    scope, prior = verified_sources()
    manifest_path = args.output / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {
        'schema': 1, 'course': 'japanese-travel-lunch', 'pairKey': 'Japanese:English',
        'locale': 'ja-JP', 'voices': VOICES, 'sourceSHA256': scope['normalizedTextSHA256'],
        'quotaProject': args.project, 'listeningReviewed': False, 'registered': False,
        'clips': {},
    }
    assert manifest['course'] == 'japanese-travel-lunch' and manifest['pairKey'] == 'Japanese:English'
    assert manifest['locale'] == 'ja-JP' and manifest['voices'] == VOICES
    assert manifest['sourceSHA256'] == scope['normalizedTextSHA256']
    assert manifest['listeningReviewed'] is manifest['registered'] is False
    if args.generate:
        assert manifest['quotaProject'] == args.project
    assert set(manifest['clips']).issubset(set(scope['texts']))
    jobs = []
    all_remaining_characters = 0
    existing = 0
    for text, value in ordered_texts(scope):
        for gender, voice in VOICES.items():
            if (text, gender) in prior:
                assert gender not in manifest['clips'].get(text, {})
                continue
            name = f"ja-lunch-{sha((text + chr(0) + voice).encode())[:24]}-{gender}.mp3"
            clip = manifest['clips'].get(text, {}).get(gender)
            if clip:
                path = args.output / clip['name']
                data = path.read_bytes()
                assert clip['name'] == name and clip['voice'] == voice and clip['locale'] == 'ja-JP'
                assert clip['spokenText'] == value['spokenText'] and clip['displayText'] == value['displayText']
                assert clip['listeningReviewed'] is False and clip['sha256'] == sha(data)
                assert clip['bytes'] == len(data) and clip['durationSeconds'] == duration(path)
                existing += 1
            else:
                jobs.append((text, value, gender, voice, name))
                all_remaining_characters += len(value['spokenText'])
    assert len(prior) + existing + len(jobs) == 3094
    batch = jobs[:args.limit]
    print(json.dumps({'sourceSHA256': scope['normalizedTextSHA256'],
                      'reusedFoundation1Clips': len(prior), 'existingCourseClips': existing,
                      'remainingClips': len(jobs), 'remainingCharacters': all_remaining_characters,
                      'plannedClips': len(batch),
                      'plannedCharacters': sum(len(x[1]['spokenText']) for x in batch),
                      'estimatedRemainingUSDAtListedRate': round(all_remaining_characters * PRICE_PER_CHARACTER_USD, 4),
                      'paidSynthesis': args.generate, 'listeningReviewed': False}, ensure_ascii=False), flush=True)
    if not args.generate:
        return
    os.umask(0o077)
    args.output.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'],
                           capture_output=True, text=True, check=True).stdout.strip()
    for text, value, gender, voice, name in batch:
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
        time.sleep(0.35)  # Stay well below the published 200 Chirp 3 requests/minute/project quota.
    print(f"Saved {len(batch)} private MP3s; listeningReviewed remains false")


if __name__ == '__main__':
    main()
