"""Build the inert Japanese Breakfast Core 9 source-scene review packet."""

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

STABLE = "travel-breakfast:9:ja-en"
REVISION = STABLE + ":source-scene-v1"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled",
    "audioRegistered", "listeningReviewed", "offlineRegistered",
    "progressWritesEnabled", "released", "runtimeImported",
    "ownerRouteEnabled", "v4Imported",
)}

CARDS = [
    "ミルク入りコーヒー",
    "クロワッサン",
    "カウンター",
    "ふた",
    "紙袋",
    "ナプキン",
    "スプーン",
    "フォーク",
    "持ち帰り用のカップ",
    "お会計",
    "注文",
    "コーヒーを持ち帰りで注文できますか。",
    "これを持ち帰りでお願いします。",
    "ナプキンとスプーンをいただけますか。",
    "袋に入れていただけますか。",
    "ふたは付いていますか。",
    "私の電車はもうすぐ出発します。"
]
CARD_GLOSSES = [
    "coffee with milk",
    "croissant",
    "counter",
    "lid",
    "paper bag",
    "napkins",
    "spoon",
    "fork",
    "cup for takeout",
    "bill",
    "order",
    "Can I order the coffee for takeout?",
    "This for takeout, please.",
    "Can you give me napkins and a spoon?",
    "Can you put it into a bag?",
    "Does it come with a lid?",
    "My train departs soon."
]
READER_JA = [
    "旅行者がカフェにいて、時計を見ています。",
    "まず、カウンターでミルク入りコーヒーとクロワッサンを注文します。",
    "次に言います。「すみません、コーヒーを持ち帰りで注文できますか。」",
    "ウェイトレスさんが聞きます。「ふたと袋はいりますか。」",
    "旅行者は答えます。「はい、お願いします。ナプキンとスプーンも必要です。」",
    "そのあと、電車で食べるので、クロワッサンの注文を変えます。",
    "「それを紙袋に入れていただけますか。」と言います。",
    "最後にお会計をして、お礼を言います。",
    "注文したものを手に持って、急いで駅へ向かいます。"
]
READER_GLOSSES = [
    "A traveler is at a café and looking at a clock.",
    "First, at the counter, he orders a coffee with milk and a croissant.",
    "Next he says: 'Excuse me, can I order the coffee for takeout?'",
    "The waitress asks: 'Do you want a lid and a bag?'",
    "The traveler answers: 'Yes, please. I also need napkins and a spoon.'",
    "After that, because he will eat on the train, he changes the croissant order.",
    "He says: 'Can you put it into a paper bag?'",
    "In the end he pays the bill and says thank you.",
    "Holding his order in his hand, he quickly heads toward the station."
]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render():
    if any(sha(path) != expected for path, expected in PINNED_HASHES.items()):
        raise ValueError("pinned source drift")
    source_file = json.loads(SOURCE.read_text(encoding="utf-8"))
    source = source_file["lessons"]["9"]
    archived = json.loads(DRAFT.read_text(encoding="utf-8"))
    old = archived["lessons"][8]
    assert old["n"] == 9 and old["stableId"] == STABLE
    assert old["sourceEnglish"]["englishWordAnchors"] == [w["en"] for w in source["words"]]
    assert old["sourceEnglish"]["englishReading"] == source["passage"]["native"]
    assert archived["reviewed"] is False and archived["registered"] is False
    assert len(source["words"]) == len(CARDS) == len(CARD_GLOSSES) == 17
    passage = source["passage"]
    assert len(passage["target"]) == len(passage["native"]) == len(READER_JA) == len(READER_GLOSSES) == 9
    objective = old["sourceEnglish"]
    objectives_text = OBJECTIVES.read_text(encoding="utf-8")
    title_at = objectives_text.index('"Request takeaway"')
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
        "stage": "core", "lessonKey": "core:9", "stableLessonId": STABLE,
        "candidateRevision": REVISION, "status": "source-only Japanese candidate; unapproved",
        "reviewed": False,
        "source": {"contentPath": str(SOURCE.relative_to(ROOT)), "contentSha256": sha(SOURCE),
                   "objectivesPath": str(OBJECTIVES.relative_to(ROOT)), "objectivesSha256": sha(OBJECTIVES),
                   "sourceVersion": source_file["version"],
                   "sourceReviewed": source_file["reviewed"],
                   "sourceModelClaim": source_file.get("model"),
                   "titleEnglishInternal": "Request takeaway",
                   "objectiveEnglishInternal": objective["objective"],
                   "objectiveEditorialHold": True,
                   "roleplayEnglishInternal": objective["roleplay"],
                   "readerTitleSpanish": passage["title"],
                   "readerVerbExamples": [v["example"] for v in source["verbs"]]},
        "archivedDraft": {"path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "Request coffee to go, ask about a lid and bag, and request utensils while heading for a train.",
        "speakingGoalInternal": objective["roleplay"],
        "sourceConflictInternal": "The unreviewed curriculum asks to convert part of a seated order, but the source Reader never establishes a seated order. Source Reader 2 already orders coffee and croissant, then Reader 3 asks to order the coffee to go; Reader 6 says the croissant order changes, without specifying the requested change until Reader 7 asks for a paper bag. Preserve these ambiguities. The archived Japanese draft invents that the order is unprepared and that staff confirms a possible change, omitting the source bill, station and fuller utensil vocabulary. The source waitress is female; a Japanese neutral staff term would lose that detail. The source does not identify a city or establish any train food policy; it says the traveler plans to eat on the train.",
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
            "Resolve curriculum seated-order wording against Reader 2–7 before learner release; do not invent that an order is unprepared.",
            "Review Japanese expression for coffee with milk and whether café au lait is a faithful match in this scene.",
            "Review female waitress reference versus natural Japanese café staff wording without silently erasing source detail.",
            "Confirm bag referents in Card 15 and Reader 7 and the croissant order-change ambiguity.",
            "Review whether source Reader 6 implies a changed order or a request to package the pastry; Japanese face keeps it unspecified.",
            "Check Japanese register, punctuation and literal glosses with qualified native and dictionary reviewers.",
            "Decide whether ナプキン needs café-specific clarification, and assess source cards fork, to-go cup and my train leaves soon, which do not occur in the Reader.",
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
