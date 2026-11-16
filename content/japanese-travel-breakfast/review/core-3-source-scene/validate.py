"""Independently validate the inert Core 3 source-scene packet."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PACKET = json.loads((HERE / "source-setting-candidate.json").read_text())


def pinned(path_key, sha_key):
    source = PACKET["source"]
    path = ROOT / source[path_key]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == source[sha_key], path
    return path


source_path = pinned("contentPath", "contentSha256")
objectives_path = pinned("objectivesPath", "objectivesSha256")
archive_path = ROOT / PACKET["archivedDraft"]["path"]
assert hashlib.sha256(archive_path.read_bytes()).hexdigest() == PACKET["archivedDraft"]["sha256"]
source = json.loads(source_path.read_text())["lessons"]["3"]
archive = json.loads(archive_path.read_text())
old = archive["lessons"][2]
objective_text = objectives_path.read_text()
stable = "travel-breakfast:3:ja-en"
revision = stable + ":source-scene-v1"

assert PACKET["schema"] == 1
assert PACKET["pairKey"] == "Japanese:English"
assert (PACKET["track"], PACKET["stage"], PACKET["lessonKey"]) == ("travel-breakfast", "core", "core:3")
assert PACKET["stableLessonId"] == old["stableId"] == stable
assert PACKET["candidateRevision"] == revision
assert source["passage"]["title"] == PACKET["source"]["readerTitleSpanish"]
assert old["sourceEnglish"]["objective"] == PACKET["source"]["objectiveEnglish"] in objective_text
assert old["sourceEnglish"]["roleplay"] == PACKET["source"]["roleplayEnglish"] in objective_text
assert archive["reviewed"] is False and archive["registered"] is False
assert PACKET["reviewed"] is False and PACKET["status"].endswith("unapproved")

cards = PACKET["sourceCards"]
reader = PACKET["sourceSettingReader"]
assert len(cards) == len(source["words"]) == 18
assert len(reader) == len(source["passage"]["target"]) == len(source["passage"]["native"]) == 9
ids = [row["id"] for row in cards + reader]
assert len(ids) == len(set(ids)) == 27
for i, (row, expected) in enumerate(zip(cards, source["words"]), 1):
    assert row["id"] == f"{revision}:card:{i:02d}"
    assert row["candidatePosition"] == i
    assert row["sourceSpanish"] == expected["es"] and row["sourceEnglish"] == expected["en"]
    assert row["kind"] == expected["kind"] and row["sourceNoteInternal"] == expected.get("note")
    assert row["targetJapaneseDraft"] and row["literalJapaneseGlossEn"]
    assert row["sourceEnglishIsJapaneseGloss"] is False
for i, row in enumerate(reader, 1):
    assert row["id"] == f"{revision}:reader:{i:02d}"
    assert row["candidatePosition"] == i
    assert row["speaker"] == "Narrator"
    assert row["sourceSpanish"] == source["passage"]["target"][i - 1]
    assert row["sourceEnglish"] == source["passage"]["native"][i - 1]
    assert row["targetJapaneseDraft"] and row["literalJapaneseGlossEn"]
    assert row["sourceEnglishIsJapaneseGloss"] is False

for key, old_rows in (("oldCardPositionPlan", old["cards"]), ("oldReaderPositionPlan", old["reader"])):
    plan = PACKET[key]
    assert len(plan) == len(old_rows)
    assert [r["old"] for r in plan] == list(range(1, len(old_rows) + 1))
    assert all(r["candidate"] is None and "no saved-item migration" in r["disposition"] for r in plan)
    assert [r["oldEnglish"] for r in plan] == [r["en"] for r in old_rows]

actual_overlap = {(o, n) for o, old_row in enumerate(old["cards"], 1)
                  for n, new_row in enumerate(cards, 1)
                  if old_row["ja"] == new_row["targetJapaneseDraft"]
                  and old_row["en"] == new_row["sourceEnglish"]}
listed_overlap = {(r["oldPosition"], r["candidatePosition"]) for r in PACKET["archivedExactCardOverlapInternal"]}
assert actual_overlap == listed_overlap
assert all(r["sameJapaneseAndEnglish"] is True and r["migrationAuthorized"] is False
           for r in PACKET["archivedExactCardOverlapInternal"])
scope = PACKET["audioScopeReadOnly"]
assert scope["placements"] == 27 and scope["twoVoiceClipDecisions"] == 54
assert scope["twoVoiceSubmittedCharacters"] == 2 * sum(len(r["targetJapaneseDraft"]) for r in cards + reader)
assert scope["archivedExactJapaneseCardTextOverlaps"] == len(actual_overlap) == 4
assert scope["candidateIDsMatchingArchive"] == 0
assert scope["synthesized"] is False and scope["listeningApproved"] is False and scope["registered"] is False
assert len(PACKET["reviewQuestionsInternal"]) >= 5
assert len(PACKET["missing"]) >= 6
assert PACKET["gates"] and all(value is False for value in PACKET["gates"].values())
assert PACKET["gates"]["reviewed"] == PACKET["reviewed"]
assert all(":source-scene-v1:" in row_id for row_id in ids)
print("PASS Core 3 source/hash/identity/order/overlap/false gates: 18 cards, 9 Reader")
