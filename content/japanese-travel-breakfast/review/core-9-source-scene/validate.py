"""Independent source, identity and closed-gate check for Core 9."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def check(condition, message):
    if not condition:
        raise ValueError(message)


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


packet = read(HERE / "source-setting-candidate.json")
source_path = ROOT / packet["source"]["contentPath"]
objective_path = ROOT / packet["source"]["objectivesPath"]
draft_path = ROOT / packet["archivedDraft"]["path"]
for path, expected in (
    (source_path, "8c00629a79532821ac7b554a4e0f828b25372500303b3dc70f9568c5aabb34cc"),
    (objective_path, "8ca7cacc58a272d5e2c9d55b06e265ec8f6b5102d412bc0382d448942e455fe8"),
    (draft_path, "7a6ed4b3869c3599119ae74ea911f6c881bf87294342a060378a5a3f19de6112"),
):
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    check(actual == expected, f"source drift: {path}")
check(packet["source"]["contentSha256"] == hashlib.sha256(source_path.read_bytes()).hexdigest(), "content pin")
check(packet["source"]["objectivesSha256"] == hashlib.sha256(objective_path.read_bytes()).hexdigest(), "objective pin")
check(packet["archivedDraft"]["sha256"] == hashlib.sha256(draft_path.read_bytes()).hexdigest(), "archive pin")

source_file = read(source_path)
source = source_file["lessons"]["9"]
draft = read(draft_path)
old = draft["lessons"][8]
stable = "travel-breakfast:9:ja-en"
revision = stable + ":source-scene-v1"
check((packet["schema"], packet["pairKey"], packet["track"], packet["stage"], packet["lessonKey"]) ==
      (1, "Japanese:English", "travel-breakfast", "core", "core:9"), "pair or stage identity")
check(packet["stableLessonId"] == old["stableId"] == stable, "stable lesson identity")
check(old["sourceEnglish"]["englishWordAnchors"] == [w["en"] for w in source["words"]], "archived English cards")
check(old["sourceEnglish"]["englishReading"] == source["passage"]["native"], "archived English Reader")
check(packet["candidateRevision"] == revision, "candidate revision")
check(packet["reviewed"] is False and packet["gates"]["reviewed"] is False, "review flag")
check(all(value is False for value in packet["gates"].values()), "gates must stay closed")
check(source_file["reviewed"] is False == packet["source"]["sourceReviewed"], "source review state")
check(draft["reviewed"] is False and draft["registered"] is False, "archive gates")
check(packet["source"]["readerTitleSpanish"] == source["passage"]["title"], "Reader title")
check(packet["source"]["readerVerbExamples"] == [v["example"] for v in source["verbs"]], "verb examples")
check(packet["source"]["objectiveEnglishInternal"] == old["sourceEnglish"]["objective"], "objective")
check(packet["source"]["roleplayEnglishInternal"] == old["sourceEnglish"]["roleplay"], "roleplay")
check(packet["source"]["objectiveEditorialHold"] is True, "objective hold")

cards = packet["sourceCards"]
reader = packet["sourceSettingReader"]
check(len(cards) == len(source["words"]) == 17, "card count")
check(len(reader) == len(source["passage"]["target"]) == len(source["passage"]["native"]) == 9, "Reader count")
ids = [row["id"] for row in cards + reader]
check(len(ids) == len(set(ids)) == 26, "candidate ID uniqueness")
for i, (row, expected) in enumerate(zip(cards, source["words"]), 1):
    check(row["id"] == f"{revision}:card:{i:02d}" and row["candidatePosition"] == i, f"card {i} ID")
    check((row["sourceSpanish"], row["sourceEnglish"], row["kind"], row["sourceNoteInternal"]) ==
          (expected["es"], expected["en"], expected["kind"], expected.get("note")), f"card {i} source")
    check(bool(row["targetJapaneseDraft"]) and bool(row["literalJapaneseGlossEn"]), f"card {i} face")
    check(row["sourceEnglishIsJapaneseGloss"] is False and row["learnerFaceEnabled"] is False, f"card {i} gate")
for i, row in enumerate(reader, 1):
    check(row["id"] == f"{revision}:reader:{i:02d}" and row["candidatePosition"] == i, f"Reader {i} ID")
    check(row["speaker"] == "Narrator", f"Reader {i} speaker")
    check(row["sourceSpanish"] == source["passage"]["target"][i - 1]
          and row["sourceEnglish"] == source["passage"]["native"][i - 1], f"Reader {i} source")
    check(row["sourceEnglishIsJapaneseGloss"] is False and row["learnerFaceEnabled"] is False, f"Reader {i} gate")
    check(bool(row["targetJapaneseDraft"]) and bool(row["literalJapaneseGlossEn"]), f"Reader {i} face")
    check(row["selectionStatus"] == "unapproved draft candidate", f"Reader {i} status")
check([row["targetJapaneseDraft"] for row in cards[:4]] ==
      ["ミルク入りコーヒー", "クロワッサン", "カウンター", "ふた"], "source terms")

for key, old_rows in (("oldCardPositionPlan", old["cards"]), ("oldReaderPositionPlan", old["reader"])):
    plan = packet[key]
    check(len(plan) == len(old_rows), f"{key} count")
    check([r["old"] for r in plan] == list(range(1, len(old_rows) + 1)), f"{key} order")
    check([r["oldEnglish"] for r in plan] == [r["en"] for r in old_rows], f"{key} source")
    check(all(r["candidate"] is None and "no saved-item migration" in r["disposition"] for r in plan), f"{key} migration")

overlap = {(oi, ni) for oi, old_row in enumerate(old["cards"], 1)
           for ni, new_row in enumerate(cards, 1)
           if old_row["ja"] == new_row["targetJapaneseDraft"]}
listed = {(r["oldPosition"], r["candidatePosition"]) for r in packet["archivedExactCardOverlapInternal"]}
check(overlap == listed, "exact text overlap")
check(all(r["textOnly"] is True and r["migrationAuthorized"] is False
          for r in packet["archivedExactCardOverlapInternal"]), "overlap status")

draft_faces = [r for r in cards + reader if r["targetJapaneseDraft"]]
scope = packet["audioScopeReadOnly"]
check(scope["draftFacePlacements"] == len(draft_faces) == 26, "audio placement count")
check(scope["twoVoiceClipDecisionsIfTextApproved"] == 52, "audio clip count")
check(scope["twoVoiceSubmittedCharactersIfTextApproved"] ==
      2 * sum(len(r["targetJapaneseDraft"]) for r in draft_faces), "audio characters")
check(scope["archivedExactJapaneseCardTextOverlapsOnly"] == len(overlap), "audio overlap")
check(scope["candidateIDsMatchingArchive"] == 0, "archive ID overlap")
check(scope["synthesized"] is False and scope["listeningApproved"] is False and scope["registered"] is False,
      "audio registration")
check("do not authorize saved-item" in packet["savedPositionPolicy"] and "revision" in packet["savedPositionPolicy"],
      "saved-position policy")
check(len(packet["reviewQuestionsInternal"]) >= 6 and len(packet["missing"]) >= 6, "open work")
print("PASS Japanese Breakfast Core 9: 17 pinned cards, 9 Reader rows, 26 draft faces, closed gates")
