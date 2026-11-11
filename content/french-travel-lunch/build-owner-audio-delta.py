#!/usr/bin/env python3
"""Pin missing private French Lunch speech strings from the corrected owner draft."""
import argparse
import hashlib
import json
import unicodedata
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUTPUT = HERE / 'owner-audio-delta.json'
PRIVATE = Path('/Users/drive/lt-audio/french-travel-lunch')
DELTA_PRIVATE = PRIVATE / 'owner-delta-2026-11-11'
FILES = (['foundation-1-3-draft.json', 'foundation-4-10-draft.json'] +
         [f'core-{n}-{n+4}-draft.json' for n in (1, 6, 11, 16, 21, 26)] +
         [f'master-{n}-{n+4}-draft.json' for n in (1, 6, 11, 16)])
VOICES = {'female': 'fr-FR-Chirp3-HD-Aoede', 'male': 'fr-FR-Chirp3-HD-Charon'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def exact(text):
    if not isinstance(text, str):
        raise ValueError('Speech text must be a string')
    value = ' '.join(unicodedata.normalize('NFC', text).split())
    if not value:
        raise ValueError('Empty speech text')
    return value


def current():
    placements = defaultdict(list)
    sources = {}
    lesson_ids = []
    for name in FILES:
        raw = (HERE / name).read_bytes()
        draft = json.loads(raw)
        sources[name] = sha(raw)
        if (draft['pairKey'], draft['locale'], draft['reviewed'], draft['registered'],
            draft['readyForLearner'], draft['audio']) != ('French:English', 'fr-FR', False, False, False, 'none'):
            raise ValueError(f'{name}: release gate or pair changed')
        for lesson in draft['lessons']:
            lid = lesson['stableId']
            if lesson['reviewed'] is not False or not lid.endswith(':fr-en'):
                raise ValueError(f'{lid}: review gate or stable ID changed')
            lesson_ids.append(lid)
            for surface in ('cards', 'reader'):
                for index, item in enumerate(lesson[surface], 1):
                    if not item.get('en'):
                        raise ValueError(f'{lid}: {surface} English pair missing')
                    placements[exact(item['fr'])].append({'lessonId': lid, 'surface': surface, 'index': index})
            for surface in ('opening', 'closure'):
                placements[exact(lesson['speaking'][surface])].append({'lessonId': lid, 'surface': f'speaking-{surface}'})
    expected = ([f'foundation-travel-lunch:{n}:fr-en' for n in range(1, 11)] +
                [f'core-travel-lunch:{n}:fr-en' for n in range(1, 31)] +
                [f'master-travel-lunch:{n}:fr-en' for n in range(1, 21)])
    if lesson_ids != expected:
        raise ValueError('60 lesson IDs or order changed')
    return placements, sources, lesson_ids


def build():
    placements, sources, ids = current()
    old = set()
    old_hashes = {}
    for path in sorted(PRIVATE.glob('*/manifest.json')):
        if path.parent == DELTA_PRIVATE:
            continue
        manifest = json.loads(path.read_bytes())
        if (manifest.get('pairKey'), manifest.get('locale'), manifest.get('registered')) != ('French:English', 'fr-FR', False):
            continue
        old_hashes[str(path.relative_to(PRIVATE))] = sha(path.read_bytes())
        old.update(exact(row['spokenText']) for row in manifest.get('clips', {}).values()
                   if isinstance(row, dict) and 'spokenText' in row)
    if len(old_hashes) < 60:
        raise ValueError('Expected private 60-lesson audio baseline is missing')
    missing = sorted(set(placements) - old)
    texts = [{'displayText': text, 'spokenText': text, 'textSHA256': sha(text.encode()),
              'placements': placements[text]} for text in missing]
    return {'schema': 1, 'courseId': 'travel-lunch', 'pairKey': 'French:English',
            'locale': 'fr-FR', 'voices': VOICES, 'sourceSHA256': sources,
            'lessonIds': ids, 'oldManifestSHA256': old_hashes,
            'currentUniqueTexts': len(placements), 'oldUniqueTexts': len(old),
            'newUniqueTexts': len(texts), 'proposedClips': 2 * len(texts),
            'submittedCharacters': 2 * sum(len(text) for text in missing),
            'texts': texts, 'recordingsBundled': False, 'listeningReviewed': False, 'registered': False}


def verify(scope):
    placements, sources, ids = current()
    if (scope['sourceSHA256'], scope['lessonIds'], scope['newUniqueTexts'],
        scope['proposedClips'], scope['recordingsBundled'], scope['listeningReviewed'],
        scope['registered']) != (sources, ids, len(scope['texts']), 2 * len(scope['texts']), False, False, False):
        raise ValueError('Pinned owner audio scope identity or release gate differs')
    for row in scope['texts']:
        text = row['spokenText']
        if (row['displayText'], row['textSHA256'], row['placements']) != (text, sha(text.encode()), placements[text]):
            raise ValueError(f'Pinned audio text or placement changed: {text}')
    if len({row['textSHA256'] for row in scope['texts']}) != len(scope['texts']):
        raise ValueError('Repeated pinned speech text')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    if args.write:
        scope = build(); verify(scope)
        OUTPUT.write_text(json.dumps(scope, ensure_ascii=False, indent=2) + '\n')
    else:
        scope = json.loads(OUTPUT.read_text()); verify(scope)
    print(json.dumps({k: scope[k] for k in ('currentUniqueTexts', 'oldUniqueTexts', 'newUniqueTexts', 'proposedClips', 'submittedCharacters')}))
