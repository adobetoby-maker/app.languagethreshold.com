"""Render the inert Core 12 Japanese source review packet from pinned sources."""

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
STABLE = "travel-breakfast:12:ja-en"
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
    source = source_file["lessons"]["12"]
    archive = json.loads((ROOT / SOURCES["archive"][0]).read_text())
    old = archive["lessons"][11]
    candidate = json.loads((HERE / "candidate-text.json").read_text())
    cards_ja, reader_ja = candidate["cards"], candidate["reader"]
    assert old["n"] == 12 and old["stableId"] == STABLE
    assert old["sourceEnglish"]["englishWordAnchors"] == [row["en"] for row in source["words"]]
    assert old["sourceEnglish"]["englishReading"] == source["passage"]["native"]
    assert len(cards_ja) == len(source["words"]) == 18
    assert len(reader_ja) == len(source["passage"]["native"]) == len(source["passage"]["target"]) == 9
    assert not any("id" in row for row in old["cards"] + old["reader"])
    objective = old["sourceEnglish"]
    objectives = (ROOT / SOURCES["objectives"][0]).read_text()
    title = objectives.index('"Ask for the bill"')
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
        "lessonKey": "core:12", "stableLessonId": STABLE, "candidateRevision": REVISION,
        "status": "source-only Japanese candidate; unapproved", "reviewed": False,
        "source": {"contentPath": SOURCES["content"][0], "contentSha256": SOURCES["content"][1],
                   "objectivesPath": SOURCES["objectives"][0], "objectivesSha256": SOURCES["objectives"][1],
                   "sourceVersion": source_file["version"], "sourceReviewed": source_file["reviewed"],
                   "sourceModelClaim": source_file.get("model"), "titleEnglishInternal": "Ask for the bill",
                   "objectiveEnglishInternal": objective["objective"],
                   "roleplayEnglishInternal": objective["roleplay"],
                   "readerTitleSpanish": source["passage"]["title"],
                   "readerVerbExamples": [v["example"] for v in source["verbs"]]},
        "archivedDraft": {"path": SOURCES["archive"][0], "sha256": SOURCES["archive"][1],
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "Ask for the bill, clarify a cover charge and optional tip, and pay by card.",
        "speakingGoalInternal": objective["roleplay"],
        "sourceConflictInternal": "The source Reader has an extra cover charge, optional tip, no cash, and payment by card. The archived draft instead foregrounds a separately listed drink and does not carry all source terms. The source setting is unspecified; do not import a Japan-specific tipping, cover-charge or receipt rule. The source phrase 'service is not included' is provisionally interpreted as service charge; qualified source/editorial review is required.",
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
        "reviewQuestionsInternal": candidate["issues"] + [
            "Check cover charge and optional tip against the source setting and local food-service usage.",
            "Check 伝票/会計/レシート as three contextual dictionary senses before learner release.",
            "Review Card 10 ウェイトレス and corresponding Reader gender/register with qualified Japanese reviewers.",
            "Assess cards for cash payment versus Reader's no-cash, card-payment scene without inventing a second payment.",
        ],
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
