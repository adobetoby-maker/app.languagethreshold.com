"""Build the inert Japanese Breakfast Core 10 source-scene review packet."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
OBJECTIVES = ROOT / "src/data/travel-zone.ts"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/core-1-30-draft.json"
OUT = HERE / "source-setting-candidate.json"
PINNED_HASHES = {
    SOURCE: "8c00629a79532821ac7b554a4e0f828b25372500303b3dc70f9568c5aabb34cc",
    OBJECTIVES: "8ca7cacc58a272d5e2c9d55b06e265ec8f6b5102d412bc0382d448942e455fe8",
    DRAFT: "7a6ed4b3869c3599119ae74ea911f6c881bf87294342a060378a5a3f19de6112",
}

STABLE = "travel-breakfast:10:ja-en"
REVISION = STABLE + ":source-scene-v1"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled",
    "audioRegistered", "listeningReviewed", "offlineRegistered",
    "progressWritesEnabled", "released", "runtimeImported",
    "ownerRouteEnabled", "v4Imported",
)}

TEXT = json.loads((HERE / "candidate-text.json").read_text(encoding="utf-8"))
CARDS = TEXT["cards"]
CARD_GLOSSES = TEXT["cardGlosses"]
READER_JA = TEXT["reader"]
READER_GLOSSES = TEXT["readerGlosses"]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render():
    if any(sha(path) != expected for path, expected in PINNED_HASHES.items()):
        raise ValueError("pinned source drift")
    source_file = json.loads(SOURCE.read_text(encoding="utf-8"))
    source = source_file["lessons"]["10"]
    archived = json.loads(DRAFT.read_text(encoding="utf-8"))
    old = archived["lessons"][9]
    assert old["n"] == 10 and old["stableId"] == STABLE
    assert old["sourceEnglish"]["englishWordAnchors"] == [w["en"] for w in source["words"]]
    assert old["sourceEnglish"]["englishReading"] == source["passage"]["native"]
    assert archived["reviewed"] is False and archived["registered"] is False
    assert len(source["words"]) == len(CARDS) == len(CARD_GLOSSES) == 16
    passage = source["passage"]
    assert len(passage["target"]) == len(passage["native"]) == len(READER_JA) == len(READER_GLOSSES) == 8
    objective = old["sourceEnglish"]
    objectives_text = OBJECTIVES.read_text(encoding="utf-8")
    title_at = objectives_text.index('"Fix the wrong order"')
    objective_at = objectives_text.index('"' + objective["objective"] + '"')
    roleplay_at = objectives_text.index('"' + objective["roleplay"] + '"')
    if not (0 < objective_at - title_at < 250 and 0 < roleplay_at - objective_at < 500):
        raise ValueError("title, objective and roleplay pairing drift")
    cards = [
        {"id": f"{REVISION}:card:{i:02d}", "candidatePosition": i,
         "sourceSpanish": row["es"], "sourceEnglish": row["en"],
         "kind": row["kind"], "sourceNoteInternal": row.get("note"),
         "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False}
        for i, (row, ja, gloss) in enumerate(zip(source["words"], CARDS, CARD_GLOSSES), 1)
    ]
    reader = [
        {"id": f"{REVISION}:reader:{i:02d}", "candidatePosition": i,
         "speaker": "Narrator", "sourceSpanish": es, "sourceEnglish": en,
         "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False,
         "selectionStatus": "withheld for source editorial review" if ja is None else "unapproved draft candidate"}
        for i, (es, en, ja, gloss) in enumerate(zip(
            passage["target"], passage["native"], READER_JA, READER_GLOSSES), 1)
    ]
    draft_faces = [r for r in cards + reader if r["targetJapaneseDraft"]]
    overlaps = [
        {"oldPosition": oi, "candidatePosition": ni, "migrationAuthorized": False,
         "textOnly": True}
        for oi, old_row in enumerate(old["cards"], 1)
        for ni, new_row in enumerate(cards, 1)
        if old_row["ja"] == new_row["targetJapaneseDraft"]
    ]
    if any("id" in row for row in old["cards"] + old["reader"]):
        raise ValueError("archived row ID assumption changed")
    old_ids = {row["id"] for row in old["cards"] + old["reader"] if "id" in row}
    new_ids = {row["id"] for row in cards + reader}
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast",
        "stage": "core", "lessonKey": "core:10", "stableLessonId": STABLE,
        "candidateRevision": REVISION, "status": "source-only Japanese candidate; unapproved",
        "reviewed": False,
        "source": {"contentPath": str(SOURCE.relative_to(ROOT)), "contentSha256": sha(SOURCE),
                   "objectivesPath": str(OBJECTIVES.relative_to(ROOT)), "objectivesSha256": sha(OBJECTIVES),
                   "sourceVersion": source_file["version"],
                   "sourceReviewed": source_file["reviewed"],
                   "sourceModelClaim": source_file.get("model"),
                   "titleEnglishInternal": "Fix the wrong order",
                   "objectiveEnglishInternal": objective["objective"],
                   "objectiveEditorialHold": True,
                   "roleplayEnglishInternal": objective["roleplay"],
                   "readerTitleSpanish": passage["title"],
                   "readerVerbExamples": [v["example"] for v in source["verbs"]]},
        "archivedDraft": {"path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "Identify the wrong coffee and missing sweet pastry, present the receipt, and politely request correction.",
        "speakingGoalInternal": objective["roleplay"],
        "sourceConflictInternal": "The archived Japanese draft switches to a blend coffee and croissant, adds staff confirmation and nine different Reader turns. The current source instead has an americano, coffee with milk, one missing pan dulce/sweet pastry, the receipt and a male server who promises to bring the corrected coffee and pastry. Card 10 decaf and Card 9 table do not occur in the Reader. Spanish pan dulce is a contextual Mexican sweet pastry; 菓子パン is a draft approximation requiring locale review. Source Card 8 says server (male); Japanese needs explicit gender wording to preserve that detail. Source Reader 8 says coffee without repeating americano; do not silently add it there.",
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
            "draftFacePlacements": len(draft_faces),
            "twoVoiceClipDecisionsIfTextApproved": 2 * len(draft_faces),
            "twoVoiceSubmittedCharactersIfTextApproved": 2 * sum(len(r["targetJapaneseDraft"]) for r in draft_faces),
            "grossEstimateUSDAt30PerMillionCharacters": round(
                30 * 2 * sum(len(r["targetJapaneseDraft"]) for r in draft_faces) / 1_000_000, 5),
            "archivedExactJapaneseCardTextOverlapsOnly": len(overlaps),
            "candidateIDsMatchingArchive": len(new_ids & old_ids),
            "synthesized": False, "listeningApproved": False, "registered": False,
        },
        "savedPositionPolicy": "Archived draft rows were not registered and have no explicit stable row IDs. New revision-scoped IDs do not authorize saved-item or audio placement migration. This revision's order is frozen; any insertion or reordering requires a new revision.",
        "reviewQuestionsInternal": [
            "Review 菓子パン for Mexican pan dulce and whether a retained food name or gloss is needed.",
            "Confirm アメリカーノ（ブラックコーヒー） and ミルク入りコーヒー as distinct source drink labels without implying a new preparation.",
            "Check male-server wording 男性の店員 versus natural Japanese café register and every literal gloss.",
            "Resolve Card 14's implied object: source says change it for me without specifying whether cup/drink/order; Japanese draft should not add one.",
            "Review whether source Reader 8's 'coffee' should stay generic while the wider scene establishes an americano.",
            "Map decaf and table cards, absent from the Reader, into contextual dictionary/six-mode work before learner use.",
        ],
        "missing": ["qualified Japanese/source/dictionary review", "six authored mode prompt/target pairs",
                    "source-aligned Japanese grammar/form examples", "contextual dictionary senses",
                    "speaking setup and card-only word bank", "authorized saved-item policy",
                    "exact-text audio and per-clip listening", "learner/offline/native acceptance"],
        "gates": GATES,
    }


if __name__ == "__main__":
    rendered = json.dumps(render(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        if OUT.read_text(encoding="utf-8") != rendered:
            raise ValueError("stale generated packet")
    else:
        OUT.write_text(rendered, encoding="utf-8")
