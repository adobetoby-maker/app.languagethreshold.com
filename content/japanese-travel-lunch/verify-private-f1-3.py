#!/usr/bin/env python3
"""Fail closed on source, pair, and authored activity links for this private draft."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSE = ROOT / 'content/japanese-travel-lunch/foundation-1-3-draft.json'
ACTIVITIES = ROOT / 'content/japanese-travel-lunch/private-mode-activities-foundation-1-3.json'
MODES = {'see', 'recall', 'hear', 'type', 'say', 'write'}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

draft = json.loads(COURSE.read_text())
mode_data = json.loads(ACTIVITIES.read_text())
source_path = ROOT / draft['source']['curriculumPath']
source = json.loads(source_path.read_text())
assert draft['source']['curriculumSha256'] == sha(source_path)
assert draft['source']['sourceLessonNumbers'] == [1, 2, 3]
assert (draft['stageId'], draft['target'], draft['native']) == ('foundation-travel-lunch', 'Japanese', 'English')
assert draft['state'] == 'authored-draft-partial'
assert draft['reviewed'] is False and draft['registered'] is False and draft['audio'] == 'none'
assert len(draft['lessons']) == 3
by_id = {}
for lesson, src in zip(draft['lessons'], source['lessons'][:3]):
    assert lesson['n'] == src['n']
    assert lesson['stableId'] == f"foundation-travel-lunch:{lesson['n']}:ja-en"
    assert lesson['sourceEnglishObjective'] == src['objective']
    assert lesson['sourceObjectiveSha256'] == hashlib.sha256(src['objective'].encode()).hexdigest()
    assert len(lesson['cards']) >= 12 and len(lesson['reader']) >= 8
    assert all(c['ja'].strip() and c['en'].strip() for c in lesson['cards'])
    assert all(r['ja'].strip() and r['en'].strip() for r in lesson['reader'])
    assert all(lesson['speaking'][key].strip() for key in ('role', 'partnerRole', 'opening', 'goal', 'closure'))
    by_id[lesson['stableId']] = lesson
assert mode_data['pairKey'] == 'Japanese:English'
assert mode_data['source'] == str(COURSE.relative_to(ROOT))
assert mode_data['sourceSha256'] == sha(COURSE)
assert mode_data['reviewed'] is False and mode_data['registered'] is False
assert mode_data['audioListeningReviewed'] is False
assert len(mode_data['activities']) == 18
seen = set()
for activity in mode_data['activities']:
    lesson = by_id[activity['lessonId']]
    assert activity['mode'] in MODES
    assert activity['id'] == f"{activity['lessonId']}:{activity['mode']}:private-1"
    assert (activity['lessonId'], activity['mode']) not in seen
    seen.add((activity['lessonId'], activity['mode']))
    prefix = activity['lessonId'] + ':card:'
    assert activity['sourceRef'].startswith(prefix)
    card = lesson['cards'][int(activity['sourceRef'][len(prefix):]) - 1]
    assert (activity['modelJapanese'], activity['modelEnglish']) == (card['ja'], card['en'])
    assert activity['recordedAudioRequired'] is (activity['mode'] == 'hear')
    assert activity['readyForLearner'] is False
assert all({mode for lesson_id, mode in seen if lesson_id == lid} == MODES for lid in by_id)
for lid in by_id:
    lesson_activities = [a for a in mode_data['activities'] if a['lessonId'] == lid]
    assert len({a['cueEnglish'] for a in lesson_activities}) == 6
    assert len({a['sourceRef'] for a in lesson_activities}) >= 5
    assert all(a['responseKind'] == ('open' if a['mode'] in {'say', 'write'} else 'fixed') for a in lesson_activities)
print('Japanese Lunch F1–3: 3 source-pinned lessons, 41 cards, 28 Reader lines, 18 six-mode activities; release flags closed')
