#!/usr/bin/env python3
"""Verify cross-batch identity and structure of the private Japanese Lunch draft."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSE = ROOT / 'content/japanese-travel-lunch'
MODES = {'see', 'recall', 'hear', 'type', 'say', 'write'}
stages = {'foundation': {}, 'core': {}, 'master': {}}
all_ids = set()
all_activity_ids = set()
cards = readers = activities = 0
batches = 0


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


for path in sorted(COURSE.glob('*-draft.json')):
    match = re.fullmatch(r'(foundation|core|master)-(\d+)-(\d+)-draft\.json', path.name)
    assert match, f'unexpected course draft: {path.name}'
    stage, first, last = match.group(1), int(match.group(2)), int(match.group(3))
    draft = json.loads(path.read_text())
    side_path = COURSE / f'private-mode-activities-{stage}-{first}-{last}.json'
    side = json.loads(side_path.read_text())
    assert draft['reviewed'] is False and draft['registered'] is False and draft['audio'] == 'none'
    assert side['reviewed'] is False and side['registered'] is False and side['audioListeningReviewed'] is False
    assert side['pairKey'] == 'Japanese:English'
    assert side['source'] == str(path.relative_to(ROOT)) and side['sourceSha256'] == sha(path)
    assert draft['source']['sourceLessonNumbers'] == list(range(first, last + 1))
    assert [lesson['n'] for lesson in draft['lessons']] == list(range(first, last + 1))
    assert len(side['activities']) == 6 * len(draft['lessons'])
    by_id = {}
    for lesson in draft['lessons']:
        n = lesson['n']
        module = {'foundation': 'foundation-travel-lunch', 'core': 'travel-lunch', 'master': 'master-travel-lunch'}[stage]
        lid = f'{module}:{n}:ja-en'
        assert lesson['stableId'] == lid and lid not in all_ids
        assert n not in stages[stage]
        all_ids.add(lid)
        stages[stage][n] = lesson
        by_id[lid] = lesson
        minimum = (20, 14) if stage == 'master' else (12, 8)
        assert len(lesson['cards']) >= minimum[0] and len(lesson['reader']) >= minimum[1]
        assert all(lesson['speaking'][field].strip() for field in ('role', 'partnerRole', 'opening', 'goal', 'closure'))
        cards += len(lesson['cards'])
        readers += len(lesson['reader'])
    mode_by_lesson = {lid: set() for lid in by_id}
    for activity in side['activities']:
        lid, mode = activity['lessonId'], activity['mode']
        assert lid in by_id and mode in MODES
        assert activity['id'] == f'{lid}:{mode}:private-1' and activity['id'] not in all_activity_ids
        all_activity_ids.add(activity['id'])
        assert mode not in mode_by_lesson[lid]
        mode_by_lesson[lid].add(mode)
        prefix = lid + ':card:'
        assert activity['sourceRef'].startswith(prefix)
        index = int(activity['sourceRef'][len(prefix):]) - 1
        card = by_id[lid]['cards'][index]
        assert (activity['modelJapanese'], activity['modelEnglish']) == (card['ja'], card['en'])
        assert activity['readyForLearner'] is False
        assert activity['recordedAudioRequired'] is (mode == 'hear')
        activities += 1
    assert all(modes == MODES for modes in mode_by_lesson.values())
    batches += 1

assert sorted(stages['foundation']) == list(range(1, 11))
assert sorted(stages['core']) == list(range(1, 31))
assert sorted(stages['master']) == list(range(1, 16))
assert batches == 18 and len(all_ids) == 55 and (cards, readers, activities) == (978, 669, 330)
print(f'Japanese Lunch private F10/C30/M15: {batches} batches, {len(all_ids)} unique lessons, {cards} cards, {readers} Reader turns, {activities} six-mode activities; release flags closed')
