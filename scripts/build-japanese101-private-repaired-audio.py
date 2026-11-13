#!/usr/bin/env python3
"""Assemble and verify an unreviewed Japanese 101 audio repair candidate."""

import argparse
import hashlib
import importlib.util
import json
import shutil
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/Users/drive/lt-audio/japanese-101')
OUTPUT = SOURCE / 'full-course-repaired-2026-11-10'
PLAN = ROOT / 'docs/japanese-program/private-audio-repair-plan-2026-11-10.json'
RETAKES = SOURCE / 'flagged-retakes-2026-11-10'
EVIDENCE = ROOT / 'docs/japanese-program/private-repaired-audio-evidence-2026-11-10.json'
STAGES = (('foundation', 10, 'foundation-1-complete'), ('core', 30, None), ('master', 20, None))


def sha(data):
    return hashlib.sha256(data).hexdigest()


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def lesson_dirs(root):
    for prefix, count, first in STAGES:
        for number in range(1, count + 1):
            yield root / (first if number == 1 and first else f'{prefix}-{number}')


def source_occurrences():
    by_hash = {}
    for folder in lesson_dirs(SOURCE):
        manifest = json.loads((folder / 'manifest.json').read_text())
        for text, voices in manifest['clips'].items():
            for gender, clip in voices.items():
                by_hash.setdefault(clip['sha256'], []).append((folder.name, text, gender, clip))
    return by_hash


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.audio = []
        self.pages = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == 'audio' and 'src' in values:
            self.audio.append(values['src'])
        if tag == 'a' and 'href' in values:
            self.pages.append(values['href'])


def verify_sheets():
    if not (OUTPUT / 'foundation-listening-review-2026-11-09.html').exists():
        return 0, 0
    total = 0
    for folder in lesson_dirs(OUTPUT):
        sheet = folder / 'listening-review-2026-11-09.html'
        links = Links()
        links.feed(sheet.read_text())
        manifest = json.loads((folder / 'manifest.json').read_text())
        names = [clip['name'] for voices in manifest['clips'].values() for clip in voices.values()]
        assert sorted(links.audio) == sorted(names)
        assert all((folder / name).is_file() for name in links.audio)
        total += len(links.audio)
    for stage, count, _ in STAGES:
        links = Links()
        links.feed((OUTPUT / f'{stage}-listening-review-2026-11-09.html').read_text())
        assert len(links.pages) == count
        assert all((OUTPUT / name).is_file() for name in links.pages)
    assert total == 2242
    return 60, total


def chosen_repairs(plan):
    retake_manifest = json.loads((RETAKES / 'manifest.json').read_text())
    assert retake_manifest['sourceRepairPlanSha256'] == sha(PLAN.read_bytes())
    assert retake_manifest['listeningReviewed'] is retake_manifest['registered'] is False
    signal = module('ja101_signal_repair', 'audit-japanese101-audio-signal.py')
    choices = []
    for row in plan['repairs']:
        original = row['original']
        alternatives = row['sameTextVoiceUnflaggedAlternatives']
        if alternatives:
            selected = alternatives[0]
            path = SOURCE / selected['file']
            kind = 'same-text-same-voice-course-take'
        else:
            key = sha((original['spokenText'] + '\n' + row['voice']).encode())
            selected = retake_manifest['clips'][key]
            path = RETAKES / selected['name']
            kind = 'exact-text-same-voice-retake'
        data = path.read_bytes()
        assert sha(data) == selected['sha256'] and len(data) == selected['bytes']
        assert selected['spokenText'] == original['spokenText'] and selected['voice'] == original['voice']
        metrics = signal.decode(path)
        assert metrics['peak'] >= .02 and metrics['rms'] >= .004
        assert metrics['activeSeconds'] >= .08 and metrics['clippedFraction'] <= .001
        assert metrics['leadingSilenceSeconds'] <= 1 and metrics['trailingSilenceSeconds'] <= 1
        choices.append((row, selected, path, kind, metrics))
    assert len(choices) == 12 and sum(item[3] == 'exact-text-same-voice-retake' for item in choices) == 5
    return choices


