"""Build the inert Japanese Breakfast Core 3 source-scene review packet."""

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

STABLE = "travel-breakfast:3:ja-en"
REVISION = STABLE + ":source-scene-v1"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled",
    "audioRegistered", "listeningReviewed", "offlineRegistered",
    "progressWritesEnabled", "released", "runtimeImported",
    "ownerRouteEnabled", "v4Imported",
)}

CARDS = [
    "パン屋", "カウンター", "パン・ドゥルセ", "ペストリー",
    "ボリージョ", "コンチャ", "エンパナーダ", "チーズ", "中身", "オーブン",
    "クロワッサン", "ジャム", "今日作ったものはどれですか。",
    "どれがいちばん代表的ですか。", "中に何か入っていますか。",
    "甘いですか、それとも塩気のあるものですか。", "何がおすすめですか。",
    "今日焼き上がったのはどれですか。",
]
CARD_GLOSSES = [
    "bread shop", "counter", "pan dulce (Mexican sweet bread)", "pastry",
    "bolillo (crusty white roll)", "concha (sweet shell-shaped bread)",
    "empanada (filled pastry)", "cheese", "contents or filling", "oven", "croissant",
    "jam", "Which items were made today?", "Which is the most representative?",
    "Does it have something inside?", "Is it sweet or something savory/salty?",
    "What do you recommend?", "Which finished baking today?",
]
READER_JA = [
    "朝、旅行者がパン屋に入ります。",
    "カウンターには、たくさんのパンとペストリーが並んでいます。",
    "旅行者は「今日作ったものはどれですか」と尋ねます。",
    "店員は、パン・ドゥルセは今朝のものだと言います。",
    "旅行者は「中に何か入っているのはどれですか」と尋ねます。",
    "店員は、コンチャは甘く、エンパナーダは塩気のあるものだと説明します。",
    "旅行者は「この辺で一般的なものを食べてみたいです」と言います。",
    "店員はボリージョとチーズの組み合わせをすすめます。",
    "旅行者は「コンチャを一つとコーヒーを一杯、お願いします」と注文します。",
]
READER_GLOSSES = [
    "In the morning, a traveler enters a bread shop.",
    "There are many breads and pastries lined up on the counter.",
    "The traveler asks which items were made today.",
    "The employee says that the pan dulce is from this morning.",
    "The traveler asks which one has something inside.",
    "The employee explains that the concha is sweet and the empanada is savory/salty.",
    "The traveler says that they want to try something common to this area.",
    "The employee recommends a combination of bolillo and cheese.",
    "The traveler orders one concha and one cup of coffee, please.",
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render():
    source = json.loads(SOURCE.read_text())["lessons"]["3"]
    archived = json.loads(DRAFT.read_text())
    old = archived["lessons"][2]
    assert old["n"] == 3 and old["stableId"] == STABLE
    assert archived["reviewed"] is False and archived["registered"] is False
    assert len(source["words"]) == len(CARDS) == len(CARD_GLOSSES) == 18
    passage = source["passage"]
    assert len(passage["target"]) == len(passage["native"]) == len(READER_JA) == len(READER_GLOSSES) == 9
    objective = old["sourceEnglish"]
    objectives_text = OBJECTIVES.read_text()
    assert objective["objective"] in objectives_text and objective["roleplay"] in objectives_text
    cards = [
        {"id": f"{REVISION}:card:{i:02d}", "candidatePosition": i,
         "sourceSpanish": row["es"], "sourceEnglish": row["en"],
         "kind": row["kind"], "sourceNoteInternal": row.get("note"),
         "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
         "sourceEnglishIsJapaneseGloss": False}
        for i, (row, ja, gloss) in enumerate(zip(source["words"], CARDS, CARD_GLOSSES), 1)
    ]
    reader = [
        {"id": f"{REVISION}:reader:{i:02d}", "candidatePosition": i,
         "speaker": "Narrator", "sourceSpanish": es, "sourceEnglish": en,
         "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
         "sourceEnglishIsJapaneseGloss": False}
        for i, (es, en, ja, gloss) in enumerate(zip(
            passage["target"], passage["native"], READER_JA, READER_GLOSSES), 1)
    ]
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast",
        "stage": "core", "lessonKey": "core:3", "stableLessonId": STABLE,
        "candidateRevision": REVISION, "status": "source-only Japanese candidate; unapproved",
        "reviewed": False,
        "source": {"contentPath": str(SOURCE.relative_to(ROOT)), "contentSha256": sha(SOURCE),
                   "objectivesPath": str(OBJECTIVES.relative_to(ROOT)), "objectivesSha256": sha(OBJECTIVES),
                   "objectiveEnglish": objective["objective"], "roleplayEnglish": objective["roleplay"],
                   "readerTitleSpanish": passage["title"]},
        "archivedDraft": {"path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "Ask which bakery items were prepared today, whether one has a filling, and what staff recommend; preserve the Mexican bakery item names as vocabulary.",
        "speakingGoalCandidate": objective["roleplay"],
        "sourceConflictInternal": "Core 3 source names no city or country. Its word notes identify pan dulce and bolillo as Mexican terms. The roleplay asks a server to explain three pastries and recommend one made that morning, but the Reader explains only concha and empanada, never says the recommended bolillo was made that morning, and ends with an order for concha. The filled-item question is answered with sweet versus savory, not a filling. The archived Japanese draft adds Sam, anpan, bean paste and cheese bread, and recommends the listed croissant instead of the source bolillo. These differences need source/locale review before release.",
        "oldCardPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["cards"], 1)],
        "oldReaderPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["reader"], 1)],
        "archivedExactCardOverlapInternal": [
            {"oldPosition": old_i, "candidatePosition": new_i,
             "sameJapaneseAndEnglish": True, "migrationAuthorized": False}
            for old_i, old_row in enumerate(old["cards"], 1)
            for new_i, new_row in enumerate(cards, 1)
            if old_row["ja"] == new_row["targetJapaneseDraft"] and old_row["en"] == new_row["sourceEnglish"]
        ],
        "audioScopeReadOnly": {
            "placements": len(cards) + len(reader),
            "twoVoiceClipDecisions": 2 * (len(cards) + len(reader)),
            "twoVoiceSubmittedCharacters": 2 * sum(len(r["targetJapaneseDraft"]) for r in cards + reader),
            "grossEstimateUSDAt30PerMillionCharacters": round(
                30 * 2 * sum(len(r["targetJapaneseDraft"]) for r in cards + reader) / 1_000_000, 5),
            "archivedExactJapaneseCardTextOverlaps": 4,
            "candidateIDsMatchingArchive": 0,
            "synthesized": False,
            "listeningApproved": False,
            "registered": False,
        },
        "savedPositionPolicy": "Old rows have no explicit stable row IDs. New revision-scoped IDs do not authorize a saved-item migration or transfer of earlier clip placement identities.",
        "sourceActorsInternal": "Spanish Reader uses a male traveler and a female employee; Japanese narration uses neutral nouns. No audio casting decision is made.",
        "reviewQuestionsInternal": [
            "Resolve the roleplay-versus-Reader gap about three pastry explanations and a recommendation made that morning; source setting is an unnamed bakery.",
            "The Reader question about a filling receives a sweet-versus-savory answer; decide whether to correct the source before any learner answer is selected.",
            "Confirm Japanese spellings for pan dulce, bolillo, concha and empanada with a qualified Japanese and Mexican-food reviewer.",
            "Decide whether 今日作った preserves fresh today, distinct from the separate oven question, without overclaiming just baked.",
            "Resolve pastry/pastel, savory/salado, filling/中身 and typical/代表的 in context.",
            "Confirm the bolillo-with-cheese serving relation without inventing a filling.",
        ],
        "missing": ["six authored mode prompt/target pairs", "source-aligned Japanese grammar/form examples",
                    "contextual dictionary senses", "speaking setup and word bank",
                    "authorized saved-item policy", "exact-text audio and per-clip listening",
                    "learner/offline/native acceptance"],
        "gates": GATES,
    }


if __name__ == "__main__":
    rendered = json.dumps(render(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.read_text() == rendered, "stale generated packet"
    else:
        OUT.write_text(rendered)
