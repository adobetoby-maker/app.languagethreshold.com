#!/usr/bin/env python3
"""Verify private Japanese Lunch Foundation 1 pilot without approving playback."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

COURSE = Path(__file__).resolve().parent
DEFAULT_OUTPUT = Path('/Users/drive/lt-audio/japanese-travel-lunch/foundation-1-pilot')
VOICES = {'female': 'ja-JP-Chirp3-HD-Aoede', 'male': 'ja-JP-Chirp3-HD-Charon'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def duration(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(path)], capture_output=True, text=True, check=True)
    return round(float(result.stdout.strip()), 3)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    subprocess.run(['python3', str(COURSE / 'build-private-audio-scope.py'), '--check'], capture_output=True, text=True, check=True)
    scope = json.loads((COURSE / 'private-audio-scope.json').read_text())
    manifest = json.loads((args.output / 'manifest.json').read_text())
    assert manifest['course'] == 'japanese-travel-lunch'
    assert manifest['lessonId'] == 'foundation-travel-lunch:1:ja-en'
    assert manifest['locale'] == 'ja-JP' and manifest['voices'] == VOICES
    assert manifest['sourceSHA256'] == scope['normalizedTextSHA256']
    assert manifest['listeningReviewed'] is False
    assert len(manifest['clips']) == 5
    filenames = set()
    durations = []
    for key, genders in manifest['clips'].items():
        assert key in scope['texts']
        assert any(ref.startswith('foundation-travel-lunch:1:ja-en:') for ref in scope['texts'][key]['occurrences'])
        assert set(genders) == set(VOICES)
        for gender, clip in genders.items():
            expected_name = 'ja-lunch-f1-' + sha(key.encode())[:20] + '-' + gender + '.mp3'
            assert clip['name'] == expected_name and clip['voice'] == VOICES[gender] and clip['locale'] == 'ja-JP'
            assert clip['displayText'] == scope['texts'][key]['displayText']
            assert clip['spokenText'] == scope['texts'][key]['spokenText']
            assert clip['listeningReviewed'] is False
            file = args.output / clip['name']
            data = file.read_bytes()
            assert len(data) == clip['bytes'] and len(data) > 500 and sha(data) == clip['sha256']
            measured = duration(file)
            assert 0.1 < measured < 120 and measured == clip['durationSeconds']
            durations.append(measured)
            filenames.add(file.name)
    actual = {p.name for p in args.output.glob('*.mp3')}
    assert actual == filenames and len(filenames) == 10
    print(f'Japanese Lunch private F1 pilot: 5 exact texts, 10 two-voice MP3s, {sum(durations):.3f}s total; listening review closed')


if __name__ == '__main__':
    main()
