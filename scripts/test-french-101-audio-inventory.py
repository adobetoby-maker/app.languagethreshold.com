#!/usr/bin/env python3
"""Focused checks for the read-only French 101 audio plan."""

import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).with_name("audit-french-101-audio.py")
spec = importlib.util.spec_from_file_location("french_audio_audit", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

report = module.audit()
assert report["lessonCounts"] == {"foundation": 10, "core": 30, "master": 20}
assert report["registered"] is False and report["reviewed"] is False
assert report["recordingsGenerated"] is False and report["listeningReviewed"] is False
assert len(report["entries"]) == report["counts"]["allUniqueDisplayTexts"]
assert len({entry["textSha256"] for entry in report["entries"]}) == len(report["entries"])
assert all(entry["textSha256"] == module.digest(entry["displayText"].encode("utf-8"))
           for entry in report["entries"])
assert all((module.ROOT / item["path"]).is_file()
           for entry in report["entries"] for item in entry["sources"])
candidate = [entry for entry in report["entries"] if "private-fixture" in entry["scope"]
             or "master-draft-no-fixture" in entry["scope"]]
assert len(candidate) == report["counts"]["candidateUniqueTexts"]
assert sum(len(entry["displayText"]) for entry in candidate) == report["counts"]["candidateSpokenCharactersPerVoice"]
assert all(s["requiredClips"] == len(candidate) * 2 * len(s["proposedLocales"])
           for s in report["voiceScenarios"].values())
assert all(s["voiceIdentityVerified"] is False for s in report["voiceScenarios"].values())
assert report["watchEstimate"]["internalResourceBudgetBytes"] == 4 * 1024 * 1024
excluded = [e["displayText"] for e in report["entries"] if e not in candidate]
assert excluded and all("espagnol" in text for text in excluded), excluded
assert any(entry["displayText"] == "bonjour" for entry in candidate)
print("French 101 audio inventory checks passed:", report["counts"])
