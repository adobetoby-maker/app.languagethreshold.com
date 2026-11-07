#!/usr/bin/env python3
"""Verify the stacked private French Travel Breakfast Core draft spans 1–30 exactly."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
paths = [ROOT / f"content/french-travel-breakfast/core-{start}-{end}-draft.json"
         for start, end in [(1, 3), (4, 6), (7, 9), (10, 12), (13, 15),
                            (16, 18), (19, 21), (22, 24), (25, 27), (28, 30)]]
lessons = [lesson for path in paths for lesson in json.loads(path.read_text())["lessons"]]
assert [lesson["n"] for lesson in lessons] == list(range(1, 31))
assert all(lesson["reviewed"] is False for lesson in lessons)
assert all(lesson["passage"]["english"] and lesson["passage"]["french"] for lesson in lessons)
print(f"French Travel Breakfast private Core draft: {len(lessons)}/30 contiguous lessons; "
      f"{sum(len(x['words']) for x in lessons)} exact English anchors; "
      f"{sum(len(x['passage']['french']) for x in lessons)} aligned Reader lines; "
      f"{sum(len(x['verbs']) for x in lessons)} source-paired verbs; reviewed:false")
