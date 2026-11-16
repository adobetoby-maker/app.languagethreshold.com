"""Build the inert, source-pinned Japanese Breakfast Core 4 review packet."""

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
    "スクランブルエッグ", "目玉焼き", "ベーコン", "トースト", "果物", "オレンジジュース",
    "ソーセージ", "ポテト", "バター", "テーブル", "メニュー", "塩なしで",
    "卵二個のスクランブルエッグをお願いします。", "トーストを持ってきていただけますか。",
    "しっかり火を通してください。", "果物は付きますか。", "コーヒーは含まれていますか。",
    "朝食には何が付いていますか。",
]
CARD_GLOSSES = [
    "scrambled eggs", "fried egg (commonly sunny side up)", "bacon", "toast", "fruit",
    "orange juice", "sausage", "potato side (style unspecified)", "butter", "table",
    "menu", "without salt", "Scrambled eggs made with two eggs, please.",
    "Could you bring me toast?", "Please cook it through thoroughly.",
    "Does fruit come with it?", "Is coffee included?",
    "What comes with breakfast?",
]
READER_JA = [
    "朝、旅行者がカフェに入ります。",
    "旅行者はテーブルに座り、メニューを見ます。",
    "女性の店員は「ご注文は何になさいますか」と尋ねます。",
    "旅行者は「卵二個のスクランブルエッグをお願いします」と言います。",
    "旅行者はベーコンとトーストと果物も注文します。",
    "女性の店員は「卵はどのように調理いたしましょうか」と尋ねます。",
    "旅行者は「しっかり火を通して、塩なしでお願いします」と答えます。",
    "それから旅行者は「コーヒーは含まれていますか」と尋ねます。",
    "女性の店員は「はい、コーヒーは含まれています」と言います。",
]
READER_GLOSSES = [
    "In the morning, a traveler enters a café.",
    "The traveler sits at a table and looks at the menu.",
    "The female staff member asks: What will you have for your order?",
    "The traveler says: Scrambled eggs made with two eggs, please.",
    "The traveler also orders bacon, toast, and fruit.",
    "The female staff member asks: How shall I prepare the eggs?",
    "The traveler answers: Cook them thoroughly, without salt, please.",
    "Then the traveler asks: Is coffee included?",
    "The female staff member says: Yes, coffee is included.",
]
QUOTED_SPEAKERS = [None, None, "Waitress", "Traveler", None, "Waitress", "Traveler", "Traveler", "Waitress"]
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled", "audioRegistered",
    "listeningReviewed", "offlineRegistered", "progressWritesEnabled", "released",
    "runtimeImported", "ownerRouteEnabled", "v4Imported",
)}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha_text(text):
    return hashlib.sha256(text.encode()).hexdigest()


