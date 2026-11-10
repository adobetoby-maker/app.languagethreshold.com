#!/usr/bin/env python3
"""Generate capped private French Lunch card/Reader Chirp 3 HD audio.

Dry run by default. Paid synthesis requires --generate and --project. Nothing
from this script registers lesson audio or changes review/release state.
"""
import argparse
import base64
import hashlib
import json
import os
import subprocess
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/french-travel-lunch'
PRIVATE = Path('/Users/drive/lt-audio/french-travel-lunch')
VOICES = {'female': 'fr-FR-Chirp3-HD-Aoede', 'male': 'fr-FR-Chirp3-HD-Charon'}
SOURCES = {
    'foundation': [(1, 3), (4, 10)],
    'core': [(n, n + 4) for n in (1, 6, 11, 16, 21, 26)],
    'master': [(n, n + 4) for n in (1, 6, 11, 16)],
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def exact(value):
    if not isinstance(value, str):
        raise ValueError('French audio text must be a string')
    result = ' '.join(unicodedata.normalize('NFC', value).split())
    if not result:
        raise ValueError('French audio text is empty')
    return result


def source_for(stage, number):
    bounds = next(((first, last) for first, last in SOURCES[stage]
                   if first <= number <= last), None)
    if bounds is None:
        raise ValueError('Lesson number outside stage')
    filename = f'{stage}-{bounds[0]}-{bounds[1]}-draft.json'
    path = CONTENT / filename
    raw = path.read_bytes()
    scope = json.loads((CONTENT / 'audio-scope-candidate.json').read_text())
    if (scope.get('pairKey'), scope.get('locale'), scope.get('recordingsBundled'),
        scope.get('textReviewed'), scope.get('listeningReviewed'), scope.get('registered')) != (
        'French:English', 'fr-FR', False, False, False, False):
        raise ValueError('Audio scope release gate changed')
    if scope['sourceSha256'].get(filename) != digest(raw):
        raise ValueError(f'Audio source changed: {filename}')
    draft = json.loads(raw)
    if (draft.get('stageId'), draft.get('pairKey'), draft.get('locale'),
        draft.get('reviewed'), draft.get('registered'), draft.get('readyForLearner')) != (
        f'{stage}-travel-lunch', 'French:English', 'fr-FR', False, False, False):
        raise ValueError('Lesson pair or release gate changed')
    lesson = next((row for row in draft['lessons'] if row['n'] == number), None)
    if lesson is None or lesson['stableId'] != f'{stage}-travel-lunch:{number}:fr-en' or lesson['reviewed'] is not False:
        raise ValueError('Lesson identity or review state changed')
    entries = {}

    def add(value, field):
        display = exact(value)
        key = digest(display.encode('utf-8'))
        previous = entries.get(key)
        if previous and previous['displayText'] != display:
            raise ValueError('Audio text hash collision')
        if previous:
            previous['fields'].append(field)
        else:
            entries[key] = {'displayText': display, 'spokenText': display, 'fields': [field]}

    for index, card in enumerate(lesson['cards']):
        if not card.get('en'):
            raise ValueError('Card lacks exact English pair')
        add(card['fr'], f'cards[{index}].fr')
    for index, turn in enumerate(lesson['reader']):
        if not turn.get('en') or not turn.get('speaker'):
            raise ValueError('Reader turn lacks English or speaker')
        add(turn['fr'], f'reader[{index}].fr')
    return entries, digest(raw), filename, lesson['stableId']


def duration(path):
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                            '-of', 'default=noprint_wrappers=1:nokey=1', str(path)],
                           capture_output=True, text=True, check=True)
    value = round(float(probe.stdout.strip()), 3)
    if not 0.1 < value < 120:
        raise ValueError(f'Invalid MP3 duration: {path.name}')
    return value


def save(path, value):
    temp = path.with_suffix('.json.part')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)


