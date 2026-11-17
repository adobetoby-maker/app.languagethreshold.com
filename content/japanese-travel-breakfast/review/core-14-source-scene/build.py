"""Build the inert, source-pinned Japanese Breakfast Core 14 review packet."""

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
STABLE = "travel-breakfast:14:ja-en"
REVISION = STABLE + ":source-scene-v1"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled", "audioRegistered",
    "listeningReviewed", "offlineRegistered", "progressWritesEnabled", "released",
    "runtimeImported", "ownerRouteEnabled", "v4Imported",
)}
JAPANESE_NOTES = {
    6: "Place 持ち帰りで after the item ordered; テイクアウト is a common alternative.",
    9: "The source specifies a female waitress; ウェイター names a waiter.",
    16: "〜お願いできますか is a polite request; check register in the complete exchange.",
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render():
    for relative, expected in SOURCES.values():
        if sha(ROOT / relative) != expected:
            raise ValueError("source drift: " + relative)
    source_file = json.loads((ROOT / SOURCES["content"][0]).read_text())
    source = source_file["lessons"]["14"]
    archive = json.loads((ROOT / SOURCES["archive"][0]).read_text())
    old = archive["lessons"][13]
    candidate = json.loads((HERE / "candidate-text.json").read_text())
    assert old["n"] == 14 and old["stableId"] == STABLE
    assert old["sourceEnglish"]["englishWordAnchors"] == [r["en"] for r in source["words"]]
    assert old["sourceEnglish"]["englishReading"] == source["passage"]["native"]
    assert len(candidate["cards"]) == len(source["words"]) == 18
    assert len(candidate["reader"]) == len(source["passage"]["native"]) == len(source["passage"]["target"]) == 9
    assert not any("id" in r for r in old["cards"] + old["reader"])
    objective = old["sourceEnglish"]
    objectives = (ROOT / SOURCES["objectives"][0]).read_text()
    title = objectives.index('"Handle a rushed morning"')
    assert 0 < objectives.index('"' + objective["objective"] + '"') - title < 250
    assert objective["roleplay"] in objectives[title:title + 500]
    cards = [
        {"id": f"{REVISION}:card:{i:02d}", "candidatePosition": i,
         "sourceSpanish": row["es"], "sourceEnglish": row["en"], "kind": row["kind"],
         "sourceNoteInternal": row.get("note"), "japaneseUsageNoteInternal": JAPANESE_NOTES.get(i),
         "targetJapaneseDraft": face["ja"], "literalJapaneseGlossEn": face["glossEn"],
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False}
        for i, (row, face) in enumerate(zip(source["words"], candidate["cards"]), 1)
    ]
    reader = [
        {"id": f"{REVISION}:reader:{i:02d}", "candidatePosition": i,
         "speaker": "Narrator", "sourceSpanish": es, "sourceEnglish": en,
         "targetJapaneseDraft": face["ja"], "literalJapaneseGlossEn": face["glossEn"],
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False,
         "selectionStatus": "unapproved draft candidate"}
        for i, (es, en, face) in enumerate(zip(source["passage"]["target"], source["passage"]["native"], candidate["reader"]), 1)
    ]
    faces = [r["targetJapaneseDraft"] for r in cards + reader if r["targetJapaneseDraft"]]
    overlaps = [
        {"oldPosition": oi, "candidatePosition": ni, "textOnly": True, "migrationAuthorized": False}
        for oi, old_row in enumerate(old["cards"], 1)
        for ni, row in enumerate(cards, 1)
        if old_row["ja"] == row["targetJapaneseDraft"]
    ]
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast", "stage": "core",
        "lessonKey": "core:14", "stableLessonId": STABLE, "candidateRevision": REVISION,
        "status": "source-only Japanese candidate; unapproved", "reviewed": False,
        "source": {"contentPath": SOURCES["content"][0], "contentSha256": SOURCES["content"][1],
                   "objectivesPath": SOURCES["objectives"][0], "objectivesSha256": SOURCES["objectives"][1],
                   "sourceVersion": source_file["version"], "sourceReviewed": source_file["reviewed"],
                   "sourceModelClaim": source_file.get("model"), "titleEnglishInternal": "Handle a rushed morning",
                   "objectiveEnglishInternal": objective["objective"], "roleplayEnglishInternal": objective["roleplay"],
                   "readerTitleSpanish": source["passage"]["title"],
                   "readerVerbExamples": [v["example"] for v in source["verbs"]]},
        "archivedDraft": {"path": SOURCES["archive"][0], "sha256": SOURCES["archive"][1],
                          "scene": old["scene"], "cardCount": len(old["cards"]), "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "Explain a 12-minute tour deadline; ask about the fastest egg-sandwich and americano order, five-minute preparation, takeout, and immediate bill.",
        "speakingGoalInternal": objective["roleplay"],
        "sourceConflictInternal": "The current source has an unnamed traveler and female waitress at 8:00, an egg sandwich and americano, a five-minute kitchen estimate, takeout, and payment at the counter before a tour. The archived draft changes the food to a rice ball, invents Sam and a busy-kitchen caveat, and omits source lines. Keep source objective separate from Japanese literal glosses.",
        "oldCardPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["cards"], 1)],
        "oldReaderPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["reader"], 1)],
        "archivedExactJapaneseCardTextOverlapsInternal": overlaps,
        "audioScopeReadOnly": {
            "draftFacePlacements": len(faces), "twoVoiceClipDecisionsIfTextApproved": 2 * len(faces),
            "twoVoiceSubmittedCharactersIfTextApproved": 2 * sum(map(len, faces)),
            "grossEstimateUSDAt30PerMillionCharacters": round(30 * 2 * sum(map(len, faces)) / 1_000_000, 5),
            "archivedExactJapaneseCardTextOverlapsOnly": len(overlaps),
            "candidateIDsMatchingArchive": 0, "synthesized": False, "listeningApproved": False, "registered": False,
        },
        "savedPositionPolicy": "Archived draft rows have no explicit stable row IDs and were not registered. Revision-scoped candidate IDs do not authorize saved-item or audio placement migration. Reordering requires a new revision.",
        "reviewQuestionsInternal": candidate["issues"],
        "missing": ["qualified Japanese/source/food/dictionary review", "six authored mode prompt/target pairs",
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
