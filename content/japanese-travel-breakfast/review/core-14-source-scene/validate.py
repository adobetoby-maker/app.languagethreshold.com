"""Independent source, identity, audio-scope and closed-gate check for Core 14."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PACKET = json.loads((HERE / "source-setting-candidate.json").read_text())
CANDIDATE = json.loads((HERE / "candidate-text.json").read_text())
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
OBJECTIVES = ROOT / "src/data/travel-zone.ts"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/core-1-30-draft.json"
HASHES = (
    (SOURCE, "8c00629a79532821ac7b554a4e0f828b25372500303b3dc70f9568c5aabb34cc"),
    (OBJECTIVES, "8ca7cacc58a272d5e2c9d55b06e265ec8f6b5102d412bc0382d448942e455fe8"),
    (ARCHIVE, "7a6ed4b3869c3599119ae74ea911f6c881bf87294342a060378a5a3f19de6112"),
)


def check(ok, label):
    if not ok:
        raise ValueError(label)


for path, expected in HASHES:
    check(hashlib.sha256(path.read_bytes()).hexdigest() == expected, "source drift: " + str(path))
source_file = json.loads(SOURCE.read_text())
source = source_file["lessons"]["14"]
archive = json.loads(ARCHIVE.read_text())
old = archive["lessons"][13]
revision = "travel-breakfast:14:ja-en:source-scene-v1"
check((PACKET["schema"], PACKET["pairKey"], PACKET["track"], PACKET["stage"],
       PACKET["lessonKey"], PACKET["stableLessonId"], PACKET["candidateRevision"]) ==
      (1, "Japanese:English", "travel-breakfast", "core", "core:14", old["stableId"], revision),
      "exact-pair or lesson identity")
check(old["stableId"] == "travel-breakfast:14:ja-en", "stable ID")
check(PACKET["reviewed"] is False and all(v is False for v in PACKET["gates"].values()), "closed gates")
check(source_file["reviewed"] is False and archive["reviewed"] is False and archive["registered"] is False,
      "source/archive gates")
check(PACKET["source"]["contentSha256"] == HASHES[0][1] and
      PACKET["source"]["objectivesSha256"] == HASHES[1][1] and
      PACKET["archivedDraft"]["sha256"] == HASHES[2][1], "packet pins")
check(PACKET["source"]["objectiveEnglishInternal"] == old["sourceEnglish"]["objective"] and
      PACKET["source"]["roleplayEnglishInternal"] == old["sourceEnglish"]["roleplay"], "objective/roleplay")
check(PACKET["source"]["readerTitleSpanish"] == source["passage"]["title"] and
      PACKET["source"]["readerVerbExamples"] == [v["example"] for v in source["verbs"]], "Reader/verb source")

cards, reader = PACKET["sourceCards"], PACKET["sourceSettingReader"]
check(len(cards) == len(source["words"]) == len(CANDIDATE["cards"]) == 18, "card count")
check(len(reader) == len(source["passage"]["target"]) == len(source["passage"]["native"]) ==
      len(CANDIDATE["reader"]) == 9, "Reader count")
check(len({r["id"] for r in cards + reader}) == 27, "unique row IDs")
for i, (row, original, face) in enumerate(zip(cards, source["words"], CANDIDATE["cards"]), 1):
    check((row["id"], row["candidatePosition"]) == (f"{revision}:card:{i:02d}", i), f"card {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["kind"], row["sourceNoteInternal"]) ==
          (original["es"], original["en"], original["kind"], original.get("note")), f"card {i} source")
    check((row["targetJapaneseDraft"], row["literalJapaneseGlossEn"]) ==
          (face["ja"], face["glossEn"]), f"card {i} Japanese/gloss")
    check(bool(row["targetJapaneseDraft"]) and bool(row["literalJapaneseGlossEn"]) and
          row["learnerFaceEnabled"] is False and row["sourceEnglishIsJapaneseGloss"] is False,
          f"card {i} face/gates")
for i, (row, face) in enumerate(zip(reader, CANDIDATE["reader"]), 1):
    check((row["id"], row["candidatePosition"]) == (f"{revision}:reader:{i:02d}", i), f"Reader {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"]) ==
          (source["passage"]["target"][i - 1], source["passage"]["native"][i - 1]),
          f"Reader {i} source")
    check((row["targetJapaneseDraft"], row["literalJapaneseGlossEn"]) ==
          (face["ja"], face["glossEn"]), f"Reader {i} Japanese/gloss")
    check(bool(row["targetJapaneseDraft"]) and row["speaker"] == "Narrator" and
          row["selectionStatus"] == "unapproved draft candidate" and row["learnerFaceEnabled"] is False and
          row["sourceEnglishIsJapaneseGloss"] is False, f"Reader {i} face/gates")
check("12分" in reader[1]["targetJapaneseDraft"] and "8時" in reader[0]["targetJapaneseDraft"] and
      "5分" in reader[5]["targetJapaneseDraft"], "time sequence")
check("エッグサンド" in reader[3]["targetJapaneseDraft"] and
      "アメリカーノ" in reader[3]["targetJapaneseDraft"] and
      "持ち帰り" in reader[6]["targetJapaneseDraft"], "source order and food")
check("伝票" in cards[2]["targetJapaneseDraft"] and "伝票" in cards[17]["targetJapaneseDraft"] and
      "伝票" in reader[7]["targetJapaneseDraft"], "bill document sense")
check("支払" in reader[7]["targetJapaneseDraft"], "counter payment")
for key, old_rows in (("oldCardPositionPlan", old["cards"]), ("oldReaderPositionPlan", old["reader"])):
    rows = PACKET[key]
    check(len(rows) == len(old_rows), key + " count")
    check([r["oldEnglish"] for r in rows] == [r["en"] for r in old_rows], key + " order")
    check(all(r["candidate"] is None and "no saved-item migration" in r["disposition"] for r in rows),
          key + " migration")
overlap = {(oi, ni) for oi, old_row in enumerate(old["cards"], 1)
           for ni, row in enumerate(cards, 1) if old_row["ja"] == row["targetJapaneseDraft"]}
check(overlap == {(r["oldPosition"], r["candidatePosition"])
                  for r in PACKET["archivedExactJapaneseCardTextOverlapsInternal"]}, "text overlap")
check(all(r["textOnly"] is True and r["migrationAuthorized"] is False
          for r in PACKET["archivedExactJapaneseCardTextOverlapsInternal"]), "overlap migration")
faces = [r["targetJapaneseDraft"] for r in cards + reader]
scope = PACKET["audioScopeReadOnly"]
check(scope["draftFacePlacements"] == 27 and scope["twoVoiceClipDecisionsIfTextApproved"] == 54,
      "audio placements")
check(scope["twoVoiceSubmittedCharactersIfTextApproved"] == 2 * sum(map(len, faces)), "audio characters")
check(scope["grossEstimateUSDAt30PerMillionCharacters"] ==
      round(30 * 2 * sum(map(len, faces)) / 1_000_000, 5), "audio estimate")
check(scope["candidateIDsMatchingArchive"] == 0 and scope["synthesized"] is False and
      scope["listeningApproved"] is False and scope["registered"] is False, "audio gates")
check("do not authorize saved-item" in PACKET["savedPositionPolicy"], "saved-item policy")
check(len(PACKET["reviewQuestionsInternal"]) >= 6 and len(PACKET["missing"]) >= 6, "open review work")
print("PASS Japanese Breakfast Core 14: 18 pinned cards, 9 Reader rows, 27 draft faces, closed gates")
