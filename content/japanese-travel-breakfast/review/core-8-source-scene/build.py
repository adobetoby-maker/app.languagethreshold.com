"""Build the inert Japanese Breakfast Core 8 source-scene review packet."""

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

STABLE = "travel-breakfast:8:ja-en"
REVISION = STABLE + ":source-scene-v1"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled",
    "audioRegistered", "listeningReviewed", "offlineRegistered",
    "progressWritesEnabled", "released", "runtimeImported",
    "ownerRouteEnabled", "v4Imported",
)}

CARDS = [
    "ウェイター", "注文", "ミルク入りのコーヒー", "スクランブルエッグ", "オレンジジュース",
    "パンドゥルセ", "トースト", "バター", "デカフェ", "お会計", "テーブル", "ハムのトルタ",
    "全員分の注文をお願いします。", "注文は合っていますか。", "これは彼女の分ですよね。",
    "チーズ抜きでお願いします。", "注文を復唱していただけますか。", "お会計をお願いします。",
]
CARD_GLOSSES = [
    "waiter", "order", "coffee with milk", "scrambled eggs", "orange juice",
    "pan dulce (a sweet roll or pastry)", "toast", "butter", "decaf", "the check / bill",
    "table", "ham torta (a sandwich on a roll)",
    "An order for everyone, please.", "Is the order correct?",
    "This is for her, right?", "Without cheese, please.",
    "Could you repeat the order, please?", "The check, please.",
]
READER_JA = [
    "私は妻と息子と義母と一緒にカフェにいます。",
    "まず、ウェイターに「全員分の注文をお願いします」と言います。",
    "私はミルク入りのコーヒーとスクランブルエッグをお願いします。",
    "妻にはお茶とチーズ抜きのハムのトルタをお願いします。",
    "息子はオレンジジュースとパンドゥルセにします。",
    "義母はデカフェのコーヒーとバター付きのトーストを希望しています。",
    "それから注文を繰り返します。「合っていますか。お茶は彼女の分ですよね」",
    "ウェイターはほほえんで「全部合っています。すぐにお持ちします」と言います。",
    "最後に、テーブルでお会計を頼みます。",
]
READER_GLOSSES = [
    "I am at a café with my wife, son, and mother-in-law.",
    "First I say to the waiter: An order for everyone, please.",
    "For me, coffee with milk and scrambled eggs, please.",
    "For my wife, tea and a ham torta without cheese, please.",
    "My son will have orange juice and pan dulce.",
    "My mother-in-law wants decaf coffee and toast with butter.",
    "Then I repeat the order: Is it correct? The tea is for her, right?",
    "The waiter smiles and says: Everything is right. I will bring it right away.",
    "Finally, I request the check at the table.",
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render():
    if any(sha(path) != expected for path, expected in PINNED_HASHES.items()):
        raise ValueError("pinned source drift")
    source_file = json.loads(SOURCE.read_text(encoding="utf-8"))
    source = source_file["lessons"]["8"]
    archived = json.loads(DRAFT.read_text(encoding="utf-8"))
    old = archived["lessons"][7]
    assert old["n"] == 8 and old["stableId"] == STABLE
    assert archived["reviewed"] is False and archived["registered"] is False
    assert len(source["words"]) == len(CARDS) == len(CARD_GLOSSES) == 18
    passage = source["passage"]
    assert len(passage["target"]) == len(passage["native"]) == len(READER_JA) == len(READER_GLOSSES) == 9
    objective = old["sourceEnglish"]
    objectives_text = OBJECTIVES.read_text(encoding="utf-8")
    title_at = objectives_text.index('"Order for another person"')
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
         "selectionStatus": "unapproved draft candidate"}
        for i, (es, en, ja, gloss) in enumerate(zip(
            passage["target"], passage["native"], READER_JA, READER_GLOSSES), 1)
    ]
    overlaps = [
        {"oldPosition": oi, "candidatePosition": ni,
         "migrationAuthorized": False, "textOnly": True}
        for oi, old_row in enumerate(old["cards"], 1)
        for ni, new_row in enumerate(cards, 1)
        if old_row["ja"] == new_row["targetJapaneseDraft"]
    ]
    if any("id" in row for row in old["cards"] + old["reader"]):
        raise ValueError("archived row ID assumption changed")
    draft_faces = cards + reader
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast",
        "stage": "core", "lessonKey": "core:8", "stableLessonId": STABLE,
        "candidateRevision": REVISION, "status": "source-only Japanese candidate; unapproved",
        "reviewed": False,
        "source": {"contentPath": str(SOURCE.relative_to(ROOT)), "contentSha256": sha(SOURCE),
                   "objectivesPath": str(OBJECTIVES.relative_to(ROOT)), "objectivesSha256": sha(OBJECTIVES),
                   "sourceVersion": source_file["version"], "sourceReviewed": source_file["reviewed"],
                   "sourceModelClaim": source_file.get("model"),
                   "titleEnglishInternal": "Order for another person",
                   "objectiveEnglishInternal": objective["objective"],
                   "roleplayEnglishInternal": objective["roleplay"],
                   "readerTitleSpanish": passage["title"],
                   "readerVerbExamples": [v["example"] for v in source["verbs"]]},
        "archivedDraft": {"path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "Place and confirm an order for four family members with distinct food and drink requests while preserving each person's assignment.",
        "speakingGoalInternal": objective["roleplay"],
        "sourceConflictInternal": "The archived Japanese draft replaces the four-person family scene with Sam and two companions, omits the mother-in-law, substitutes food, and loses the decaf, no-cheese, and check-at-table details. This candidate follows the pinned Spanish/English source instead. The source Reader has the narrator repeat the order; source card 17 separately asks a server to repeat it. Both speech acts are retained rather than treated as interchangeable. The source does not specify the tea type or a city. Pan dulce and torta de jamón remain named foods rather than generic Japanese substitutes. Japanese cafés may use counter payment, but the pinned scene asks for the check at the table.",
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
            "grossEstimateUSDAt30PerMillionCharacters": round(30 * 2 * sum(len(r["targetJapaneseDraft"]) for r in draft_faces) / 1_000_000, 5),
            "archivedExactJapaneseCardTextOverlapsOnly": len(overlaps),
            "candidateIDsMatchingArchive": 0,
            "synthesized": False, "listeningApproved": False, "registered": False,
        },
        "savedPositionPolicy": "Archived draft rows were not registered and have no explicit stable row IDs. New revision-scoped IDs do not authorize saved-item or audio placement migration. This revision's order is frozen; any insertion or reordering requires a new revision.",
        "reviewQuestionsInternal": [
            "Confirm polite ウェイター versus neutral 店員 for the source mesero and target speaking register.",
            "Confirm that the service request 全員分の注文をお願いします adequately teaches source Quiero pedir para todos; its literal Japanese gloss does not include want.",
            "Confirm that ミルク入りのコーヒー preserves café con leche without a stronger coffee-style claim.",
            "Review パンドゥルセ and ハムのトルタ pronunciation and explanatory glosses; neither is a generic Japanese pastry or sliced-bread sandwich.",
            "Confirm お茶 as an unspecified tea; do not silently make the source tea black or green.",
            "Confirm デカフェ and the explicit チーズ抜き order, including a distinct food-allergy interpretation only if the source supplies one.",
            "Check the narrator's order repetition against the separate card asking the server to repeat it.",
            "Confirm table-side check request and all four family assignments before any audio or learner release.",
        ],
        "missing": ["qualified Japanese/food/locale review", "six authored mode prompt/target pairs",
                    "source-aligned Japanese grammar/form examples", "contextual dictionary senses",
                    "speaking setup and word bank", "authorized saved-item policy",
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
