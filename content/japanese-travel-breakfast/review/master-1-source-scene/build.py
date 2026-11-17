"""Render the inert Japanese Breakfast Master 1 packet from pinned Spanish sources."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCES = {
    "curriculum": ("src/data/core60/es/master-travel-breakfast.json", "9403eb80ef58e72bcff62be5c6fac3b7c9a02b2e76acb237592fcc34ddb1f87b"),
    "reader": ("public/lesson-content/es/master-travel-breakfast.json", "7cc91b0ca9a264ec20ac63a0e760e6df4b3cfc8ca7e931decc239c4329a74348"),
    "archive": ("content/review-archive/french-japanese-2026-11-15/japanese-breakfast/master-1-3-draft.json", "84b7673fc72175428d48dbf211b41be75b7dac31320c7c82e708ab1c9803d224"),
}
STABLE = "master-travel-breakfast:1:ja-en"
REVISION = STABLE + ":source-scene-v1"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled", "audioRegistered",
    "listeningReviewed", "offlineRegistered", "progressWritesEnabled", "released",
    "runtimeImported", "ownerRouteEnabled", "v4Imported",
)}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render():
    for relative, expected in SOURCES.values():
        if sha(ROOT / relative) != expected:
            raise ValueError("source drift: " + relative)
    curriculum_file = json.loads((ROOT / SOURCES["curriculum"][0]).read_text())
    curriculum = curriculum_file["lessons"][0]
    reader_file = json.loads((ROOT / SOURCES["reader"][0]).read_text())
    reader_source = reader_file["lessons"]["1"]["passage"]
    archive = json.loads((ROOT / SOURCES["archive"][0]).read_text())
    old = archive["lessons"][0]
    candidate = json.loads((HERE / "candidate-text.json").read_text())
    cards_ja, reader_ja = candidate["cards"], candidate["reader"]
    assert curriculum["n"] == old["n"] == 1 and old["stableId"] == STABLE
    assert old["sourceEnglish"]["englishWordAnchors"] == [row["en"] for row in curriculum["words"]]
    assert old["sourceEnglish"]["englishReading"] == reader_source["native"]
    assert curriculum["title"] == old["sourceEnglish"]["title"]
    assert curriculum["objective"] == old["sourceEnglish"]["objective"]
    assert curriculum["speaking"] == old["sourceEnglish"]["speaking"]
    assert len(cards_ja) == len(curriculum["words"]) == 22
    assert len(reader_ja) == len(reader_source["native"]) == len(reader_source["target"]) == 18
    assert [row["en"] for row in cards_ja] == [row["en"] for row in curriculum["words"]]
    assert [row["en"] for row in reader_ja] == reader_source["native"]
    assert all(row["glossEn"] == row["en"] for row in cards_ja + reader_ja)
    assert not any("id" in row for row in old["cards"] + old["reader"])
    cards = [
        {"id": f"{REVISION}:card:{i:02d}", "candidatePosition": i,
         "sourceSpanish": row["es"], "sourceEnglish": row["en"],
         "kind": row["kind"], "sourceNoteInternal": row.get("note"),
         "targetJapaneseDraft": translated["ja"], "literalJapaneseGlossEn": translated["glossEn"],
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False}
        for i, (row, translated) in enumerate(zip(curriculum["words"], cards_ja), 1)
    ]
    reader = [
        {"id": f"{REVISION}:reader:{i:02d}", "candidatePosition": i,
         "speaker": "Narrator with source dialogue", "sourceSpanish": es, "sourceEnglish": en,
         "targetJapaneseDraft": translated["ja"], "literalJapaneseGlossEn": translated["glossEn"],
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False,
         "selectionStatus": "unapproved draft candidate"}
        for i, (es, en, translated) in enumerate(zip(
            reader_source["target"], reader_source["native"], reader_ja), 1)
    ]
    faces = [row["targetJapaneseDraft"] for row in cards + reader if row["targetJapaneseDraft"]]
    overlaps = [
        {"oldPosition": oi, "candidatePosition": ni, "textOnly": True, "migrationAuthorized": False}
        for oi, old_row in enumerate(old["cards"], 1)
        for ni, row in enumerate(cards, 1)
        if old_row["ja"] == row["targetJapaneseDraft"]
    ]
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast", "stage": "master",
        "lessonKey": "master:1", "stableLessonId": STABLE, "candidateRevision": REVISION,
        "status": "source-only Japanese candidate; unapproved", "reviewed": False,
        "source": {"curriculumPath": SOURCES["curriculum"][0], "curriculumSha256": SOURCES["curriculum"][1],
                   "readerPath": SOURCES["reader"][0], "readerSha256": SOURCES["reader"][1],
                   "curriculumVersion": curriculum_file["version"], "readerVersion": reader_file["version"],
                   "curriculumReviewed": curriculum_file["reviewed"], "readerReviewed": reader_file["reviewed"],
                   "titleEnglishInternal": curriculum["title"], "objectiveEnglishInternal": curriculum["objective"],
                   "speakingEnglishInternal": curriculum["speaking"], "lessonTypeInternal": curriculum["lessonType"],
                   "grammarInternal": curriculum["grammar"], "readerTitleSpanish": reader_source["title"],
                   "readerVerbExamplesInternal": [v["example"] for v in reader_file["lessons"]["1"]["verbs"]]},
        "archivedDraft": {"path": SOURCES["archive"][0], "sha256": SOURCES["archive"][1],
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "Teach a friend the sequence of a Madrid bar breakfast at the counter, then ask for the teach-back.",
        "speakingGoalInternal": curriculum["speaking"],
        "speakingGoalJapaneseDraft": candidate["speakingGoalJapaneseDraft"],
        "speakingGoalLearnerEnabled": False,
        "sourceConflictInternal": "Current Spanish Master 1 has Emma and Brazilian Thiago at a crowded Lavapiés bar, 22 cards and 18 Reader turns; the archive has 15 cards and ten turns and is not a source-equivalent substitute. Current source includes 9 a.m. crowd, counter standing, chalkboard, three-euro deal, named foods and drinks, Paco's receipt under a cup, card/cash payment options, optional tip, and a full teach-back.",
        "oldCardPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["cards"], 1)],
        "oldReaderPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["reader"], 1)],
        "archivedExactCardOverlapInternal": overlaps,
        "audioScopeReadOnly": {
            "draftFacePlacements": len(faces), "twoVoiceClipDecisionsIfTextApproved": 2 * len(faces),
            "twoVoiceSubmittedCharactersIfTextApproved": 2 * sum(map(len, faces)),
            "grossEstimateUSDAt30PerMillionCharacters": round(30 * 2 * sum(map(len, faces)) / 1_000_000, 5),
            "archivedExactJapaneseCardTextOverlapsOnly": len(overlaps),
            "candidateIDsMatchingArchive": 0, "synthesized": False,
            "listeningApproved": False, "registered": False,
        },
        "savedPositionPolicy": "Archived draft rows have no explicit stable row IDs and were not registered. Revision-scoped candidate IDs do not authorize saved-item or audio placement migration. Reordering requires a new revision.",
        "reviewQuestionsInternal": candidate["issues"],
        "missing": ["qualified Japanese/source/Madrid café/food/locale/dictionary review", "six authored mode prompt/target pairs",
                    "source-aligned Japanese forms", "contextual dictionary senses", "complete speaking setup and card-only word bank",
                    "authorized saved-item policy", "exact-text audio and per-clip listening", "learner/offline/native acceptance"],
        "gates": GATES,
    }


if __name__ == "__main__":
    result = json.dumps(render(), ensure_ascii=False, indent=2) + "\n"
    output = HERE / "source-setting-candidate.json"
    if "--check" in sys.argv:
        if output.read_text() != result:
            raise ValueError("stale generated packet")
    else:
        output.write_text(result)
