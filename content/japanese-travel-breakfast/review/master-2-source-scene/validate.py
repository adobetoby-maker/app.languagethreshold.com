"""Independent source, identity, audio-scope and false-gate check for Master 2."""

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
curriculum = curriculum_file["lessons"][1]
reader_file = json.loads(READER.read_text())
reader_source = reader_file["lessons"]["2"]
archive_file = json.loads(ARCHIVE.read_text())
old = archive_file["lessons"][1]
revision = "master-travel-breakfast:2:ja-en:source-scene-v1"
check((PACKET["schema"], PACKET["pairKey"], PACKET["track"], PACKET["stage"],
       PACKET["lessonKey"], PACKET["stableLessonId"], PACKET["candidateRevision"]) ==
      (1, "Japanese:English", "travel-breakfast", "master", "master:2", old["stableId"], revision),
      "exact-pair or lesson identity")
check(old["stableId"] == "master-travel-breakfast:2:ja-en", "stable ID")
check(PACKET["reviewed"] is False and all(v is False for v in PACKET["gates"].values()), "closed gates")
check(curriculum_file["reviewed"] is False and reader_file["reviewed"] is False and
      archive_file["reviewed"] is False and archive_file["registered"] is False,
      "source/archive gates")
check(PACKET["source"]["curriculumSha256"] == hashlib.sha256(CURRICULUM.read_bytes()).hexdigest(),
      "curriculum pin")
check(PACKET["source"]["readerSha256"] == hashlib.sha256(READER.read_bytes()).hexdigest(),
      "Reader pin")
check(PACKET["archivedDraft"]["sha256"] == hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(),
      "archive pin")
check(PACKET["source"]["objectiveEnglishInternal"] == curriculum["objective"], "objective")
check(PACKET["source"]["speakingEnglishInternal"] == curriculum["speaking"], "speaking")
check(PACKET["source"]["readerVerbExamples"] == [v["example"] for v in reader_source["verbs"]],
      "verb examples")

cards, reader = PACKET["sourceCards"], PACKET["sourceSettingReader"]
check(len(cards) == len(curriculum["words"]) == 23, "card count")
check(len(reader) == len(reader_source["passage"]["target"]) ==
      len(reader_source["passage"]["native"]) == 18, "Reader count")
ids = [row["id"] for row in cards + reader]
check(len(set(ids)) == 41, "unique IDs")
for i, (row, original) in enumerate(zip(cards, curriculum["words"]), 1):
    check((row["id"], row["candidatePosition"]) == (f"{revision}:card:{i:02d}", i),
          f"card {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["kind"], row["sourceNoteInternal"]) ==
          (original["es"], original["en"], original["kind"], original.get("note")),
          f"card {i} source")
    check(row["literalJapaneseGlossEn"] == original["en"] and
          row["sourceEnglishIsJapaneseGloss"] is False, f"card {i} anchor/gloss")
    check(bool(row["targetJapaneseDraft"]) and row["learnerFaceEnabled"] is False,
          f"card {i} face/gate")
for i, row in enumerate(reader, 1):
    check((row["id"], row["candidatePosition"]) == (f"{revision}:reader:{i:02d}", i),
          f"Reader {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["literalJapaneseGlossEn"]) ==
          (reader_source["passage"]["target"][i - 1], reader_source["passage"]["native"][i - 1],
           reader_source["passage"]["native"][i - 1]), f"Reader {i} source")
    check(bool(row["targetJapaneseDraft"]) and row["speaker"] == "Narrator" and
          row["selectionStatus"] == "unapproved draft candidate" and
          row["learnerFaceEnabled"] is False and row["sourceEnglishIsJapaneseGloss"] is False,
          f"Reader {i} face/gate")
text = [row["targetJapaneseDraft"] for row in reader]
check("トリアナ" in text[0] and "セビリア" in text[0] and "イングリッド" in text[0],
      "Triana teach-back scene")
check("メディア" in text[2] and "エンテラ" in text[2], "half/whole")
check("モジェテ" in text[4] and "中" in text[4], "mollete crumb")
check("パン・デ・ビエナ" in text[5] and "皮" in text[5], "Vienna roll crust")
check("ピトゥフォ" in text[6] and "コーヒー" in text[6], "pitufo and coffee")
check("モジェテ" in text[7] and "聞" in text[7], "tentative house-bread belief")
check("ロシオ" in text[9] and "パン・デ・ビエナ" in text[9] and "別注文" in text[9],
      "owner correction")
check("豚" in text[12] and "パプリカ" in text[12] and "ロース" in text[12],
      "pork spreads direct explanation")
check("豚肉" in text[13] and "生ハム" in text[13], "Ingrid pork avoidance")
check("イングリッド" in text[17] and "トマト" in text[17] and "オイル" in text[17] and
      "焼き" in text[17] and "塩入れ" in text[17], "final order")
check(PACKET["speakingGoalLearnerEnabled"] is False and
      all(word in PACKET["speakingGoalJapaneseDraft"] for word in
          ("イングリッド", "セビリア", "トスターダ", "パン", "トッピング")),
      "speaking focus/gate")
for key, old_rows in (("oldCardPositionPlan", old["cards"]),
                      ("oldReaderPositionPlan", old["reader"])):
    rows = PACKET[key]
    check(len(rows) == len(old_rows), key + " count")
    check([row["oldEnglish"] for row in rows] == [row["en"] for row in old_rows],
          key + " order")
    check(all(row["candidate"] is None and "no saved-item migration" in row["disposition"]
              for row in rows), key + " migration")
overlap = {(oi, ni) for oi, old_row in enumerate(old["cards"], 1)
           for ni, row in enumerate(cards, 1)
           if old_row["ja"] == row["targetJapaneseDraft"]}
check(overlap == {(row["oldPosition"], row["candidatePosition"])
                  for row in PACKET["archivedExactCardOverlapInternal"]}, "overlap")
check(all(row["textOnly"] is True and row["migrationAuthorized"] is False
          for row in PACKET["archivedExactCardOverlapInternal"]), "overlap migration")
scope = PACKET["audioScopeReadOnly"]
faces = [row["targetJapaneseDraft"] for row in cards + reader]
check(scope["draftFacePlacements"] == 41 and scope["twoVoiceClipDecisionsIfTextApproved"] == 82,
      "audio placements")
check(scope["twoVoiceSubmittedCharactersIfTextApproved"] == 2 * sum(map(len, faces)),
      "audio characters")
check(scope["candidateIDsMatchingArchive"] == 0 and scope["synthesized"] is False and
      scope["listeningApproved"] is False and scope["registered"] is False, "audio gates")
check("do not authorize saved-item" in PACKET["savedPositionPolicy"], "saved-item policy")
check(len(PACKET["reviewQuestionsInternal"]) >= 6 and len(PACKET["missing"]) >= 6,
      "open review work")
metadata = json.loads((HERE / "ai-assistance-metadata.json").read_text())
check(metadata["qualifiedReview"] is False and len(metadata["calls"]) == 3,
      "AI metadata/review gate")
check(metadata["calls"][0]["requestedModel"] == "haiku" and
      metadata["calls"][0]["actualModelReported"] == "claude-sonnet-5-5" and
      metadata["calls"][0]["isError"] is False, "honest Haiku fallback")
check(metadata["calls"][1]["actualModelReported"] == "claude-opus-5-5" and
      metadata["calls"][2]["actualModelReported"] == "claude-fable-5-2",
      "actual critique models")
print("PASS Japanese Breakfast Master 2: 23 pinned cards, 18 Reader rows, 41 draft faces, closed gates")
