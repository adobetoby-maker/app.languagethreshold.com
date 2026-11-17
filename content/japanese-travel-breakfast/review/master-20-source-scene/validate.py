"""Independent source, identity, scene, audio-scope and gate checks for Master 20."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PACKET = json.loads((HERE / "source-setting-candidate.json").read_text())
SOURCES = {
    "curriculum": ("src/data/core60/es/master-travel-breakfast.json", "9403eb80ef58e72bcff62be5c6fac3b7c9a02b2e76acb237592fcc34ddb1f87b"),
    "reader": ("public/lesson-content/es/master-travel-breakfast.json", "7cc91b0ca9a264ec20ac63a0e760e6df4b3cfc8ca7e931decc239c4329a74348"),
    "archive": ("content/review-archive/french-japanese-2026-11-15/japanese-breakfast/master-19-20-draft.json", "43665cf686c2fee88655e3904f7e07606519744aa70b833dcfd6799f5bcaa127"),
}


def check(ok, label):
    if not ok:
        raise ValueError(label)


for name, (relative, expected) in SOURCES.items():
    check(hashlib.sha256((ROOT / relative).read_bytes()).hexdigest() == expected, name + " drift")

curriculum = json.loads((ROOT / SOURCES["curriculum"][0]).read_text())
reader = json.loads((ROOT / SOURCES["reader"][0]).read_text())
archive = json.loads((ROOT / SOURCES["archive"][0]).read_text())
source = curriculum["lessons"][19]
reading = reader["lessons"]["20"]
old = archive["lessons"][1]
revision = "master-travel-breakfast:20:ja-en:source-scene-v1"

check((PACKET["schema"], PACKET["pairKey"], PACKET["track"], PACKET["stage"],
       PACKET["lessonKey"], PACKET["stableLessonId"], PACKET["candidateRevision"]) ==
      (1, "Japanese:English", "travel-breakfast", "master", "master:20", old["stableId"], revision),
      "exact pair or identity")
check(source["n"] == old["n"] == 20 and old["stableId"] == "master-travel-breakfast:20:ja-en", "stable identity")
check(PACKET["reviewed"] is False and all(v is False for v in PACKET["gates"].values()), "false gates")
check(curriculum["reviewed"] is False and reader["reviewed"] is False and
      archive["reviewed"] is False and archive["registered"] is False, "source gates")
check(PACKET["source"]["curriculumSha256"] == SOURCES["curriculum"][1] and
      PACKET["source"]["readerSha256"] == SOURCES["reader"][1] and
      PACKET["archivedDraft"]["sha256"] == SOURCES["archive"][1], "source pins")
check(PACKET["source"]["titleEnglishInternal"] == source["title"] and
      PACKET["source"]["objectiveEnglishInternal"] == source["objective"] and
      PACKET["source"]["speakingEnglishInternal"] == source["speaking"], "source objective")
check(PACKET["source"]["grammarEnglishExamplesInternal"] ==
      [row["en"] for row in source["grammar"]["examples"]], "grammar source")
check(PACKET["source"]["readerVerbExamples"] == [row["example"] for row in reading["verbs"]], "verbs source")
cards, turns = PACKET["sourceCards"], PACKET["sourceSettingReader"]
check(len(cards) == len(source["words"]) == 23 and
      len(turns) == len(reading["passage"]["target"]) == len(reading["passage"]["native"]) == 18,
      "card or Reader count")
check(len({row["id"] for row in cards + turns}) == 41, "unique revision IDs")
for i, (row, original) in enumerate(zip(cards, source["words"]), 1):
    check((row["id"], row["candidatePosition"], row["sourceSpanish"], row["sourceEnglish"],
           row["kind"], row["sourceNoteInternal"]) ==
          (f"{revision}:card:{i:02d}", i, original["es"], original["en"],
           original["kind"], original.get("note")), f"card {i} source/ID")
    check(bool(row["targetJapaneseDraft"]) and row["literalJapaneseGlossEn"] == original["en"] and
          row["sourceEnglishIsJapaneseGloss"] is False and row["learnerFaceEnabled"] is False,
          f"card {i} draft gate")
for i, row in enumerate(turns, 1):
    english, spanish = reading["passage"]["native"][i - 1], reading["passage"]["target"][i - 1]
    check((row["id"], row["candidatePosition"], row["sourceSpanish"], row["sourceEnglish"],
           row["literalJapaneseGlossEn"]) ==
          (f"{revision}:reader:{i:02d}", i, spanish, english, english), f"Reader {i} source/ID")
    check(bool(row["targetJapaneseDraft"]) and row["selectionStatus"] == "unapproved draft candidate" and
          row["sourceEnglishIsJapaneseGloss"] is False and row["learnerFaceEnabled"] is False,
          f"Reader {i} draft gate")

for index, required in (
    (0, ("ダニエル", "親戚5人", "プエブラ", "ホテル・アスレホ", "カフェ・チョルーラ")),
    (1, ("エミリオ", "スペイン語")),
    (2, ("チャルーパス", "チャンプラード", "コマル")),
    (3, ("ローサ", "ピーナッツアレルギー", "バインダー")),
    (7, ("モレ・ポブラーノ", "売り切れ")),
    (9, ("ピピアン", "ピーナッツ")),
    (11, ("ピピアン", "ピーナッツ", "エンフリホラーダス")),
    (13, ("6人分", "アレルギー", "エンフリホラーダス")),
    (14, ("モロテス", "ハビエル", "セミータス")),
    (15, ("ルピータ", "20分")),
    (16, ("鍵", "支配人", "バインダー")),
    (17, ("満足度アンケート", "バインダー")),
):
    check(all(word in turns[index]["targetJapaneseDraft"] for word in required),
          f"Reader {index + 1} scene")
check(all(word in PACKET["speakingGoalJapaneseDraft"] for word in
          ("親戚5人", "エミリオ", "ローサ", "ブレンダ", "ピーナッツ", "6人分", "ルピータ", "20分", "支配人")),
      "speaking source scene")
check(PACKET["speakingGoalLearnerEnabled"] is False, "speaking gate")
check(all(row["candidate"] is None for row in PACKET["oldCardPositionPlan"] +
          PACKET["oldReaderPositionPlan"]), "saved-position policy")
scope = PACKET["audioScopeReadOnly"]
faces = [row["targetJapaneseDraft"] for row in cards + turns]
check((scope["draftFacePlacements"], scope["twoVoiceClipDecisionsIfTextApproved"],
       scope["twoVoiceSubmittedCharactersIfTextApproved"]) ==
      (41, 82, 2 * sum(map(len, faces))), "audio scope")
check(scope["synthesized"] is False and scope["listeningApproved"] is False and
      scope["registered"] is False and scope["candidateIDsMatchingArchive"] == 0, "audio gates")
print(f"PASS Japanese Breakfast Master 20: 23 pinned cards, 18 Reader rows, 41 draft faces, closed gates; {scope['twoVoiceSubmittedCharactersIfTextApproved']} audio characters")
