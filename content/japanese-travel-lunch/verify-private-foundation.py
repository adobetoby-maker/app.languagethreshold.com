#!/usr/bin/env python3
"""Fail closed on source identity, pair, and authored links in private Foundation batches."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'content/japanese-travel-lunch'
MODES = {'see', 'recall', 'hear', 'type', 'say', 'write'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


lesson_ids = set()
total_cards = total_reader = total_activities = 0
for start, end in ((1, 3), (4, 6)):
    course = DIR / f'foundation-{start}-{end}-draft.json'
    activities_path = DIR / f'private-mode-activities-foundation-{start}-{end}.json'
    draft = json.loads(course.read_text())
    mode_data = json.loads(activities_path.read_text())
    source_path = ROOT / draft['source']['curriculumPath']
    source = json.loads(source_path.read_text())
    assert draft['source']['curriculumSha256'] == sha(source_path)
    assert draft['source']['sourceLessonNumbers'] == list(range(start, end + 1))
    assert (draft['moduleId'], draft['stageId'], draft['target'], draft['native']) == ('travel-lunch', 'foundation-travel-lunch', 'Japanese', 'English')
    assert draft['state'] == 'authored-draft-partial'
    assert draft['reviewed'] is False and draft['registered'] is False and draft['audio'] == 'none'
    assert len(draft['lessons']) == end - start + 1
    by_id = {}
    for lesson, src in zip(draft['lessons'], source['lessons'][start - 1:end]):
        assert lesson['n'] == src['n']
        assert lesson['stableId'] == f"foundation-travel-lunch:{lesson['n']}:ja-en"
        assert lesson['stableId'] not in lesson_ids
        lesson_ids.add(lesson['stableId'])
        assert lesson['sourceEnglishObjective'] == src['objective']
        assert lesson['sourceObjectiveSha256'] == hashlib.sha256(src['objective'].encode()).hexdigest()
        assert len(lesson['cards']) >= 12 and len(lesson['reader']) >= 8
        assert all(c['ja'].strip() and c['en'].strip() for c in lesson['cards'])
        assert all(r['ja'].strip() and r['en'].strip() for r in lesson['reader'])
        assert all(lesson['speaking'][key].strip() for key in ('role', 'partnerRole', 'opening', 'goal', 'closure'))
        by_id[lesson['stableId']] = lesson
        total_cards += len(lesson['cards'])
        total_reader += len(lesson['reader'])
    assert mode_data['pairKey'] == 'Japanese:English'
    assert mode_data['source'] == str(course.relative_to(ROOT))
    assert mode_data['sourceSha256'] == sha(course)
    assert mode_data['reviewed'] is False and mode_data['registered'] is False
    assert mode_data['audioListeningReviewed'] is False
    assert len(mode_data['activities']) == 6 * len(by_id)
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
    total_activities += len(mode_data['activities'])

assert len(lesson_ids) == 6
print(f'Japanese Lunch F1–6: {len(lesson_ids)} source-pinned lessons, {total_cards} cards, {total_reader} Reader lines, {total_activities} distinct six-mode activities; release flags closed')
