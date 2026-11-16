"""Build inert, source-pinned Japanese Breakfast Foundation 4/9 proposals."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CURRICULUM = ROOT / "src/data/core60/es/foundation-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/foundation-travel-breakfast.json"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/foundation-1-10-draft.json"
OUT = HERE / "source-correction-proposals.json"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled", "audioRegistered",
    "listeningReviewed", "offlineRegistered", "progressWritesEnabled", "released",
    "runtimeImported", "ownerRouteEnabled",
)}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rows(n, source, japanese, glosses, speakers, slugs):
    assert len(source) == len(japanese) == len(glosses) == len(speakers) == len(slugs)
    return [
        {"id": f"foundation-travel-breakfast:{n}:ja-en:reader:source-scene-v1:{slug}",
         "candidateReaderRevision": f"foundation-travel-breakfast:{n}:ja-en:reader:source-scene-v1",
         "candidatePosition": i, "speaker": speaker, "ja": ja, "sourceEnglish": en,
         "literalJapaneseGlossEn": gloss,
         "sourceEnglishIsJapaneseGloss": False}
        for i, (en, ja, gloss, speaker, slug) in enumerate(zip(source, japanese, glosses, speakers, slugs), 1)
    ]


def build():
    curriculum = json.loads(CURRICULUM.read_text())["lessons"]
    reader = json.loads(READER.read_text())["lessons"]
    draft_file = json.loads(DRAFT.read_text())
    assert draft_file["reviewed"] is False and draft_file["registered"] is False
    draft = draft_file["lessons"]
    f4_native = reader["4"]["passage"]["native"]
    f9_native = reader["9"]["passage"]["native"]
    assert curriculum[3]["words"][9]["note"] == "Natural means freshly squeezed, not from a carton."
    assert f4_native[1] == "Emma: Do you have fresh orange juice?"
    assert f4_native[2] == "Luis: Yes, and there is also fresh fruit with breakfast."
    assert draft[3]["reader"][5]["en"] == "No, it is not freshly squeezed."
    assert f9_native[7] == "Anna: In cash, here are 200 pesos."
    assert f9_native[-1] == "Anna: Keep the change as a tip."
    assert draft[8]["reader"][7]["en"] == "Then I will pay by card."

    f4_ja = [
        "オアハカのカフェで、エマは店員のルイスに「とてもおなかがすいています」と言います。",
        "生搾りのオレンジジュースはありますか。",
        "はい、あります。朝食には新鮮な果物もあります。",
        "トーストはありますか。",
        "はい、トーストにはバターとジャムがつきます。",
        "砂糖なしのお茶とスプーンをお願いします。",
        "フォークとナプキンも必要です。いただけますか。",
        "かしこまりました。お会計は食後にレジでお願いします。",
    ]
    f9_ja = [
        "アンナはオアハカのカフェで、朝食に卵料理を食べ、コーヒーを飲みます。",
        "お水を一杯いただけますか。",
        "店員のルイスは、氷入りの水とストローを持ってきます。",
        "お塩を持ってきていただけますか。",
        "クリームをもっと持ってきてください。",
        "お会計をお願いできますか。",
        "カードと現金、どちらでお支払いになりますか。",
        "現金で払います。二百ペソ、どうぞ。",
        "おつりはチップとしてどうぞ。",
    ]
    f4_gloss = [
        "At a café in Oaxaca, Emma tells staff member Luis, 'I am very hungry.'",
        "Do you have fresh-squeezed orange juice?",
        "Yes, we do. There is also fresh fruit with breakfast.",
        "Is there toast?",
        "Yes, toast comes with butter and jam.",
        "Tea without sugar and a spoon, please.",
        "I also need a fork and napkin. Could I have them?",
        "Certainly. Please pay at the register after the meal.",
    ]
    f9_gloss = [
        "Anna eats an egg dish and drinks coffee for breakfast at a café in Oaxaca.",
        "Could I have a glass of water?",
        "Staff member Luis brings water with ice and a straw.",
        "Could you bring me salt?",
        "Please bring me more cream.",
        "Could I ask for the bill?",
        "Will you pay by card or in cash?",
        "I will pay in cash. Here are 200 pesos.",
        "Here is the change as a tip.",
    ]
    common = {
        "readerPositionIndexBase": 1,
        "identityNote": "The archived Reader has no row IDs. Every source-setting turn has a new candidate ID. Old positions are retired as candidates, not automatically mapped to saved items or scoring targets; no progress migration is authorized.",
        "audioNote": "Each new exact-text Japanese turn needs fresh audio and its own listening decision if promoted; older recordings do not cover this proposal.",
    }
    proposals = []
    for n, ja, cards, note in (
        (4, f4_ja, [
            ("ask-natural-orange-juice", "生搾りのオレンジジュースはありますか", "Do you have fresh orange juice?", "phrase"),
            ("fresh-fruit", "新鮮な果物", "fresh fruit", "term"),
            ("butter-and-jam", "バターとジャム", "butter and jam", "phrase"),
        ], "The Spanish curriculum glosses natural orange juice as freshly squeezed. The older original Japanese scene answers no, unlike the source scene's yes. This proposed Oaxaca practice scene follows source order and reverses that particular original-scene choice. Natural/freshly squeezed equivalence needs qualified Japanese and locale review."),
        (9, f9_ja, [
            ("tip", "チップ", "the tip", "term"),
            ("salt", "塩", "the salt", "term"),
            ("straw", "ストロー", "the straw", "term"),
            ("cream", "クリーム", "the cream", "term"),
            ("ice", "氷", "the ice", "term"),
            ("tip-included-question", "チップは含まれていますか", "Is the tip included?", "phrase"),
            ("keep-change-as-tip", "おつりはチップとしてどうぞ", "Keep the change as a tip.", "phrase"),
        ], "The source scene is explicitly in Oaxaca and pays 200 pesos cash, leaving change as a tip; no bill total or tip percentage is stated. The older original card-payment scene remains archived, and its future variation status is undecided. This is a Japanese-language practice dialogue in the source setting, not a claim about ordinary Japanese café payment or tipping. Qualified Japanese, Mexican locale and restaurant review is required."),
    ):
        old = draft[n - 1]
        assert curriculum[n - 1]["n"] == n
        assert old["sourceEnglishObjective"] == curriculum[n - 1]["objective"]
        speakers = (["Narrator", "Emma", "Luis", "Emma", "Luis", "Emma", "Emma", "Luis"] if n == 4 else
                    ["Narrator", "Anna", "Narrator", "Anna", "Anna", "Anna", "Luis", "Anna", "Anna"])
        glosses = f4_gloss if n == 4 else f9_gloss
        slugs = (["oaxaca-hungry", "ask-natural-juice", "yes-fruit", "ask-toast", "toast-butter-jam", "tea-spoon", "need-fork-napkin", "pay-register"] if n == 4 else
                 ["oaxaca-breakfast", "ask-water", "water-ice-straw", "ask-salt", "ask-cream", "ask-bill", "card-or-cash", "cash-two-hundred-pesos", "change-as-tip"])
        proposals.append({
            "lessonKey": f"foundation:{n}",
            "stableLessonId": old["stableId"],
            "sourceObjective": curriculum[n - 1]["objective"],
            "sourceReaderTitle": reader[str(n)]["passage"]["title"],
            "sourceSetting": "Oaxaca, Mexico",
            "sourceReviewStatus": "Spanish source is reviewed:false; it is a parity baseline, not a qualified approval",
            "sceneFraming": "Japanese-language practice dialogue following the Spanish source's Oaxaca setting; the old Japanese draft uses original scenes elsewhere in the track.",
            "archivedDraftScene": old["scene"],
            "sourceAnchors": [{"position": i, "english": en} for i, en in enumerate(reader[str(n)]["passage"]["native"], 1)],
            "proposedSourceSettingReader": rows(n, reader[str(n)]["passage"]["native"], ja, glosses, speakers, slugs),
            "candidateReaderRevision": f"foundation-travel-breakfast:{n}:ja-en:reader:source-scene-v1",
            "savedPositionPolicy": "Do not resolve old saved Reader positions through this candidate revision. The archived draft was unregistered; no shipped saved positions are known. A future runtime must use revision-scoped row IDs and explicit migration or tombstones.",
            "oldReaderPositionPlan": [
                {"old": i, "candidate": None, "oldEnglish": row["en"], "disposition": "retire from candidate; retain only in archive; no saved-item migration"}
                for i, row in enumerate(old["reader"], 1)
            ],
            "newCardCandidates": [
                {"id": f"foundation-travel-breakfast:{n}:ja-en:card:source-scene-v1:{slug}", "ja": target, "literalJapaneseGlossEn": native, "kind": kind}
                for slug, target, native, kind in cards
            ],
            "newCardsPlacement": f"Candidate cards have distinct IDs but no saved positions. The archived {len(old['cards'])} cards remain intact; decide any append, replacement or retirement with qualified review and explicit saved-item mapping.",
            "sourceConflictNote": note,
            "speakingGoalCandidate": "Say you are hungry, ask whether fresh-squeezed orange juice is available, and say you need a fork and napkin." if n == 4 else "In the Oaxaca source scene, ask for water and the bill, pay in cash and explicitly leave the change as a tip; the 200-peso amount is a Reader detail, not a required response.",
            "learnerContextCandidate": "This practice dialogue follows a café in Oaxaca; confirm juice preparation when ordering." if n == 4 else "This practice dialogue follows a café in Oaxaca and uses pesos. If unsure, ask whether a tip is included. Payment and tipping practices vary by place.",
            "archivedFieldReconciliation": "If promoted, replace or reconcile the old objective, focus, opening, closure, word bank and mode content as one reviewed lesson revision; the source-only speaking goal does not update those fields.",
            "modeStatus": "Archived mode descriptions are labels, not authored six-mode prompt/answer pairs; no proposed answer is registered.",
            **common,
        })
    return {
        "schema": 1,
        "pairKey": "Japanese:English",
        "track": "travel-breakfast",
        "stage": "foundation",
        "sourceCurriculumSha256": sha(CURRICULUM),
        "sourceReaderSha256": sha(READER),
        "archivedDraftSha256": sha(DRAFT),
        "status": "source-only review candidates; no runtime import, owner route, audio or progress migration",
        "gates": GATES,
        "proposals": proposals,
        "unresolved": [
            "Qualified Japanese, locale and restaurant review must decide the proposed wording and whether the old Japan-style card-payment scene remains a separate lesson variation.",
            "Foundation 4's source gloss says natural means freshly squeezed; confirm the intended Japanese quality claim and café response before any learner answer is set.",
            "Foundation 9's cash, 200-peso and tip lines belong to the Oaxaca source setting; they must not be taught as a universal Japanese café practice.",
            "The source English anchors are separate from literal Japanese glosses; qualified review must approve text and paired answer semantics, including tea type, cream type and natural/freshly squeezed nuance.",
            "Stable card and Reader saved-item semantics, dictionary senses, Japanese forms, speaking and six authored activities remain open. The old F9 speaking closure requires an amount confirmation absent from the source dialogue.",
            "All new exact-text audio needs technical verification and distinct per-clip listening decisions; older audio is not approved for changed text.",
        ],
    }


def main():
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.read_text() == rendered, "proposal is stale"
        print("PASS Japanese Breakfast Foundation 4/9 pinned proposals and closed gates")
    else:
        OUT.write_text(rendered)


if __name__ == "__main__":
    main()
