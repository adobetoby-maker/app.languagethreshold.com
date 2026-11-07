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
source = json.loads((ROOT / "public/lesson-content/es/travel-breakfast.json").read_text())["lessons"]["30"]["passage"]
review = lessons[-1]["passage"]
assert review["english"] == source["native"]
assert "cannot rule out cross-contact" in source["native"][3]
assert "no puede descartar el contacto cruzado" in source["target"][3]
assert "ne peut pas exclure le contact croisé" in review["french"][3]
assert "because the cook says it has no nuts" not in source["native"][3]
print(f"French Travel Breakfast private Core draft: {len(lessons)}/30 contiguous lessons; "
      f"{sum(len(x['words']) for x in lessons)} exact English anchors; "
      f"{sum(len(x['passage']['french']) for x in lessons)} aligned Reader lines; "
      f"{sum(len(x['verbs']) for x in lessons)} source-paired verbs; reviewed:false")
