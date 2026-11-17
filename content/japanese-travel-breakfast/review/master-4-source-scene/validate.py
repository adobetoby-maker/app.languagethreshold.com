"""Independent source, identity, audio-scope and false-gate check for Master 4."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PACKET = json.loads((HERE / "source-setting-candidate.json").read_text())
CURRICULUM = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/master-4-6-draft.json"


def check(ok, label):
    if not ok:
        raise ValueError(label)


for path, expected in (
    (CURRICULUM, "9403eb80ef58e72bcff62be5c6fac3b7c9a02b2e76acb237592fcc34ddb1f87b"),
    (READER, "7cc91b0ca9a264ec20ac63a0e760e6df4b3cfc8ca7e931decc239c4329a74348"),
    (ARCHIVE, "62e2ec4a86b1639f04241a0312acd3a6e06cb430950ec379964856d6d6fd5004"),
):
    check(hashlib.sha256(path.read_bytes()).hexdigest() == expected, "source drift: " + str(path))

curriculum_file = json.loads(CURRICULUM.read_text())
curriculum = curriculum_file["lessons"][3]
reader_file = json.loads(READER.read_text())
source_reader = reader_file["lessons"]["4"]["passage"]
archive_file = json.loads(ARCHIVE.read_text())
old = archive_file["lessons"][0]
revision = "master-travel-breakfast:4:ja-en:source-scene-v1"
check((PACKET["schema"], PACKET["pairKey"], PACKET["track"], PACKET["stage"],
       PACKET["lessonKey"], PACKET["stableLessonId"], PACKET["candidateRevision"]) ==
      (1, "Japanese:English", "travel-breakfast", "master", "master:4", old["stableId"], revision),
      "exact-pair or lesson identity")
check(old["stableId"] == "master-travel-breakfast:4:ja-en", "stable ID")
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
      [v["example"] for v in reader_file["lessons"]["4"]["verbs"]], "Reader verb examples")

cards, reader = PACKET["sourceCards"], PACKET["sourceSettingReader"]
check(len(cards) == len(curriculum["words"]) == 23, "card count")
check(len(reader) == len(source_reader["target"]) == len(source_reader["native"]) == 18,
      "Reader count")
check(len({row["id"] for row in cards + reader}) == 41, "unique candidate IDs")
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
check(all(x in reader[0]["targetJapaneseDraft"] for x in ("リマ", "ミラフローレス", "エリフ")),
      "Miraflores/Elif scene")
check("3月3日" in reader[5]["targetJapaneseDraft"] and "9月" in reader[5]["targetJapaneseDraft"],
      "outdated chart timeline")
check("食パン" in reader[7]["targetJapaneseDraft"] and "種" in reader[7]["targetJapaneseDraft"],
      "sliced bread seeds")
check("ごま" in reader[12]["targetJapaneseDraft"] and "製品仕様書" in reader[12]["targetJapaneseDraft"],
      "spec sheet confirms sesame")
check("微量" in reader[13]["targetJapaneseDraft"] and "可能性" in reader[13]["targetJapaneseDraft"],
      "French roll trace label")
check(all(x in reader[15]["targetJapaneseDraft"] for x in ("別々の調理器具", "卵", "塩", "バター")),
      "separate scrambled eggs facts")
check("安全" not in reader[15]["targetJapaneseDraft"], "no unsupported eggs safety claim")
check("エピネフリン自己注射器" in reader[16]["targetJapaneseDraft"] and
      all(x in reader[17]["targetJapaneseDraft"] for x in ("アレルギー反応", "医師の指示", "救急車")),
      "clinical ending")
check(not any(number in reader[17]["targetJapaneseDraft"] for number in ("119", "911")),
      "no invented local emergency number")
check(PACKET["speakingGoalLearnerEnabled"] is False and
      all(x in PACKET["speakingGoalJapaneseDraft"] for x in ("エリフ", "レンソ", "ごま")),
      "speaking setup/gate")
check(all(x in PACKET["japaneseSpecificFocusCandidate"] for x in
          ("〜する前に", "〜した後で", "〜する必要がある")), "Japanese grammar focus")
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
check(scope["draftFacePlacements"] == 41 and scope["twoVoiceClipDecisionsIfTextApproved"] == 82,
      "audio placement scope")
check(scope["twoVoiceSubmittedCharactersIfTextApproved"] == 2 * sum(map(len, faces)), "audio characters")
check(scope["archivedExactJapaneseCardTextOverlapsOnly"] == len(overlap), "audio overlap")
check(scope["candidateIDsMatchingArchive"] == 0 and scope["synthesized"] is False and
      scope["listeningApproved"] is False and scope["registered"] is False, "audio gates")
check("do not authorize saved-item" in PACKET["savedPositionPolicy"], "saved-item policy")
check(len(PACKET["reviewQuestionsInternal"]) >= 6 and len(PACKET["missing"]) >= 6, "open review work")
metadata = json.loads((HERE / "ai-assistance-metadata.json").read_text())
check(metadata["qualifiedReview"] is False and metadata["authStatus"]["loggedIn"] is False and
      metadata["calls"][0]["actualModelReported"] is None and metadata["calls"][0]["isError"] is True,
      "AI unavailability and review gates")
print("PASS Japanese Breakfast Master 4: 23 pinned cards, 18 Reader rows, 41 draft faces, closed gates")
