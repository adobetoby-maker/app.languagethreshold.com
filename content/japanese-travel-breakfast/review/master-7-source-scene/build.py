"""Render the inert Japanese Breakfast Master 7 source review packet."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCES = {
    "reader": ("public/lesson-content/es/master-travel-breakfast.json", "7cc91b0ca9a264ec20ac63a0e760e6df4b3cfc8ca7e931decc239c4329a74348"),
    "curriculum": ("src/data/core60/es/master-travel-breakfast.json", "9403eb80ef58e72bcff62be5c6fac3b7c9a02b2e76acb237592fcc34ddb1f87b"),
    "archive": ("content/review-archive/french-japanese-2026-11-15/japanese-breakfast/master-7-9-draft.json", "2df980428024f9bf436cbdd49d7b52cdcab5d9b49c6b670ba2988bb544b07337"),
}
STABLE = "master-travel-breakfast:7:ja-en"
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
    curriculum = curriculum_file["lessons"][6]
    reader_source = reader_file["lessons"]["7"]
    old = archive_file["lessons"][0]
    candidate = json.loads((HERE / "candidate-text.json").read_text())
    assert curriculum["n"] == old["n"] == 7 and old["stableId"] == STABLE
    assert old["sourceEnglish"]["englishWordAnchors"] == [row["en"] for row in curriculum["words"]]
    assert old["sourceEnglish"]["englishReading"] == reader_source["passage"]["native"]
    assert old["sourceEnglish"]["englishGrammarExamples"] == [row["en"] for row in curriculum["grammar"]["examples"]]
    assert old["sourceEnglish"]["title"] == curriculum["title"]
    assert old["sourceEnglish"]["objective"] == curriculum["objective"]
    assert old["sourceEnglish"]["speaking"] == curriculum["speaking"]
    assert len(candidate["cards"]) == len(curriculum["words"]) == 23
    assert len(candidate["reader"]) == len(reader_source["passage"]["native"]) == len(reader_source["passage"]["target"]) == 18
    assert [row["en"] for row in candidate["cards"]] == [row["en"] for row in curriculum["words"]]
    assert [row["en"] for row in candidate["reader"]] == reader_source["passage"]["native"]
    assert all(row["glossEn"] == row["en"] and row["ja"] for row in candidate["cards"] + candidate["reader"])
    assert not any("id" in row for row in old["cards"] + old["reader"])
    cards = [
        {"id": f"{REVISION}:card:{i:02d}", "candidatePosition": i,
         "sourceSpanish": row["es"], "sourceEnglish": row["en"],
         "kind": row["kind"], "sourceNoteInternal": row.get("note"),
         "targetJapaneseDraft": translated["ja"], "literalJapaneseGlossEn": translated["glossEn"],
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False}
        for i, (row, translated) in enumerate(zip(curriculum["words"], candidate["cards"]), 1)
    ]
    reader = [
        {"id": f"{REVISION}:reader:{i:02d}", "candidatePosition": i,
         "speaker": next((name for name in ("Emma", "Marleny") if en.startswith(name + ":")), "Narrator"),
         "sourceSpanish": es, "sourceEnglish": en,
         "targetJapaneseDraft": translated["ja"], "literalJapaneseGlossEn": translated["glossEn"],
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False,
         "selectionStatus": "unapproved draft candidate"}
        for i, (es, en, translated) in enumerate(zip(reader_source["passage"]["target"],
                                                      reader_source["passage"]["native"],
                                                      candidate["reader"]), 1)
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
        "lessonKey": "master:7", "stableLessonId": STABLE, "candidateRevision": REVISION,
        "status": "source-only Japanese candidate; unapproved", "reviewed": False,
        "source": {"curriculumPath": SOURCES["curriculum"][0], "curriculumSha256": SOURCES["curriculum"][1],
                   "readerPath": SOURCES["reader"][0], "readerSha256": SOURCES["reader"][1],
                   "curriculumVersion": curriculum_file["version"], "readerVersion": reader_file["version"],
                   "curriculumReviewed": curriculum_file["reviewed"], "readerReviewed": reader_file["reviewed"],
                   "titleEnglishInternal": curriculum["title"], "objectiveEnglishInternal": curriculum["objective"],
                   "speakingEnglishInternal": curriculum["speaking"],
                   "grammarEnglishExamplesInternal": [row["en"] for row in curriculum["grammar"]["examples"]],
                   "readerTitleSpanish": reader_source["passage"]["title"],
                   "readerVerbExamples": [row["example"] for row in reader_source["verbs"]]},
        "archivedDraft": {"path": SOURCES["archive"][0], "sha256": SOURCES["archive"][1],
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "Recount Emma’s group breakfast order and settle its remaining coffee-farm bill through a Nequi transfer before Andrés’s minibus leaves.",
        "speakingGoalInternal": curriculum["speaking"],
        "speakingGoalJapaneseDraft": candidate["speakingGoalJapaneseDraft"],
        "speakingGoalLearnerEnabled": False,
        "sourceConflictInternal": "Current source follows Emma, cook Marleny and guide Andrés at a Salento-area coffee farm, with departure moved to 7:45 because of a landslide. The group ordered seven cheese arepas, nine tintos, two aguapanelas, eggs and two calentados; four people paid cash, but 64,000 pesos remain. Emma has only 100,000-peso notes, transfers 64,000 through Nequi and shows proof before reaching the minibus. The archived draft has different scene rows and stays separate evidence. The pinned timing of 7:30, 7:45 and 'in 10 minutes' requires source review without silent alteration.",
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
        "missing": ["qualified Japanese/source/Argentine food/locale/dictionary review", "six authored mode prompt/target pairs",
                    "source-aligned Japanese forms", "contextual dictionary senses", "speaking setup and card-only word bank",
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
