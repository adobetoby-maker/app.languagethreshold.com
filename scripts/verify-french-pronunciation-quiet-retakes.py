#!/usr/bin/env python3
"""Verify isolated quiet-word retakes and build a private listening review sheet."""

import argparse
from collections import defaultdict
import hashlib
import html
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path('/Users/drive/lt-audio/french-pronunciation')
SOURCE = ROOT / 'docs/french-program/fr-001-private-full-audio-signal-screen.json'
SUMMARY = ROOT / 'docs/french-program/fr-001-private-quiet-retakes.json'
PRIVATE = AUDIO / 'quiet-retakes-review-2026-11-10.json'
SHEET = AUDIO / 'quiet-retakes-listening-review-2026-11-10.html'
BATCHES = ('quiet-retakes-2026-11-10', 'quiet-retakes-2-2026-11-10')


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def signal(path):
    script = ROOT / 'scripts/audit-french-pronunciation-private-audio-signal.py'
    spec = importlib.util.spec_from_file_location('french_signal', script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.signal(path)


def clean(metrics):
    return (metrics['peak'] >= 0.02 and metrics['rms'] >= 0.004
            and metrics['activeSeconds'] >= 0.08
            and metrics['leadingSilenceSeconds'] <= 1
            and metrics['trailingSilenceSeconds'] <= 1
            and metrics['clippedFraction'] <= 0.001)


def build():
    source = json.loads(SOURCE.read_text())
    if source['filesDecoded'] != 1778 or source['flaggedFiles'] != 28:
        raise ValueError('Source signal scope changed')
    by_pair = defaultdict(list)
    manifest_hashes = {}
    characters = 0
    for batch in BATCHES:
        root = AUDIO / batch
        raw = (root / 'manifest.json').read_bytes()
        manifest_hashes[batch] = sha(raw)
        manifest = json.loads(raw)
        if (manifest['pairKey'], manifest['locale'], manifest['quotaProject'],
            manifest['sourceSignalSummarySha256'], manifest['listeningReviewed'],
            manifest['registered']) != ('French:English', 'fr-FR',
            'project-91661021-fb2d-4524-b9f', sha(SOURCE.read_bytes()), False, False):
            raise ValueError(f'Private retake gate or source changed: {batch}')
        for key, clip in manifest['clips'].items():
            characters += len(clip['text'])
            path = root / clip['name']
            raw_clip = path.read_bytes()
            if (key != sha((clip['text'] + '\n' + clip['gender']).encode()) or
                clip['textSha256'] != sha(clip['text'].encode()) or
                clip['voice'] != {'female': 'fr-FR-Chirp3-HD-Aoede',
                                  'male': 'fr-FR-Chirp3-HD-Charon'}[clip['gender']] or
                clip['sha256'] != sha(raw_clip) or clip['bytes'] != len(raw_clip) or
                clip['listeningReviewed'] is not False or clip['signal'] != signal(path)):
                raise ValueError(f'Retake identity, bytes, or signal changed: {path}')
            by_pair[(clip['text'], clip['gender'])].append({
                'batch': batch, 'path': str(path), 'sha256': clip['sha256'],
                'voice': clip['voice'], 'signal': clip['signal'],
                'signalClean': clean(clip['signal']),
            })
    if len(by_pair) != 19 or sum(map(len, by_pair.values())) != 30:
        raise ValueError('Retake scope changed')
    resolved = {key for key, takes in by_pair.items() if any(take['signalClean'] for take in takes)}
    unresolved = sorted(set(by_pair) - resolved)
    summary = {'schema': 1, 'pairKey': 'French:English', 'scope': 'private-quiet-word-retakes',
               'sourceSignalSummarySha256': sha(SOURCE.read_bytes()),
               'retakeManifestSha256ByBatch': manifest_hashes,
               'paidRetakeClips': 30, 'paidRetakeCharacters': characters,
               'targetedTextVoicePairs': len(by_pair), 'signalCleanPairs': len(resolved),
               'stillQuietPairs': [{'text': text, 'gender': gender} for text, gender in unresolved],
               'privateReviewReport': str(PRIVATE), 'privateReviewSheet': str(SHEET),
               'listeningReviewed': False, 'runtimeRegistered': False}
    return summary, by_pair


def review_sheet(by_pair):
    sections = []
    for (text, gender), takes in sorted(by_pair.items()):
        clips = []
        for take in takes:
            metrics = take['signal']
            clips.append('<p>' + html.escape(take['batch']) + ' · ' +
                         ('signal-clean candidate' if take['signalClean'] else 'still quiet') +
                         ' · peak ' + str(metrics['peak']) + ' · RMS ' + str(metrics['rms']) +
                         '</p><audio controls preload="none" src="' +
                         html.escape(Path(take['path']).as_uri(), quote=True) + '"></audio>')
        sections.append('<section><h2 lang="fr">' + html.escape(text) + ' · ' +
                        html.escape(gender) + '</h2>' + ''.join(clips) + '</section>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>French pronunciation retake review</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:1rem}'
            'section{border:1px solid #aaa;border-radius:10px;padding:1rem;margin:1rem 0}'
            'audio{width:100%;max-width:420px}</style><h1>French pronunciation retake review</h1>'
            '<p>Private candidates only. Signal-clean means audible level and duration thresholds passed; '
            'it does not approve pronunciation. Listen before selecting any clip for learner playback.</p>' +
            ''.join(sections) + '</html>\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check-report', action='store_true')
    args = parser.parse_args()
    summary, by_pair = build()
    encoded = json.dumps(summary, ensure_ascii=False, indent=2) + '\n'
    if args.check_report:
        assert SUMMARY.read_text() == encoded, 'Retake summary stale'
    else:
        SUMMARY.write_text(encoded)
        PRIVATE.write_text(json.dumps({**summary, 'takes': [
            {'text': text, 'gender': gender, 'candidates': takes}
            for (text, gender), takes in sorted(by_pair.items())
        ]}, ensure_ascii=False, indent=2) + '\n')
        SHEET.write_text(review_sheet(by_pair))
    print(json.dumps({'targetedTextVoicePairs': summary['targetedTextVoicePairs'],
                      'signalCleanPairs': summary['signalCleanPairs'],
                      'stillQuietPairs': len(summary['stillQuietPairs'])}))
