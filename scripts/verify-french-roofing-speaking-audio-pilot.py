#!/usr/bin/env python3
"""Verify private French Roofing speaking-opening pilot without approving it."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INVENTORY = ROOT / 'content/french-roofing/private-speaking-audio-pilot-fr-en.json'
DEFAULT_OUTPUT = Path('/Users/drive/lt-audio/french-roofing/speaking-openings-f2-4-f6-7')
VOICES = {'female': 'fr-FR-Chirp3-HD-Aoede', 'male': 'fr-FR-Chirp3-HD-Charon'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def duration(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(path)], capture_output=True, text=True, check=True)
    return round(float(result.stdout.strip()), 3)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    subprocess.run(['python3', str(ROOT / 'scripts/build-french-roofing-private-speaking-audio-scope.py'), '--check'], capture_output=True, text=True, check=True)
    subprocess.run(['python3', str(ROOT / 'scripts/build-french-roofing-speaking-audio-pilot.py'), '--check'], capture_output=True, text=True, check=True)
    inventory = json.loads(INVENTORY.read_text())
    manifest = json.loads((args.output / 'manifest.json').read_text())
    assert (manifest['pairKey'], manifest['locale'], manifest['voices']) == ('French:English', 'fr-FR', VOICES)
    assert manifest['exactTextSha256'] == inventory['exactTextSha256']
    assert manifest['textReviewed'] is False and isinstance(manifest['listeningReviewed'], bool)
    if manifest['listeningReviewed']:
        assert manifest['listeningReview']['reviewer'] == 'owner'
        assert manifest['listeningReview']['decision'] == 'accepted-all-pilot-clips'
    assert len(manifest['clips']) == len(inventory['texts']) == 5
    names = set()
    durations = []
    for row in inventory['texts']:
        assert row['textReviewed'] is False and sha(row['text'].encode()) == row['sha256']
        clips = manifest['clips'][row['sha256']]
        assert set(clips) == set(VOICES)
        for gender, clip in clips.items():
            name = f"fr-FR-{row['sha256'][:20]}-{gender}.mp3"
            assert clip['name'] == name and clip['text'] == row['text']
            assert clip['voice'] == VOICES[gender] and clip['locale'] == 'fr-FR'
            assert clip['listeningReviewed'] is manifest['listeningReviewed']
            file = args.output / name
            data = file.read_bytes()
            assert len(data) == clip['bytes'] and len(data) > 500 and sha(data) == clip['sha256']
            seconds = duration(file)
            assert 0.1 < seconds < 120 and seconds == clip['durationSeconds']
            names.add(name)
            durations.append(seconds)
    assert {p.name for p in args.output.glob('*.mp3')} == names and len(names) == 10
    print(f'French Roofing private speaking pilot: 5 exact openings, 10 two-voice MP3s, {sum(durations):.3f}s total; listening reviewed: {manifest["listeningReviewed"]}')


if __name__ == '__main__':
    main()
