"""Render inert Japanese Breakfast Master 8 source-review packet."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCES = {
    "curriculum": ("src/data/core60/es/master-travel-breakfast.json", "9403eb80ef58e72bcff62be5c6fac3b7c9a02b2e76acb237592fcc34ddb1f87b"),
    "reader": ("public/lesson-content/es/master-travel-breakfast.json", "7cc91b0ca9a264ec20ac63a0e760e6df4b3cfc8ca7e931decc239c4329a74348"),
    "archive": ("content/review-archive/french-japanese-2026-11-15/japanese-breakfast/master-7-9-draft.json", "2df980428024f9bf436cbdd49d7b52cdcab5d9b49c6b670ba2988bb544b07337"),
}
STABLE = "master-travel-breakfast:8:ja-en"
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
    curriculum = curriculum_file["lessons"][7]
    reader_file = json.loads((ROOT / SOURCES["reader"][0]).read_text())
    reader_source = reader_file["lessons"]["8"]
    archive_file = json.loads((ROOT / SOURCES["archive"][0]).read_text())
    old = archive_file["lessons"][1]
    candidate = json.loads((HERE / "candidate-text.json").read_text())
    cards_ja, reader_ja = candidate["cards"], candidate["reader"]
    assert curriculum["n"] == old["n"] == 8 and old["stableId"] == STABLE
    assert old["sourceEnglish"]["englishWordAnchors"] == [row["en"] for row in curriculum["words"]]
    assert old["sourceEnglish"]["englishReading"] == reader_source["passage"]["native"]
    assert old["sourceEnglish"]["title"] == curriculum["title"]
    assert old["sourceEnglish"]["objective"] == curriculum["objective"]
    assert old["sourceEnglish"]["speaking"] == curriculum["speaking"]
    assert len(cards_ja) == len(curriculum["words"]) == 23
    assert len(reader_ja) == len(reader_source["passage"]["native"]) == len(reader_source["passage"]["target"]) == 18
    assert [row["en"] for row in cards_ja] == [row["en"] for row in curriculum["words"]]
    assert [row["en"] for row in reader_ja] == reader_source["passage"]["native"]
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
         "speaker": "Narrator", "sourceSpanish": es, "sourceEnglish": en,
         "targetJapaneseDraft": translated["ja"], "literalJapaneseGlossEn": translated["glossEn"],
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False,
         "selectionStatus": "unapproved draft candidate"}
        for i, (es, en, translated) in enumerate(zip(
            reader_source["passage"]["target"], reader_source["passage"]["native"], reader_ja), 1)
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
        "lessonKey": "master:8", "stableLessonId": STABLE, "candidateRevision": REVISION,
        "status": "source-only Japanese candidate; unapproved", "reviewed": False,
        "source": {"curriculumPath": SOURCES["curriculum"][0], "curriculumSha256": SOURCES["curriculum"][1],
                   "readerPath": SOURCES["reader"][0], "readerSha256": SOURCES["reader"][1],
                   "sourceVersion": curriculum_file["version"], "sourceReviewed": curriculum_file["reviewed"],
                   "readerSourceReviewed": reader_file["reviewed"],
                   "sourceModelClaim": curriculum_file.get("model"),
                   "titleEnglishInternal": curriculum["title"],
                   "objectiveEnglishInternal": curriculum["objective"],
                   "speakingEnglishInternal": curriculum["speaking"],
                   "readerTitleSpanish": reader_source["passage"]["title"],
                   "readerVerbExamples": [v["example"] for v in reader_source["verbs"]]},
        "archivedDraft": {"path": SOURCES["archive"][0], "sha256": SOURCES["archive"][1],
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "Thank a server in a traditional Barcelona café, decline scraping almonds from coca for a friend with severe tree-nut allergy, ask about labeled packaged food, and check the hot chocolate preparation before ordering.",
        "speakingGoalInternal": curriculum["speaking"],
        "speakingGoalJapaneseDraft": candidate["speakingGoalJapaneseDraft"],
        "speakingGoalLearnerEnabled": False,
        "sourceConflictInternal": "The current 18-turn source follows Ana and Kenji at a Saturday café breakfast in Barcelona’s Gràcia district. Jordi offers to scrape almonds from coca, but bakery dough is made on a surface used for almonds all day. Kenji has a severe tree-nut allergy and a prior anaphylaxis. The source specifies his antihistamine and auto-injector, and 112 for symptoms; a packaged item warns of tree-nut traces, while hot chocolate requires a separate clean-utensil check. The archived 12-turn draft compresses these source facts and is retained as distinct evidence, not an answer or migration source.",
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
        "savedPositionPolicy": "Archived draft rows lack explicit stable IDs and were not learner-registered. Revision-scoped candidate IDs do not authorize saved-item or audio migration. Reordering requires a new revision.",
        "reviewQuestionsInternal": candidate["issues"],
        "missing": ["qualified Japanese/source/Catalonian-food/allergy/clinical/dictionary review",
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
        if output.read_text() != result:
            raise ValueError("stale generated packet")
    else:
        output.write_text(result)
