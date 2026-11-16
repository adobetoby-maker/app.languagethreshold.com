"""Build the inert, source-pinned Japanese Breakfast Core 2 review packet."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
OBJECTIVES = ROOT / "src/data/travel-zone.ts"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/core-1-30-draft.json"
OUT = HERE / "source-setting-candidate.json"
STABLE = "travel-breakfast:2:ja-en"
REVISION = STABLE + ":source-scene-v1"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled",
    "audioRegistered", "listeningReviewed", "offlineRegistered",
    "progressWritesEnabled", "released", "runtimeImported",
    "ownerRouteEnabled", "v4Imported",
)}

# Null is deliberate: source Spanish café americano and English black coffee
# disagree, while Reader 7 assigns a staff-style question to the traveler.
CARDS = [
    None, "カフェオレ", "Mサイズ", "オーツミルク", "ホット", "アイス",
    "カウンター", "テーブル", "バリスタ", "サイズ", "ミルク",
    "持ち帰り", "どんな種類のコーヒーがありますか。", "どんなサイズがありますか。",
    "カフェオレをお願いします。", "オーツミルクはありますか。",
    "店内ですか、持ち帰りですか。", "ホットでお願いできますか。",
]
CARD_GLOSSES = [
    None, "café au lait; coffee with milk", "medium size", "oat milk",
    "hot (menu label)", "iced/cold (menu label)", "counter", "table",
    "barista", "size", "milk", "takeaway", "What kinds of coffee are available?",
    "What sizes are available?", "Café au lait, please.",
    "Is oat milk available?", "For here or to go?", "Could it be hot, please?",
]
READER = [
    "女性の旅行者がカフェのカウンターに来ます。",
    "彼女は「どんな種類のコーヒーがありますか」と聞きます。",
    None,
    "彼女はMサイズのカフェオレがほしいと思っています。",
    "「オーツミルクはありますか」と聞きます。",
    "バリスタは「はい」と答え、ホットとアイスのどちらがいいかを聞きます。",
    None,
    "彼女はテーブルに着いて、コーヒーを飲みます。",
]
READER_GLOSSES = [
    "A female traveler comes to the café counter.",
    "She asks what kinds of coffee are available.", None,
    "She thinks she wants a medium café au lait.",
    "She asks whether oat milk is available.",
    "The barista says yes and asks whether she wants it hot or iced.",
    None, "She sits at a table and drinks her coffee.",
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    source = json.loads(SOURCE.read_text())["lessons"]["2"]
    archive = json.loads(ARCHIVE.read_text())
    old = archive["lessons"][1]
    assert old["n"] == 2 and old["stableId"] == STABLE
    assert archive["reviewed"] is False and archive["registered"] is False
    assert len(source["words"]) == len(CARDS) == len(CARD_GLOSSES) == 18
    passage = source["passage"]
    assert len(passage["target"]) == len(passage["native"]) == len(READER) == 8
    assert [w["en"] for w in source["words"]] == old["sourceEnglish"]["englishWordAnchors"]
    assert passage["native"] == old["sourceEnglish"]["englishReading"]
    objective = old["sourceEnglish"]["objective"]
    assert f'"{objective}"' in OBJECTIVES.read_text()
    cards = [
        {"id": f"{REVISION}:card:{i:02d}", "candidatePosition": i,
         "sourceSpanish": row["es"], "sourceEnglish": row["en"],
         "kind": row["kind"], "sourceNoteInternal": row.get("note"),
         "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
         "sourceEnglishIsJapaneseGloss": False,
         "blockedOnSourceDecision": i == 1}
        for i, (row, ja, gloss) in enumerate(zip(source["words"], CARDS, CARD_GLOSSES), 1)
    ]
    reader = [
        {"id": f"{REVISION}:reader:{i:02d}", "candidatePosition": i,
         "sourceSpanish": es, "sourceEnglish": en,
         "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
         "sourceEnglishIsJapaneseGloss": False,
         "blockedOnSourceDecision": i in (3, 7)}
        for i, (es, en, ja, gloss) in enumerate(zip(
            passage["target"], passage["native"], READER, READER_GLOSSES), 1)
    ]
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast",
        "stage": "core", "lessonKey": "core:2", "stableLessonId": STABLE,
        "candidateRevision": REVISION, "reviewed": False,
        "status": "source-only Japanese-language candidate; unapproved",
        "source": {"lessonPath": str(SOURCE.relative_to(ROOT)),
                   "lessonSha256": sha(SOURCE),
                   "objectivesPath": str(OBJECTIVES.relative_to(ROOT)),
                   "objectivesSha256": sha(OBJECTIVES),
                   "archivePath": str(ARCHIVE.relative_to(ROOT)),
                   "archiveSha256": sha(ARCHIVE),
                   "objectiveEnglish": objective,
                   "readerTitleSpanish": passage["title"],
                   "sourceVerbExamples": [v["example"] for v in source["verbs"]]},
        "archivedDraft": {"scene": old["scene"],
                          "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "selectedJapaneseCardCount": sum(x is not None for x in CARDS),
        "selectedJapaneseReaderCount": sum(x is not None for x in READER),
        "sourceConflictsInternal": [
            {"sourceRows": ["card:01", "reader:03"],
             "issue": "Spanish café americano and its espresso-with-water note conflict with English black coffee; no Japanese face selected for either row.",
             "alternativesNotSelected": ["アメリカーノ", "ブラックコーヒー"]},
            {"sourceRows": ["card:17", "reader:07"],
             "issue": "Reader assigns a normally staff-asked here-or-to-go question to the traveler; Card 17 is speaker-neutral, but Reader 7 remains null pending source decision.",
             "alternativesNotSelected": ["traveler asks as written", "barista asks after source correction"]},
            {"sourceRows": ["reader:04", "reader:05", "reader:06", "reader:07"],
             "issue": "Oat milk is confirmed available but never ordered; hot/medium coffee order sequence is incomplete in source. Do not add a new order line in this candidate."},
        ],
        "qualifiedReviewQuestionsInternal": [
            "Choose Japanese café menu labels for café con leche, medium, hot and cold without equating every menu style.",
            "Review narrator gender and polite request register; decide whether Core 2 should teach source Spanish querer/pedir forms or a Japanese want/request contrast.",
            "Review source Reader 7 speaker and card 17 direction before authoring six practice answers or audio.",
        ],
        "oldCardPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; preserve archive; no saved-item migration"}
            for i, row in enumerate(old["cards"], 1)],
        "oldReaderPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; preserve archive; no saved-item migration"}
            for i, row in enumerate(old["reader"], 1)],
        "savedPositionPolicy": "New revision-scoped candidate IDs do not map archived positions or change learner progress.",
        "modeStatus": "Archived mode labels are not authored six-mode prompt/answer pairs.",
        "gates": GATES,
    }


def main():
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.read_text() == rendered, "Core 2 packet is stale"
        print("Japanese Breakfast Core 2 packet build check PASS")
    else:
        OUT.write_text(rendered)
        print("Wrote", OUT)


if __name__ == "__main__":
    main()
