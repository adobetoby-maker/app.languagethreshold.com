#!/usr/bin/env python3
"""Check 10/30/20 private inputs remain contiguous, pair-safe and unpublished."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/japanese-construction-foreman'
foundation = json.loads((CONTENT / 'foundation-runtime-draft-ja-en.json').read_text())
core_ranges = [(i, i + 2) for i in range(1, 31, 3)]
master_ranges = [(1,3),(4,6),(7,9),(10,12),(13,15),(16,18),(19,20)]
core = [json.loads((CONTENT / f'core-runtime-pilot-{a}-{b}-ja-en.json').read_text()) for a,b in core_ranges]
master = [json.loads((CONTENT / f'master-runtime-pilot-{a}-{b}-ja-en.json').read_text()) for a,b in master_ranges]
stages = [('foundation',[foundation],10,'foundation-construction-foreman-ja-en'),
          ('core',core,30,'construction-foreman-ja-en'),
          ('master',master,20,'master-construction-foreman-ja-en')]
all_ids = set()
for stage, parts, count, course_id in stages:
    lessons = [lesson for part in parts for lesson in part['lessons']]
    assert [lesson['n'] for lesson in lessons] == list(range(1,count+1)), stage
    assert all(part['courseId'] == course_id and part['pairKey'] == 'Japanese:English' and
               part['target'] == 'Japanese' and part['native'] == 'English' and
               part['state'] == 'private-runtime-draft' and part['reviewed'] is False for part in parts), stage
    assert all(lesson['id'] == f'{course_id}:lesson:{lesson["n"]}' and
               lesson['modes'] == ['see','recall','hear','type','say','write'] and
               lesson['reviewed'] is False for lesson in lessons), stage
    assert all(lesson['speaking']['locale'] == 'ja-JP' and lesson['reader']['sentences'] and
               len(lesson['checks']) >= 3 for lesson in lessons), stage
    stage_ids = {lesson['id'] for lesson in lessons}
    assert len(stage_ids) == count and not (stage_ids & all_ids), stage
    all_ids |= stage_ids
    assert all(card['courseId'] == course_id for part in parts for card in part['cards'] + part['dictionary']), stage
assert len(all_ids) == 60
assert master[0]['lessons'][1]['technicalSourceBlockers'], 'Master 2 concrete concern must remain explicit'
manifest = (ROOT / 'src/data/core60/manifest.ts').read_text()
for _,_,_,course_id in stages:
    assert course_id not in manifest, course_id
print('Japanese Foreman 10/30/20 private-input coverage and isolation checks passed; no runtime release asserted')
