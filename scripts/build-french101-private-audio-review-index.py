#!/usr/bin/env python3
"""Verify private French 101 audio files and build one listening-review index."""

import argparse
import hashlib
import html
import json
from pathlib import Path
from urllib.parse import quote

DEFAULT_ROOT = Path('/Users/drive/lt-audio/french-101')
REPO = Path(__file__).resolve().parents[1]
EXPECTED = {'foundation': (10, 'foundation-french-basics'),
            'core': (30, 'french-basics'), 'master': (20, 'master-french-basics')}
FIXTURES = {'foundation': 'private-runtime-foundation-1-10.json',
            'core': 'private-runtime-core-1-30.json',
            'master': 'private-runtime-master-1-20.json'}


def fixture_hash(name):
    return hashlib.sha256((REPO / 'content/french-basics' / name).read_bytes()).hexdigest()


def verify_clip_set(folder, manifest):
    clips = manifest['clips']
    if not isinstance(clips, dict) or not clips:
        raise ValueError(f'{folder}: no clips')
    reviewed = 0
    for clip_key, clip in clips.items():
        voices = clip['voices'] if 'voices' in clip else clip
        if set(voices) != {'female', 'male'}:
            raise ValueError(f'{folder}:{clip_key}: missing voice')
        for gender, voice in voices.items():
            if voice.get('voice') != f"fr-FR-Chirp3-HD-{'Aoede' if gender == 'female' else 'Charon'}" or voice.get('locale') != 'fr-FR':
                raise ValueError(f'{folder}:{clip_key}: wrong voice or locale')
            file = folder / voice['name']
            if not file.is_file() or file.stat().st_size != voice['bytes']:
                raise ValueError(f'{file}: missing file or wrong size')
            if hashlib.sha256(file.read_bytes()).hexdigest() != voice['sha256']:
                raise ValueError(f'{file}: wrong hash')
            if not voice.get('spokenText') and not voice.get('text'):
                raise ValueError(f'{file}: missing spoken text')
            if voice.get('durationSeconds', 0) <= 0:
                raise ValueError(f'{file}: invalid duration')
            reviewed += voice.get('listeningReviewed') is True
    return len(clips), len(clips) * 2, reviewed


def load_scope(root, stage, number):
    name = f'{stage}-{number}'
    if stage == 'foundation' and number == 1:
        name += '-complete'
    folder = root / name
    manifest_path = folder / 'manifest.json'
    raw = manifest_path.read_bytes()
    data = json.loads(raw)
    if data.get('pairKey') != 'French:English' or data.get('locale') != 'fr-FR':
        raise ValueError(f'{name}: wrong pair or locale')
    count, module = EXPECTED[stage]
    if data.get('scope') != {'stage': stage, 'lesson': number, 'module': module} or number > count:
        raise ValueError(f'{name}: wrong scope or stable module')
    if data.get('sourceFixtureSha256') != fixture_hash(FIXTURES[stage]):
        raise ValueError(f'{name}: audio source fixture changed')
    if data.get('registered') is not False:
        raise ValueError(f'{name}: private recording unexpectedly registered')
    clips, voices, accepted = verify_clip_set(folder, data)
    if data.get('listeningReviewed') is True and accepted != voices:
        raise ValueError(f'{name}: manifest approval exceeds per-voice review')
    reviews = sorted(folder.glob('listening-review-*.html'))
    if len(reviews) != 1:
        raise ValueError(f'{name}: expected one listening worksheet')
    return {'name': name, 'stage': stage, 'number': number, 'clips': clips,
            'voices': voices, 'acceptedVoices': accepted,
            'listeningReviewed': data.get('listeningReviewed') is True,
            'manifestSha256': hashlib.sha256(raw).hexdigest(),
            'worksheet': str(reviews[0].relative_to(root))}


