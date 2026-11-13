#!/usr/bin/env python3
"""Fail if any Japanese Lunch learner speech surface lacks a pinned recording."""

import importlib.util
import json
import unicodedata
from collections import Counter
from pathlib import Path

COURSE = Path(__file__).resolve().parent


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def key(text):
    return ' '.join(unicodedata.normalize('NFC', text).strip().split()).lower()


def check():
    source = load(COURSE / 'build-private-audio-scope.py', 'japanese_lunch_audio_scope')
    scope = source.collect()
    assert json.loads((COURSE / 'private-audio-scope.json').read_text()) == scope
    runtime = json.loads((COURSE / 'private-runtime-candidate.json').read_text())
    evidence = json.loads((COURSE / 'private-course-audio-batch-evidence.json').read_text())
    assert runtime['pairKey'] == evidence['pairKey'] == 'Japanese:English'
    assert runtime['moduleId'] == scope['moduleId'] == 'travel-lunch'
    assert runtime['registration'] == 'disabled' and runtime['reviewed'] is False
    assert runtime['audioListeningReviewed'] is False
    assert evidence['registered'] is evidence['listeningReviewed'] is False
    assert evidence['technicallyCoveredPairs'] == scope['proposedTextVoicePairs']
    assert evidence['pairsNotSynthesized'] == 0 and evidence['technicallyCompleteLessons'] == 60
    assert evidence['signalFlaggedBatchClips'] == 0

    placements = Counter()
    missing = []
    lesson_ids = set()
    for lesson in runtime['lessons']:
        lesson_id = lesson['stableId']
        assert lesson_id not in lesson_ids
        lesson_ids.add(lesson_id)
        surfaces = {
            'card': [card['ja'] for card in lesson['cards']],
            'reader': [turn['ja'] for turn in lesson['reader']],
            'speaking-opening': [lesson['speaking']['opening']],
            'speaking-closure': [lesson['speaking']['closure']],
            'speaking-word-bank': lesson['speaking']['wordBank'],
            'mode-model': [mode['modelJapanese'] for mode in lesson['modes'].values()],
        }
        for surface, texts in surfaces.items():
            for text in texts:
                placements[surface] += 1
                if not isinstance(text, str) or key(text) not in scope['texts']:
                    missing.append(f'{lesson_id}:{surface}:{text!r}')
        stage, number, _ = lesson_id.split(':')
        assert evidence['lessonCoverage'][f'{stage}:{number}']['complete'] is True
    assert len(lesson_ids) == runtime['lessonCount'] == 60
    assert not missing, '\n'.join(missing)
    print(json.dumps({'lessons': len(lesson_ids), 'recordedPairs': evidence['technicallyCoveredPairs'],
                      'speechPlacements': dict(placements), 'missingPlacements': len(missing),
                      'listeningReviewed': False, 'registered': False}, sort_keys=True))


if __name__ == '__main__':
    check()
