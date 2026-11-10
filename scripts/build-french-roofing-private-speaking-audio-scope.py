#!/usr/bin/env python3
"""Inventory fixed French Roofing speaking openings without synthesizing or approving."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'content/french-roofing/private-runtime-candidate.json'
OUTPUT = ROOT / 'content/french-roofing/private-speaking-openings-audio-scope-fr-en.json'
VOICES = {'female': 'fr-FR-Chirp3-HD-Aoede', 'male': 'fr-FR-Chirp3-HD-Charon'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build():
    raw = SOURCE.read_bytes()
    fixture = json.loads(raw)
    if (fixture['moduleId'], fixture['targetLanguage'], fixture['nativeLanguage']) != ('roofing', 'French', 'English'):
        raise ValueError('Wrong fixture language pair')
    gate = fixture['releaseGate']
    if any(gate.values()) or fixture['stageCounts'] != {'foundation': 10, 'core': 30, 'master': 20} or fixture['lessonCount'] != 60:
        raise ValueError('Unexpected release gate or lesson count')
    rows = []
    deferred = []
    ids = set()
    for lesson in fixture['lessons']:
        key = lesson['draftLessonKey']
        if key in ids or lesson['reviewed'] is not False or lesson['registered'] is not False:
            raise ValueError(f'Wrong lesson identity or review state: {key}')
        ids.add(key)
        text = lesson['speakingOpeningFrench'].strip()
        if not text:
            raise ValueError(f'Empty speaking opening: {key}')
        record = {'draftLessonKey': key, 'displayText': text, 'textSha256': sha(text.encode()), 'sourceField': 'speakingOpeningFrench', 'textReviewed': False, 'listeningReviewed': False, 'registered': False}
        if '___' in text:
            record['reason'] = 'Blank and embedded English terms require a fixed French recording script'
            deferred.append(record)
        else:
            record['proposedSpokenText'] = text
            rows.append(record)
    if len(ids) != 60 or len(rows) != 59 or [item['draftLessonKey'] for item in deferred] != ['foundation:1']:
        raise ValueError('Speaking-opening scope changed; inspect before synthesis')
    if len({item['proposedSpokenText'] for item in rows}) != len(rows):
        raise ValueError('Duplicate speaking opening needs a shared-text decision')
    characters = sum(len(item['proposedSpokenText']) for item in rows)
    return {'schema': 1, 'moduleId': 'roofing', 'pairKey': 'French:English', 'locale': 'fr-FR', 'voices': VOICES, 'sourceFixturePath': str(SOURCE.relative_to(ROOT)), 'sourceFixtureSha256': sha(raw), 'state': 'private-unreviewed-speaking-audio-scope', 'recordingsGenerated': False, 'textReviewed': False, 'listeningReviewed': False, 'registered': False, 'lessonCount': 60, 'fixedCandidateOpenings': len(rows), 'deferredOpenings': len(deferred), 'proposedClips': len(rows)*len(VOICES), 'proposedCharactersPerVoice': characters, 'proposedCharactersAllVoices': characters*len(VOICES), 'rows': rows, 'deferred': deferred}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    report = build()
    encoded = json.dumps(report, ensure_ascii=False, indent=2)+'\n'
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text() != encoded:
            raise SystemExit('French Roofing speaking audio scope is missing or stale')
    else:
        OUTPUT.write_text(encoded)
    print(f"French Roofing speaking audio scope: {report['fixedCandidateOpenings']} fixed candidates, {report['deferredOpenings']} deferred, {report['proposedClips']} proposed clips, {report['proposedCharactersAllVoices']} proposed characters; no synthesis")
