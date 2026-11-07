#!/usr/bin/env python3
"""Focused source, priority, identity and size checks for the private Watch plan."""

import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).with_name("plan-french-101-watch-starter.py")
spec = importlib.util.spec_from_file_location("french_watch_plan", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

plan = module.build()
assert plan["registered"] is False and plan["reviewed"] is False
assert plan["recordingsGenerated"] is False and plan["watchIntegrated"] is False
assert plan["bundleId"] == "com.languagethreshold.core60v4.watchkitapp"
assert plan["voiceIdentitiesVerified"] is False
assert plan["selectedTextCount"] == len(plan["selected"]) == 12
assert plan["requestedClipCount"] == 24
assert [item["priority"] for item in plan["selected"]] == list(range(1, 13))
assert len({item["v4LookupKey"] for item in plan["selected"]}) == 12
assert plan["selected"][0]["displayText"] == "bonjour"
assert {item["stage"] for item in plan["selected"]} == {"foundation", "core", "master"}
assert all(item["recorded"] is False and item["listeningReviewed"] is False
           for item in plan["selected"])
assert all((module.ROOT / ref["path"]).is_file()
           for item in plan["selected"] for ref in item["sourceRefs"])
assert module.v4_lookup_key("Bonjour!") == "bonjour"
assert module.v4_lookup_key("Bonjour !") == "bonjour "  # Current V4 behavior; tracked blocker.
assert plan["lookupKeysWithTrailingSpace"] == sum(
    item["v4LookupKeyHasTrailingSpace"] for item in plan["selected"])
size = plan["sizePlan"]
assert size["illustrativeCombinedPackBytes"] == (
    size["existingSpanishStarterPackObservedBytes"] + size["illustrativeFrenchExtraBytes"])
assert size["illustrativeRemainingHeadroomBytes"] >= size["minimumUncommittedHeadroomBytes"]
assert size["actualFrenchBytesKnown"] is False and size["actualCombinedPackVerified"] is False
print("Private French 101 Watch starter checks passed:", plan["selectedTextCount"], "texts")
