#!/usr/bin/env python3
"""Make private level candidates for three weak French Breakfast question words."""

import hashlib
import html
import json
import math
from pathlib import Path
from runpy import run_path
import subprocess

ROOT = Path('/Users/drive/lt-audio/french-travel-breakfast')
ORIGINALS = ROOT / 'full-course-2026-11-09'
RETAKES = ROOT / 'signal-candidates-2026-11-09'
OUTPUT = ROOT / 'signal-level-candidates-2026-11-09'
SIGNAL = run_path(str(Path(__file__).with_name('audit-french-travel-breakfast-private-audio-signal.py')))['signal']
TARGET_PEAK = 0.4


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    source_bytes = (RETAKES / 'manifest.json').read_bytes()
    source = json.loads(source_bytes)
    if (source['pairKey'], source['textReviewed'], source['listeningReviewed'], source['registered']) != (
            'French:English', False, False, False):
        raise ValueError('Private pair or review gate changed')
    quiet = [item for item in source['candidates'] if item['kind'] == 'same-text-retake']
    if len(quiet) != 3 or OUTPUT.exists():
        raise ValueError('Expected exactly three quiet candidates and a new output folder')
    OUTPUT.mkdir(parents=True)
    rows = []
    for item in quiet:
        original = ORIGINALS / item['originalFile']
        retake = RETAKES / item['candidateFile']
        if sha(original.read_bytes()) != item['originalSha256'] or sha(retake.read_bytes()) != item['candidateSha256']:
            raise ValueError('Original or retake clip changed')
        selected = retake if item['after']['peak'] > item['before']['peak'] else original
        before = SIGNAL(selected)
        if before['peak'] <= 0:
            raise ValueError('Cannot level a silent source')
        gain_db = 20 * math.log10(TARGET_PEAK / before['peak'])
        candidate = OUTPUT / (Path(item['originalFile']).stem + '-level.mp3')
        subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-i', str(selected),
                        '-af', f'volume={gain_db:.3f}dB', '-codec:a', 'libmp3lame',
                        '-q:a', '2', str(candidate)], check=True)
        after = SIGNAL(candidate)
        if not 0.2 < after['peak'] < 0.7 or after['clippedFraction'] > 0.001:
            raise ValueError(f'Invalid level candidate: {candidate.name}')
        rows.append({'textSha256': item['textSha256'], 'text': item['text'],
                     'voice': item['voice'], 'originalFile': item['originalFile'],
                     'retakeFile': item['candidateFile'], 'selectedSource': selected.name,
                     'levelFile': candidate.name, 'levelSha256': sha(candidate.read_bytes()),
                     'gainDb': round(gain_db, 3), 'before': before, 'after': after,
                     'listeningReviewed': False})
    result = {'schema': 1, 'state': 'private-level-candidates', 'pairKey': 'French:English',
              'sourceCandidateManifestSha256': sha(source_bytes), 'targetPeak': TARGET_PEAK,
              'textReviewed': False, 'listeningReviewed': False, 'registered': False,
              'candidates': rows}
    (OUTPUT / 'manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    blocks = []
    for row in rows:
        blocks.append('<section><h2 lang="fr">' + html.escape(row['text']) + '</h2><p>' +
                      html.escape(row['voice']) + '</p><p>Original</p><audio controls preload="none" '
                      'src="../full-course-2026-11-09/' + html.escape(row['originalFile'], quote=True) +
                      '"></audio><p>Retake</p><audio controls preload="none" src="../signal-candidates-2026-11-09/' +
                      html.escape(row['retakeFile'], quote=True) +
                      '"></audio><p>Level candidate</p><audio controls preload="none" src="' +
                      html.escape(row['levelFile'], quote=True) + '"></audio><p>Peak ' +
                      str(row['before']['peak']) + ' → ' + str(row['after']['peak']) +
                      '. Level adjustment can amplify noise; listening decides whether speech is usable.</p></section>')
    (OUTPUT / 'review.html').write_text(
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>French Breakfast quiet-word comparisons</title><style>body{font:16px system-ui;max-width:850px;margin:auto;padding:1rem}'
        'section{border:1px solid #aaa;border-radius:10px;padding:1rem;margin:1rem 0}audio{width:100%;max-width:420px}</style>'
        '<h1>French Breakfast quiet-word comparisons</h1><p>Private candidates only. Course recordings are unchanged.</p>' +
        ''.join(blocks) + '</html>\n')
    print(json.dumps({'levelCandidates': len(rows), 'output': str(OUTPUT)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
