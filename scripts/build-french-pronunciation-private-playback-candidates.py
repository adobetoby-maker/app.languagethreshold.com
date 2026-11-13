#!/usr/bin/env python3
"""Classify private French pronunciation takes without approving or registering audio."""

import argparse
import hashlib
import importlib.util
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path('/Users/drive/lt-audio/french-pronunciation')
COVERAGE = ROOT / 'docs/french-program/fr-001-private-full-audio-coverage.json'
SIGNAL_SUMMARY = ROOT / 'docs/french-program/fr-001-private-full-audio-signal-screen.json'
SIGNAL_DETAIL = AUDIO / 'signal-screen-2026-11-10.json'
OUTPUT = ROOT / 'content/french-pronunciation/private-playback-candidates-fr-en.json'
VOICES = {'female': 'fr-FR-Chirp3-HD-Aoede', 'male': 'fr-FR-Chirp3-HD-Charon'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def verified_coverage():
    path = ROOT / 'scripts/verify-french-pronunciation-full-audio.py'
    spec = importlib.util.spec_from_file_location('fr_pronunciation_full_audio', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    report = module.build_report()
    assert json.loads(COVERAGE.read_text()) == report, 'Full audio coverage changed'
    return report


def build():
    coverage = verified_coverage()
    summary = json.loads(SIGNAL_SUMMARY.read_text())
    signal = json.loads(SIGNAL_DETAIL.read_text())
    assert summary['filesDecoded'] == signal['filesDecoded'] == coverage['batchTextVoiceClips'] == 1778
    assert summary['flaggedFiles'] == signal['flaggedFiles'] == len(signal['flags']) == 28
    assert summary['manifestSha256ByBatch'] == signal['manifestSha256ByBatch']
    flagged = {(row['batch'], row['sha256']) for row in signal['flags']}
    assert len(flagged) == 28
    takes = defaultdict(list)
    for batch in coverage['batches']:
        directory = Path(batch['directory'])
        raw = (directory / 'manifest.json').read_bytes()
        assert sha(raw) == batch['manifestSha256']
        assert summary['manifestSha256ByBatch'][directory.name] == sha(raw)
        manifest = json.loads(raw)
        assert manifest['pairKey'] == 'French:English' and manifest['locale'] == 'fr-FR'
        assert manifest['voices'] == VOICES and manifest['listeningReviewed'] is False
        assert manifest['registered'] is False
        for text_hash, genders in manifest['clips'].items():
            assert set(genders) == set(VOICES)
            for gender, clip in genders.items():
                text = clip['spokenText']
                assert sha(text.encode()) == text_hash
                assert clip['voice'] == VOICES[gender] and clip['locale'] == 'fr-FR'
                assert clip['listeningReviewed'] is False
                takes[(text, gender)].append({
                    'batch': directory.name,
                    'file': clip['name'],
                    'sha256': clip['sha256'],
                    'durationSeconds': clip['durationSeconds'],
                    'signalFlagged': (directory.name, clip['sha256']) in flagged,
                })
    assert len(takes) == coverage['uniqueTextVoicePairsAcrossBatches'] == 1660
    candidates = []
    unresolved = []
    for (text, gender), options in sorted(takes.items()):
        clean = [option for option in options if not option['signalFlagged']]
        hashes = {option['sha256'] for option in clean}
        if len(hashes) == 1:
            selected = sorted(clean, key=lambda row: (row['batch'], row['file']))[0]
            candidates.append({'text': text, 'gender': gender, 'voice': VOICES[gender],
                               **selected, 'listeningReviewed': False})
        else:
            unresolved.append({'text': text, 'gender': gender,
                               'reason': 'all-takes-signal-flagged' if not clean else 'different-unreviewed-takes',
                               'takes': options})
    assert len(candidates) + len(unresolved) == 1660
    return {
        'schema': 1,
        'moduleId': 'french-sound-like-a-native',
        'pairKey': 'French:English',
        'state': 'private-technical-candidates-only',
        'sourceCoverageSha256': sha(COVERAGE.read_bytes()),
        'sourceSignalSummarySha256': sha(SIGNAL_SUMMARY.read_bytes()),
        'sourceSignalDetailSha256': sha(SIGNAL_DETAIL.read_bytes()),
        'sourceBatchClipsVerified': coverage['batchTextVoiceClips'],
        'uniqueTextVoicePairs': len(takes),
        'unambiguousUnflaggedPairs': len(candidates),
        'unresolvedPairs': len(unresolved),
        'listeningReviewed': False,
        'textReviewed': False,
        'runtimeRegistered': False,
        'webPublished': False,
        'nativeBundled': False,
        'canonicalPlaybackSelectionMade': False,
        'candidates': candidates,
        'unresolved': unresolved,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    report = build()
    encoded = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        assert OUTPUT.read_text() == encoded, 'Playback candidate map changed'
    else:
        OUTPUT.write_text(encoded)
    print(json.dumps({key: report[key] for key in
                      ('sourceBatchClipsVerified', 'uniqueTextVoicePairs',
                       'unambiguousUnflaggedPairs', 'unresolvedPairs')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