def build():
    plan = PLAN.read_text()
    objective = "request eggs, sides, toast, fruit, and cooking preferences"
    roleplay = "Build a complete hot breakfast order and confirm what is included."
    title = "Order eggs and a full breakfast"
    assert objective in plan and roleplay in plan and title in plan
    reader_file = json.loads(READER.read_text())
    source = reader_file["lessons"]["4"]
    archive = json.loads(DRAFT.read_text())
    old = archive["lessons"][3]
    stable = "travel-breakfast:4:ja-en"
    revision = stable + ":source-scene-v1"
    assert old["n"] == 4 and old["stableId"] == stable
    assert old["sourceEnglish"]["objective"] == objective
    assert old["sourceEnglish"]["roleplay"] == roleplay
    assert reader_file["reviewed"] is False and archive["reviewed"] is False and archive["registered"] is False
    assert len(source["words"]) == len(CARDS) == len(CARD_GLOSSES) == 18
    passage = source["passage"]
    assert len(passage["target"]) == len(passage["native"]) == len(READER_JA) == len(READER_GLOSSES) == len(QUOTED_SPEAKERS) == 9
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast", "stage": "core",
        "lessonKey": "core:4", "stageId": "travel-breakfast", "lessonNumber": 4,
        "stableLessonId": stable, "candidateRevision": revision, "reviewed": False,
        "status": "source-only Japanese-language full-scene candidate; unapproved",
        "source": {
            "planPath": str(PLAN.relative_to(ROOT)), "planSha256": sha(PLAN),
            "readerPath": str(READER.relative_to(ROOT)), "readerSha256": sha(READER),
            "planTitleEnglish": title, "objectiveEnglish": objective, "roleplayEnglish": roleplay,
            "readerTitleSpanish": passage["title"],
            "sourceVerbs": source["verbs"],
        },
        "archivedDraft": {
            "path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
            "scene": old["scene"], "cardCount": len(old["cards"]), "readerCount": len(old["reader"]),
        },
        "sourceCards": [
            {"id": f"{revision}:card:{i:02d}", "candidatePosition": i,
             "sourceSpanish": word["es"], "sourceEnglish": word["en"],
             "kind": word["kind"], "sourceNoteInternal": word.get("note"),
             "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
             "sourceEnglishIsJapaneseGloss": False, "candidateTextSha256": sha_text(ja)}
            for i, (word, ja, gloss) in enumerate(zip(source["words"], CARDS, CARD_GLOSSES), 1)
        ],
        "sourceSettingReader": [
            {"id": f"{revision}:reader:{i:02d}", "candidatePosition": i,
             "speaker": "Narrator", "quotedSpeaker": speaker,
             "sourceSpanish": es, "sourceEnglish": en,
             "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
             "sourceEnglishIsJapaneseGloss": False, "candidateTextSha256": sha_text(ja)}
            for i, (es, en, ja, gloss, speaker) in enumerate(zip(
                passage["target"], passage["native"], READER_JA, READER_GLOSSES, QUOTED_SPEAKERS), 1)
        ],
        "speakingGoalCandidate": "Order two scrambled eggs, bacon, toast and fruit; request the eggs cooked through without salt; ask whether coffee is included.",
        "japaneseSpecificFocusCandidate": "Order with ～をお願いします, request a cooking preference with ～てください, and ask whether an item is included with 含まれていますか. Spanish querer/pedir/traer/sentarse form tables are separate source concepts.",
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
        "savedPositionPolicy": "Archived rows have no explicit row IDs. Some Japanese text overlaps, but no old row identity is authorized for transfer. This packet has revision-scoped candidate IDs; no shipped progress migration is authorized.",
        "unresolvedInternal": [
            "The archived Sam breakfast-set scene and extra-price coffee answer contradict the pinned unnamed-traveler Reader; they remain archived, not promoted.",
            "Spanish dos huevos revueltos means two eggs scrambled, not two servings; Japanese card and Reader explicitly say 卵二個.",
            "The source asks for scrambled eggs well done. Choose natural Japanese egg-doneness wording with a qualified reviewer before scoring or recording.",
            "The source marks the traveler as male in English/Spanish; Japanese naturally omits that pronoun. Keep this source distinction visible for translation and voice decisions.",
            "Japanese 目玉焼き is a common fried-egg term, but the source does not specify sunny-side-up or a count for that separate card.",
            "Spanish papas has an unspecified breakfast-potato preparation; Japanese ポテト is a candidate menu term, not a claim about fries or hash browns.",
            "The source says coffee is included. Whether it is included in price or merely served alongside breakfast needs source and dictionary review.",
            "The source Reader is itself reviewed:false; its source authority is structural, not qualified language approval.",
            "The source says waitress; Japanese 女性の店員 retains gender in narration, while its service wording needs qualified register review.",
            "Card 13 counting, table-side request register, salt omission and the Reader narrator frames need qualified Japanese and café-domain review.",
        ],
        "missing": ["six authored prompt-answer mode pairs", "kana readings for learner display", "Japanese Reader title", "contextual forms", "full speaking setup", "dictionary senses", "saved-item reconciliation decision", "exact-text audio and individual listening decisions", "qualified Japanese and domain review"],
        "gates": GATES,
    }


if __name__ == "__main__":
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text() != rendered:
            raise SystemExit("Core 4 review packet is stale")
        print("Core 4 source packet current")
    else:
        OUT.write_text(rendered)
        print(OUT)
