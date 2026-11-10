#!/usr/bin/env python3
"""Create private listening candidates for the three long-leading-silence clips."""

import hashlib
import html
import json
from pathlib import Path
from runpy import run_path
import subprocess

ROOT = Path('/Users/drive/lt-audio/japanese-travel-breakfast')
SOURCE = ROOT / 'full-course-2026-11-09'
OUTPUT = ROOT / 'signal-trims-2026-11-09'
SIGNAL = run_path(str(Path(__file__).with_name('audit-japanese-breakfast-private-audio-signal.py')))['signal']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    report = json.loads((SOURCE / 'signal-screen-2026-11-09.json').read_text())
    manifest_bytes = (SOURCE / 'manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    if report['manifestSha256'] != sha(manifest_bytes) or report['flaggedFiles'] != 3:
        raise ValueError('Source signal report or manifest changed')
    if (manifest['textReviewed'], manifest['listeningReviewed'], manifest['registered']) != (False, False, False):
        raise ValueError('Source audio review gate changed')
    if OUTPUT.exists():
        raise FileExistsError(f'Candidate folder already exists: {OUTPUT}')
    OUTPUT.mkdir(parents=True)
    candidates = []
    for row in report['flags']:
        if row['issues'] != ['long-edge-silence'] or not 1 < row['signal']['leadingSilenceSeconds'] < 1.2:
            raise ValueError('Unexpected signal flag; inspect it before trimming')
        clip = manifest['clips'][row['textSha256']]['voices'][row['gender']]
        if clip['name'] != row['filename'] or clip['text'] != row['text'] or clip['voice'] != row['voice']:
            raise ValueError('Signal flag does not match source clip')
        original = SOURCE / clip['name']
        if sha(original.read_bytes()) != clip['sha256']:
            raise ValueError(f'Source clip bytes changed: {original.name}')
        trim_seconds = round(row['signal']['leadingSilenceSeconds'] - 0.35, 3)
        candidate = OUTPUT / clip['name']
        subprocess.run([
            'ffmpeg', '-nostdin', '-loglevel', 'error', '-i', str(original),
            '-af', f'atrim=start={trim_seconds},asetpts=PTS-STARTPTS',
            '-codec:a', 'libmp3lame', '-q:a', '2', str(candidate),
        ], check=True)
        before = SIGNAL(original)
        after = SIGNAL(candidate)
        if (after['leadingSilenceSeconds'] >= 1 or after['activeSeconds'] < before['activeSeconds'] - 0.03
                or after['peak'] < 0.02 or after['clippedFraction'] > 0.001):
            raise ValueError(f'Trim needs manual inspection: {candidate.name}')
        candidates.append({
            'textSha256': row['textSha256'], 'text': row['text'], 'gender': row['gender'],
            'voice': row['voice'], 'originalFile': clip['name'], 'originalSha256': clip['sha256'],
            'candidateFile': candidate.name, 'candidateSha256': sha(candidate.read_bytes()),
            'trimStartSeconds': trim_seconds, 'before': before, 'after': after,
            'listeningReviewed': False,
        })
    result = {
        'schema': 1, 'state': 'private-signal-trim-candidates',
        'sourceManifestSha256': sha(manifest_bytes), 'sourceSignalReportSha256': sha((SOURCE / 'signal-screen-2026-11-09.json').read_bytes()),
        'textReviewed': False, 'listeningReviewed': False, 'registered': False,
        'candidates': candidates,
    }
    (OUTPUT / 'manifest.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    rows = []
    for item in candidates:
        name = html.escape(item['candidateFile'], quote=True)
        rows.append('<section><h2 lang="ja">' + html.escape(item['text']) + '</h2><p>' +
                    html.escape(item['voice']) + '</p><p>Original</p><audio controls preload="none" src="../full-course-2026-11-09/' + name +
                    '"></audio><p>Trim candidate</p><audio controls preload="none" src="' + name +
                    '"></audio><p>Leading silence: ' + str(item['before']['leadingSilenceSeconds']) + ' s → ' +
                    str(item['after']['leadingSilenceSeconds']) + ' s.</p></section>')
    (OUTPUT / 'review.html').write_text(
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>Japanese Breakfast trim candidates</title><style>body{font:16px system-ui;max-width:850px;margin:auto;padding:1rem}'
        'section{border:1px solid #aaa;border-radius:10px;padding:1rem;margin:1rem 0}audio{width:100%;max-width:420px}</style>'
        '<h1>Japanese Breakfast trim candidates</h1><p>These three files are private alternatives for listening review. '
        'The source recordings and course manifest are unchanged.</p>' + ''.join(rows) + '</html>\n')
    print(json.dumps({'candidates': len(candidates), 'output': str(OUTPUT)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
