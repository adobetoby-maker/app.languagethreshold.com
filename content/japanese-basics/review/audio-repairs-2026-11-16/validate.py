#!/usr/bin/env python3
"""Verify inert Japanese 101 repair candidates against current source and decoded signal."""

import array
import hashlib
import json
import math
import subprocess
import unicodedata
from html.parser import HTMLParser
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
STAGES = {
    'foundation': ('foundation-japanese-basics', 10),
    'core': ('japanese-basics', 30),
    'master': ('master-japanese-basics', 20),
}
VOICES = {'female': 'ja-JP-Chirp3-HD-Aoede', 'male': 'ja-JP-Chirp3-HD-Charon'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def spoken(text):
    return ''.join(unicodedata.normalize('NFC', text).split())


def normalized(text):
    return ' '.join(unicodedata.normalize('NFC', text).strip().split()).lower()


def duration(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                             '-of', 'default=noprint_wrappers=1:nokey=1', str(path)],
                            capture_output=True, text=True, check=True)
    value = round(float(result.stdout.strip()), 3)
    assert 0.1 < value < 120
    return value


def signal(path):
    result = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', str(path),
                             '-ac', '1', '-ar', '16000', '-f', 's16le', '-acodec',
                             'pcm_s16le', '-'], capture_output=True, check=True)
    samples = array.array('h')
    samples.frombytes(result.stdout)
    assert samples
    values = [abs(value) / 32768 for value in samples]
    active = [i for i, value in enumerate(values) if value >= 0.006]
    return {
        'durationSeconds': round(len(samples) / 16000, 3),
        'peak': round(max(values), 5),
        'rms': round(math.sqrt(sum(value * value for value in values) / len(values)), 5),
        'activeSeconds': round(len(active) / 16000, 3),
        'leadingSilenceSeconds': round((active[0] if active else len(samples)) / 16000, 3),
        'trailingSilenceSeconds': round((len(samples) - active[-1] - 1 if active else len(samples)) / 16000, 3),
        'clippedFraction': round(sum(value >= 0.999 for value in values) / len(values), 6),
    }


class AudioLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.audio = []
        self.sections = 0
        self.selects = 0

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag == 'audio':
            self.audio.append(data.get('src'))
        elif tag == 'section':
            self.sections += 1
        elif tag == 'select':
            self.selects += 1


def main():
    manifest = json.loads((HERE / 'manifest.json').read_text())
    assert manifest['pairKey'] == 'Japanese:English' and manifest['locale'] == 'ja-JP'
    assert manifest['voices'] == VOICES
    for key in ('reviewed', 'listeningReviewed', 'registered', 'playbackRegistered',
                'offlineRegistered', 'progressEnabled', 'recordingsBundled'):
        assert manifest[key] is False, key
    sources = {}
    source_entries = {}
    for stage, (module, count) in STAGES.items():
        relative = f'public/lesson-content/ja/{module}.json'
        raw = (ROOT / relative).read_bytes()
        assert sha(raw) == manifest['sourceFilesSha256'][relative]
        blob = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
        assert blob == manifest['sourceFilesGitBlobs'][relative]
        source = json.loads(raw)
        assert source['module'] == module and len(source['lessons']) == count
        assert source['language'] == 'Japanese' and source['nativeLanguage'] == 'English'
        sources[stage] = source
        for lesson in source['lessons'].values():
            for text in lesson['passage']['target'] + [word['es'] for word in lesson['words']]:
                source_entries.setdefault(normalized(text), spoken(text))
    fingerprint = sha(json.dumps(source_entries, ensure_ascii=False, sort_keys=True).encode())
    inventory = json.loads((ROOT / 'docs/japanese-program/audio-inventory.json').read_text())
    assert fingerprint == inventory['normalizedTextSHA256'] == manifest['sourceTextFingerprint']
    assert len(source_entries) == inventory['uniqueTexts'] == 840
    originals = manifest['flaggedOriginals']
    assert len(originals) == manifest['flaggedOriginalCount'] == 12
    assert len({row['sha256'] for row in originals}) == 12
    clips = manifest['clips']
    assert len(clips) == manifest['uniqueSelectedClipCount'] == 11
    assert len(list(HERE.glob('*.mp3'))) == 11
    for digest, clip in clips.items():
        path = HERE / clip['file']
        assert path.name == f'ja101-repair-{digest[:20]}.mp3'
        assert clip['sha256'] == digest == sha(path.read_bytes())
        assert clip['bytes'] == path.stat().st_size
        assert clip['durationSeconds'] == duration(path)
        assert clip['voice'] in VOICES.values() and clip['locale'] == 'ja-JP'
        assert clip['listeningReviewed'] is clip['registered'] is False
        observed = signal(path)
        assert observed == clip['signal']
        assert observed['peak'] >= .02 and observed['rms'] >= .004
        assert observed['activeSeconds'] >= .08 and observed['clippedFraction'] <= .001
        assert observed['leadingSilenceSeconds'] <= 1 and observed['trailingSilenceSeconds'] <= 1
    placements = manifest['placements']
    assert len(placements) == manifest['affectedPlacementCount'] == 13
    assert len({p['id'] for p in placements}) == 13
    assert {p['selectedSha256'] for p in placements} == set(clips)
    assert {p['originalSha256'] for p in placements} == {row['sha256'] for row in originals}
    for placement in placements:
        stage = placement['stage']
        module, _ = STAGES[stage]
        assert placement['module'] == module
        lesson = sources[stage]['lessons'][str(placement['lesson'])]
        text = placement['displayedText']
        assert placement['spokenText'] == spoken(text)
        assert placement['textSha256'] == sha(text.encode())
        rows = [f'passage.target[{i}]' for i, value in enumerate(lesson['passage']['target']) if value == text]
        rows += [f'words[{i}].es' for i, word in enumerate(lesson['words']) if word['es'] == text]
        assert rows == placement['sourceRows'] and rows
        gender = placement['gender']
        assert placement['voice'] == VOICES[gender]
        assert placement['id'] == f"ja101:{module}:{placement['lesson']}:{placement['textSha256'][:16]}:{gender}"
        clip = clips[placement['selectedSha256']]
        assert (placement['selectedFile'], placement['spokenText'], placement['voice']) == (
            clip['file'], clip['spokenText'], clip['voice'])
        assert placement['listeningReviewed'] is placement['registered'] is placement['progressEnabled'] is False
    links = AudioLinks()
    links.feed((HERE / 'listening-review.html').read_text())
    assert links.sections == links.selects == len(links.audio) == 13
    assert links.audio == [p['selectedFile'] for p in placements]
    print('PASS: 60 current source lessons, 12 flagged originals, 11 exact candidate MP3s, '
          '13 separate placement decisions, zero signal flags, all gates closed')


if __name__ == '__main__':
    main()
