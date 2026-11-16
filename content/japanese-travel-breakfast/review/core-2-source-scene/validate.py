"""Independently validate the inert Core 2 packet's source, IDs and gates."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
packet = json.loads((HERE / "source-setting-candidate.json").read_text())
source_meta = packet["source"]
source_path = ROOT / source_meta["lessonPath"]
archive_path = ROOT / source_meta["archivePath"]
objectives_path = ROOT / source_meta["objectivesPath"]
for path, key in ((source_path, "lessonSha256"),
                  (archive_path, "archiveSha256"),
                  (objectives_path, "objectivesSha256")):
    assert hashlib.sha256(path.read_bytes()).hexdigest() == source_meta[key]

source = json.loads(source_path.read_text())["lessons"]["2"]
archive = json.loads(archive_path.read_text())
old = archive["lessons"][1]
assert packet["pairKey"] == "Japanese:English"
assert packet["track"] == "travel-breakfast"
assert packet["stage"] == "core" and packet["lessonKey"] == "core:2"
assert packet["stableLessonId"] == old["stableId"] == "travel-breakfast:2:ja-en"
assert packet["reviewed"] is False and archive["reviewed"] is False
assert archive["registered"] is False
assert packet["candidateRevision"].startswith(packet["stableLessonId"] + ":source-scene-")
assert source_meta["objectiveEnglish"] == old["sourceEnglish"]["objective"]
assert f'"{source_meta["objectiveEnglish"]}"' in objectives_path.read_text()

cards = packet["sourceCards"]
reader = packet["sourceSettingReader"]
assert len(cards) == len(source["words"]) == 18
assert len(reader) == len(source["passage"]["target"]) == len(source["passage"]["native"]) == 8
ids = [row["id"] for row in cards + reader]
assert len(ids) == len(set(ids))
for i, (row, src) in enumerate(zip(cards, source["words"]), 1):
    assert row["candidatePosition"] == i
    assert row["id"] == f'{packet["candidateRevision"]}:card:{i:02d}'
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (src["es"], src["en"], src["kind"])
    assert row["sourceEnglishIsJapaneseGloss"] is False
    assert row["blockedOnSourceDecision"] == (i == 1)
    assert (row["targetJapaneseDraft"] is None) == (i == 1)
    assert (row["literalJapaneseGlossEn"] is None) == (i == 1)
for i, (row, es, en) in enumerate(zip(reader, source["passage"]["target"], source["passage"]["native"]), 1):
    assert row["candidatePosition"] == i
    assert row["id"] == f'{packet["candidateRevision"]}:reader:{i:02d}'
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
    assert row["sourceEnglishIsJapaneseGloss"] is False
    assert row["blockedOnSourceDecision"] == (i in (3, 7))
    assert (row["targetJapaneseDraft"] is None) == (i in (3, 7))
    assert (row["literalJapaneseGlossEn"] is None) == (i in (3, 7))
assert packet["selectedJapaneseCardCount"] == 17
assert packet["selectedJapaneseReaderCount"] == 6
assert len(packet["oldCardPositionPlan"]) == len(old["cards"])
assert len(packet["oldReaderPositionPlan"]) == len(old["reader"])
assert all(row["candidate"] is None for row in packet["oldCardPositionPlan"] + packet["oldReaderPositionPlan"])
assert all(value is False for value in packet["gates"].values())
assert len(packet["sourceConflictsInternal"]) >= 2
print("Japanese Breakfast Core 2 source/ID/false-gate validator PASS")
