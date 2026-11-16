"""Build the inert, source-pinned Japanese Breakfast Core 1 review packet."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PLAN = ROOT / "src/data/travel-zone.ts"
READER = ROOT / "public/lesson-content/es/travel-breakfast.json"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/core-1-30-draft.json"
OUT = HERE / "source-setting-candidate.json"

CARDS = [
    "カフェ", "カウンター", "テーブル", "空いているテーブル", "店員", "メニュー", "列",
    "テラス", "パン・ドゥルセ", "椅子",
    "おはようございます。こちらのカウンターで注文すればいいですか。",
    "空いているテーブルはありますか。",
    "好きなところに座ってもいいですか。",
    "すみません、わかりません。もう一度言っていただけますか。",
    "お持ち帰りですか、それとも店内でお召し上がりですか。",
]
CARD_GLOSSES = [
    "café (the place)", "counter", "table", "available table", "staff member",
    "menu", "line; queue", "terrace; patio", "pan dulce (sweet pastry)",
    "chair", "Good morning. Should I order at this counter?",
    "Is there an available table?", "May I sit wherever I like?",
    "Excuse me, I do not understand. Could you say it again?",
    "Will you take it away or eat in? (staff-side polite wording)",
]
READER_JA = [
    "旅行者が、とても混んでいるカフェに入ります。",
    "カウンターの前には長い列があります。",
    "旅行者は言います。「おはようございます。」",
    "旅行者は女性の店員に聞きます。「こちらのカウンターで注文すればいいですか。」",
    "女性の店員は答えます。「はい、こちらでご注文ください。」",
    "旅行者は聞きます。「空いているテーブルはありますか。」",
    "女性の店員は言います。「テラスにテーブルがあります。」",
    "旅行者は列に並んで待ち、メニューを見ます。",
    "それから、コーヒーとパン・ドゥルセを注文します。",
]
READER_GLOSSES = [
    "A traveler enters a very crowded café.",
    "There is a long line in front of the counter.",
    "The traveler says: Good morning.",
    "The traveler asks a female staff member: Should I order at this counter?",
    "The female staff member answers: Yes, please order here.",
    "The traveler asks: Is there an available table?",
    "The female staff member says: There is a table on the terrace.",
    "The traveler waits in line and looks at the menu.",
    "Then the traveler orders coffee and pan dulce.",
]
QUOTED_SPEAKERS = [None, None, "Traveler", "Traveler", "Waitress", "Traveler", "Waitress", None, None]
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled", "audioRegistered",
    "listeningReviewed", "offlineRegistered", "progressWritesEnabled", "released",
    "runtimeImported", "ownerRouteEnabled", "v4Imported",
)}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    plan = PLAN.read_text()
    objective = "greet staff, learn whether to order at the counter, and find a place"
    roleplay = "Walk into a crowded Roman café and work out how ordering and seating operate."
    assert objective in plan and roleplay in plan
    source = json.loads(READER.read_text())["lessons"]["1"]
    archived = json.loads(DRAFT.read_text())
    old = archived["lessons"][0]
    stable = "travel-breakfast:1:ja-en"
    revision = stable + ":source-scene-v1"
    assert old["n"] == 1 and old["stableId"] == stable
    assert old["sourceEnglish"]["objective"] == objective
    assert old["sourceEnglish"]["roleplay"] == roleplay
    assert archived["reviewed"] is False and archived["registered"] is False
    assert len(source["words"]) == len(CARDS) == len(CARD_GLOSSES) == 15
    passage = source["passage"]
    assert len(passage["target"]) == len(passage["native"]) == len(READER_JA) == len(READER_GLOSSES) == len(QUOTED_SPEAKERS) == 9
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast",
        "stage": "core", "lessonKey": "core:1", "stableLessonId": stable,
        "candidateRevision": revision, "reviewed": False,
        "status": "source-only Japanese-language full-scene candidate; unapproved",
        "source": {
            "planPath": str(PLAN.relative_to(ROOT)), "planSha256": sha(PLAN),
            "readerPath": str(READER.relative_to(ROOT)), "readerSha256": sha(READER),
            "objectiveEnglish": objective, "roleplayEnglish": roleplay,
            "readerTitleSpanish": passage["title"],
            "sourceVerbExamples": [v["example"] for v in source["verbs"]],
        },
        "archivedDraft": {
            "path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
            "scene": old["scene"], "cardCount": len(old["cards"]),
            "readerCount": len(old["reader"]),
        },
        "sourceCards": [
            {"id": f"{stable}:card:source-scene-v1:{i:02d}",
             "candidateCardRevision": f"{stable}:card:source-scene-v1", "candidatePosition": i,
             "sourceSpanish": row["es"], "sourceEnglish": row["en"],
             "sourceNoteInternal": row.get("note"), "kind": row["kind"],
             "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
             "sourceEnglishIsJapaneseGloss": False,
             "candidateTextSha256": hashlib.sha256(ja.encode()).hexdigest(),
             "speakerUse": "staff-to-customer; traveler-side version requires separate review" if i == 15 else None}
            for i, (row, ja, gloss) in enumerate(zip(source["words"], CARDS, CARD_GLOSSES), 1)
        ],
        "sourceSettingReader": [
            {"id": f"{stable}:reader:source-scene-v1:{i:02d}",
             "candidateReaderRevision": f"{stable}:reader:source-scene-v1", "candidatePosition": i,
             "speaker": "Narrator", "quotedSpeaker": speaker,
             "sourceSpanish": es, "sourceEnglish": en,
             "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
             "sourceEnglishIsJapaneseGloss": False,
             "candidateTextSha256": hashlib.sha256(ja.encode()).hexdigest()}
            for i, (es, en, ja, gloss, speaker) in enumerate(zip(
                passage["target"], passage["native"], READER_JA, READER_GLOSSES, QUOTED_SPEAKERS), 1)
        ],
        "speakingGoalCandidate": "Greet the waitress, ask whether to order at the counter, and ask whether a table is available in a busy café.",
        "japaneseSpecificFocusCandidate": "Ask service-process and seating questions with ～すればいいですか, ～はありますか and ～てもいいですか; source Spanish verb classes are not a Japanese conjugation lesson.",
        "oldCardPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["cards"], 1)
        ],
        "oldReaderPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["reader"], 1)
        ],
        "savedPositionPolicy": "Archived rows have no explicit row IDs. This candidate has revision-scoped IDs; no shipped progress migration is authorized.",
        "unresolvedInternal": [
            "Source plan says Roman café; the Spanish Reader names no city and uses Mexican pan dulce. Choose intended locale before learner promotion.",
            "Spanish café means the shop and may also mean coffee; Japanese カフェ carries only the shop sense here.",
            "Spanish mesero/mesera has grammatical gender; Japanese 店員 is neutral. Reader retains a female staff member.",
            "Pan dulce is preserved as a source-specific term, not silently generalized to Japanese sweet bread; qualified food/locale wording needed.",
            "Card 15 is a staff-side question, so its Japanese polite register differs from traveler-side prompts.",
            "Japanese quote punctuation, terrace seating, table availability and service register need qualified review.",
            "The pinned Spanish Reader itself is reviewed:false; source text is not qualified approval.",
            "Pin 空いている as あいている (vacant), not すいている (uncrowded), before any audio synthesis.",
        ],
        "missing": ["six authored prompt-answer mode pairs", "kana readings for learner display", "Japanese Reader title", "traveler-side card 15 variant", "contextual forms", "full speaking setup", "dictionary senses", "saved-item migration", "exact-text audio and individual listening decisions", "qualified Japanese and domain review"],
        "gates": GATES,
    }


if __name__ == "__main__":
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text() != rendered:
            raise SystemExit("review packet is stale")
        print("Core 1 source packet current")
    else:
        OUT.write_text(rendered)
        print(OUT)
