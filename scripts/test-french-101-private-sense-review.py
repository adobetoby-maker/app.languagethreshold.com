#!/usr/bin/env python3
"""Negative checks for source-pinned, still-unreviewed dictionary sense evidence."""

import copy
import importlib.util
import json
from pathlib import Path

SCRIPT = Path(__file__).with_name("build-french-101-private-sense-review.py")
spec = importlib.util.spec_from_file_location("french_sense_review", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
review = json.loads(module.OUTPUT.read_bytes())
module.validate(review)
assert review["counts"] == {"ambiguousHeadwords": 25, "sourceAlignedAnnotations": 13, "unresolved": 12}
assert review["target"] == "French" and review["native"] == "English"
assert review["registered"] is False and review["reviewed"] is False and review["senseIdsMerged"] is False
assert len({case["headwordId"] for case in review["cases"]}) == 25
assert sum(case["sourceLevelStatus"] == "annotation-overlap-provisional" for case in review["cases"]) == 13
assert sum(case["sourceLevelStatus"] == "unresolved" for case in review["cases"]) == 12
assert {case["target"] for case in review["cases"] if case["sourceLevelStatus"] == "annotation-overlap-provisional"} >= {
    "le", "un cahier", "un livre", "un étudiant", "une étudiante"
}
assert all(len(case["evidence"]) == len(case["senseIds"]) and
           {item["senseId"] for item in case["evidence"]} == set(case["senseIds"])
           for case in review["cases"])

for change in (
    lambda data: data.update(reviewed=True),
    lambda data: data.update(registered=True),
    lambda data: data.update(senseIdsMerged=True),
    lambda data: data["cases"][0].update(reviewed=True),
    lambda data: data["cases"][0].update(sourceLevelStatus="approved"),
    lambda data: data["cases"][0]["evidence"][0].update(englishGloss="wrong"),
    lambda data: data["cases"][0]["evidence"][0].update(sourceSha256="0" * 64),
    lambda data: data["cases"][0]["senseIds"].pop(),
):
    changed = copy.deepcopy(review)
    change(changed)
    try:
        module.validate(changed)
    except (AssertionError, ValueError):
        pass
    else:
        raise AssertionError("Modified sense-review evidence was accepted")

print("French 101 private sense-review evidence and negative checks passed")
