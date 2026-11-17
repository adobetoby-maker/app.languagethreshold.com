"""Build the inert Japanese Breakfast Master 17 source review packet."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCES = {
    "reader": ("public/lesson-content/es/master-travel-breakfast.json", "7cc91b0ca9a264ec20ac63a0e760e6df4b3cfc8ca7e931decc239c4329a74348"),
    "curriculum": ("src/data/core60/es/master-travel-breakfast.json", "9403eb80ef58e72bcff62be5c6fac3b7c9a02b2e76acb237592fcc34ddb1f87b"),
    "archive": ("content/review-archive/french-japanese-2026-11-15/japanese-breakfast/master-16-18-draft.json", "a566248455c3ff2ef12188ce7b7b824e38a0f9e6a850415e7ae60104b0bab6c9"),
}
STABLE = "master-travel-breakfast:17:ja-en"
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
    reader_file = json.loads((ROOT / SOURCES["reader"][0]).read_text())
    archive_file = json.loads((ROOT / SOURCES["archive"][0]).read_text())
    curriculum = curriculum_file["lessons"][16]
    reading = reader_file["lessons"]["17"]
    old = archive_file["lessons"][1]
    candidate = json.loads((HERE / "candidate-text.json").read_text())
    assert curriculum["n"] == old["n"] == 17 and old["stableId"] == STABLE
    assert old["sourceEnglish"]["englishWordAnchors"] == [row["en"] for row in curriculum["words"]]
    assert old["sourceEnglish"]["englishReading"] == reading["passage"]["native"]
    assert old["sourceEnglish"]["englishGrammarExamples"] == [row["en"] for row in curriculum["grammar"]["examples"]]
    assert old["sourceEnglish"]["title"] == curriculum["title"]
    assert old["sourceEnglish"]["objective"] == curriculum["objective"]
    assert old["sourceEnglish"]["speaking"] == curriculum["speaking"]
    assert len(candidate["cardsJapanese"]) == len(curriculum["words"]) == 24
    assert len(candidate["readerJapanese"]) == len(reading["passage"]["native"]) == len(reading["passage"]["target"]) == 18
    assert all(candidate["cardsJapanese"]) and all(candidate["readerJapanese"])
    assert not any("id" in row for row in old["cards"] + old["reader"])
    cards = [
        {"id": f"{REVISION}:card:{i:02d}", "candidatePosition": i,
         "sourceSpanish": row["es"], "sourceEnglish": row["en"],
         "kind": row["kind"], "sourceNoteInternal": row.get("note"),
         "targetJapaneseDraft": translated, "literalJapaneseGlossEn": row["en"],
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False}
        for i, (row, translated) in enumerate(zip(curriculum["words"], candidate["cardsJapanese"]), 1)
    ]
    reader = [
        {"id": f"{REVISION}:reader:{i:02d}", "candidatePosition": i,
         "speaker": next((name for name in ("Emma", "Lucía") if en.startswith(name + ":")), "Narrator"),
         "sourceSpanish": es, "sourceEnglish": en,
         "targetJapaneseDraft": translated, "literalJapaneseGlossEn": en,
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False,
         "selectionStatus": "unapproved draft candidate"}
        for i, (es, en, translated) in enumerate(zip(reading["passage"]["target"],
                                                      reading["passage"]["native"],
                                                      candidate["readerJapanese"]), 1)
    ]
    faces = [row["targetJapaneseDraft"] for row in cards + reader]
    overlaps = [
        {"oldPosition": oi, "candidatePosition": ni, "textOnly": True, "migrationAuthorized": False}
        for oi, old_row in enumerate(old["cards"], 1)
        for ni, row in enumerate(cards, 1)
        if old_row["ja"] == row["targetJapaneseDraft"]
    ]
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast", "stage": "master",
        "lessonKey": "master:17", "stableLessonId": STABLE, "candidateRevision": REVISION,
        "status": "source-only Japanese candidate; unapproved", "reviewed": False,
        "source": {"curriculumPath": SOURCES["curriculum"][0], "curriculumSha256": SOURCES["curriculum"][1],
                   "readerPath": SOURCES["reader"][0], "readerSha256": SOURCES["reader"][1],
                   "curriculumVersion": curriculum_file["version"], "readerVersion": reader_file["version"],
                   "curriculumReviewed": curriculum_file["reviewed"], "readerReviewed": reader_file["reviewed"],
                   "titleEnglishInternal": curriculum["title"], "objectiveEnglishInternal": curriculum["objective"],
                   "speakingEnglishInternal": curriculum["speaking"],
                   "grammarEnglishExamplesInternal": [row["en"] for row in curriculum["grammar"]["examples"]],
                   "readerTitleSpanish": reading["passage"]["title"],
                   "readerVerbExamples": [row["example"] for row in reading["verbs"]]},
        "archivedDraft": {"path": SOURCES["archive"][0], "sha256": SOURCES["archive"][1],
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "Organize a formal Japanese email and ask Lucía which health details she permits sharing before sending it.",
        "speakingGoalInternal": curriculum["speaking"],
        "speakingGoalJapaneseDraft": candidate["speakingGoalJapaneseDraft"],
        "speakingGoalLearnerEnabled": False,
        "sourceConflictInternal": "The current Valencia source is a 24-card, 18-turn consent-limited email to Inés Soler. The archived generic draft omits the dated subject line, almond cake, exact disclosure choices, official complaint attachment, 15-day request, and Emma's final attachment check. It remains separate evidence.",
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
            "listeningApproved": False, "registered": False},
        "savedPositionPolicy": "Archived draft rows have no explicit stable row IDs and were not registered. Revision-scoped candidate IDs do not authorize saved-item or audio placement migration. Reordering requires a new revision.",
        "reviewQuestionsInternal": candidate["issues"],
        "missing": ["qualified Japanese/source/Spanish locale/clinical/food/dictionary review",
                    "six authored mode prompt/target pairs", "source-aligned Japanese forms",
                    "contextual dictionary senses", "speaking setup and card-only word bank",
                    "authorized saved-item policy", "exact-text audio and per-clip listening",
                    "learner/offline/native acceptance"],
        "gates": GATES,
    }


if __name__ == "__main__":
    result = json.dumps(render(), ensure_ascii=False, indent=2) + "\n"
    output = HERE / "source-setting-candidate.json"
    if "--check" in sys.argv:
        if not output.exists() or output.read_text() != result:
            raise SystemExit("stale packet; rerun build.py")
    else:
        output.write_text(result)
    print("Master 17 packet: 24 cards, 18 Reader, 84 possible clips")
