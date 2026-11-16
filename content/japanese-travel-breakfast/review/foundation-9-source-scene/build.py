"""Build the inert Japanese Breakfast Foundation 9 source-scene packet."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CURRICULUM = ROOT / "src/data/core60/es/foundation-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/foundation-travel-breakfast.json"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/foundation-1-10-draft.json"
PROPOSAL = ROOT / "content/japanese-travel-breakfast/review/foundation-4-9/source-correction-proposals.json"
OUT = HERE / "source-setting-candidate.json"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled", "audioRegistered",
    "listeningReviewed", "offlineRegistered", "progressWritesEnabled", "released",
    "runtimeImported", "ownerRouteEnabled", "v4Imported",
)}

CARDS = [
    "お会計", "チップ", "カード", "現金", "おつり", "氷", "塩", "ストロー", "クリーム",
    "お会計をお願いできますか", "お水を一杯いただけますか",
    "クリームをもっと持ってきてください", "少し待ってください",
    "おつりは取っておいてください",
]
READER_JA = [
    "アンナはオアハカのカフェで、朝食に卵を食べ、コーヒーを飲みます。",
    "お水を一杯いただけますか。",
    "店員のルイスは、氷入りの水とストローを持ってきます。",
    "お塩を持ってきていただけますか。",
    "クリームをもっと持ってきてください。",
    "お会計をお願いできますか。",
    "カードと現金、どちらでお支払いになりますか。",
    "現金で払います。二百ペソ、どうぞ。",
    "おつりはチップとして取っておいてください。",
]
SPEAKERS = ["Narrator", "Anna", "Narrator", "Anna", "Anna", "Anna", "Luis", "Anna", "Anna"]
CARD_GLOSSES = [
    "the bill or payment", "the tip", "the card", "cash", "change", "ice", "salt",
    "a straw", "cream", "Could I ask for the bill?", "Could I have a glass of water?",
    "Please bring more cream.", "Please wait a moment.", "Please keep the change.",
]
READER_GLOSSES = [
    "Anna eats eggs and drinks coffee for breakfast at a café in Oaxaca.",
    "Could I have a glass of water?", "Staff member Luis brings water with ice and a straw.",
    "Could you bring me salt?", "Please bring me more cream.", "Could I ask for the bill?",
    "Will you pay by card or in cash?", "I will pay in cash. Here are 200 pesos.",
    "Please keep the change as a tip.",
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    source = json.loads(CURRICULUM.read_text())["lessons"][8]
    passage = json.loads(READER.read_text())["lessons"]["9"]["passage"]
    archived = json.loads(DRAFT.read_text())
    old = archived["lessons"][8]
    proposal = next(p for p in json.loads(PROPOSAL.read_text())["proposals"] if p["lessonKey"] == "foundation:9")
    stable = "foundation-travel-breakfast:9:ja-en"
    assert source["n"] == 9 and old["stableId"] == proposal["stableLessonId"] == stable
    assert source["objective"] == old["sourceEnglishObjective"] == proposal["sourceObjective"]
    assert len(source["words"]) == len(CARDS) == len(CARD_GLOSSES) == 14
    assert len(passage["target"]) == len(passage["native"]) == len(READER_JA) == len(READER_GLOSSES) == len(SPEAKERS) == 9
    assert archived["reviewed"] is False and archived["registered"] is False
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast",
        "stage": "foundation", "lessonKey": "foundation:9", "stableLessonId": stable,
        "reviewed": False, "status": "source-only Japanese-language candidate; unapproved",
        "source": {
            "curriculumPath": str(CURRICULUM.relative_to(ROOT)), "curriculumSha256": sha(CURRICULUM),
            "readerPath": str(READER.relative_to(ROOT)), "readerSha256": sha(READER),
            "objectiveEnglish": source["objective"], "focusEnglish": source["focus"],
            "speakingEnglish": source["speaking"], "readerTitleSpanish": passage["title"],
        },
        "archivedDraft": {"path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
                          "scene": old["scene"], "cardCount": len(old["cards"]), "readerCount": len(old["reader"])},
        "priorProposal": {"path": str(PROPOSAL.relative_to(ROOT)), "sha256": sha(PROPOSAL),
                          "readerRevision": proposal["candidateReaderRevision"],
                          "cardRevision": "foundation-travel-breakfast:9:ja-en:card:source-scene-v1",
                          "status": "retained separately; no automatic audio or saved-item mapping"},
        "sourceCards": [
            {"id": f"{stable}:card:source-scene-v2:{i:02d}",
             "candidateCardRevision": f"{stable}:card:source-scene-v2", "candidatePosition": i,
             "sourceSpanish": row["es"], "sourceEnglish": row["en"], "kind": row["kind"],
             "sourceNote": row.get("note"), "targetJapaneseDraft": ja,
             "literalJapaneseGlossEn": gloss, "sourceEnglishIsJapaneseGloss": False}
            for i, (row, ja, gloss) in enumerate(zip(source["words"], CARDS, CARD_GLOSSES), 1)
        ],
        "sourceSettingReader": [
            {"id": f"{stable}:reader:source-scene-v2:{i:02d}",
             "candidateReaderRevision": f"{stable}:reader:source-scene-v2", "candidatePosition": i,
             "speaker": speaker, "sourceSpanish": es, "sourceEnglish": en,
             "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
             "sourceEnglishIsJapaneseGloss": False}
            for i, (es, en, ja, speaker, gloss) in enumerate(zip(
                passage["target"], passage["native"], READER_JA, SPEAKERS, READER_GLOSSES), 1)
        ],
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
        "savedPositionPolicy": "Archived rows have no explicit row IDs. Source-scene v2 uses revision-scoped IDs; no shipped saved positions are known because the draft was unregistered. No automatic position migration, scoring or progress write is authorized.",
        "speakingGoalCandidate": "In the Oaxaca café, ask for water and the bill, pay in cash, and tell Luis to keep the change.",
        "sourceContextNote": "The Reader explicitly gives change as a tip in Oaxaca; the source word-list note also mentions tips. This is source-setting context, not a universal Japanese café payment rule. The extra prior-proposal tip-included question came from a source note, not one of the 14 source cards.",
        "modeStatus": "Archived six-mode descriptions are labels, not authored prompt/answer pairs; no answer is registered.",
        "audioNote": "Existing Foundation 9 v1 candidate recordings require exact text, voice, file-hash and placement audit before reuse. New or changed text needs separate synthesis and per-clip listening. No audio is registered or approved.",
        "gates": GATES,
        "reviewQuestions": [
            "Qualified Japanese and Mexican-locale review must distinguish this Oaxaca cash/tip scene from the archived Japanese card-payment scene; no universal tipping rule is asserted.",
            "The source gives 200 pesos in the Reader but no bill total or tip percentage; do not invent one.",
            "The Spanish source teaches usted commands. Japanese polite requests are the teaching adaptation; confirm register and card/Reader/speaking consistency before use.",
            "The source does not specify the kind of cream; review クリーム in this food context and preserve the source ambiguity.",
        ],
    }


def main():
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.read_text() == rendered, "Foundation 9 source-scene packet is stale"
        print("PASS Japanese Breakfast Foundation 9 source-scene build")
    else:
        OUT.write_text(rendered)


if __name__ == "__main__":
    main()