def reusable_record(key, row, gender, voice, current_output, quota_project):
    """Find a verified, exact-text recording made for another lesson."""
    for candidate in sorted(PRIVATE.glob('*/manifest.json')):
        if candidate.parent == current_output:
            continue
        other = json.loads(candidate.read_text())
        if (other.get('pairKey'), other.get('locale'), other.get('quotaProject'),
            other.get('voices'), other.get('registered')) != (
            'French:English', 'fr-FR', quota_project, VOICES, False):
            continue
        entry = other.get('clips', {}).get(key)
        if not entry:
            continue
        if (entry.get('displayText'), entry.get('spokenText')) != (
            row['displayText'], row['spokenText']):
            raise ValueError('Conflicting reusable text identity')
        clip = entry.get('voices', {}).get(gender)
        if not clip:
            continue
        path = candidate.parent / clip['name']
        if (clip.get('voice'), clip.get('locale'), clip.get('spokenText')) != (
            voice, 'fr-FR', row['spokenText']):
            raise ValueError('Conflicting reusable voice identity')
        data = path.read_bytes()
        if (len(data), digest(data), duration(path)) != (
            clip.get('bytes'), clip.get('sha256'), clip.get('durationSeconds')):
            raise ValueError('Reusable clip bytes or duration differ')
        return path, clip
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--stage', choices=SOURCES, required=True)
    parser.add_argument('--lesson', type=int, required=True)
    parser.add_argument('--project', help='Google quota/billing project')
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--limit', type=int, default=10)
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        raise SystemExit('--limit must be between 1 and 20')
    if args.generate and not args.project:
        raise SystemExit('--project is required for paid synthesis')
    os.umask(0o077)
    entries, source_sha, filename, stable_id = source_for(args.stage, args.lesson)
    output = PRIVATE / f'{args.stage}-{args.lesson}'
    manifest_path = output / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {
        'schema': 1, 'pairKey': 'French:English', 'locale': 'fr-FR',
        'courseId': 'travel-lunch', 'stableLessonId': stable_id,
        'sourceFile': filename, 'sourceFixtureSha256': source_sha,
        'quotaProject': args.project, 'voices': VOICES,
        'textReviewed': False, 'listeningReviewed': False,
        'registered': False, 'clips': {},
    }
    if (manifest.get('pairKey'), manifest.get('locale'), manifest.get('courseId'),
        manifest.get('stableLessonId'), manifest.get('sourceFile'),
        manifest.get('sourceFixtureSha256'), manifest.get('voices'),
        manifest.get('textReviewed'), manifest.get('listeningReviewed'),
        manifest.get('registered')) != (
        'French:English', 'fr-FR', 'travel-lunch', stable_id, filename,
        source_sha, VOICES, False, False, False):
        raise ValueError('Existing manifest identity or review state changed')
    if args.project and manifest['quotaProject'] != args.project:
        raise ValueError('Existing manifest quota project differs')
    if set(manifest['clips']) - set(entries):
        raise ValueError('Existing manifest contains out-of-scope text')
    jobs = []
    verified = 0
    reused = 0
    for key, row in entries.items():
        current = manifest['clips'].get(key)
        if current and current['displayText'] != row['displayText']:
            raise ValueError('Existing manifest text differs')
        for gender, voice in VOICES.items():
            name = f'fr-lunch-{key[:20]}-{gender}.mp3'
            clip = current.get('voices', {}).get(gender) if current else None
            path = output / name
            if clip:
                if (clip.get('name'), clip.get('voice'), clip.get('locale'),
                    clip.get('spokenText'), clip.get('listeningReviewed')) != (
                    name, voice, 'fr-FR', row['spokenText'], False):
                    raise ValueError('Existing clip identity differs')
                data = path.read_bytes()
                if (len(data), digest(data), duration(path)) != (
                    clip.get('bytes'), clip.get('sha256'), clip.get('durationSeconds')):
                    raise ValueError('Existing clip bytes or duration differ')
                verified += 1
                continue
            if path.exists():
                raise ValueError('Unmanifested recording exists')
            if args.generate:
                reusable = reusable_record(key, row, gender, voice, output, args.project)
                if reusable:
                    source_path, source_clip = reusable
                    output.mkdir(parents=True, exist_ok=True)
                    os.link(source_path, path)
                    record = manifest['clips'].setdefault(key, {**row, 'voices': {}})
                    record['voices'][gender] = {**source_clip, 'name': name,
                                                'listeningReviewed': False}
                    save(manifest_path, manifest)
                    reused += 1
                    continue
            jobs.append((key, row, gender, voice, name))
    planned = jobs[:args.limit]
    print(json.dumps({'stableLessonId': stable_id, 'sourceFixtureSha256': source_sha,
                      'uniqueTexts': len(entries), 'verifiedClips': verified,
                      'reusedClips': reused,
                      'remainingClips': len(jobs), 'plannedClips': len(planned),
                      'plannedCharacters': sum(len(row['spokenText']) for _, row, _, _, _ in planned),
                      'paidSynthesis': args.generate}, ensure_ascii=False), flush=True)
    if not args.generate:
        return
    output.mkdir(parents=True, exist_ok=True)
    token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'],
                           capture_output=True, text=True, check=True).stdout.strip()
    for key, row, gender, voice, name in planned:
        payload = {'input': {'text': row['spokenText']},
                   'voice': {'languageCode': 'fr-FR', 'name': voice},
                   'audioConfig': {'audioEncoding': 'MP3'}}
        request = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize',
            data=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json',
                     'x-goog-user-project': args.project})
        for attempt in range(3):
            try:
                response = json.load(urllib.request.urlopen(request, timeout=75))
                data = base64.b64decode(response['audioContent'])
                if len(data) <= 500:
                    raise ValueError('Empty MP3')
                path = output / name
                temp = path.with_suffix('.part')
                temp.write_bytes(data)
                length = duration(temp)
                temp.replace(path)
                record = manifest['clips'].setdefault(key, {**row, 'voices': {}})
                record['voices'][gender] = {
                    'name': name, 'voice': voice, 'locale': 'fr-FR',
                    'spokenText': row['spokenText'], 'bytes': len(data),
                    'durationSeconds': length, 'sha256': digest(data),
                    'listeningReviewed': False,
                }
                save(manifest_path, manifest)
                break
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError(f'Synthesis HTTP {error.code}') from None
                time.sleep(2 ** attempt)
    print(json.dumps({'generatedClips': len(planned), 'manifest': str(manifest_path)}), flush=True)


if __name__ == '__main__':
    main()
