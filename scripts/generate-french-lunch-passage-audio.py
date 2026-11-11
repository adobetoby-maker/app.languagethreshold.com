#!/usr/bin/env python3
"""Generate private exact-text French Lunch passage clips missing from source audio."""
import argparse
import base64
import hashlib
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/french-travel-lunch'
PRIVATE = Path('/Users/drive/lt-audio/french-travel-lunch/content-passages')
def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BUILD = load(CONTENT / 'build-private-content-audio-delta.py', 'french_lunch_passage_delta')
AUDIO = load(ROOT / 'scripts/generate-french-lunch-hd-audio.py', 'french_lunch_audio_generator')
PROJECT = 'project-91661021-fb2d-4524-b9f'


def require(value, message):
    if not value:
        raise ValueError(message)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--limit', type=int, default=20)
    args = parser.parse_args()
    require(1 <= args.limit <= 20, 'Limit must be between 1 and 20')
    os.umask(0o077)
    delta = BUILD.build()
    require(json.loads(BUILD.OUTPUT.read_text()) == delta, 'Pinned passage delta changed')
    require((delta['recordingsBundled'], delta['textReviewed'], delta['listeningReviewed'], delta['registered']) ==
            (False, False, False, False), 'Release gate changed')
    voices = {'female': delta['voices'][0], 'male': delta['voices'][1]}
    path = PRIVATE / 'manifest.json'
    manifest = json.loads(path.read_text()) if path.exists() else {
        'schema': 1, 'courseId': 'travel-lunch', 'pairKey': 'French:English', 'locale': 'fr-FR',
        'quotaProject': PROJECT, 'deltaSha256': hashlib.sha256(BUILD.OUTPUT.read_bytes()).hexdigest(),
        'voices': voices, 'textReviewed': False, 'listeningReviewed': False,
        'registered': False, 'clips': {},
    }
    require((manifest.get('courseId'), manifest.get('pairKey'), manifest.get('locale'),
             manifest.get('quotaProject'), manifest.get('deltaSha256'), manifest.get('voices'),
             manifest.get('textReviewed'), manifest.get('listeningReviewed'), manifest.get('registered')) ==
            ('travel-lunch', 'French:English', 'fr-FR', PROJECT,
             hashlib.sha256(BUILD.OUTPUT.read_bytes()).hexdigest(), voices, False, False, False),
            'Existing manifest identity or release gate changed')
    allowed = {row['textSha256'] for row in delta['texts']}
    require(not set(manifest['clips']) - allowed, 'Manifest has out-of-scope clips')
    jobs = []
    verified = 0
    for row in delta['texts']:
        text = row['text']
        key = row['textSha256']
        require(hashlib.sha256(text.encode()).hexdigest() == key and AUDIO.exact(text) == text,
                'Passage text changed by normalization')
        current = manifest['clips'].get(key)
        require(current is None or current['text'] == text, 'Manifest text differs')
        for gender, voice in voices.items():
            name = f'fr-lunch-passage-{key[:20]}-{gender}.mp3'
            clip = current.get('voices', {}).get(gender) if current else None
            target = PRIVATE / name
            if clip:
                require((clip.get('name'), clip.get('voice'), clip.get('locale'), clip.get('text'),
                         clip.get('listeningReviewed')) == (name, voice, 'fr-FR', text, False),
                        'Clip identity changed')
                data = target.read_bytes()
                require((len(data), AUDIO.digest(data), AUDIO.duration(target)) ==
                        (clip.get('bytes'), clip.get('sha256'), clip.get('durationSeconds')),
                        'Recorded clip bytes or duration changed')
                verified += 1
            else:
                require(not target.exists(), 'Unmanifested recording exists')
                jobs.append((key, text, gender, voice, name))
    planned = jobs[:args.limit]
    print(json.dumps({'verifiedClips': verified, 'remainingClips': len(jobs),
                      'plannedClips': len(planned),
                      'plannedCharacters': sum(len(job[1]) for job in planned),
                      'paidSynthesis': args.generate}), flush=True)
    if not args.generate or not planned:
        return
    PRIVATE.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'],
                           capture_output=True, text=True, check=True).stdout.strip()
    for key, text, gender, voice, name in planned:
        payload = {'input': {'text': text},
                   'voice': {'languageCode': 'fr-FR', 'name': voice},
                   'audioConfig': {'audioEncoding': 'MP3'}}
        request = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize',
            data=json.dumps(payload, ensure_ascii=False).encode(),
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json',
                     'x-goog-user-project': PROJECT})
        for attempt in range(3):
            try:
                response = json.load(urllib.request.urlopen(request, timeout=75))
                data = base64.b64decode(response['audioContent'])
                require(len(data) > 500, 'Empty MP3')
                target = PRIVATE / name
                temp = target.with_suffix('.part')
                temp.write_bytes(data)
                length = AUDIO.duration(temp)
                temp.replace(target)
                record = manifest['clips'].setdefault(key, {'text': text, 'voices': {}})
                record['voices'][gender] = {'name': name, 'voice': voice, 'locale': 'fr-FR',
                    'text': text, 'bytes': len(data), 'durationSeconds': length,
                    'sha256': AUDIO.digest(data), 'listeningReviewed': False}
                AUDIO.save(path, manifest)
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError(f'Synthesis HTTP {error.code}') from None
                time.sleep(2 ** attempt)
    print(json.dumps({'generatedClips': len(planned), 'manifest': str(path)}), flush=True)


if __name__ == '__main__':
    main()
