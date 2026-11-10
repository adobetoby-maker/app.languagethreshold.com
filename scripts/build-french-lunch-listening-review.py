#!/usr/bin/env python3
"""Build private, hash-pinned listening sheets; do not approve recordings."""
import importlib.util
import json
from pathlib import Path

PRIVATE = Path('/Users/drive/lt-audio/french-travel-lunch')
HELPER = Path('/Users/drive/lt-audio/build-course-listening-review.py')


def main():
    spec = importlib.util.spec_from_file_location('listening_sheets', HELPER)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    verification = json.loads((PRIVATE / 'verification-report.json').read_text())
    if verification['lessons'] != 60 or verification['uniqueTextVoiceClips'] != 2654:
        raise ValueError('Course audio verification does not cover the pinned scope')
    output = PRIVATE / 'course-listening-review'
    output.mkdir(exist_ok=True)
    index = ['<!doctype html><html lang="en"><meta charset="utf-8">',
             '<title>French Lunch listening review</title>', helper.STYLE,
             '<h1>French Lunch · private 60-lesson listening review</h1>',
             '<p class="note">New private recordings await listening and flagged retakes. '
             'Earlier approval of other French or Japanese pilot recordings does not approve these clips. '
             'Exporting a worksheet does not change review or release status.</p>']
    total = 0
    for stage, count in (('foundation', 10), ('core', 30), ('master', 20)):
        index.append(f'<h2>{helper.h(stage.title())}</h2><ul>')
        for number in range(1, count + 1):
            source = PRIVATE / f'{stage}-{number}' / 'manifest.json'
            manifest = json.loads(source.read_text())
            if (manifest.get('courseId'), manifest.get('pairKey'), manifest.get('locale'),
                    manifest.get('listeningReviewed'), manifest.get('registered')) != (
                    'travel-lunch', 'French:English', 'fr-FR', False, False):
                raise ValueError(f'Wrong course, locale, or review state: {source}')
            name = f'{stage}-{number}.html'
            (output / name).write_text(helper.page('french-travel-lunch', 'French Lunch', stage, number, source, manifest))
            n = len(manifest['clips']) * 2
            total += n
            index.append(f'<li><a href="{name}">{helper.h(stage.title())} {number}</a> · '
                         f'{n} clips · manifest {helper.sha(source)[:12]}</li>')
        index.append('</ul>')
    if total != verification['manifestClipOccurrences']:
        raise ValueError('Worksheet coverage differs from verified manifests')
    index.append(f'<p>{total} clip placements across 60 lesson worksheets. '
                 f'{verification["uniqueTextVoiceClips"]} unique recordings.</p></html>')
    (output / 'index.html').write_text('\n'.join(index))
    print(json.dumps({'lessons': 60, 'clipPlacements': total,
                      'uniqueRecordings': verification['uniqueTextVoiceClips'],
                      'index': str(output / 'index.html')}))


if __name__ == '__main__':
    main()
