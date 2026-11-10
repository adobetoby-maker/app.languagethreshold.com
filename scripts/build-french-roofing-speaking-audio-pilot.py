#!/usr/bin/env python3
"""Pin five unreviewed French Roofing speaking openings for a private audio pilot."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'content/french-roofing/private-speaking-openings-audio-scope-fr-en.json'
OUTPUT = ROOT / 'content/french-roofing/private-speaking-audio-pilot-fr-en.json'
KEYS = ('foundation:2', 'foundation:3', 'foundation:4', 'foundation:6', 'foundation:7')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build():
    source_raw = SOURCE.read_bytes()
    source = json.loads(source_raw)
    if (source['pairKey'], source['locale'], source['fixedCandidateOpenings']) != ('French:English', 'fr-FR', 59):
        raise ValueError('Wrong speaking scope')
    if source['textReviewed'] is not False or source['listeningReviewed'] is not False or source['recordingsGenerated'] is not False:
        raise ValueError('Unexpected source review state')
    by_key = {row['draftLessonKey']: row for row in source['rows']}
    rows = []
    for key in KEYS:
        row = by_key[key]
        if row['textReviewed'] is not False or row['listeningReviewed'] is not False or row['registered'] is not False:
            raise ValueError(f'Unexpected row review state: {key}')
        text = row['proposedSpokenText']
        if text != row['displayText'] or sha(text.encode()) != row['textSha256']:
            raise ValueError(f'Changed source text: {key}')
        rows.append({'lessonKey': key, 'text': text, 'sha256': row['textSha256'], 'textReviewed': False})
    aggregate = sha('\n'.join(row['text'] for row in rows).encode())
    return {'schema': 1, 'moduleId': 'roofing', 'pairKey': 'French:English', 'locale': 'fr-FR', 'state': 'private-audio-pilot-unsynthesized', 'reviewed': False, 'registered': False, 'sourceSpeakingScopePath': str(SOURCE.relative_to(ROOT)), 'sourceSpeakingScopeSha256': sha(source_raw), 'sourceFixtureSha256': source['sourceFixtureSha256'], 'selectedLessonKeys': list(KEYS), 'counts': {'uniqueExactTexts': 5, 'proposedClips': 10, 'proposedCharacters': sum(len(row['text']) for row in rows)*2}, 'exactTextSha256': aggregate, 'texts': rows}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    report = build()
    encoded = json.dumps(report, ensure_ascii=False, indent=2)+'\n'
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text() != encoded:
            raise SystemExit('Private speaking pilot inventory is missing or stale')
    else:
        OUTPUT.write_text(encoded)
    print(f"French Roofing speaking pilot: {report['counts']['uniqueExactTexts']} source-pinned openings, {report['counts']['proposedClips']} proposed clips, {report['counts']['proposedCharacters']} characters; no synthesis")
