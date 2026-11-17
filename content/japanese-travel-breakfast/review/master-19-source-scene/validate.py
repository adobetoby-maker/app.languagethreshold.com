"""Independent source, identity, scene, audio-scope and gate check for Master 19."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
packet = json.loads((HERE / "source-setting-candidate.json").read_text())
curriculum_path = ROOT / "src/data/core60/es/master-travel-breakfast.json"
reader_path = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
archive_path = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/master-19-20-draft.json"


def check(ok, label):
    if not ok:
        raise ValueError(label)


for path, expected in (
    (curriculum_path, "9403eb80ef58e72bcff62be5c6fac3b7c9a02b2e76acb237592fcc34ddb1f87b"),
    (reader_path, "7cc91b0ca9a264ec20ac63a0e760e6df4b3cfc8ca7e931decc239c4329a74348"),
    (archive_path, "43665cf686c2fee88655e3904f7e07606519744aa70b833dcfd6799f5bcaa127"),
):
    check(hashlib.sha256(path.read_bytes()).hexdigest() == expected, "source drift: " + str(path))

curriculum_file = json.loads(curriculum_path.read_text())
reader_file = json.loads(reader_path.read_text())
archive_file = json.loads(archive_path.read_text())
source = curriculum_file["lessons"][18]
reading = reader_file["lessons"]["19"]
old = archive_file["lessons"][0]
revision = "master-travel-breakfast:19:ja-en:source-scene-v1"
check((packet["pairKey"], packet["track"], packet["stage"], packet["lessonKey"],
       packet["stableLessonId"], packet["candidateRevision"]) ==
      ("Japanese:English", "travel-breakfast", "master", "master:19", old["stableId"], revision),
      "exact-pair identity")
check(source["n"] == old["n"] == 19 and old["stableId"] == "master-travel-breakfast:19:ja-en",
      "stable lesson identity")
check(packet["reviewed"] is False and all(value is False for value in packet["gates"].values()),
      "closed gates")
check(not curriculum_file["reviewed"] and not reader_file["reviewed"] and
      not archive_file["reviewed"] and not archive_file["registered"], "source/archive gates")
check(packet["source"]["curriculumSha256"] == hashlib.sha256(curriculum_path.read_bytes()).hexdigest() and
      packet["source"]["readerSha256"] == hashlib.sha256(reader_path.read_bytes()).hexdigest() and
      packet["archivedDraft"]["sha256"] == hashlib.sha256(archive_path.read_bytes()).hexdigest(), "source pins")
check(packet["source"]["titleEnglishInternal"] == source["title"] and
      packet["source"]["objectiveEnglishInternal"] == source["objective"] and
      packet["source"]["speakingEnglishInternal"] == source["speaking"], "source goals")
check(packet["source"]["grammarEnglishExamplesInternal"] ==
      [row["en"] for row in source["grammar"]["examples"]], "grammar")
cards, reader = packet["sourceCards"], packet["sourceSettingReader"]
check(len(cards) == len(source["words"]) == 24 and len(reader) == 18, "counts")
check(len({row["id"] for row in cards + reader}) == 42, "unique revision IDs")
for i, (card, original) in enumerate(zip(cards, source["words"]), 1):
    check((card["id"], card["candidatePosition"], card["sourceSpanish"],
           card["sourceEnglish"], card["kind"], card["sourceNoteInternal"]) ==
          (f"{revision}:card:{i:02d}", i, original["es"], original["en"],
           original["kind"], original.get("note")), f"card {i} source")
    check(card["targetJapaneseDraft"] and card["literalJapaneseGlossEn"] == original["en"] and
          card["sourceEnglishIsJapaneseGloss"] is False and
          card["learnerFaceEnabled"] is False, f"card {i} draft gate")
for i, (row, spanish, english) in enumerate(zip(reader, reading["passage"]["target"],
                                                reading["passage"]["native"]), 1):
    check((row["id"], row["candidatePosition"], row["sourceSpanish"],
           row["sourceEnglish"], row["literalJapaneseGlossEn"]) ==
          (f"{revision}:reader:{i:02d}", i, spanish, english, english), f"reader {i} source")
    check(row["targetJapaneseDraft"] and row["learnerFaceEnabled"] is False and
          row["sourceEnglishIsJapaneseGloss"] is False, f"reader {i} draft gate")
    speaker = next((name for name in ("Laura", "Gonzalo")
                    if english.startswith(name + ":")), "Narrator")
    check(row["speaker"] == speaker, f"reader {i} speaker")
    if speaker != "Narrator":
        check(row["targetJapaneseDraft"].startswith({"Laura": "ラウラ：",
                                                    "Gonzalo": "ゴンサロ："}[speaker]),
              f"reader {i} speaker marker")

required = {
    1: ("日曜日", "10時", "ラウラ", "ポシートス", "7B"),
    3: ("ラウラ：", "旬の果物"),
    4: ("ラウラ：", "子どもたち"),
    5: ("ソフィア", "自家製", "グラノーラ", "ヨーグルト"),
    6: ("ゴンサロ", "アレルギー", "食事制限"),
    7: ("トマス", "セリアック病"),
    9: ("月曜日", "水曜日", "クラッカー"),
    10: ("ラウラ：", "毎日", "グルテンフリーのパン"),
    11: ("バター", "共用", "トマス", "交差汚染"),
    12: ("ラウラ：", "個別包装"),
    14: ("ゴンサロ：", "5泊以上", "15%", "割引"),
    15: ("ラウラ：", "3月", "料金"),
    16: ("ラウラ：", "7B", "予約"),
    17: ("ゴンサロ", "10点満点中9点"),
}
for index, words in required.items():
    check(all(word in reader[index - 1]["targetJapaneseDraft"] for word in words),
          f"reader {index} scene")
check(all(word in packet["speakingGoalJapaneseDraft"]
          for word in ("7B", "ゴンサロ", "トマス", "セリアック病", "グルテンフリーのパン", "バター")),
      "speaking scene")
check(packet["speakingGoalLearnerEnabled"] is False, "speaking gate")
for key, old_rows in (("oldCardPositionPlan", old["cards"]),
                      ("oldReaderPositionPlan", old["reader"])):
    plan = packet[key]
    check(len(plan) == len(old_rows) and
          [row["oldEnglish"] for row in plan] == [row["en"] for row in old_rows] and
          all(row["candidate"] is None and "no saved-item migration" in row["disposition"]
              for row in plan), key)
faces = [row["targetJapaneseDraft"] for row in cards + reader]
scope = packet["audioScopeReadOnly"]
check(scope["draftFacePlacements"] == 42 and
      scope["twoVoiceClipDecisionsIfTextApproved"] == 84 and
      scope["twoVoiceSubmittedCharactersIfTextApproved"] == 2 * sum(map(len, faces)),
      "audio read-only scope")
check(scope["synthesized"] is False and scope["listeningApproved"] is False and
      scope["registered"] is False and scope["candidateIDsMatchingArchive"] == 0,
      "audio gates")
check(len(packet["reviewQuestionsInternal"]) >= 4 and len(packet["missing"]) >= 6,
      "review remains")
metadata = json.loads((HERE / "ai-assistance-metadata.json").read_text())
check(metadata["qualifiedReview"] is False and
      all(call.get("qualifiedApproval") is False for call in metadata["calls"]),
      "qualified review separation")
print("PASS Japanese Breakfast Master 19: 24 pinned cards, 18 Reader rows, 42 draft faces, closed gates")
