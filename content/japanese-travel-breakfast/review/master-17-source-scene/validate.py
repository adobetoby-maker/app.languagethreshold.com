"""Independent source, identity and closed-gate check for Master 17."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PACKET = json.loads((HERE / "source-setting-candidate.json").read_text())
CURRICULUM = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/master-16-18-draft.json"
EXPECTED = (
    "9403eb80ef58e72bcff62be5c6fac3b7c9a02b2e76acb237592fcc34ddb1f87b",
    "7cc91b0ca9a264ec20ac63a0e760e6df4b3cfc8ca7e931decc239c4329a74348",
    "a566248455c3ff2ef12188ce7b7b824e38a0f9e6a850415e7ae60104b0bab6c9",
)


def check(ok, label):
    if not ok:
        raise ValueError(label)


for path, expected in zip((CURRICULUM, READER, ARCHIVE), EXPECTED):
    check(hashlib.sha256(path.read_bytes()).hexdigest() == expected, "source drift " + str(path))
curriculum_file = json.loads(CURRICULUM.read_text())
reader_file = json.loads(READER.read_text())
archive_file = json.loads(ARCHIVE.read_text())
source = curriculum_file["lessons"][16]
reading = reader_file["lessons"]["17"]
old = archive_file["lessons"][1]
revision = "master-travel-breakfast:17:ja-en:source-scene-v1"
check((PACKET["schema"], PACKET["pairKey"], PACKET["track"], PACKET["stage"],
       PACKET["lessonKey"], PACKET["stableLessonId"], PACKET["candidateRevision"]) ==
      (1, "Japanese:English", "travel-breakfast", "master", "master:17", old["stableId"], revision),
      "exact pair / stable identity")
check(old["stableId"] == "master-travel-breakfast:17:ja-en" and source["n"] == old["n"] == 17,
      "source lesson identity")
check(PACKET["reviewed"] is False and all(v is False for v in PACKET["gates"].values()), "gates")
check(curriculum_file["reviewed"] is False and reader_file["reviewed"] is False and
      archive_file["reviewed"] is False and archive_file["registered"] is False, "source gates")
check((PACKET["source"]["curriculumSha256"], PACKET["source"]["readerSha256"],
       PACKET["archivedDraft"]["sha256"]) == EXPECTED, "pins")
check(PACKET["source"]["titleEnglishInternal"] == source["title"] and
      PACKET["source"]["objectiveEnglishInternal"] == source["objective"] and
      PACKET["source"]["speakingEnglishInternal"] == source["speaking"], "source objective")
check(PACKET["source"]["grammarEnglishExamplesInternal"] ==
      [row["en"] for row in source["grammar"]["examples"]], "source grammar")
check(PACKET["source"]["readerTitleSpanish"] == reading["passage"]["title"] and
      PACKET["source"]["readerVerbExamples"] == [row["example"] for row in reading["verbs"]],
      "source Reader metadata")
cards, reader = PACKET["sourceCards"], PACKET["sourceSettingReader"]
check(len(cards) == len(source["words"]) == 24 and
      len(reader) == len(reading["passage"]["native"]) == len(reading["passage"]["target"]) == 18,
      "source counts")
check(len({row["id"] for row in cards + reader}) == 42, "unique IDs")
for i, (row, original) in enumerate(zip(cards, source["words"]), 1):
    check((row["id"], row["candidatePosition"]) == (f"{revision}:card:{i:02d}", i), f"card {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["kind"], row["sourceNoteInternal"]) ==
          (original["es"], original["en"], original["kind"], original.get("note")), f"card {i} source")
    check(bool(row["targetJapaneseDraft"]) and row["literalJapaneseGlossEn"] == original["en"] and
          row["sourceEnglishIsJapaneseGloss"] is False and row["learnerFaceEnabled"] is False,
          f"card {i} face/gate")
for i, row in enumerate(reader, 1):
    en = reading["passage"]["native"][i - 1]
    es = reading["passage"]["target"][i - 1]
    check((row["id"], row["candidatePosition"]) == (f"{revision}:reader:{i:02d}", i), f"Reader {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["literalJapaneseGlossEn"]) ==
          (es, en, en), f"Reader {i} source")
    check(bool(row["targetJapaneseDraft"]) and row["selectionStatus"] == "unapproved draft candidate"
          and row["sourceEnglishIsJapaneseGloss"] is False and row["learnerFaceEnabled"] is False,
          f"Reader {i} face/gate")
    speaker = next((name for name in ("Emma", "Lucía") if en.startswith(name + ":")), "Narrator")
    check(row["speaker"] == speaker, f"Reader {i} speaker")
    if speaker != "Narrator":
        check(row["targetJapaneseDraft"].startswith({"Emma": "エマ：", "Lucía": "ルシア："}[speaker]),
              f"Reader {i} Japanese speaker")

# These checks protect the source's consent boundary and dated email request.
scene = [row["targetJapaneseDraft"] for row in reader]
for i, fragments in (
    (1, ("イネス・ソレル", "バレンシア", "エマ")),
    (2, ("10月13日", "火曜日", "アレルギー反応")),
    (5, ("診断名", "薬", "書かない")),
    (7, ("同意", "アーモンドアレルギー", "救急外来", "だけ")),
    (11, ("アーモンド入り", "アレルギー反応", "救急外来")),
    (14, ("15日以内", "謝罪", "アレルゲン一覧")),
    (15, ("苦情申立書", "添付")),
    (17, ("添付ファイル", "医療報告書", "含まれていない")),
    (18, ("エマ・クラーク",)),
):
    check(all(fragment in scene[i - 1] for fragment in fragments), f"Reader {i} scene")
check(PACKET["speakingGoalLearnerEnabled"] is False and
      all(term in PACKET["speakingGoalJapaneseDraft"] for term in
          ("イネス・ソレル", "ルシア", "健康情報", "診断名", "薬")), "speaking boundary")
for key, rows in (("oldCardPositionPlan", old["cards"]), ("oldReaderPositionPlan", old["reader"])):
    plan = PACKET[key]
    check(len(plan) == len(rows) and [item["oldEnglish"] for item in plan] ==
          [item["en"] for item in rows], key + " source")
    check(all(item["candidate"] is None and "no saved-item migration" in item["disposition"]
              for item in plan), key + " migration")
overlaps = {(oi, ni) for oi, old_row in enumerate(old["cards"], 1)
            for ni, row in enumerate(cards, 1) if old_row["ja"] == row["targetJapaneseDraft"]}
check(overlaps == {(item["oldPosition"], item["candidatePosition"])
                   for item in PACKET["archivedExactCardOverlapInternal"]}, "text overlap")
check(all(item["textOnly"] is True and item["migrationAuthorized"] is False
          for item in PACKET["archivedExactCardOverlapInternal"]), "overlap migration")
faces = [row["targetJapaneseDraft"] for row in cards + reader]
scope = PACKET["audioScopeReadOnly"]
check(scope["draftFacePlacements"] == 42 and scope["twoVoiceClipDecisionsIfTextApproved"] == 84 and
      scope["twoVoiceSubmittedCharactersIfTextApproved"] == 2 * sum(map(len, faces)) and
      scope["grossEstimateUSDAt30PerMillionCharacters"] ==
      round(30 * 2 * sum(map(len, faces)) / 1_000_000, 5), "audio scope")
check(scope["candidateIDsMatchingArchive"] == 0 and scope["synthesized"] is False and
      scope["listeningApproved"] is False and scope["registered"] is False, "audio gate")
metadata = json.loads((HERE / "ai-assistance-metadata.json").read_text())
check(metadata["qualifiedReview"] is False and
      all(call["qualifiedApproval"] is False for call in metadata["calls"]), "AI/qualified gate")
print("PASS Japanese Breakfast Master 17: 24 pinned cards, 18 Reader rows, 42 draft faces, closed gates")
