#!/usr/bin/env python3
"""Prepare and verify private, reversible retake candidates for signal flags."""
import hashlib
import html
import importlib.util
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = Path('/Users/drive/lt-audio/french-travel-lunch')
OUT = PRIVATE / 'retake-candidates'


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


signal = load(ROOT / 'scripts/audit-japanese101-audio-signal.py', 'signal_screen')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def clear(measured):
    return (measured['peak'] >= 0.02 and measured['rms'] >= 0.004
            and measured['activeSeconds'] >= 0.08
            and measured['clippedFraction'] <= 0.001
            and measured['leadingSilenceSeconds'] <= 1
            and measured['trailingSilenceSeconds'] <= 1)


def chosen_quiet(flag):
    name = Path(flag['path']).stem
    if name == 'fr-lunch-1328f8bfaf03d12e5128-male':
        return OUT / 'rien-charon-ssml-slow-plus6db.mp3'
    suffix = '-retry2' if name in {
        'fr-lunch-a51e6902955171347722-female',
        'fr-lunch-a51e6902955171347722-male',
        'fr-lunch-764c4c7b78d6fd3b7bf7-male'} else ''
    return OUT / f'{name}-ssml-slow-plus12db{suffix}.mp3'


def trimmed(flag, source):
    path = OUT / f'{source.stem}-edge-trim.mp3'
    if not path.exists():
        measured = flag['signal']
        start = max(0, measured['leadingSilenceSeconds'] - 0.2)
        end = measured['durationSeconds'] - max(0, measured['trailingSilenceSeconds'] - 0.2)
        if end - start < 0.2:
            raise ValueError('Trim would remove most of the clip')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(source),
                        '-af', f'atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS',
                        '-codec:a', 'libmp3lame', '-q:a', '2', str(path)], check=True)
    return path


def main():
    report = json.loads((PRIVATE / 'signal-screen.json').read_text())
    verification = json.loads((PRIVATE / 'verification-report.json').read_text())
    if report['manifestSetSHA256'] != verification['manifestSetSHA256']:
        raise ValueError('Source manifest set changed')
    if len(report['flags']) != 19:
        raise ValueError('Expected 19 flagged sources')
    OUT.mkdir(exist_ok=True)
    rows = []
    for flag in report['flags']:
        source = PRIVATE / flag['path']
        if sha(source.read_bytes()) != flag['sha256']:
            raise ValueError('Source recording changed')
        if 'very-quiet' in flag['issues']:
            candidate = chosen_quiet(flag)
            method = 'exact-text-fr-FR-Chirp3-HD-SSML-prosody'
        elif flag['issues'] == ['long-edge-silence']:
            candidate = trimmed(flag, source)
            method = 'edge-trim-from-original-MP3'
        else:
            raise ValueError('Unaccounted signal flag')
        measured = signal.decode(candidate)
        row = {'sourcePath': flag['path'], 'sourceSHA256': flag['sha256'],
               'candidatePath': str(candidate.relative_to(PRIVATE)),
               'candidateSHA256': sha(candidate.read_bytes()),
               'displayText': flag['displayText'], 'spokenText': flag['spokenText'],
               'voice': flag['voice'], 'locale': 'fr-FR', 'method': method,
               'originalIssues': flag['issues'], 'candidateSignal': measured,
               'signalClear': clear(measured), 'listeningReviewed': False,
               'installed': False}
        rows.append(row)
    result = {'schema': 1, 'courseId': 'travel-lunch',
              'manifestSetSHA256': report['manifestSetSHA256'],
              'flaggedSources': len(rows), 'signalClearCandidates': sum(r['signalClear'] for r in rows),
              'candidates': rows, 'listeningReviewed': False, 'installed': False}
    (OUT / 'retake-candidate-report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    sections = []
    for row in rows:
        source = html.escape(row['sourcePath'], quote=True)
        candidate = html.escape(row['candidatePath'], quote=True)
        sections.append(f'<section><h2 lang="fr">{html.escape(row["displayText"])}</h2>'
                        f'<p>{html.escape(row["voice"])} · {html.escape(row["method"])}</p>'
                        f'<p>Original</p><audio controls preload="none" src="{source}"></audio>'
                        f'<p>Candidate</p><audio controls preload="none" src="{candidate}"></audio>'
                        f'<p>Signal clear: {row["signalClear"]}</p></section>')
    page = ('<!doctype html><html lang="en"><meta charset="utf-8"><title>French Lunch retake review</title>'
            '<style>body{font:16px system-ui;max-width:900px;margin:auto;padding:20px}'
            'section{border:1px solid #aaa;border-radius:10px;margin:14px 0;padding:14px}'
            'audio{width:100%}</style><h1>French Lunch private retake candidates</h1>'
            '<p>Listen to both versions. Signal clearance is not listening approval. '
            'Candidates are separate from source manifests and are not installed.</p>'
            + ''.join(sections) + '</html>')
    (PRIVATE / 'retake-review.html').write_text(page)
    print(json.dumps({'flaggedSources': len(rows),
                      'signalClearCandidates': result['signalClearCandidates'],
                      'report': str(OUT / 'retake-candidate-report.json')}))


if __name__ == '__main__':
    main()
