#!/usr/bin/env python3
"""Decode private French Lunch content clips and flag numeric signal defects."""
import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_ROOT = Path('/Users/drive/lt-audio/french-travel-lunch')


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SIGNAL = load(ROOT / 'scripts/audit-japanese101-audio-signal.py', 'french_lunch_content_signal')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--scope', choices=('passages', 'supplement'), required=True)
    args = parser.parse_args()
    private = PRIVATE_ROOT / ('content-passages' if args.scope == 'passages' else 'content-supplement')
    check = subprocess.run([sys.executable, str(ROOT / 'scripts/generate-french-lunch-passage-audio.py'),
                            '--scope', args.scope], capture_output=True, text=True, check=True)
    if json.loads(check.stdout)['remainingClips'] != 0:
        raise ValueError('Audio set is incomplete')
    manifest_path = private / 'manifest.json'
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    flags = []
    count = 0
    for row in manifest['clips'].values():
        for clip in row['voices'].values():
            count += 1
            measured = SIGNAL.decode(private / clip['name'])
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
                flags.append({'name': clip['name'], 'text': row['text'], 'voice': clip['voice'],
                              'sha256': clip['sha256'], 'issues': issues, 'signal': measured})
    report = {'schema': 1, 'scope': args.scope,
              'manifestSha256': hashlib.sha256(manifest_bytes).hexdigest(),
              'clipsDecoded': count, 'flaggedFiles': len(flags), 'flags': flags,
              'listeningReviewed': False, 'registered': False}
    (private / 'signal-screen.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'clipsDecoded': count, 'flaggedFiles': len(flags),
                      'manifestSha256': report['manifestSha256']}))


if __name__ == '__main__':
    main()