def build(root):
    rows = [load_scope(root, stage, n)
            for stage, (count, _) in EXPECTED.items() for n in range(1, count + 1)]
    gap_folder = root / 'form-practice-gap'
    gap_data = json.loads((gap_folder / 'manifest.json').read_bytes())
    if gap_data.get('pairKey') != 'French:English' or gap_data.get('scope') != 'private-form-practice-gap' or gap_data.get('registered') is not False:
        raise ValueError('Form-practice gap has wrong pair, scope, or registration')
    expected_gap = gap_data.get('fixtureSHA256', {})
    if not isinstance(expected_gap, dict) or len(expected_gap) != 8:
        raise ValueError('Form-practice gap fixture set changed')
    for name, digest in expected_gap.items():
        if not name.startswith('private-form-practice-') or digest != fixture_hash(name):
            raise ValueError(f'Form-practice gap source changed: {name}')
    gap_clips, gap_voices, gap_accepted = verify_clip_set(gap_folder, gap_data)
    if gap_data.get('listeningReviewed') is True and gap_accepted != gap_voices:
        raise ValueError('Form-practice gap approval exceeds per-voice review')
    gap_sheet = gap_folder / 'listening-review-2026-11-09.html'
    if not gap_sheet.is_file():
        raise ValueError('Form-practice gap worksheet missing')
    return rows, (gap_clips, gap_voices, gap_accepted, str(gap_sheet.relative_to(root)))


def render(root, rows, gap):
    lesson_clips = sum(row['clips'] for row in rows)
    lesson_voices = sum(row['voices'] for row in rows)
    accepted_lessons = sum(row['listeningReviewed'] for row in rows)
    parts = ['<!doctype html><html lang="en"><meta charset="utf-8">',
             '<meta name="viewport" content="width=device-width,initial-scale=1">',
             '<title>French 101 private audio review</title>',
             '<style>body{font:16px system-ui;max-width:900px;margin:auto;padding:24px;line-height:1.5}'
             'table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid #ccc;text-align:left}'
             'a{color:#154e9d}small{color:#555}</style>',
             '<h1>French 101 private audio review</h1>',
             f'<p>{len(rows)} lesson manifests, {lesson_clips} unique strings, {lesson_voices} voice files; '
             f'{accepted_lessons} full lessons listening-approved. Separate form gap: {gap[0]} strings, '
             f'{gap[1]} voice files, {gap[2]} individual clips approved.</p>',
             '<p>Pilot approval applies only to the earlier pilot clips. Full-lesson and form-gap approval must be recorded separately. '
             'Retake and level candidates are not installed replacements.</p>',
             f'<p><a href="{quote(gap[3])}">Review the form-practice gap</a> · '
             '<a href="signal-retakes-all-2026-11-09/review.html">Review retake candidates</a> · '
             '<a href="signal-level-all-2026-11-09/review.html">Review level candidates</a></p>',
             '<table><thead><tr><th>Stage</th><th>Lesson</th><th>Strings</th><th>Voice clips</th><th>Listening</th><th>Worksheet</th></tr></thead><tbody>']
    for row in rows:
        status = 'approved' if row['listeningReviewed'] else f"pending ({row['acceptedVoices']}/{row['voices']} clips)"
        parts.append('<tr>' + ''.join(f'<td>{html.escape(str(value))}</td>' for value in
                     (row['stage'].title(), row['number'], row['clips'], row['voices'], status)) +
                     f'<td><a href="{quote(row["worksheet"])}">Listen</a></td></tr>')
    parts.append('</tbody></table><small>Generated from local private manifests and verified file hashes. '
                 'No course publication or listening acceptance is implied.</small></html>')
    return '\n'.join(parts) + '\n'


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=DEFAULT_ROOT)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    rows, gap = build(args.root)
    output = args.root / 'full-course-review-index-2026-11-09.html'
    text = render(args.root, rows, gap)
    if args.check:
        if not output.is_file() or output.read_text() != text:
            raise SystemExit('French 101 private review index needs regeneration')
    else:
        output.write_text(text)
    print(f'French 101 private audio: {len(rows)} lessons, {sum(r["clips"] for r in rows)} strings, {gap[0]} form-gap strings')
