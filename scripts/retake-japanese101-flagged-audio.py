#!/usr/bin/env python3
"""Bounded private retakes for Japanese 101 flagged clips without alternatives."""

import argparse
import base64
import hashlib
import json
import os
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / 'docs/japanese-program/private-audio-repair-plan-2026-11-10.json'
OUTPUT = Path('/Users/drive/lt-audio/japanese-101/flagged-retakes-2026-11-10')
PROJECT = 'workerbee-494003'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def duration(path):
    value = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                     '-of', 'default=noprint_wrappers=1:nokey=1', str(path)], text=True)
    return round(float(value.strip()), 3)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate', action='store_true', help='Issue up to five paid Cloud TTS requests')
    args = parser.parse_args()
    plan_bytes = PLAN.read_bytes()
    plan = json.loads(plan_bytes)
    assert plan['pairKey'] == 'Japanese:English' and plan['flaggedRecordings'] == 12
    rows = [row for row in plan['repairs'] if row['nextStep'] == 'bounded-private-retake']
    assert len(rows) == 5 and all(not row['sameTextVoiceUnflaggedAlternatives'] for row in rows)
    os.umask(0o077)
    manifest_path = OUTPUT / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
        'schema': 1, 'pairKey': 'Japanese:English', 'locale': 'ja-JP', 'quotaProject': PROJECT,
        'sourceRepairPlanSha256': sha(plan_bytes), 'listeningReviewed': False,
        'registered': False, 'clips': {},
    }
    assert (manifest['pairKey'], manifest['locale'], manifest['quotaProject'],
            manifest['sourceRepairPlanSha256'], manifest['listeningReviewed'], manifest['registered']) == (
            'Japanese:English', 'ja-JP', PROJECT, sha(plan_bytes), False, False)
    pending = []
    for row in rows:
        original = row['original']
        text = original['spokenText']
        voice = row['voice']
        assert voice == original['voice'] and text
        key = sha((text + '\n' + voice).encode())
        name = f'ja-101-retake-{key[:24]}.mp3'
        saved = manifest['clips'].get(key)
        if saved:
            file = OUTPUT / saved['name']
            assert saved['name'] == name and saved['spokenText'] == text and saved['voice'] == voice
            assert saved['listeningReviewed'] is False and file.is_file()
            assert sha(file.read_bytes()) == saved['sha256'] and duration(file) == saved['durationSeconds']
        else:
            assert not (OUTPUT / name).exists(), f'Untracked retake: {name}'
            pending.append((key, name, text, voice, row))
    print(json.dumps({'targetedClips': len(rows), 'existing': len(rows)-len(pending),
                      'planned': len(pending), 'plannedCharacters': sum(len(p[2]) for p in pending),
                      'paidSynthesis': args.generate}), flush=True)
    if not args.generate or not pending:
        return
    OUTPUT.mkdir(parents=True, exist_ok=True)
    token = subprocess.check_output(['gcloud', 'auth', 'application-default', 'print-access-token'], text=True).strip()
    for key, name, text, voice, row in pending:
        payload = {'input': {'text': text}, 'voice': {'languageCode': 'ja-JP', 'name': voice},
                   'audioConfig': {'audioEncoding': 'MP3'}}
        request = urllib.request.Request(
            'https://texttospeech.googleapis.com/v1/text:synthesize',
            data=json.dumps(payload).encode(),
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json',
                     'x-goog-user-project': PROJECT})
        with urllib.request.urlopen(request, timeout=75) as response:
            raw = base64.b64decode(json.load(response)['audioContent'])
        assert len(raw) > 500
        file = OUTPUT / name
        part = OUTPUT / (name + '.part')
        with part.open('xb') as handle:
            handle.write(raw)
        part.replace(file)
        manifest['clips'][key] = {
            'name': name, 'spokenText': text, 'voice': voice, 'locale': 'ja-JP',
            'sourceLesson': row['original']['lesson'], 'sha256': sha(raw),
            'bytes': len(raw), 'durationSeconds': duration(file), 'listeningReviewed': False,
        }
        temporary = OUTPUT / 'manifest.json.part'
        temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        temporary.replace(manifest_path)
        print(json.dumps({'text': text, 'voice': voice, 'durationSeconds': manifest['clips'][key]['durationSeconds']}), flush=True)


if __name__ == '__main__':
    main()
