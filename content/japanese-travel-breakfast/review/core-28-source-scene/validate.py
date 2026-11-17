"""Independent source, scene, identity, audio-scope and gate check for Core 28."""

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
source = source_file["lessons"]["28"]
old = json.loads(ARCHIVE.read_text())["lessons"][27]
revision = "travel-breakfast:28:ja-en:source-scene-v1"
check((PACKET["schema"], PACKET["pairKey"], PACKET["track"], PACKET["stage"],
       PACKET["lessonKey"], PACKET["stableLessonId"], PACKET["candidateRevision"]) ==
      (1, "Japanese:English", "travel-breakfast", "core", "core:28", old["stableId"], revision),
      "exact-pair or lesson identity")
check(old["n"] == 28 and old["stableId"] == "travel-breakfast:28:ja-en", "stable ID")
check(PACKET["reviewed"] is False and all(v is False for v in PACKET["gates"].values()), "closed gates")
check(source_file["reviewed"] is False and PACKET["source"]["sourceReviewed"] is False, "source review")
check(PACKET["source"]["contentSha256"] == hashlib.sha256(SOURCE.read_bytes()).hexdigest(), "source pin")
check(PACKET["source"]["objectivesSha256"] == hashlib.sha256(OBJECTIVES.read_bytes()).hexdigest(), "objective pin")
check(PACKET["archivedDraft"]["sha256"] == hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(), "archive pin")
check(PACKET["source"]["objectiveEnglishInternal"] == old["sourceEnglish"]["objective"], "objective")
check(PACKET["source"]["roleplayEnglishInternal"] == old["sourceEnglish"]["roleplay"], "roleplay")
check(PACKET["source"]["readerTitleSpanish"] == source["passage"]["title"], "Reader title")
check(PACKET["source"]["readerVerbExamples"] == [v["example"] for v in source["verbs"]], "verbs")

cards, reader = PACKET["sourceCards"], PACKET["sourceSettingReader"]
check(len(cards) == len(source["words"]) == 18, "card count")
check(len(reader) == len(source["passage"]["target"]) == len(source["passage"]["native"]) == 8,
      "Reader count")
check(len({row["id"] for row in cards + reader}) == 26, "unique IDs")
for i, (row, original) in enumerate(zip(cards, source["words"]), 1):
    check((row["id"], row["candidatePosition"]) == (f"{revision}:card:{i:02d}", i), f"card {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["kind"], row["sourceNoteInternal"]) ==
          (original["es"], original["en"], original["kind"], original.get("note")), f"card {i} source")
    check(row["literalJapaneseGlossEn"] == original["en"] and bool(row["targetJapaneseDraft"]),
          f"card {i} face")
    check(row["learnerFaceEnabled"] is False and row["sourceEnglishIsJapaneseGloss"] is False,
          f"card {i} gate")
for i, row in enumerate(reader, 1):
    check((row["id"], row["candidatePosition"]) == (f"{revision}:reader:{i:02d}", i), f"Reader {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["literalJapaneseGlossEn"]) ==
          (source["passage"]["target"][i - 1], source["passage"]["native"][i - 1],
           source["passage"]["native"][i - 1]), f"Reader {i} source")
    check(bool(row["targetJapaneseDraft"]) and row["speaker"] == "Narrator" and
          row["selectionStatus"] == "unapproved draft candidate" and
          row["learnerFaceEnabled"] is False and row["sourceEnglishIsJapaneseGloss"] is False,
          f"Reader {i} face/gates")

# Facts that the archived generic café chat changed or omitted.
check("ドン・ラモン" in reader[0]["targetJapaneseDraft"] and "退職者" in reader[0]["targetJapaneseDraft"],
      "Don Ramón retiree")
check("カナダ" in reader[1]["targetJapaneseDraft"] and "2週間" in reader[1]["targetJapaneseDraft"],
      "Canada/two weeks")
check("40年" in reader[3]["targetJapaneseDraft"] and "教師" in reader[3]["targetJapaneseDraft"] and
      "広場" in reader[3]["targetJapaneseDraft"], "forty years/plaza school")
check("土曜日" in reader[5]["targetJapaneseDraft"] and "パン・ドゥルセ" in reader[5]["targetJapaneseDraft"],
      "Saturday pan dulce")
check("博物館" in reader[6]["targetJapaneseDraft"] and "中心部" in reader[6]["targetJapaneseDraft"],
      "downtown museum")
check("会計" in reader[7]["targetJapaneseDraft"] and "お話しできて" in reader[7]["targetJapaneseDraft"],
      "paid bill and close")
check(not any(token in row["targetJapaneseDraft"] for row in reader
              for token in ("公園", "駅", "早く閉まる")), "no archived park/station/early close")
check(PACKET["speakingGoalLearnerEnabled"] is False and "ドン・ラモン" in
      PACKET["speakingGoalJapaneseDraft"], "speaking gate")
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
check(scope["draftFacePlacements"] == 26 and scope["twoVoiceClipDecisionsIfTextApproved"] == 52,
      "audio placements")
check(scope["twoVoiceSubmittedCharactersIfTextApproved"] == 2 * sum(map(len, faces)), "audio chars")
check(scope["archivedExactJapaneseCardTextOverlapsOnly"] == len(overlap), "overlap scope")
check(scope["candidateIDsMatchingArchive"] == 0 and scope["synthesized"] is False and
      scope["listeningApproved"] is False and scope["registered"] is False, "audio gates")
check("do not authorize saved-item" in PACKET["savedPositionPolicy"], "saved-item policy")
check(len(PACKET["reviewQuestionsInternal"]) >= 6 and len(PACKET["missing"]) >= 6, "open review")
print("PASS Japanese Breakfast Core 28: 18 pinned cards, 8 Reader rows, 26 draft faces, closed gates")
