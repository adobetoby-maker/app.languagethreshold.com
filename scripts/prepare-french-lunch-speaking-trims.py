#!/usr/bin/env python3
"""Prepare private edge-silence trims for flagged Lunch speaking clips."""
import hashlib
import importlib.util
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = Path('/Users/drive/lt-audio/french-travel-lunch/content-speaking')


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SIGNAL = load(ROOT / 'scripts/audit-japanese101-audio-signal.py', 'french_lunch_speaking_trim_signal')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def clear(measured):
    return (measured['peak'] >= 0.02 and measured['rms'] >= 0.004
            and measured['activeSeconds'] >= 0.08
            and measured['clippedFraction'] <= 0.001
            and measured['leadingSilenceSeconds'] <= 1
            and measured['trailingSilenceSeconds'] <= 1)


def main():
    manifest_path = PRIVATE / 'manifest.json'
    report = json.loads((PRIVATE / 'signal-screen.json').read_text())
    assert report['manifestSha256'] == sha(manifest_path)
    assert report['listeningReviewed'] is report['registered'] is False
    manifest = json.loads(manifest_path.read_text())
    assert manifest['pairKey'] == 'French:English' and manifest['locale'] == 'fr-FR'
    assert manifest['listeningReviewed'] is manifest['registered'] is False
    rows = []
    for flag in report['flags']:
        if flag['issues'] != ['long-edge-silence']:
            continue
        source = PRIVATE / flag['name']
        assert sha(source) == flag['sha256']
        key = hashlib.sha256(flag['text'].encode()).hexdigest()
        assert manifest['clips'][key]['text'] == flag['text']
        assert any(clip['name'] == flag['name'] and clip['voice'] == flag['voice']
                   for clip in manifest['clips'][key]['voices'].values())
        measured = flag['signal']
        start = max(0, measured['leadingSilenceSeconds'] - 0.2)
        end = measured['durationSeconds'] - max(0, measured['trailingSilenceSeconds'] - 0.2)
        assert end - start > 0.3
        candidate = PRIVATE / (source.stem + '-edge-trim-candidate.mp3')
        if not candidate.exists():
            subprocess.run(['ffmpeg', '-v', 'error', '-i', str(source),
                            '-af', f'atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS',
                            '-codec:a', 'libmp3lame', '-q:a', '2', str(candidate)], check=True)
        signal = SIGNAL.decode(candidate)
        rows.append({'sourceName': source.name, 'sourceSHA256': flag['sha256'],
                     'candidateName': candidate.name, 'candidateSHA256': sha(candidate),
                     'text': flag['text'], 'voice': flag['voice'], 'method': 'edge-trim-from-original-MP3',
                     'originalIssues': flag['issues'], 'candidateSignal': signal,
                     'signalClear': clear(signal), 'listeningReviewed': False, 'installed': False})
    result = {'schema': 1, 'manifestSha256': sha(manifest_path), 'candidates': rows,
              'signalClearCandidates': sum(row['signalClear'] for row in rows),
              'listeningReviewed': False, 'installed': False}
    (PRIVATE / 'trim-candidates.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'candidates': len(rows), 'signalClear': result['signalClearCandidates']}))


if __name__ == '__main__':
    main()
