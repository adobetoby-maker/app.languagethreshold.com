#!/usr/bin/env python3
"""Run all French 101 redesigned Master draft gates and check 20-slot coverage."""
import json
import subprocess
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BATCHES=('1-3','4-6','7-9','10-12','13-15','16-18','19-20')
lessons=[]
for batch in BATCHES:
 subprocess.run([sys.executable,str(ROOT/f'scripts/validate-french-basics-master-redesign-{batch}-draft.py')],cwd=ROOT,check=True)
 d=json.loads((ROOT/f'content/french-basics/master-{batch}-redesign-draft.json').read_text())
 assert d['reviewed'] is False and d['registered'] is False and d['state']=='redesigned-authored-draft'
 lessons+=d['lessons']
assert [x['n'] for x in lessons]==list(range(1,21))
assert [x['stableLessonKey'] for x in lessons]==[f'master-french-basics:{n}' for n in range(1,21)]
assert all(len(x['words'])==20 and len(x['reading']['target'])==len(x['reading']['native'])==12 for x in lessons)
english=[line for x in lessons for line in x['reading']['native']]
assert len(english)==len(set(english))==240
print('French 101 Master 1–20 redesigned drafts: 20 stable lessons, 400 cards, 240 distinct aligned Reader pairs; review/runtime/audio pending')