def build(check):
    plan = json.loads(PLAN.read_text())
    assert plan['flaggedRecordings'] == 12 and plan['listeningReviewed'] is False
    course = module('ja101_course_repair', 'verify-japanese101-private-course-audio.py')
    original_report = course.verify(SOURCE)
    assert original_report == json.loads((ROOT / 'docs/japanese-program/private-course-audio-verification-2026-11-09.json').read_text())
    choices = chosen_repairs(plan)
    occurrences = source_occurrences()
    assembling = not OUTPUT.exists() and not check
    if assembling:
        OUTPUT.mkdir(mode=0o700)
        for folder in lesson_dirs(SOURCE):
            target = OUTPUT / folder.name
            target.mkdir(mode=0o700)
            for path in folder.iterdir():
                if path.is_file() and (path.suffix == '.mp3' or path.name == 'manifest.json'):
                    shutil.copy2(path, target / path.name)
    changed = []
    for row, selected, candidate, kind, metrics in choices:
        original = row['original']
        for folder_name, text, gender, source_clip in occurrences[original['sha256']]:
            assert text == row['text'] and gender == original['gender']
            assert source_clip['spokenText'] == original['spokenText'] and source_clip['voice'] == row['voice']
            target = OUTPUT / folder_name / source_clip['name']
            manifest_path = target.parent / 'manifest.json'
            manifest = json.loads(manifest_path.read_text())
            clip = manifest['clips'][text][gender]
            assert clip['sha256'] == (original['sha256'] if assembling else selected['sha256'])
            assert clip['name'] == target.name and clip['spokenText'] == original['spokenText']
            assert manifest['listeningReviewed'] is False and manifest.get('registered') is not True
            if assembling:
                shutil.copy2(candidate, target)
                clip['sha256'] = selected['sha256']
                clip['bytes'] = selected['bytes']
                clip['durationSeconds'] = selected['durationSeconds']
                manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
            assert sha(target.read_bytes()) == selected['sha256']
            changed.append({'file': str(target.relative_to(OUTPUT)), 'text': text, 'voice': row['voice'],
                            'originalSha256': original['sha256'], 'selectedSha256': selected['sha256'],
                            'selectedBytes': selected['bytes'], 'selectedDurationSeconds': selected['durationSeconds'],
                            'selectedFrom': str(candidate), 'selectionKind': kind, 'signal': metrics,
                            'listeningReviewed': False})
    changed_by_file = {row['file']: row for row in changed}
    assert len(changed_by_file) == len(changed) == 13
    for folder in lesson_dirs(SOURCE):
        source_manifest = json.loads((folder / 'manifest.json').read_text())
        expected_manifest = json.loads((folder / 'manifest.json').read_text())
        candidate_folder = OUTPUT / folder.name
        assert {p.name for p in folder.glob('*.mp3')} == {p.name for p in candidate_folder.glob('*.mp3')}
        for text, voices in expected_manifest['clips'].items():
            for gender, clip in voices.items():
                relative = f'{folder.name}/{clip["name"]}'
                change = changed_by_file.get(relative)
                if change:
                    assert change['text'] == text and change['voice'] == clip['voice']
                    assert change['originalSha256'] == clip['sha256']
                    clip['sha256'] = change['selectedSha256']
                    clip['bytes'] = change['selectedBytes']
                    clip['durationSeconds'] = change['selectedDurationSeconds']
        assert json.loads((candidate_folder / 'manifest.json').read_text()) == expected_manifest
        assert source_manifest['sourceSHA256'] == expected_manifest['sourceSHA256']
    repaired_report = course.verify(OUTPUT)
    assert repaired_report['lessons'] == 60 and repaired_report['recordedClipOccurrences'] == 2242
    assert repaired_report['listeningReviewedLessons'] == 0 and repaired_report['releaseReady'] is False
    assert repaired_report['sourceTextSHA256'] == original_report['sourceTextSHA256']
    signal = module('ja101_signal_repair_full', 'audit-japanese101-audio-signal.py')
    audit = signal.audit(OUTPUT)
    assert audit['occurrences'] == 2242 and audit['flaggedFiles'] == 0
    sheet_count, linked_clips = verify_sheets()
    assert len(changed) == 13 and len({row['file'] for row in changed}) == 13
    report = {'schema': 1, 'pairKey': 'Japanese:English', 'state': 'private-unreviewed-repaired-candidate',
              'sourceRepairPlanSha256': sha(PLAN.read_bytes()), 'originalCourseReport': original_report,
              'repairedCourseReport': repaired_report, 'repairedManifestSetSha256': audit['manifestSetSHA256'],
              'repairedClips': len(changed), 'signalFlaggedFiles': audit['flaggedFiles'],
              'listeningSheets': sheet_count, 'linkedClips': linked_clips,
              'listeningReviewed': False, 'registered': False, 'changes': changed}
    encoded = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if check:
        assert EVIDENCE.read_text() == encoded, 'Repair evidence changed'
    else:
        EVIDENCE.write_text(encoded)
    print(json.dumps({'repairedClips': len(changed), 'lessonFilesVerified': repaired_report['recordedClipOccurrences'],
                      'signalFlags': audit['flaggedFiles'], 'listeningReviewed': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
