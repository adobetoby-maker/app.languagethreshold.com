#!/usr/bin/env python3
"""Pin same-text/voice alternatives for flagged Japanese 101 private audio."""

import argparse
import hashlib
import importlib.util
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path('/Users/drive/lt-audio/japanese-101')
SIGNAL = AUDIO / 'signal-audit-2026-11-09.json'
COURSE_REPORT = ROOT / 'docs/japanese-program/private-course-audio-verification-2026-11-09.json'
OUTPUT = ROOT / 'docs/japanese-program/private-audio-repair-plan-2026-11-10.json'
STAGES = (('foundation', 10, 'foundation-1-complete'), ('core', 30, None), ('master', 20, None))


def sha(data):
    return hashlib.sha256(data).hexdigest()


def verified_course():
    path = ROOT / 'scripts/verify-japanese101-private-course-audio.py'
    spec = importlib.util.spec_from_file_location('japanese101_course_audio', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    report = module.verify(AUDIO)
    assert report == json.loads(COURSE_REPORT.read_text()), 'Private course audio report changed'
    return report


def build():
    verified_course()
    signal_bytes = SIGNAL.read_bytes()
    signal = json.loads(signal_bytes)
    assert signal['occurrences'] == 2242 and signal['flaggedFiles'] == len(signal['flags']) == 12
    manifests = hashlib.sha256()
    by_text_voice = defaultdict(list)
    by_file = {}
    for prefix, count, first_folder in STAGES:
        for number in range(1, count + 1):
            folder = AUDIO / (first_folder if number == 1 and first_folder else f'{prefix}-{number}')
            manifest_path = folder / 'manifest.json'
            raw = manifest_path.read_bytes()
            manifests.update(str(manifest_path.relative_to(AUDIO)).encode() + b'\0' + raw)
            manifest = json.loads(raw)
            assert manifest['listeningReviewed'] is False and manifest.get('registered') is not True
            for text, voices in manifest['clips'].items():
                assert set(voices) == {'female', 'male'}
                for gender, clip in voices.items():
                    path = folder / clip['name']
                    row = {'lesson': f'{prefix}-{number}', 'file': str(path.relative_to(AUDIO)),
                           'sha256': clip['sha256'], 'bytes': clip['bytes'],
                           'durationSeconds': clip['durationSeconds'], 'spokenText': clip['spokenText'],
                           'voice': clip['voice'], 'gender': gender}
                    assert path not in by_file
                    by_file[path] = row
                    by_text_voice[(text, clip['voice'])].append(row)
    assert manifests.hexdigest() == signal['manifestSetSHA256'], 'Signal audit is stale'
    flagged_hashes = set()
    for flag in signal['flags']:
        path = Path(flag['path'])
        assert path in by_file and by_file[path]['voice'] == flag['voice']
        assert by_file[path]['sha256'] == sha(path.read_bytes())
        flagged_hashes.add(by_file[path]['sha256'])
    repairs = []
    for flag in signal['flags']:
        path = Path(flag['path'])
        original = by_file[path]
        options = [row for row in by_text_voice[(flag['text'], flag['voice'])]
                   if row['sha256'] not in flagged_hashes]
        unique = {row['sha256']: row for row in options}
        alternatives = sorted(unique.values(), key=lambda row: (row['lesson'], row['file']))
        repairs.append({'text': flag['text'], 'voice': flag['voice'], 'issues': flag['issues'],
                        'original': original, 'sameTextVoiceUnflaggedAlternatives': alternatives,
                        'nextStep': 'listen-to-alternatives' if alternatives else 'bounded-private-retake'})
    assert len(repairs) == 12
    assert sum(bool(row['sameTextVoiceUnflaggedAlternatives']) for row in repairs) == 7
    return {
        'schema': 1, 'pairKey': 'Japanese:English', 'state': 'private-repair-plan',
        'sourceCourseReportSha256': sha(COURSE_REPORT.read_bytes()),
        'sourceSignalReportSha256': sha(signal_bytes),
        'manifestSetSha256': manifests.hexdigest(),
        'flaggedRecordings': len(repairs),
        'withSameTextVoiceAlternative': 7,
        'withoutAlternative': 5,
        'listeningReviewed': False, 'registered': False,
        'repairs': repairs,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    result = build()
    encoded = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        assert OUTPUT.read_text() == encoded, 'Repair plan changed'
    else:
        OUTPUT.write_text(encoded)
    print(json.dumps({key: result[key] for key in
                      ('flaggedRecordings', 'withSameTextVoiceAlternative', 'withoutAlternative')}))


if __name__ == '__main__':
    main()
