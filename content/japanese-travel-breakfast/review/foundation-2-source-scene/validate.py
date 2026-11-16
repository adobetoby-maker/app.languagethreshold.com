"""Independently check Foundation 2 source, identities and closed gates."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
packet = json.loads((HERE / "source-setting-candidate.json").read_text())
source = json.loads((ROOT / "src/data/core60/es/foundation-travel-breakfast.json").read_text())["lessons"][1]
reader = json.loads((ROOT / "public/lesson-content/es/foundation-travel-breakfast.json").read_text())["lessons"]["2"]["passage"]
archive = json.loads((ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/foundation-1-10-draft.json").read_text())["lessons"][1]
prior = json.loads((ROOT / "content/japanese-travel-breakfast/review/foundation-2-8/source-correction-proposals.json").read_text())

assert packet["pairKey"] == "Japanese:English" and packet["reviewed"] is False
assert not any(packet["gates"].values()) and len(packet["lessons"]) == 1
lesson = packet["lessons"][0]
stable = "foundation-travel-breakfast:2:ja-en"
revision = stable + ":source-scene-v1"
assert lesson["lessonKey"] == "foundation:2" and lesson["stableLessonId"] == archive["stableId"] == stable
assert lesson["candidateRevision"] == revision and lesson["reviewed"] is False
assert not any(lesson["gates"].values())
assert lesson["source"]["objectiveEnglish"] == source["objective"]
for name in ("curriculum", "reader"):
    path = ROOT / lesson["source"][name + "Path"]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == lesson["source"][name + "Sha256"]
for field, name in (("archivedDraft", "sha256"), ("supersedesPreviousProposal", "sha256")):
    path = ROOT / lesson[field]["path"]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == lesson[field][name]
assert lesson["supersedesPreviousProposal"]["lessonKey"] == "foundation:2"
assert "Foundation 8 remains unchanged" in lesson["supersedesPreviousProposal"]["scope"]
assert lesson["supersedesPreviousProposal"]["rejectedCandidateReaderId"] == prior["proposals"][0]["newReaderCandidate"]["id"]
assert prior["proposals"][1]["lessonKey"] == "foundation:8" and not any(prior["gates"].values())

cards = lesson["sourceCards"]
lines = lesson["sourceSettingReader"]
assert len(cards) == len(source["words"]) == 16
assert len(lines) == len(reader["native"]) == len(reader["target"]) == 9
ids = set()
for i, (card, src) in enumerate(zip(cards, source["words"]), 1):
    assert card["candidatePosition"] == i and card["id"] == f"{revision}:card:{i:02d}"
    assert card["sourceSpanish"] == src["es"] and card["sourceEnglish"] == src["en"]
    assert card["kind"] == src["kind"] and card["targetJapaneseDraft"]
    assert card["sourceEnglishIsJapaneseGloss"] is False
    assert card["id"] not in ids
    ids.add(card["id"])
for i, (line, es, en) in enumerate(zip(lines, reader["target"], reader["native"]), 1):
    assert line["candidatePosition"] == i and line["id"] == f"{revision}:reader:{i:02d}"
    assert line["sourceSpanish"] == es and line["sourceEnglish"] == en
    assert line["targetJapaneseDraft"] and line["sourceEnglishIsJapaneseGloss"] is False
    assert line["id"] not in ids
    ids.add(line["id"])
assert len(ids) == 25
assert len(lesson["oldCardPositionPlan"]) == len(archive["cards"]) == 12
assert len(lesson["oldReaderPositionPlan"]) == len(archive["reader"]) == 9
assert all(row["candidate"] is None for row in lesson["oldCardPositionPlan"] + lesson["oldReaderPositionPlan"])
assert "サム" not in " ".join(row["targetJapaneseDraft"] for row in cards + lines)
assert "円" not in " ".join(row["targetJapaneseDraft"] for row in cards + lines)
assert "エマ" in lines[0]["targetJapaneseDraft"] and "8時半" in lines[1]["targetJapaneseDraft"]
assert "120ペソ" in lines[7]["targetJapaneseDraft"]
print("PASS Japanese Breakfast Foundation 2: 16 source-order cards, nine Reader turns, stable revision IDs, superseded Sam proposal and false gates")
