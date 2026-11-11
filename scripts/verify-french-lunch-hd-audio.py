#!/usr/bin/env python3
"""Verify every private French Lunch card/Reader HD recording; no release flags."""
import hashlib
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


generator = load(ROOT / 'scripts/generate-french-lunch-hd-audio.py', 'french_lunch_generator')
scope_module = load(ROOT / 'content/french-travel-lunch/verify-private-audio-scope.py', 'french_lunch_scope')


def require(value, message):
    if not value:
        raise ValueError(message)


def verify():
    scope = scope_module.build()
    pinned = json.loads(scope_module.SCOPE.read_text())
    require(scope == pinned, 'Audio scope differs from current lesson source')
    expected_voices = generator.VOICES
    manifest_digest = hashlib.sha256()
    unique = {}
    occurrences = 0
    total_bytes = 0
    total_duration = 0
    for stage, count in (('foundation', 10), ('core', 30), ('master', 20)):
        for number in range(1, count + 1):
            entries, source_sha, filename, stable_id = generator.source_for(stage, number)
            folder = PRIVATE / f'{stage}-{number}'
            manifest_path = folder / 'manifest.json'
            raw = manifest_path.read_bytes()
            manifest_digest.update(str(manifest_path.relative_to(PRIVATE)).encode() + b'\0' + raw)
            manifest = json.loads(raw)
            require((manifest.get('schema'), manifest.get('pairKey'), manifest.get('locale'),
                     manifest.get('courseId'), manifest.get('stableLessonId'),
                     manifest.get('sourceFile'), manifest.get('sourceFixtureSha256'),
                     manifest.get('voices'), manifest.get('textReviewed'),
                     manifest.get('listeningReviewed'), manifest.get('registered')) ==
                    (1, 'French:English', 'fr-FR', 'travel-lunch', stable_id,
                     filename, source_sha, expected_voices, False, False, False),
                    f'{stable_id}: manifest identity or release gate differs')
            require(manifest.get('quotaProject') == 'project-91661021-fb2d-4524-b9f',
                    f'{stable_id}: quota project differs')
            require(set(manifest['clips']) == set(entries),
                    f'{stable_id}: missing or extra source texts')
            named_files = set()
            for key, expected in entries.items():
                row = manifest['clips'][key]
                require((row['displayText'], row['spokenText'], row['fields']) ==
                        (expected['displayText'], expected['spokenText'], expected['fields']),
                        f'{stable_id}: card/Reader text differs')
                require(set(row['voices']) == set(expected_voices),
                        f'{stable_id}: missing voice')
                for gender, voice in expected_voices.items():
                    clip = row['voices'][gender]
                    expected_name = f'fr-lunch-{key[:20]}-{gender}.mp3'
                    require((clip.get('name'), clip.get('voice'), clip.get('locale'),
                             clip.get('spokenText'), clip.get('listeningReviewed')) ==
                            (expected_name, voice, 'fr-FR', expected['spokenText'], False),
                            f'{stable_id}: clip identity or review differs')
                    path = folder / expected_name
                    data = path.read_bytes()
                    require((len(data), generator.digest(data), generator.duration(path)) ==
                            (clip.get('bytes'), clip.get('sha256'), clip.get('durationSeconds')),
                            f'{stable_id}: MP3 bytes or duration differ')
                    named_files.add(expected_name)
                    occurrences += 1
                    identity = (key, gender)
                    previous = unique.get(identity)
                    current = (clip['sha256'], path.stat().st_ino)
                    require(previous is None or previous == current,
                            f'{stable_id}: repeated text/voice is not the same verified file')
                    if previous is None:
                        unique[identity] = current
                        total_bytes += len(data)
                        total_duration += clip['durationSeconds']
            require({path.name for path in folder.glob('*.mp3')} == named_files,
                    f'{stable_id}: unmanifested MP3 file')
    require(len(unique) == scope['proposedTwoVoiceClips'],
            'Unique clip count differs from pinned two-voice scope')
    return {'schema': 1, 'courseId': 'travel-lunch', 'pairKey': 'French:English',
            'locale': 'fr-FR', 'quotaProject': 'project-91661021-fb2d-4524-b9f',
            'lessons': 60, 'manifestClipOccurrences': occurrences,
            'uniqueTextVoiceClips': len(unique),
            'hardlinkReuseOccurrences': occurrences - len(unique),
            'uniqueBytes': total_bytes,
            'uniqueDurationSeconds': round(total_duration, 3),
            'manifestSetSHA256': manifest_digest.hexdigest(),
            'textReviewed': False, 'listeningReviewed': False,
            'registered': False}


if __name__ == '__main__':
    result = verify()
    target = PRIVATE / 'verification-report.json'
    temp = target.with_suffix('.json.part')
    temp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    temp.replace(target)
    print(json.dumps(result, ensure_ascii=False))
