"""Independent source, identity, audio-scope and gate check for Core 27."""

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
source = source_file["lessons"]["27"]
archive = json.loads(ARCHIVE.read_text())
old = archive["lessons"][26]
revision = "travel-breakfast:27:ja-en:source-scene-v1"
check((PACKET["schema"], PACKET["pairKey"], PACKET["track"], PACKET["stage"],
       PACKET["lessonKey"], PACKET["stableLessonId"], PACKET["candidateRevision"]) ==
      (1, "Japanese:English", "travel-breakfast", "core", "core:27", old["stableId"], revision),
      "exact-pair or lesson identity")
check(old["stableId"] == "travel-breakfast:27:ja-en", "stable ID")
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
check(len(cards) == len(source["words"]) == 16, "card count")
check(len(reader) == len(source["passage"]["target"]) == len(source["passage"]["native"]) == 9,
      "Reader count")
ids = [row["id"] for row in cards + reader]
check(len(set(ids)) == 25, "unique IDs")
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
check("午前5時30分" in cards[12]["targetJapaneseDraft"] and
      "午前5時30分" in reader[1]["targetJapaneseDraft"] and
      "7時" in reader[1]["targetJapaneseDraft"], "departure and breakfast hours")
check("午後9時" in reader[0]["targetJapaneseDraft"], "evening arrival")
check("紙袋" in reader[3]["targetJapaneseDraft"] and
      all(word in reader[3]["targetJapaneseDraft"] for word in ("果物", "パン", "ジュース")),
      "bag contents")
check("ナッツアレルギー" in reader[4]["targetJapaneseDraft"] and
      "部屋番号" in reader[4]["targetJapaneseDraft"] and
      "書き留め" in reader[4]["targetJapaneseDraft"], "allergy observation")
check("午前5時" in reader[6]["targetJapaneseDraft"] and
      "フロント" in reader[6]["targetJapaneseDraft"], "pickup time and location")
check("宿泊料金" in cards[15]["targetJapaneseDraft"] and
      "予約" in reader[8]["targetJapaneseDraft"] and "朝食" in reader[8]["targetJapaneseDraft"],
      "rate and inclusion")
check(not any(word in row["targetJapaneseDraft"] for row in cards + reader
              for word in ("安全です", "アレルギー対応", "ナッツ不使用", "完全に除去")),
      "no invented allergy-safety assurance")
check(PACKET["speakingGoalLearnerEnabled"] is False and
      "午前5時30分" in PACKET["speakingGoalJapaneseDraft"], "speaking setup/gate")
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
check(scope["draftFacePlacements"] == 25 and scope["twoVoiceClipDecisionsIfTextApproved"] == 50,
      "audio placements")
check(scope["twoVoiceSubmittedCharactersIfTextApproved"] == 2 * sum(map(len, faces)), "audio characters")
check(scope["archivedExactJapaneseCardTextOverlapsOnly"] == len(overlap), "audio text overlap")
check(scope["candidateIDsMatchingArchive"] == 0 and scope["synthesized"] is False and
      scope["listeningApproved"] is False and scope["registered"] is False, "audio gates")
check("do not authorize saved-item" in PACKET["savedPositionPolicy"], "saved-item policy")
check(len(PACKET["reviewQuestionsInternal"]) >= 6 and len(PACKET["missing"]) >= 6, "open review work")
print("PASS Japanese Breakfast Core 27: 16 pinned cards, 9 Reader rows, 25 draft faces, closed gates")
