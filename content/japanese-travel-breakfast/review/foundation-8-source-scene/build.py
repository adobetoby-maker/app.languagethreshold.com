"""Build inert Japanese Breakfast Foundation 8 source-setting review evidence."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CURRICULUM = ROOT / "src/data/core60/es/foundation-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/foundation-travel-breakfast.json"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/foundation-1-10-draft.json"
PRIOR = ROOT / "content/japanese-travel-breakfast/review/foundation-2-8/source-correction-proposals.json"
OUT = HERE / "source-setting-candidate.json"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled", "audioRegistered",
    "listeningReviewed", "offlineRegistered", "progressWritesEnabled", "released",
    "runtimeImported", "ownerRouteEnabled",
)}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


CARD_JA = [
    "肉", "ナッツ類", "ピーナッツ", "乳製品", "グルテン", "ラクトースフリーの牛乳",
    "誰も…ない", "まだ…ない", "もう一杯", "もっと", "少なめ",
    "肉は食べません。", "ピーナッツは絶対に食べません。アレルギーがあります。",
    "まだ注文が決まっていません。", "コーヒーをもう一杯お願いします。",
    "牛乳を多めに、砂糖は少なめでお願いします。",
    "ほかには何もいりません。ありがとうございます。",
]
CARD_SLUGS = [
    "meat", "nuts", "peanut", "dairy-products", "gluten", "lactose-free-milk",
    "nobody", "not-yet", "another", "more", "less", "do-not-eat-meat",
    "never-peanuts-allergic", "not-ready-yet", "another-coffee", "more-milk-less-sugar",
    "nothing-else-thanks",
]
READER_JA = [
    "エマとトムは、オアハカのカフェで朝食をとっています。",
    "店員のルイスが尋ねます。「ご注文はお決まりですか。」",
    "まだ決まっていません。",
    "私は肉を食べません。トムは乳製品を食べません。",
    "ピーナッツは絶対に食べません。アレルギーがあります。",
    "厨房でナッツ類やピーナッツを使っているか確認します。",
    "クリームもチーズも入っていない緑のチラキレスには、肉も乳製品も入っていません。",
    "トウモロコシのトルティーヤにはグルテンが入っていません。",
    "コーヒーをもう一杯。ラクトースフリーの牛乳を多めに、砂糖は少なめでお願いします。",
]
READER_GLOSS = [
    "Emma and Tom are having breakfast at a café in Oaxaca.",
    "Staff member Luis asks: Have you decided on your order?",
    "We have not decided yet.",
    "I don't eat meat. Tom does not eat dairy products.",
    "I never eat peanuts. I have an allergy.",
    "I will check whether the kitchen uses nuts or peanuts.",
    "The green chilaquiles without cream or cheese contain neither meat nor dairy products.",
    "The corn tortillas do not contain gluten.",
    "Another coffee, with more lactose-free milk and less sugar, please.",
]
READER_SPEAKERS = ["Narrator", "Luis", "Emma", "Emma", "Tom", "Luis", "Luis", "Luis", "Emma"]
READER_SLUGS = [
    "oaxaca-breakfast", "ask-ready", "not-ready", "meat-and-dairy",
    "peanut-allergy", "ask-kitchen", "chilaquiles", "corn-tortillas", "another-coffee",
]


def build():
    source = json.loads(CURRICULUM.read_text())["lessons"][7]
    reading = json.loads(READER.read_text())["lessons"]["8"]["passage"]
    archive = json.loads(DRAFT.read_text())
    prior = json.loads(PRIOR.read_text())
    old = archive["lessons"][7]
    assert archive["reviewed"] is False and archive["registered"] is False
    assert source["n"] == old["n"] == 8
    assert old["stableId"] == "foundation-travel-breakfast:8:ja-en"
    assert old["sourceEnglishObjective"] == source["objective"]
    assert len(source["words"]) == len(CARD_JA) == len(CARD_SLUGS) == 17
    assert len(reading["native"]) == len(reading["target"]) == len(READER_JA) == len(READER_GLOSS) == len(READER_SPEAKERS) == len(READER_SLUGS) == 9
    assert reading["native"][3] == "Emma: I don't eat meat and Tom doesn't eat dairy products."
    assert reading["native"][4] == "Tom: I never eat peanuts, I'm allergic."
    assert reading["native"][5] == "Luis: I'm going to ask the kitchen if they use nuts or peanuts."
    assert reading["native"][6] == "Luis: The green chilaquiles without cream or cheese have no meat or dairy."
    assert reading["native"][8] == "Emma: Another coffee with more lactose-free milk and less sugar, please."
    assert prior["proposals"][1]["lessonKey"] == "foundation:8"
    assert prior["proposals"][1]["newReaderCandidate"]["en"] == "I cannot eat peanuts at all. I have a peanut allergy."
    cards = [
        {
            "id": f"foundation-travel-breakfast:8:ja-en:card:source-scene-v1:{slug}",
            "candidateCardRevision": "foundation-travel-breakfast:8:ja-en:card:source-scene-v1",
            "candidatePosition": i,
            "sourceSpanish": word["es"],
            "sourceEnglish": word["en"],
            "targetJapaneseDraft": ja,
            "kind": word["kind"],
            "sourceNote": word.get("note"),
        }
        for i, (word, ja, slug) in enumerate(zip(source["words"], CARD_JA, CARD_SLUGS), 1)
    ]
    lines = [
        {
            "id": f"foundation-travel-breakfast:8:ja-en:reader:source-scene-v1:{slug}",
            "candidateReaderRevision": "foundation-travel-breakfast:8:ja-en:reader:source-scene-v1",
            "candidatePosition": i,
            "speaker": speaker,
            "sourceSpanish": es,
            "sourceEnglish": en,
            "targetJapaneseDraft": ja,
            "literalJapaneseGlossEn": gloss,
            "sourceEnglishIsJapaneseGloss": False,
        }
        for i, (es, en, ja, gloss, speaker, slug) in enumerate(zip(
            reading["target"], reading["native"], READER_JA, READER_GLOSS, READER_SPEAKERS, READER_SLUGS
        ), 1)
    ]
    return {
        "schema": 1,
        "pairKey": "Japanese:English",
        "track": "travel-breakfast",
        "stage": "foundation",
        "lessonKey": "foundation:8",
        "stableLessonId": old["stableId"],
        "reviewed": False,
        "source": {"curriculumPath": str(CURRICULUM.relative_to(ROOT)), "curriculumSha256": sha(CURRICULUM),
                   "readerPath": str(READER.relative_to(ROOT)), "readerSha256": sha(READER),
                   "objectiveEnglish": source["objective"], "readerTitleSpanish": reading["title"]},
        "archivedDraft": {"path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
                          "scene": old["scene"], "cardCount": len(old["cards"]), "readerCount": len(old["reader"])},
        "priorPeanutProposal": {"path": str(PRIOR.relative_to(ROOT)), "sha256": sha(PRIOR),
                                  "status": "superseded as a full-scene candidate; original proposal remains in the archive"},
        "status": "source-only Japanese-language practice candidate in the Oaxaca source setting; unapproved",
        "sourceReviewStatus": "Spanish source is reviewed:false; used as parity baseline, not qualified approval",
        "sourceCards": cards,
        "sourceSettingReader": lines,
        "oldCardPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archived draft; no saved-item migration"}
            for i, row in enumerate(old["cards"], 1)
        ],
        "oldReaderPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archived draft; no saved-item migration"}
            for i, row in enumerate(old["reader"], 1)
        ],
        "savedPositionPolicy": "The archived cards and Reader have no row IDs; all source-setting candidates use revision-scoped IDs. No shipped saved positions are known because the archived draft was unregistered. Do not map old positions to new IDs or scoring targets without reviewed semantic migration or tombstones.",
        "speakingGoalCandidate": "In the Oaxaca source scene, say the group is not ready; keep Emma's meat avoidance, Tom's dairy avoidance and Tom's peanut allergy distinct; request more lactose-free milk and less sugar in another coffee.",
        "learnerContextCandidate": "This Japanese-language practice dialogue follows a café in Oaxaca. Luis says he will ask the kitchen whether it uses nuts or peanuts.",
        "archivedFieldReconciliation": "If promoted, reconcile objective, focus, scene, speaking, word bank and six authored mode prompt/answer pairs as one reviewed lesson revision; this packet changes no runtime field.",
        "modeStatus": "Archived six-mode descriptions are labels, not authored prompt/answer pairs; no answer is registered.",
        "audioNote": "All new exact-text Japanese card and Reader strings need scoped audio, technical checks and distinct per-clip listening decisions if promoted; older recordings do not cover this revision.",
        "gates": GATES,
        "reviewQuestions": [
            "Qualified Japanese, Oaxaca/Mexican locale, food and allergy terminology review must decide the proposed wording and source-scene switch.",
            "The source separates Tom's dairy avoidance from his peanut allergy; neither implies the other, and Emma's lactose-free milk request is her own.",
            "The source states ingredient/gluten properties for specific foods, but the packet does not claim cross-contact safety or give medical advice.",
            "Card 'another' uses the contextual drink counter もう一杯; a general standalone Japanese dictionary sense needs separate review.",
            "The old Japan-oriented Sam scene and partial peanut addition remain archived; decide whether either survives as a separately identified locale variant.",
            "No saved-item, scoring, progress, audio, offline, owner or V4 identity was changed.",
        ],
    }


def main():
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.read_text() == rendered, "source-setting candidate is stale"
        print("PASS Japanese Breakfast Foundation 8 source-scene build and closed gates")
    else:
        OUT.write_text(rendered)


if __name__ == "__main__":
    main()
