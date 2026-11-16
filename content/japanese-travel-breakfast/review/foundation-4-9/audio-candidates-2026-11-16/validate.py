#!/usr/bin/env python3
"""Read-only source, identity and decoded-signal check for inert F4/F9 MP3s."""

import array
import hashlib
import json
import math
import subprocess
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SOURCE = ROOT / 'content/japanese-travel-breakfast/review/foundation-4-9/source-correction-proposals.json'
VOICES = {'female': 'ja-JP-Chirp3-HD-Aoede', 'male': 'ja-JP-Chirp3-HD-Charon'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def duration(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                             '-of', 'default=noprint_wrappers=1:nokey=1', str(path)],
                            capture_output=True, text=True, check=True)
    value = round(float(result.stdout.strip()), 3)
    assert 0.1 < value < 120
    return value


def signal(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1',
                          '-ar', '16000', '-f', 'f32le', 'pipe:1'],
                         capture_output=True, check=True).stdout
    samples = array.array('f')
    samples.frombytes(raw)
    assert len(samples) >= 1600
    peak = max(abs(x) for x in samples)
    rms = math.sqrt(sum(x * x for x in samples) / len(samples))
    assert math.isfinite(rms) and rms >= 0.001 and peak >= 0.01
    threshold = 0.003
    lead = next((i for i, x in enumerate(samples) if abs(x) >= threshold), len(samples)) / 16000
    tail = next((i for i, x in enumerate(reversed(samples)) if abs(x) >= threshold), len(samples)) / 16000
    assert lead <= 0.75 and tail <= 0.75
    return len(samples), round(rms, 5), round(peak, 5), round(lead, 3), round(tail, 3)


def main():
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)
    scope_bytes = (HERE / 'scope.json').read_bytes()
    scope = json.loads(scope_bytes)
    manifest = json.loads((HERE / 'manifest.json').read_text())
    report = json.loads((HERE / 'verification.json').read_text())
    assert source['pairKey'] == scope['pairKey'] == manifest['pairKey'] == report['pairKey'] == 'Japanese:English'
    assert scope['sourceSha256'] == report['sourceSha256'] == sha(source_bytes)
    assert scope['sourcePath'] == str(SOURCE.relative_to(ROOT))
    assert scope['locale'] == manifest['locale'] == report['locale'] == 'ja-JP'
    assert scope['quotaProject'] == manifest['quotaProject'] == report['quotaProject'] == 'project-91661021-fb2d-4524-b9f'
    assert scope['voices'] == manifest['voices'] == VOICES
    assert manifest['scopeSha256'] == report['scopeSha256'] == sha(scope_bytes)
    assert source['gates'] and all(v is False for v in source['gates'].values())
    for data in (scope, manifest, report):
        assert data['listeningReviewed'] is False and data['registered'] is False
        assert data['recordingsBundled'] is False
    rows = []
    for lesson in source['proposals']:
        assert lesson['lessonKey'] in ('foundation:4', 'foundation:9')
        for kind, field in [('reader', 'proposedSourceSettingReader'), ('card', 'newCardCandidates')]:
            for item in lesson[field]:
                value = item['ja']
                rows.append({'text': value, 'textSha256': sha(value.encode()),
                             'lessonKey': lesson['lessonKey'], 'placementId': item['id'],
                             'kind': kind})
    assert rows == scope['texts']
    assert len(rows) == scope['uniqueTexts'] == 27
    assert len({row['textSha256'] for row in rows}) == 27
    assert sum(len(row['text']) for row in rows) * 2 == scope['submittedCharacters'] == report['submittedCharacters'] == 852
    assert len(manifest['clips']) == scope['proposedClips'] == report['clipsVerified'] == 54
    assert report['signalFlags'] == []
    report_rows = {(row['textSha256'], row['gender']): row for row in report['clips']}
    assert len(report_rows) == 54
    assert len(list(HERE.glob('*.mp3'))) == 54
    for row in rows:
        for gender, voice in VOICES.items():
            key = f"{row['textSha256']}:{gender}"
            clip = manifest['clips'][key]
            check = report_rows[(row['textSha256'], gender)]
            path = HERE / clip['name']
            assert path.name == f"ja-breakfast-f4f9-{row['textSha256'][:20]}-{gender}.mp3"
            assert clip['text'] == check['text'] == row['text']
            assert clip['placementId'] == check['placementId'] == row['placementId']
            assert clip['lessonKey'] == check['lessonKey'] == row['lessonKey']
            assert clip['kind'] == check['kind'] == row['kind']
            assert clip['voice'] == check['voice'] == voice and clip['locale'] == 'ja-JP'
            assert clip['listeningReviewed'] is False
            content = path.read_bytes()
            assert (sha(content), len(content), duration(path)) == (
                clip['sha256'], clip['bytes'], clip['durationSeconds'])
            assert (check['fileSha256'], check['bytes'], check['durationSeconds']) == (
                clip['sha256'], clip['bytes'], clip['durationSeconds'])
            observed = signal(path)
            expected = (check['decodedSamples'], check['rms'], check['peak'],
                        check['leadingSilenceSeconds'], check['trailingSilenceSeconds'])
            assert observed == expected and check['signalFlags'] == []
    print('PASS: 27 source-pinned texts, 54 exact ja-JP clips, zero signal flags, all gates closed')


if __name__ == '__main__':
    main()
