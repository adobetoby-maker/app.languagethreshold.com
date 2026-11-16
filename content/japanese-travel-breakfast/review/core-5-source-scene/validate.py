"""Independently check the inert Core 5 packet against current source files."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PACKET = json.loads((HERE / "source-setting-candidate.json").read_text())
SOURCE_PATH = ROOT / "public/lesson-content/es/travel-breakfast.json"
PLAN_PATH = ROOT / "src/data/travel-zone.ts"
DRAFT_PATH = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/core-1-30-draft.json"
SOURCE = json.loads(SOURCE_PATH.read_text())["lessons"]["5"]
DRAFT = json.loads(DRAFT_PATH.read_text())
OLD = DRAFT["lessons"][4]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


assert PACKET["pairKey"] == "Japanese:English"
assert PACKET["track"] == "travel-breakfast"
assert PACKET["stage"] == "core" and PACKET["lessonKey"] == "core:5"
assert PACKET["stableLessonId"] == OLD["stableId"] == "travel-breakfast:5:ja-en"
assert PACKET["candidateRevision"] == "travel-breakfast:5:ja-en:source-scene-v1"
assert PACKET["reviewed"] is False and DRAFT["reviewed"] is False
assert PACKET["source"]["planSha256"] == digest(PLAN_PATH)
assert PACKET["source"]["readerSha256"] == digest(SOURCE_PATH)
assert PACKET["archivedDraft"]["sha256"] == digest(DRAFT_PATH)
assert PACKET["source"]["objectiveEnglish"] == OLD["sourceEnglish"]["objective"]
assert PACKET["source"]["roleplayEnglish"] == OLD["sourceEnglish"]["roleplay"]
assert PACKET["source"]["objectiveEnglish"] in PLAN_PATH.read_text()
assert PACKET["source"]["roleplayEnglish"] in PLAN_PATH.read_text()
assert PACKET["source"]["sourceVerbExamples"] == [v["example"] for v in SOURCE["verbs"]]

cards = PACKET["sourceCards"]
reader = PACKET["sourceSettingReader"]
assert len(cards) == len(SOURCE["words"]) == 16
assert len(reader) == len(SOURCE["passage"]["target"]) == len(SOURCE["passage"]["native"]) == 9
assert [r["sourceSpanish"] for r in cards] == [r["es"] for r in SOURCE["words"]]
assert [r["sourceEnglish"] for r in cards] == [r["en"] for r in SOURCE["words"]]
assert [r["kind"] for r in cards] == [r["kind"] for r in SOURCE["words"]]
assert [r["sourceSpanish"] for r in reader] == SOURCE["passage"]["target"]
assert [r["sourceEnglish"] for r in reader] == SOURCE["passage"]["native"]
assert [r["candidatePosition"] for r in cards] == list(range(1, 17))
assert [r["candidatePosition"] for r in reader] == list(range(1, 10))
ids = [r["id"] for r in cards + reader]
assert len(ids) == len(set(ids)) == 25
assert all(r["id"].startswith(PACKET["candidateRevision"] + ":") for r in cards + reader)
assert all(r["targetJapaneseDraft"] and r["literalJapaneseGlossEn"] for r in cards + reader)
assert all(r["sourceEnglishIsJapaneseGloss"] is False for r in cards + reader)
assert all(r["candidateTextSha256"] == hashlib.sha256(r["targetJapaneseDraft"].encode()).hexdigest() for r in cards + reader)
assert len(PACKET["oldCardPositionPlan"]) == len(OLD["cards"])
assert len(PACKET["oldReaderPositionPlan"]) == len(OLD["reader"])
assert all(r["candidate"] is None and "no saved-item migration" in r["disposition"] for r in PACKET["oldCardPositionPlan"] + PACKET["oldReaderPositionPlan"])
assert PACKET["gates"] and all(value is False for value in PACKET["gates"].values())
assert "menú" in " ".join(PACKET["unresolvedInternal"])
assert "214" in reader[5]["targetJapaneseDraft"]
assert "6時30分から10時まで" in reader[4]["targetJapaneseDraft"]
assert "きれいなお皿" in reader[7]["targetJapaneseDraft"]
assert "持ち出さない" in reader[7]["targetJapaneseDraft"]
print("Core 5 source/hash/ID/gate validator PASS: 16 cards, 9 Reader turns, 25 revision-scoped placements")
