#!/usr/bin/env python3
"""Pin private retake evidence without selecting or publishing a take."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path('/Users/drive/lt-audio/french-pronunciation')
BASE = ROOT / 'content/french-pronunciation/private-playback-candidates-fr-en.json'
REVIEW = AUDIO / 'quiet-retakes-review-2026-11-10.json'
OUTPUT = ROOT / 'docs/french-program/fr-001-private-quiet-retake-reconciliation.json'
VOICES = {'female': 'fr-FR-Chirp3-HD-Aoede', 'male': 'fr-FR-Chirp3-HD-Charon'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build():
    base_bytes = BASE.read_bytes()
    review_bytes = REVIEW.read_bytes()
    base = json.loads(base_bytes)
    review = json.loads(review_bytes)
    assert base['pairKey'] == review['pairKey'] == 'French:English'
    assert base['listeningReviewed'] is review['listeningReviewed'] is False
    assert base['runtimeRegistered'] is review['runtimeRegistered'] is False
    assert review['sourceSignalSummarySha256'] == base['sourceSignalSummarySha256']
    flagged = {(x['text'], x['gender']) for x in base['unresolved']
               if x['reason'] == 'all-takes-signal-flagged'}
    assert len(flagged) == 20
    rows = []
    seen = set()
    for item in review['takes']:
        key = (item['text'], item['gender'])
        assert key in flagged and key not in seen
        seen.add(key)
        takes = []
        for option in item['candidates']:
            batch = option['batch']
            directory = AUDIO / batch
            manifest_bytes = (directory / 'manifest.json').read_bytes()
            assert digest(manifest_bytes) == review['retakeManifestSha256ByBatch'][batch]
            manifest = json.loads(manifest_bytes)
            assert manifest['pairKey'] == 'French:English' and manifest['locale'] == 'fr-FR'
            assert manifest['listeningReviewed'] is manifest['registered'] is False
            matches = [clip for clip in manifest['clips'].values()
                       if (clip['text'], clip['gender']) == key and clip['sha256'] == option['sha256']]
            assert len(matches) == 1
            clip = matches[0]
            assert clip['voice'] == option['voice'] == VOICES[item['gender']]
            assert clip['textSha256'] == digest(item['text'].encode())
            assert clip['signal'] == option['signal']
            assert clip['listeningReviewed'] is False
            audio = (directory / clip['name']).read_bytes()
            assert digest(audio) == clip['sha256'] and len(audio) == clip['bytes']
            takes.append({'batch': batch, 'file': clip['name'], 'sha256': clip['sha256'],
                          'signalClean': option['signalClean'], 'durationSeconds': clip['signal']['durationSeconds']})
        rows.append({'text': item['text'], 'gender': item['gender'],
                     'hasSignalCleanRetake': any(t['signalClean'] for t in takes),
                     'takes': takes})
    assert len(rows) == review['targetedTextVoicePairs'] == 19
    assert len(flagged - seen) == 1
    assert sum(x['hasSignalCleanRetake'] for x in rows) == review['signalCleanPairs'] == 15
    still_quiet = {(x['text'], x['gender']) for x in review['stillQuietPairs']}
    assert still_quiet == {key for key in seen if not next(r for r in rows if (r['text'], r['gender']) == key)['hasSignalCleanRetake']}
    assert review['paidRetakeClips'] == sum(len(json.loads((AUDIO / batch / 'manifest.json').read_text())['clips'])
                                               for batch in review['retakeManifestSha256ByBatch']) == 30
    untargeted_text, untargeted_gender = next(iter(flagged - seen))
    return {
        'schema': 1, 'pairKey': 'French:English', 'state': 'private-technical-retake-evidence',
        'baseCandidateSha256': digest(base_bytes), 'privateReviewSha256': digest(review_bytes),
        'retakeManifestSha256ByBatch': review['retakeManifestSha256ByBatch'],
        'originalAllTakesFlaggedPairs': len(flagged), 'targetedPairs': len(seen),
        'pairsWithSignalCleanRetake': 15, 'stillQuietPairs': 4,
        'untargetedPair': {'text': untargeted_text, 'gender': untargeted_gender},
        'differentUnreviewedTakesStillUnresolved': sum(x['reason'] == 'different-unreviewed-takes'
                                                       for x in base['unresolved']),
        'listeningReviewed': False, 'textReviewed': False, 'runtimeRegistered': False,
        'webPublished': False, 'nativeBundled': False, 'canonicalPlaybackSelectionMade': False,
        'retakes': sorted(rows, key=lambda x: (x['text'], x['gender'])),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    report = build()
    encoded = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        assert OUTPUT.read_text() == encoded, 'Retake reconciliation changed'
    else:
        OUTPUT.write_text(encoded)
    print(json.dumps({k: report[k] for k in ('originalAllTakesFlaggedPairs', 'targetedPairs',
                                             'pairsWithSignalCleanRetake', 'stillQuietPairs')},
                     ensure_ascii=False))


if __name__ == '__main__':
    main()
