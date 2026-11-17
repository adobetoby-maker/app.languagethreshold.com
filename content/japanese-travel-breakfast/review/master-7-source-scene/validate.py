"""Independent source, identity, scene, audio-scope and gate check for Master 7."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PACKET = json.loads((HERE / "source-setting-candidate.json").read_text())
CURRICULUM = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/master-7-9-draft.json"


def check(ok, label):
    if not ok:
        raise ValueError(label)


for path, expected in (
    (CURRICULUM, "9403eb80ef58e72bcff62be5c6fac3b7c9a02b2e76acb237592fcc34ddb1f87b"),
    (READER, "7cc91b0ca9a264ec20ac63a0e760e6df4b3cfc8ca7e931decc239c4329a74348"),
    (ARCHIVE, "2df980428024f9bf436cbdd49d7b52cdcab5d9b49c6b670ba2988bb544b07337"),
):
    check(hashlib.sha256(path.read_bytes()).hexdigest() == expected, "source drift: " + str(path))

curriculum_file = json.loads(CURRICULUM.read_text())
reader_file = json.loads(READER.read_text())
archive_file = json.loads(ARCHIVE.read_text())
source = curriculum_file["lessons"][6]
reading = reader_file["lessons"]["7"]
old = archive_file["lessons"][0]
revision = "master-travel-breakfast:7:ja-en:source-scene-v1"
check((PACKET["schema"], PACKET["pairKey"], PACKET["track"], PACKET["stage"],
       PACKET["lessonKey"], PACKET["stableLessonId"], PACKET["candidateRevision"]) ==
      (1, "Japanese:English", "travel-breakfast", "master", "master:7", old["stableId"], revision),
      "exact-pair or lesson identity")
check(old["stableId"] == "master-travel-breakfast:7:ja-en" and source["n"] == old["n"] == 7,
      "stable identity")
check(PACKET["reviewed"] is False and all(v is False for v in PACKET["gates"].values()), "closed gates")
check(curriculum_file["reviewed"] is False and reader_file["reviewed"] is False and
      archive_file["reviewed"] is False and archive_file["registered"] is False, "source/archive gates")
check(PACKET["source"]["curriculumSha256"] == hashlib.sha256(CURRICULUM.read_bytes()).hexdigest(), "curriculum pin")
check(PACKET["source"]["readerSha256"] == hashlib.sha256(READER.read_bytes()).hexdigest(), "reader pin")
check(PACKET["archivedDraft"]["sha256"] == hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(), "archive pin")
check(PACKET["source"]["titleEnglishInternal"] == source["title"] and
      PACKET["source"]["objectiveEnglishInternal"] == source["objective"] and
      PACKET["source"]["speakingEnglishInternal"] == source["speaking"], "source objective")
check(PACKET["source"]["grammarEnglishExamplesInternal"] ==
      [row["en"] for row in source["grammar"]["examples"]], "source grammar")
check(PACKET["source"]["readerTitleSpanish"] == reading["passage"]["title"], "reader title")
check(PACKET["source"]["readerVerbExamples"] == [row["example"] for row in reading["verbs"]],
      "source verbs")
cards, reader = PACKET["sourceCards"], PACKET["sourceSettingReader"]
check(len(cards) == len(source["words"]) == 23, "card count")
check(len(reader) == len(reading["passage"]["native"]) == len(reading["passage"]["target"]) == 18,
      "reader count")
check(len({row["id"] for row in cards + reader}) == 41, "unique candidate IDs")
for i, (row, original) in enumerate(zip(cards, source["words"]), 1):
    check((row["id"], row["candidatePosition"]) == (f"{revision}:card:{i:02d}", i), f"card {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["kind"], row["sourceNoteInternal"]) ==
          (original["es"], original["en"], original["kind"], original.get("note")), f"card {i} source")
    check(row["literalJapaneseGlossEn"] == original["en"] and bool(row["targetJapaneseDraft"]),
          f"card {i} face")
    check(row["learnerFaceEnabled"] is False and row["sourceEnglishIsJapaneseGloss"] is False,
          f"card {i} gates")
for i, row in enumerate(reader, 1):
    english, spanish = reading["passage"]["native"][i - 1], reading["passage"]["target"][i - 1]
    check((row["id"], row["candidatePosition"]) == (f"{revision}:reader:{i:02d}", i), f"reader {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["literalJapaneseGlossEn"]) ==
          (spanish, english, english), f"reader {i} source")
    check(row["speaker"] == next((name for name in ("Emma", "Marleny") if english.startswith(name + ":")), "Narrator"), f"reader {i} speaker")
    check(bool(row["targetJapaneseDraft"]) and row["selectionStatus"] == "unapproved draft candidate" and
          row["learnerFaceEnabled"] is False and row["sourceEnglishIsJapaneseGloss"] is False,
          f"reader {i} face/gates")
for row in reader:
    english = row["sourceEnglish"]
    japanese = row["targetJapaneseDraft"]
    speaker = next((name for name in ("Emma", "Marleny") if english.startswith(name + ":")), None)
    if speaker:
        check(japanese.startswith({"Emma": "エマ：", "Marleny": "マルレニー："}[speaker]), "speaker marker " + speaker)
    else:
        check(not japanese.startswith(("エマ：", "マルレニー：")), "narrator marker")
for index, words in (
    (0, ("七時半", "エマ", "サレント", "コーヒー農園")),
    (1, ("アンドレス", "土砂崩れ", "七時四十五分")),
    (4, ("七つ", "九杯")), (5, ("プリヤ", "二杯")),
    (6, ("四人", "現金")), (7, ("カレンタード", "二皿")),
    (9, ("トム", "プリヤ", "ケソ・カンペシーノ")),
    (10, ("三杯", "二杯")), (12, ("六万四千ペソ", "二皿")),
    (13, ("十万ペソ", "お釣り")), (15, ("ネキ", "壁")),
    (17, ("六万四千ペソ", "小型バス")),
):
    check(all(word in reader[index]["targetJapaneseDraft"] for word in words), f"reader {index + 1} source scene")
check(all(word in PACKET["speakingGoalJapaneseDraft"] for word in
          ("エマ", "マルレニー", "サレント", "七つ", "九杯", "四人", "六万四千ペソ", "ネキ", "アンドレス")),
      "speaking scope")
check(PACKET["speakingGoalLearnerEnabled"] is False, "speaking gate")
for key, old_rows in (("oldCardPositionPlan", old["cards"]), ("oldReaderPositionPlan", old["reader"])):
    rows = PACKET[key]
    check(len(rows) == len(old_rows), key + " count")
    check([row["oldEnglish"] for row in rows] == [row["en"] for row in old_rows], key + " order")
    check(all(row["candidate"] is None and "no saved-item migration" in row["disposition"] for row in rows),
          key + " migration")
overlap = {(oi, ni) for oi, old_row in enumerate(old["cards"], 1)
           for ni, row in enumerate(cards, 1) if old_row["ja"] == row["targetJapaneseDraft"]}
check(overlap == {(row["oldPosition"], row["candidatePosition"])
                  for row in PACKET["archivedExactCardOverlapInternal"]}, "overlap")
check(all(row["textOnly"] is True and row["migrationAuthorized"] is False
          for row in PACKET["archivedExactCardOverlapInternal"]), "overlap migration")
scope = PACKET["audioScopeReadOnly"]
faces = [row["targetJapaneseDraft"] for row in cards + reader]
check(scope["draftFacePlacements"] == 41 and scope["twoVoiceClipDecisionsIfTextApproved"] == 82,
      "audio placements")
check(scope["twoVoiceSubmittedCharactersIfTextApproved"] == 2 * sum(map(len, faces)), "audio characters")
check(scope["archivedExactJapaneseCardTextOverlapsOnly"] == len(overlap), "audio text overlap")
check(scope["candidateIDsMatchingArchive"] == 0 and scope["synthesized"] is False and
      scope["listeningApproved"] is False and scope["registered"] is False, "audio gates")
check("do not authorize saved-item" in PACKET["savedPositionPolicy"], "saved-item policy")
check(len(PACKET["reviewQuestionsInternal"]) >= 6 and len(PACKET["missing"]) >= 6, "open review work")
metadata = json.loads((HERE / "ai-assistance-metadata.json").read_text())
check(metadata["qualifiedReview"] is False and all(call.get("qualifiedApproval") is False for call in metadata["calls"]),
      "AI/qualified review separation")
print("PASS Japanese Breakfast Master 7: 23 pinned cards, 18 Reader rows, 41 draft faces, closed gates")
