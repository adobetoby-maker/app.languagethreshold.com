#!/usr/bin/env python3
"""Focused integrity checks for the private French 101 inventory."""

import importlib.util
from collections import Counter
from pathlib import Path

SCRIPT = Path(__file__).with_name("build-french-101-private-dictionary.py")
spec = importlib.util.spec_from_file_location("french_inventory", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

inventory = module.build()
assert inventory["reviewed"] is False and inventory["registered"] is False
assert inventory["counts"]["lessons"] == {"foundation": 10, "core": 30, "master": 20}
assert inventory["counts"]["wordRows"] == sum(len(s["occurrences"]) for s in inventory["senses"])
assert inventory["counts"]["uniqueSensePairs"] == len(inventory["senses"])
assert inventory["counts"]["ambiguousHeadwords"] == len(inventory["ambiguousHeadwords"])
assert inventory["counts"]["unpairedCardOverrides"] == 0
assert all(s["reviewed"] is False and s["registered"] is False for s in inventory["senses"])
assert all(s["senseId"] == module.stable_id("sense", s["target"], s["native"])
           for s in inventory["senses"])
assert len({s["senseId"] for s in inventory["senses"]}) == len(inventory["senses"])
assert module.stable_id("sense", "Bonjour", "Hello") == module.stable_id("sense", "bonjour", "hello")
assert module.stable_id("sense", "m’appelle", "my name is") == module.stable_id("sense", "m'appelle", "my name is")
counts = Counter((o["stage"], o["lesson"]) for s in inventory["senses"] for o in s["occurrences"])
assert all(counts[(stage, number)] > 0 for stage, total in (("foundation", 10), ("core", 30), ("master", 20))
           for number in range(1, total + 1))
assert all((module.ROOT / o["draftPath"]).is_file()
           for s in inventory["senses"] for o in s["occurrences"])
assert any(s["target"] == "en" and s["native"] == "in / by (depending on the phrase)"
           for s in inventory["senses"]), "Core support override must be represented"
print("French 101 private dictionary integrity passed:", inventory["counts"])
