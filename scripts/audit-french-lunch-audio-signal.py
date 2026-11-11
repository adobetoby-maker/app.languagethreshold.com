#!/usr/bin/env python3
"""Decode private French Lunch MP3s and flag signal defects, without approval."""
import hashlib
import html
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = Path('/Users/drive/lt-audio/french-travel-lunch')


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


signal = load(ROOT / 'scripts/audit-japanese101-audio-signal.py', 'signal_screen')


def audit():
    verification = json.loads((PRIVATE / 'verification-report.json').read_text())
    digest = hashlib.sha256()
    seen = set()
    flags = []
    for stage, count in (('foundation', 10), ('core', 30), ('master', 20)):
        for number in range(1, count + 1):
            manifest_path = PRIVATE / f'{stage}-{number}' / 'manifest.json'
            digest.update(str(manifest_path.relative_to(PRIVATE)).encode() + b'\0' + manifest_path.read_bytes())
            manifest = json.loads(manifest_path.read_text())
            for row in manifest['clips'].values():
                for clip in row['voices'].values():
                    if clip['sha256'] in seen:
                        continue
                    seen.add(clip['sha256'])
                    path = manifest_path.parent / clip['name']
                    measured = signal.decode(path)
                    issues = []
                    if measured['peak'] < 0.02 or measured['rms'] < 0.004:
                        issues.append('very-quiet')
                    if measured['activeSeconds'] < 0.08:
                        issues.append('little-active-signal')
                    if measured['clippedFraction'] > 0.001:
                        issues.append('possible-clipping')
                    if measured['leadingSilenceSeconds'] > 1 or measured['trailingSilenceSeconds'] > 1:
                        issues.append('long-edge-silence')
                    if issues:
                        flags.append({'path': str(path.relative_to(PRIVATE)),
                                      'displayText': row['displayText'],
                                      'spokenText': row['spokenText'],
                                      'voice': clip['voice'], 'sha256': clip['sha256'],
                                      'issues': issues, 'signal': measured})
    if digest.hexdigest() != verification['manifestSetSHA256'] or len(seen) != verification['uniqueTextVoiceClips']:
        raise ValueError('Verified private manifest set changed during signal screen')
    return {'schema': 1, 'courseId': 'travel-lunch',
            'manifestSetSHA256': digest.hexdigest(),
            'uniqueFilesDecoded': len(seen), 'flaggedFiles': len(flags),
            'flags': flags, 'listeningReviewed': False, 'registered': False}


def review_page(report):
    rows = []
    for flag in report['flags']:
        name = html.escape(flag['path'], quote=True)
        rows.append('<section><h2 lang="fr">' + html.escape(flag['displayText']) + '</h2>'
                    '<p>' + html.escape(flag['voice']) + '</p>'
                    '<audio controls preload="none" src="' + name + '"></audio>'
                    '<p>' + html.escape(', '.join(flag['issues'])) + '</p></section>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>French Lunch private signal review</title><style>body{font:16px system-ui;max-width:900px;margin:auto;padding:24px}'
            'section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:16px 0}audio{width:100%}</style>'
            '<h1>French Lunch private signal review</h1><p>Signal flags are listening priorities, not approval. '
            'All recordings remain private and unregistered.</p>' + ''.join(rows) + '</html>\n')


if __name__ == '__main__':
    report = audit()
    (PRIVATE / 'signal-screen.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    (PRIVATE / 'signal-review.html').write_text(review_page(report))
    print(json.dumps({'uniqueFilesDecoded': report['uniqueFilesDecoded'],
                      'flaggedFiles': report['flaggedFiles'],
                      'manifestSetSHA256': report['manifestSetSHA256']}))
