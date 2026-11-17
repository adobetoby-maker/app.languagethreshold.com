"""Render the inert Core 27 Japanese source review packet from pinned sources."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCES = {
    "content": ("public/lesson-content/es/travel-breakfast.json", "8c00629a79532821ac7b554a4e0f828b25372500303b3dc70f9568c5aabb34cc"),
    "objectives": ("src/data/travel-zone.ts", "8ca7cacc58a272d5e2c9d55b06e265ec8f6b5102d412bc0382d448942e455fe8"),
    "archive": ("content/review-archive/french-japanese-2026-11-15/japanese-breakfast/core-1-30-draft.json", "7a6ed4b3869c3599119ae74ea911f6c881bf87294342a060378a5a3f19de6112"),
}
STABLE = "travel-breakfast:27:ja-en"
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
    source_file = json.loads((ROOT / SOURCES["content"][0]).read_text())
    source = source_file["lessons"]["27"]
    archive = json.loads((ROOT / SOURCES["archive"][0]).read_text())
    old = archive["lessons"][26]
    candidate = json.loads((HERE / "candidate-text.json").read_text())
    cards_ja, reader_ja = candidate["cards"], candidate["reader"]
    assert old["n"] == 27 and old["stableId"] == STABLE
    assert old["sourceEnglish"]["englishWordAnchors"] == [row["en"] for row in source["words"]]
    assert old["sourceEnglish"]["englishReading"] == source["passage"]["native"]
    assert len(cards_ja) == len(source["words"]) == 16
    assert len(reader_ja) == len(source["passage"]["native"]) == len(source["passage"]["target"]) == 9
    assert [row["en"] for row in cards_ja] == [row["en"] for row in source["words"]]
    assert [row["en"] for row in reader_ja] == source["passage"]["native"]
    assert all(row["glossEn"] == row["en"] for row in cards_ja + reader_ja)
    assert not any("id" in row for row in old["cards"] + old["reader"])
    objective = old["sourceEnglish"]
    objectives = (ROOT / SOURCES["objectives"][0]).read_text()
    title = objectives.index('"Arrange an early-departure breakfast"')
    assert 0 < objectives.index('"' + objective["objective"] + '"') - title < 250
    assert objective["roleplay"] in objectives[title:title + 500]
    cards = [
        {"id": f"{REVISION}:card:{i:02d}", "candidatePosition": i,
         "sourceSpanish": row["es"], "sourceEnglish": row["en"],
         "kind": row["kind"], "sourceNoteInternal": row.get("note"),
         "targetJapaneseDraft": translated["ja"], "literalJapaneseGlossEn": translated["glossEn"],
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False}
        for i, (row, translated) in enumerate(zip(source["words"], cards_ja), 1)
    ]
    reader = [
        {"id": f"{REVISION}:reader:{i:02d}", "candidatePosition": i,
         "speaker": "Narrator", "sourceSpanish": es, "sourceEnglish": en,
         "targetJapaneseDraft": translated["ja"], "literalJapaneseGlossEn": translated["glossEn"],
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False,
         "selectionStatus": "unapproved draft candidate"}
        for i, (es, en, translated) in enumerate(zip(
            source["passage"]["target"], source["passage"]["native"], reader_ja), 1)
    ]
    faces = [row["targetJapaneseDraft"] for row in cards + reader if row["targetJapaneseDraft"]]
    overlaps = [
        {"oldPosition": oi, "candidatePosition": ni, "textOnly": True, "migrationAuthorized": False}
        for oi, old_row in enumerate(old["cards"], 1)
        for ni, row in enumerate(cards, 1)
        if old_row["ja"] == row["targetJapaneseDraft"]
    ]
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast", "stage": "core",
        "lessonKey": "core:27", "stableLessonId": STABLE, "candidateRevision": REVISION,
        "status": "source-only Japanese candidate; unapproved", "reviewed": False,
        "source": {"contentPath": SOURCES["content"][0], "contentSha256": SOURCES["content"][1],
                   "objectivesPath": SOURCES["objectives"][0], "objectivesSha256": SOURCES["objectives"][1],
                   "sourceVersion": source_file["version"], "sourceReviewed": source_file["reviewed"],
                   "sourceModelClaim": source_file.get("model"), "titleEnglishInternal": "Arrange an early-departure breakfast",
                   "objectiveEnglishInternal": objective["objective"],
                   "roleplayEnglishInternal": objective["roleplay"],
                   "readerTitleSpanish": source["passage"]["title"],
                   "readerVerbExamples": [v["example"] for v in source["verbs"]]},
        "archivedDraft": {"path": SOURCES["archive"][0], "sha256": SOURCES["archive"][1],
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "Arrange a packed breakfast before a 5:30 a.m. airport transfer and confirm its pickup and rate inclusion.",
        "speakingGoalInternal": objective["roleplay"],
        "speakingGoalJapaneseDraft": "午前5時30分の空港送迎で朝食の提供時間より前に出発します。ホテルのフロントで持ち帰り用の朝食を頼み、受け取り時間と場所を確認してください。",
        "speakingGoalLearnerEnabled": False,
        "sourceConflictInternal": "The current nine-turn source has Ana at the hotel front desk at 9 p.m., a 5:30 a.m. airport transfer before the 7 o’clock breakfast opening, a fruit/bread/juice paper bag, nut allergy noted with her room number, 5 a.m. front-desk pickup and breakfast included in her reservation. The archived Japanese scene is generic and adds ingredients/preparation requests absent from the source. The early-service option in the objective is not represented by a source card or Reader turn. Hotel, allergy, rate and dictionary senses need qualified review.",
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
        "missing": ["qualified Japanese/source/hotel/allergy/locale/dictionary review", "six authored mode prompt/target pairs",
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
