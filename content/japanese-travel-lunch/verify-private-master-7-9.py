#!/usr/bin/env python3
"""Verify exact source goals and private Japanese Lunch Master 7–9 links."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSE = ROOT / 'content/japanese-travel-lunch/master-7-9-draft.json'
ACTIVITIES = ROOT / 'content/japanese-travel-lunch/private-mode-activities-master-7-9.json'
MODES = {'see', 'recall', 'hear', 'type', 'say', 'write'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


draft = json.loads(COURSE.read_text())
side = json.loads(ACTIVITIES.read_text())
source = draft['source']
curriculum_path = ROOT / source['curriculumPath']
reader_path = ROOT / source['readerPath']
assert source['curriculumSha256'] == sha(curriculum_path)
assert source['readerSha256'] == sha(reader_path)
assert source['sourceLessonNumbers'] == [7, 8, 9]
assert (draft['moduleId'], draft['stageId'], draft['target'], draft['native']) == ('travel-lunch', 'master-travel-lunch', 'Japanese', 'English')
assert draft['state'] == 'authored-draft-partial'
assert draft['reviewed'] is False and draft['registered'] is False and draft['audio'] == 'none'
curriculum = json.loads(curriculum_path.read_text())
reader = json.loads(reader_path.read_text())
assert curriculum['module'] == 'master-travel-lunch' and reader['module'] == 'master-travel-lunch'
assert (curriculum['language'], curriculum['nativeLanguage']) == ('Spanish', 'English')
assert (reader['language'], reader['nativeLanguage']) == ('Spanish', 'English')
assert len(curriculum['lessons']) == 20 and len(reader['lessons']) == 20
assert len(draft['lessons']) == 3
by_id = {}
for lesson in draft['lessons']:
    n = lesson['n']
    assert n in (7, 8, 9)
    assert lesson['stableId'] == f'master-travel-lunch:{n}:ja-en'
    original = curriculum['lessons'][n - 1]
    assert (lesson['sourceEnglishTitle'], lesson['sourceEnglishObjective']) == (original['title'], original['objective'])
    passage = reader['lessons'][str(n)]['passage']
    assert len(passage['target']) == len(passage['native']) >= 14
    assert len(lesson['cards']) >= 20 and len(lesson['reader']) >= 14
    assert all(c['ja'].strip() and c['en'].strip() for c in lesson['cards'])
    assert all(r['ja'].strip() and r['en'].strip() for r in lesson['reader'])
    assert all(lesson['speaking'][key].strip() for key in ('role', 'partnerRole', 'opening', 'goal', 'closure'))
    by_id[lesson['stableId']] = lesson
assert len(by_id) == 3

assert side['pairKey'] == 'Japanese:English'
assert side['source'] == str(COURSE.relative_to(ROOT)) and side['sourceSha256'] == sha(COURSE)
assert side['reviewed'] is False and side['registered'] is False and side['audioListeningReviewed'] is False
assert len(side['activities']) == 18
seen = set()
for activity in side['activities']:
    lesson = by_id[activity['lessonId']]
    assert activity['mode'] in MODES
    assert activity['id'] == f"{activity['lessonId']}:{activity['mode']}:private-1"
    assert (activity['lessonId'], activity['mode']) not in seen
    seen.add((activity['lessonId'], activity['mode']))
    prefix = activity['lessonId'] + ':card:'
    assert activity['sourceRef'].startswith(prefix)
    card = lesson['cards'][int(activity['sourceRef'][len(prefix):]) - 1]
    assert (activity['modelJapanese'], activity['modelEnglish']) == (card['ja'], card['en'])
    assert activity['responseKind'] == ('open' if activity['mode'] in {'say', 'write'} else 'fixed')
    assert activity['recordedAudioRequired'] is (activity['mode'] == 'hear')
    assert activity['readyForLearner'] is False
for lid in by_id:
    rows = [a for a in side['activities'] if a['lessonId'] == lid]
    assert {a['mode'] for a in rows} == MODES
    assert len({a['cueEnglish'] for a in rows}) == 6
    assert len({a['sourceRef'] for a in rows}) >= 5
print(f"Japanese Lunch M7–9: {len(by_id)} source-pinned lessons, {sum(len(l['cards']) for l in by_id.values())} cards, {sum(len(l['reader']) for l in by_id.values())} Reader turns, {len(side['activities'])} six-mode activities; release flags closed")
