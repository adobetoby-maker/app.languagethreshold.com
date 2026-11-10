#!/usr/bin/env python3
"""Fail closed on exact English objectives and private Japanese Lunch Core links."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSE = ROOT / 'content/japanese-travel-lunch/core-16-18-draft.json'
ACTIVITIES = ROOT / 'content/japanese-travel-lunch/private-mode-activities-core-16-18.json'
MODES = {'see', 'recall', 'hear', 'type', 'say', 'write'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


draft = json.loads(COURSE.read_text())
mode_data = json.loads(ACTIVITIES.read_text())
map_path = ROOT / draft['source']['mapPath']
reader_path = ROOT / draft['source']['readerPath']
assert draft['source']['mapSha256'] == sha(map_path)
assert draft['source']['readerSha256'] == sha(reader_path)
assert draft['source']['sourceLessonNumbers'] == [16, 17, 18]
assert (draft['moduleId'], draft['stageId'], draft['target'], draft['native']) == ('travel-lunch', 'travel-lunch', 'Japanese', 'English')
assert draft['state'] == 'authored-draft-partial'
assert draft['reviewed'] is False and draft['registered'] is False and draft['audio'] == 'none'
assert len(draft['lessons']) == 3

map_text = map_path.read_text().split('id: "travel-lunch"', 1)[1]
source_goals = re.findall(r'lesson\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\s*,?\s*\)', map_text)[:30]
assert len(source_goals) == 30
reader = json.loads(reader_path.read_text())
assert reader['module'] == 'travel-lunch'
assert (reader['language'], reader['nativeLanguage']) == ('Spanish', 'English')
by_id = {}
for lesson, (title, skills, scenario) in zip(draft['lessons'], source_goals[15:18]):
    n = lesson['n']
    assert n in (16, 17, 18)
    assert lesson['stableId'] == f'travel-lunch:{n}:ja-en'
    assert (lesson['sourceEnglishTitle'], lesson['sourceEnglishSkills'], lesson['sourceEnglishScenario']) == (title, skills, scenario)
    original = reader['lessons'][str(n)]
    assert len(original['passage']['target']) == len(original['passage']['native']) >= 8
    assert len(lesson['cards']) >= 12 and len(lesson['reader']) >= 8
    assert all(c['ja'].strip() and c['en'].strip() for c in lesson['cards'])
    assert all(r['ja'].strip() and r['en'].strip() for r in lesson['reader'])
    assert all(lesson['speaking'][key].strip() for key in ('role', 'partnerRole', 'opening', 'goal', 'closure'))
    by_id[lesson['stableId']] = lesson
assert len(by_id) == 3

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
    assert activity['responseKind'] == ('open' if activity['mode'] in {'say', 'write'} else 'fixed')
    assert activity['recordedAudioRequired'] is (activity['mode'] == 'hear')
    assert activity['readyForLearner'] is False
for lid in by_id:
    rows = [a for a in mode_data['activities'] if a['lessonId'] == lid]
    assert {a['mode'] for a in rows} == MODES
    assert len({a['cueEnglish'] for a in rows}) == 6
    assert len({a['sourceRef'] for a in rows}) >= 5
print(f"Japanese Lunch C16–18: {len(by_id)} source-pinned lessons, {sum(len(l['cards']) for l in by_id.values())} cards, {sum(len(l['reader']) for l in by_id.values())} Reader lines, {len(mode_data['activities'])} distinct six-mode activities; release flags closed")
