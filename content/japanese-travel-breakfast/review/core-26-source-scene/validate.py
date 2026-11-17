"""Independent source, identity, audio-scope and gate check for Core 26."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PACKET = json.loads((HERE / "source-setting-candidate.json").read_text())
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
OBJECTIVES = ROOT / "src/data/travel-zone.ts"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/core-1-30-draft.json"


def check(ok, label):
    if not ok:
        raise ValueError(label)


for path, expected in (
    (SOURCE, "8c00629a79532821ac7b554a4e0f828b25372500303b3dc70f9568c5aabb34cc"),
    (OBJECTIVES, "8ca7cacc58a272d5e2c9d55b06e265ec8f6b5102d412bc0382d448942e455fe8"),
    (ARCHIVE, "7a6ed4b3869c3599119ae74ea911f6c881bf87294342a060378a5a3f19de6112"),
):
    check(hashlib.sha256(path.read_bytes()).hexdigest() == expected, "source drift: " + str(path))

source_file = json.loads(SOURCE.read_text())
source = source_file["lessons"]["26"]
archive = json.loads(ARCHIVE.read_text())
old = archive["lessons"][25]
revision = "travel-breakfast:26:ja-en:source-scene-v1"
check((PACKET["schema"], PACKET["pairKey"], PACKET["track"], PACKET["stage"],
       PACKET["lessonKey"], PACKET["stableLessonId"], PACKET["candidateRevision"]) ==
      (1, "Japanese:English", "travel-breakfast", "core", "core:26", old["stableId"], revision),
      "exact-pair or lesson identity")
check(old["stableId"] == "travel-breakfast:26:ja-en", "stable ID")
check(PACKET["reviewed"] is False and all(v is False for v in PACKET["gates"].values()), "closed gates")
check(source_file["reviewed"] is False and archive["reviewed"] is False and archive["registered"] is False,
      "source/archive gates")
check(PACKET["source"]["contentSha256"] == hashlib.sha256(SOURCE.read_bytes()).hexdigest(), "source pin")
check(PACKET["source"]["objectivesSha256"] == hashlib.sha256(OBJECTIVES.read_bytes()).hexdigest(), "objective pin")
check(PACKET["archivedDraft"]["sha256"] == hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(), "archive pin")
check(PACKET["source"]["objectiveEnglishInternal"] == old["sourceEnglish"]["objective"], "objective")
check(PACKET["source"]["roleplayEnglishInternal"] == old["sourceEnglish"]["roleplay"], "roleplay")
check(PACKET["source"]["readerTitleSpanish"] == source["passage"]["title"], "Reader title")
check(PACKET["source"]["readerVerbExamples"] == [v["example"] for v in source["verbs"]], "verb examples")

cards, reader = PACKET["sourceCards"], PACKET["sourceSettingReader"]
check(len(cards) == len(source["words"]) == 17, "card count")
check(len(reader) == len(source["passage"]["target"]) == len(source["passage"]["native"]) == 9,
      "Reader count")
ids = [row["id"] for row in cards + reader]
check(len(set(ids)) == 26, "unique IDs")
for i, (row, original) in enumerate(zip(cards, source["words"]), 1):
    check((row["id"], row["candidatePosition"]) == (f"{revision}:card:{i:02d}", i), f"card {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["kind"], row["sourceNoteInternal"]) ==
          (original["es"], original["en"], original["kind"], original.get("note")), f"card {i} source")
    check(row["literalJapaneseGlossEn"] == original["en"], f"card {i} literal gloss")
    check(bool(row["targetJapaneseDraft"]) and row["learnerFaceEnabled"] is False and
          row["sourceEnglishIsJapaneseGloss"] is False, f"card {i} face/gates")
for i, row in enumerate(reader, 1):
    check((row["id"], row["candidatePosition"]) == (f"{revision}:reader:{i:02d}", i), f"Reader {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["literalJapaneseGlossEn"]) ==
          (source["passage"]["target"][i - 1], source["passage"]["native"][i - 1],
           source["passage"]["native"][i - 1]), f"Reader {i} source")
    check(bool(row["targetJapaneseDraft"]) and row["speaker"] == "Narrator" and
          row["selectionStatus"] == "unapproved draft candidate" and
          row["learnerFaceEnabled"] is False and row["sourceEnglishIsJapaneseGloss"] is False,
          f"Reader {i} face/gates")
check("2時間" in cards[12]["targetJapaneseDraft"] and
      "2時間" in reader[1]["targetJapaneseDraft"], "work-duration alignment")
check("火曜日" in reader[0]["targetJapaneseDraft"] and
      "レナ" in reader[0]["targetJapaneseDraft"], "Tuesday/Lena opening")
check("カウンター" in reader[1]["targetJapaneseDraft"] and
      "お昼どき" in reader[2]["targetJapaneseDraft"], "counter and lunchtime")
check("テーブルを空けます" in cards[16]["targetJapaneseDraft"] and
      "テーブルを空けます" in reader[3]["targetJapaneseDraft"], "vacate table alignment")
check("パスワード" in reader[4]["targetJapaneseDraft"] and
      "指し示します" in reader[4]["targetJapaneseDraft"] and
      "コンセント" in reader[4]["targetJapaneseDraft"], "slip, pointing and outlet")
check("カフェラテ" in reader[5]["targetJapaneseDraft"] and
      "甘いパン" in reader[5]["targetJapaneseDraft"], "source food")
check("次はいつ頃注文したらよろしいでしょうか" in cards[15]["targetJapaneseDraft"] and
      "次はいつ頃注文したらよろしいでしょうか" in reader[6]["targetJapaneseDraft"], "next order alignment")
check("30分ごと" in reader[7]["targetJapaneseDraft"] and
      "チップ" in reader[8]["targetJapaneseDraft"] and
      "お会計" in reader[8]["targetJapaneseDraft"], "return, bill and tip")
check("2時間" in PACKET["speakingGoalJapaneseDraft"] and
      PACKET["speakingGoalLearnerEnabled"] is False, "speaking setup/gate")
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
check(not any(number in face for face in faces for number in ("119", "911")),
      "no unrelated emergency number")
check(scope["draftFacePlacements"] == 26 and scope["twoVoiceClipDecisionsIfTextApproved"] == 52,
      "audio placements")
check(scope["twoVoiceSubmittedCharactersIfTextApproved"] == 2 * sum(map(len, faces)), "audio characters")
check(scope["archivedExactJapaneseCardTextOverlapsOnly"] == len(overlap), "audio text overlap")
check(scope["candidateIDsMatchingArchive"] == 0 and scope["synthesized"] is False and
      scope["listeningApproved"] is False and scope["registered"] is False, "audio gates")
check("do not authorize saved-item" in PACKET["savedPositionPolicy"], "saved-item policy")
check(len(PACKET["reviewQuestionsInternal"]) >= 6 and len(PACKET["missing"]) >= 6, "open review work")
print("PASS Japanese Breakfast Core 26: 17 pinned cards, 9 Reader rows, 26 draft faces, closed gates")
