"""Independent source, identity, audio-scope and false-gate check for Master 8."""

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
curriculum = curriculum_file["lessons"][7]
reader_file = json.loads(READER.read_text())
reader_source = reader_file["lessons"]["8"]
archive_file = json.loads(ARCHIVE.read_text())
old = archive_file["lessons"][1]
revision = "master-travel-breakfast:8:ja-en:source-scene-v1"
check((PACKET["schema"], PACKET["pairKey"], PACKET["track"], PACKET["stage"],
       PACKET["lessonKey"], PACKET["stableLessonId"], PACKET["candidateRevision"]) ==
      (1, "Japanese:English", "travel-breakfast", "master", "master:8", old["stableId"], revision),
      "exact-pair or lesson identity")
check(old["stableId"] == "master-travel-breakfast:8:ja-en", "stable ID")
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
check("バルセロナ" in text[0] and "グラシア" in text[0] and "土曜日" in text[0], "locale/day")
check("ケンジ" in text[1] and "ジョルディ" in text[1] and "コカ" in text[1], "café/food/people")
check("表面" in text[2] and "アーモンド" in text[2], "almond surface")
check("重い" in text[3] and "木の実" in text[3], "severe allergy")
check("削り取" in text[4] and "一切れ" in text[4], "server offer")
check("削り取らない" in text[6], "refusal")
check("アーモンド" in text[8] and "同じ台" in text[8] and "生地" in text[8], "bakery surface")
check("生地" in text[10] and "かけら" in text[10], "dough bits")
check("アナフィラキシー" in text[12] and "昨年" in text[12], "prior anaphylaxis")
check("抗ヒスタミン薬" in text[13] and "自己注射器" in text[13] and "112" in text[13], "clinical items/emergency")
check("アレルゲン表示" in text[14], "packaged label request")
check("微量" in text[15] and "木の実" in text[15], "trace warning")
check("何も食べない" in text[16], "decline")
check("原材料" in text[17] and "清潔な器具" in text[17] and "厨房" in text[17], "hot chocolate conditional")
check(PACKET["speakingGoalLearnerEnabled"] is False and
      all(word in PACKET["speakingGoalJapaneseDraft"] for word in
          ("バルセロナ", "ケンジ", "ジョルディ", "アーモンド")),
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
check(len(PACKET["reviewQuestionsInternal"]) >= 5 and len(PACKET["missing"]) >= 6,
      "open review work")
metadata = json.loads((HERE / "ai-assistance-metadata.json").read_text())
check(metadata["qualifiedReview"] is False and metadata["cliAvailable"] is False,
      "AI metadata/review gate")
check(all(call["isError"] is True and call["actualModelReported"] is None
          for call in metadata["calls"]), "honest failed model attempts")
print("PASS Japanese Breakfast Master 8: 23 pinned cards, 18 Reader rows, 41 draft faces, closed gates")
