#!/usr/bin/env python3
"""Build a deterministic, private Japanese Lunch audio scope; never synthesize."""
import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSE = ROOT / 'content/japanese-travel-lunch'
OUTPUT = COURSE / 'private-audio-scope.json'
VOICES = {'female': 'ja-JP-Chirp3-HD-Aoede', 'male': 'ja-JP-Chirp3-HD-Charon'}
STAGES = {'foundation': (10, 'foundation-travel-lunch'), 'core': (30, 'travel-lunch'), 'master': (20, 'master-travel-lunch')}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def normalized(text):
    return ' '.join(unicodedata.normalize('NFC', text).strip().split()).lower()


def spoken(text):
    return ''.join(unicodedata.normalize('NFC', text).split())


def collect():
    files = sorted(COURSE.glob('*-draft.json'))
    entries = {}
    stages = {stage: {'lessons': set(), 'keys': set(), 'occurrences': 0} for stage in STAGES}
    sources = {}
    lesson_ids = set()
    for path in files:
        match = re.fullmatch(r'(foundation|core|master)-(\d+)-(\d+)-draft\.json', path.name)
        if not match:
            raise ValueError(f'Unexpected draft: {path.name}')
        stage, first, last = match.group(1), int(match.group(2)), int(match.group(3))
        raw = path.read_bytes()
        sources[str(path.relative_to(ROOT))] = sha(raw)
        draft = json.loads(raw)
        if (draft['target'], draft['native']) != ('Japanese', 'English') or draft['reviewed'] is not False or draft['registered'] is not False or draft['audio'] != 'none':
            raise ValueError(f'Wrong pair or release state: {path.name}')
        if [lesson['n'] for lesson in draft['lessons']] != list(range(first, last + 1)):
            raise ValueError(f'Nonconsecutive lesson numbers: {path.name}')
        for lesson in draft['lessons']:
            n = lesson['n']
            lid = f'{STAGES[stage][1]}:{n}:ja-en'
            if lesson['stableId'] != lid or lid in lesson_ids:
                raise ValueError(f'Unstable or duplicate lesson ID: {lid}')
            lesson_ids.add(lid)
            stages[stage]['lessons'].add(n)
            occurrences = [
                *((f'card:{i}', card['ja']) for i, card in enumerate(lesson['cards'], 1)),
                *((f'reader:{i}', turn['ja']) for i, turn in enumerate(lesson['reader'], 1)),
                ('speaking:opening', lesson['speaking']['opening']),
                ('speaking:closure', lesson['speaking']['closure']),
            ]
            for ref, display in occurrences:
                key = normalized(display)
                speech = spoken(display)
                if not key or not speech:
                    raise ValueError(f'Empty audio text: {lid}:{ref}')
                entry = entries.setdefault(key, {'displayText': display, 'spokenText': speech, 'occurrences': []})
                if entry['spokenText'] != speech:
                    raise ValueError(f'Conflicting spoken text: {key}')
                entry['occurrences'].append(f'{lid}:{ref}')
                stages[stage]['keys'].add(key)
                stages[stage]['occurrences'] += 1
    for stage, (expected, _) in STAGES.items():
        if stages[stage]['lessons'] != set(range(1, expected + 1)):
            raise ValueError(f'Incomplete {stage} stage')
    if len(lesson_ids) != 60:
        raise ValueError('Not exactly 60 stable lessons')
    hear_activities = 0
    for side_path in sorted(COURSE.glob('private-mode-activities-*.json')):
        side = json.loads(side_path.read_text())
        source_path = ROOT / side['source']
        if (side['pairKey'] != 'Japanese:English' or side['reviewed'] is not False
                or side['registered'] is not False or side['audioListeningReviewed'] is not False
                or sources.get(side['source']) != side['sourceSha256']):
            raise ValueError(f'Wrong sidecar source or release state: {side_path.name}')
        if source_path.name not in {Path(path).name for path in sources}:
            raise ValueError(f'Unscoped activity source: {side_path.name}')
        for activity in side['activities']:
            if activity['mode'] == 'hear':
                hear_activities += 1
                if normalized(activity['modelJapanese']) not in entries or activity['readyForLearner'] is not False:
                    raise ValueError(f'Unscoped Hear activity: {activity["id"]}')
    if hear_activities != 60:
        raise ValueError(f'Expected one Hear activity per lesson, got {hear_activities}')
    ordered = dict(sorted(entries.items()))
    corpus = {key: value['spokenText'] for key, value in ordered.items()}
    character_count = sum(len(value) for value in corpus.values())
    report = {
        'schema': 1,
        'moduleId': 'travel-lunch',
        'targetLanguage': 'Japanese',
        'nativeLanguage': 'English',
        'locale': 'ja-JP',
        'provider': 'Google Cloud Chirp 3 HD',
        'voices': VOICES,
        'state': 'private-draft-audio-scope',
        'reviewed': False,
        'registered': False,
        'recordingsGenerated': False,
        'listeningReviewed': False,
        'sourceLessonFiles': sources,
        'stages': {stage: {'lessons': len(data['lessons']), 'uniqueTexts': len(data['keys']), 'textOccurrences': data['occurrences']} for stage, data in stages.items()},
        'lessonCount': len(lesson_ids),
        'uniqueTexts': len(ordered),
        'textOccurrences': sum(data['occurrences'] for data in stages.values()),
        'hearActivitiesCovered': hear_activities,
        'proposedTextVoicePairs': len(ordered) * len(VOICES),
        'spokenCharactersPerVoice': character_count,
        'spokenCharactersAllVoices': character_count * len(VOICES),
        'normalizedTextSHA256': sha(json.dumps(corpus, ensure_ascii=False, sort_keys=True).encode('utf-8')),
        'texts': ordered,
    }
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true', help='Fail if saved scope is missing or stale')
    args = parser.parse_args()
    encoded = json.dumps(collect(), ensure_ascii=False, indent=2) + '\n'
    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text() != encoded:
            raise SystemExit('Private audio scope is missing or stale')
    else:
        OUTPUT.write_text(encoded)
    report = json.loads(encoded)
    print(f"Japanese Lunch audio scope: {report['lessonCount']} lessons, {report['uniqueTexts']} unique texts, {report['textOccurrences']} occurrences, {report['proposedTextVoicePairs']} two-voice pairs, {report['spokenCharactersAllVoices']} proposed characters; no synthesis")
