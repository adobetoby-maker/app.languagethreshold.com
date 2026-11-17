"""Independent source, identity, audio-scope and false-gate check for Master 1."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PACKET = json.loads((HERE / "source-setting-candidate.json").read_text())
CURRICULUM = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/master-1-3-draft.json"


def check(ok, label):
    if not ok:
        raise ValueError(label)


for path, expected in (
    (CURRICULUM, "9403eb80ef58e72bcff62be5c6fac3b7c9a02b2e76acb237592fcc34ddb1f87b"),
    (READER, "7cc91b0ca9a264ec20ac63a0e760e6df4b3cfc8ca7e931decc239c4329a74348"),
    (ARCHIVE, "84b7673fc72175428d48dbf211b41be75b7dac31320c7c82e708ab1c9803d224"),
):
    check(hashlib.sha256(path.read_bytes()).hexdigest() == expected, "source drift: " + str(path))

curriculum_file = json.loads(CURRICULUM.read_text())
curriculum = curriculum_file["lessons"][0]
reader_file = json.loads(READER.read_text())
source_reader = reader_file["lessons"]["1"]["passage"]
archive_file = json.loads(ARCHIVE.read_text())
old = archive_file["lessons"][0]
revision = "master-travel-breakfast:1:ja-en:source-scene-v1"
check((PACKET["schema"], PACKET["pairKey"], PACKET["track"], PACKET["stage"],
       PACKET["lessonKey"], PACKET["stableLessonId"], PACKET["candidateRevision"]) ==
      (1, "Japanese:English", "travel-breakfast", "master", "master:1", old["stableId"], revision),
      "exact-pair or lesson identity")
check(old["stableId"] == "master-travel-breakfast:1:ja-en", "stable ID")
check(PACKET["reviewed"] is False and all(v is False for v in PACKET["gates"].values()), "closed gates")
check(curriculum_file["reviewed"] is False and reader_file["reviewed"] is False and
      archive_file["reviewed"] is False and archive_file["registered"] is False, "source/archive gates")
check(PACKET["source"]["curriculumSha256"] == hashlib.sha256(CURRICULUM.read_bytes()).hexdigest(), "curriculum pin")
check(PACKET["source"]["readerSha256"] == hashlib.sha256(READER.read_bytes()).hexdigest(), "Reader pin")
check(PACKET["archivedDraft"]["sha256"] == hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(), "archive pin")
check(PACKET["source"]["titleEnglishInternal"] == curriculum["title"] and
      PACKET["source"]["objectiveEnglishInternal"] == curriculum["objective"] and
      PACKET["source"]["speakingEnglishInternal"] == curriculum["speaking"], "source objective")
check(PACKET["source"]["readerTitleSpanish"] == source_reader["title"], "Reader title")
check(PACKET["source"]["readerVerbExamplesInternal"] ==
      [v["example"] for v in reader_file["lessons"]["1"]["verbs"]], "Reader verb examples")

cards, reader = PACKET["sourceCards"], PACKET["sourceSettingReader"]
check(len(cards) == len(curriculum["words"]) == 22, "card count")
check(len(reader) == len(source_reader["target"]) == len(source_reader["native"]) == 18,
      "Reader count")
check(len({row["id"] for row in cards + reader}) == 40, "unique candidate IDs")
for i, (row, source) in enumerate(zip(cards, curriculum["words"]), 1):
    check((row["id"], row["candidatePosition"]) == (f"{revision}:card:{i:02d}", i), f"card {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["kind"], row["sourceNoteInternal"]) ==
          (source["es"], source["en"], source["kind"], source.get("note")), f"card {i} source")
    check(row["literalJapaneseGlossEn"] == source["en"] and
          row["sourceEnglishIsJapaneseGloss"] is False and row["learnerFaceEnabled"] is False and
          bool(row["targetJapaneseDraft"]), f"card {i} face/gates")
for i, row in enumerate(reader, 1):
    check((row["id"], row["candidatePosition"]) == (f"{revision}:reader:{i:02d}", i), f"Reader {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["literalJapaneseGlossEn"]) ==
          (source_reader["target"][i - 1], source_reader["native"][i - 1],
           source_reader["native"][i - 1]), f"Reader {i} source")
    check(row["selectionStatus"] == "unapproved draft candidate" and
          row["learnerFaceEnabled"] is False and row["sourceEnglishIsJapaneseGloss"] is False and
          bool(row["targetJapaneseDraft"]), f"Reader {i} face/gates")
check("ラバピエス" in reader[0]["targetJapaneseDraft"] and
      "ブラジル人" in reader[0]["targetJapaneseDraft"] and "チアゴ" in reader[0]["targetJapaneseDraft"],
      "Lavapiés/Thiago scene")
check("9時" in reader[1]["targetJapaneseDraft"] and "カウンター" in reader[1]["targetJapaneseDraft"],
      "9 a.m. counter crowd")
check("3ユーロ" in reader[6]["targetJapaneseDraft"] and "チュロス" in reader[6]["targetJapaneseDraft"],
      "breakfast deal")
check("ポラス" in reader[9]["targetJapaneseDraft"] and
      "エスプレッソ" in reader[9]["targetJapaneseDraft"], "Thiago order")
check("パコ" in reader[11]["targetJapaneseDraft"] and "レシート" in reader[11]["targetJapaneseDraft"] and
      "カップの下" in reader[11]["targetJapaneseDraft"], "receipt under cup")
check("カード決済端末" in reader[14]["targetJapaneseDraft"] and "お釣り" in reader[14]["targetJapaneseDraft"],
      "card/cash choices")
check("義務じゃない" in reader[15]["targetJapaneseDraft"] and "チップ" in reader[15]["targetJapaneseDraft"],
      "optional tip")
check("順を追って" in reader[16]["targetJapaneseDraft"] and
      "レシート" in reader[17]["targetJapaneseDraft"], "teach-back")
check(PACKET["speakingGoalLearnerEnabled"] is False and
      all(x in PACKET["speakingGoalJapaneseDraft"] for x in ("マドリード", "カウンター", "説明")),
      "speaking setup/gate")
for key, old_rows in (("oldCardPositionPlan", old["cards"]), ("oldReaderPositionPlan", old["reader"])):
    rows = PACKET[key]
    check(len(rows) == len(old_rows), key + " count")
    check([row["oldEnglish"] for row in rows] == [row["en"] for row in old_rows], key + " order")
    check(all(row["candidate"] is None and "no saved-item migration" in row["disposition"] for row in rows),
          key + " migration")
overlap = {(oi, ni) for oi, old_row in enumerate(old["cards"], 1)
           for ni, row in enumerate(cards, 1) if old_row["ja"] == row["targetJapaneseDraft"]}
check(overlap == {(row["oldPosition"], row["candidatePosition"])
                  for row in PACKET["archivedExactCardOverlapInternal"]}, "archived overlap")
check(all(row["textOnly"] is True and row["migrationAuthorized"] is False
          for row in PACKET["archivedExactCardOverlapInternal"]), "overlap migration")
scope = PACKET["audioScopeReadOnly"]
faces = [row["targetJapaneseDraft"] for row in cards + reader]
check(scope["draftFacePlacements"] == 40 and scope["twoVoiceClipDecisionsIfTextApproved"] == 80,
      "audio placement scope")
check(scope["twoVoiceSubmittedCharactersIfTextApproved"] == 2 * sum(map(len, faces)), "audio characters")
check(scope["archivedExactJapaneseCardTextOverlapsOnly"] == len(overlap), "audio overlap")
check(scope["candidateIDsMatchingArchive"] == 0 and scope["synthesized"] is False and
      scope["listeningApproved"] is False and scope["registered"] is False, "audio gates")
check("do not authorize saved-item" in PACKET["savedPositionPolicy"], "saved-item policy")
check(len(PACKET["reviewQuestionsInternal"]) >= 6 and len(PACKET["missing"]) >= 6, "open review work")
print("PASS Japanese Breakfast Master 1: 22 pinned cards, 18 Reader rows, 40 draft faces, closed gates")
