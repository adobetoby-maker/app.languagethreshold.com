"""Build the inert, source-pinned Japanese Breakfast Core 5 review packet."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PLAN = ROOT / "src/data/travel-zone.ts"
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/core-1-30-draft.json"
OUT = HERE / "source-setting-candidate.json"

CARDS = [
    "朝食", "食事会場", "朝食の時間", "部屋番号", "ビュッフェ", "受付係",
    "テーブル", "お皿", "コーヒー", "ルール",
    "朝食は付いていますか。", "朝食は何時から何時までですか。",
    "部屋は214号室です。", "どのテーブルに座ってもいいですか。",
    "すみません、ビュッフェのルールを教えていただけますか。",
    "もう一度言っていただけますか。",
]
CARD_GLOSSES = [
    "breakfast", "dining venue", "breakfast hours", "room number",
    "buffet", "reception staff member", "table", "plate", "coffee", "rules",
    "Is breakfast included?", "From what time to what time is breakfast?",
    "The room is room 214.", "May I sit at any table?",
    "Excuse me, could you tell me the buffet rules?", "Could you say it again?",
]
READER_JA = [
    "朝、旅行者がホテルの食事会場に着きます。",
    "旅行者は受付係に話しかけます。「朝食は付いていますか」",
    "受付係は「はい、お部屋に朝食が付いています」と言います。",
    "旅行者は「朝食は何時から何時までですか」と尋ねます。",
    "受付係は、このホテルの朝食は6時30分から10時までだと答えます。",
    "旅行者は部屋番号の「214」を伝えます。",
    "次に「ビュッフェですか、それともメニューから注文しますか」と尋ねます。",
    "受付係はビュッフェのルールを説明します。「きれいなお皿をお取りください。食べ物は持ち出さないでください」",
    "旅行者は空いているテーブルを探し、コーヒーを飲みます。",
]
READER_GLOSSES = [
    "In the morning, a traveler arrives at the hotel dining room.",
    "The traveler speaks to the receptionist: 'Is breakfast included?'",
    "The receptionist says, 'Yes, breakfast comes with your room.'",
    "The traveler asks, 'From what time to what time is breakfast?'",
    "The receptionist answers that breakfast at this hotel is from 6:30 to 10:00.",
    "The traveler gives his room number: 214.",
    "Then the traveler asks, 'Is it a buffet, or do I order from a menu?'",
    "She explains the buffet rules: take a clean plate and do not take food out.",
    "The traveler looks for a free table and drinks coffee.",
]
QUOTED_SPEAKERS = [None, "Traveler", "Receptionist", "Traveler", None, None, "Traveler", "Receptionist", None]
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled", "audioRegistered",
    "listeningReviewed", "offlineRegistered", "progressWritesEnabled", "released",
    "runtimeImported", "ownerRouteEnabled", "v4Imported",
)}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    plan = PLAN.read_text()
    objective = "ask whether breakfast is included, the hours, room number, and buffet rules"
    roleplay = "Arrive at a hotel breakfast and resolve uncertainty about access and seating."
    assert objective in plan and roleplay in plan
    source = json.loads(SOURCE.read_text())["lessons"]["5"]
    archive = json.loads(DRAFT.read_text())
    old = archive["lessons"][4]
    stable = "travel-breakfast:5:ja-en"
    revision = stable + ":source-scene-v1"
    assert old["n"] == 5 and old["stableId"] == stable
    assert old["sourceEnglish"]["objective"] == objective
    assert old["sourceEnglish"]["roleplay"] == roleplay
    assert archive["reviewed"] is False and archive["registered"] is False
    assert len(source["words"]) == len(CARDS) == len(CARD_GLOSSES) == 16
    passage = source["passage"]
    assert len(passage["target"]) == len(passage["native"]) == len(READER_JA) == len(READER_GLOSSES) == len(QUOTED_SPEAKERS) == 9
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast",
        "stage": "core", "lessonKey": "core:5", "stableLessonId": stable,
        "candidateRevision": revision, "reviewed": False,
        "status": "source-only Japanese-language full-scene candidate; unapproved",
        "source": {
            "planPath": str(PLAN.relative_to(ROOT)), "planSha256": sha(PLAN),
            "readerPath": str(SOURCE.relative_to(ROOT)), "readerSha256": sha(SOURCE),
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
            {
                "id": f"{revision}:card:{i:02d}", "candidatePosition": i,
                "sourceSpanish": row["es"], "sourceEnglish": row["en"],
                "sourceNoteInternal": row.get("note"), "kind": row["kind"],
                "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
                "sourceEnglishIsJapaneseGloss": False,
                "candidateTextSha256": sha_text(ja),
            }
            for i, (row, ja, gloss) in enumerate(zip(source["words"], CARDS, CARD_GLOSSES), 1)
        ],
        "sourceSettingReader": [
            {
                "id": f"{revision}:reader:{i:02d}", "candidatePosition": i,
                "speaker": "Narrator", "quotedSpeaker": speaker,
                "sourceSpanish": es, "sourceEnglish": en,
                "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
                "sourceEnglishIsJapaneseGloss": False,
                "candidateTextSha256": sha_text(ja),
            }
            for i, (es, en, ja, gloss, speaker) in enumerate(zip(
                passage["target"], passage["native"], READER_JA, READER_GLOSSES, QUOTED_SPEAKERS), 1)
        ],
        "speakingGoalCandidate": "Ask whether hotel breakfast is included and its hours, give room 214, and ask about buffet rules and seating.",
        "japaneseSpecificFocusCandidate": "Ask service-time and inclusion questions with ～は付いていますか and 何時から何時まで; use polite hotel service register without copying Spanish verb paradigms.",
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
        "savedPositionPolicy": "Archived rows have no explicit row IDs. New revision-scoped IDs have no authorized saved-item migration.",
        "unresolvedInternal": [
            "Source menú could mean a set menu or ordering from a printed menu. Earlier Breakfast source lessons use menú as a printed menu, so Reader 7 provisionally selects ordering from it; qualified source/Japanese review remains.",
            "Source says breakfast is included with the room; inclusion in a booking plan is not explicitly stated. Do not add an unverified hotel policy.",
            "The 6:30–10:00 hours are attributed to this hotel only; no universal hotel hours are taught.",
            "Source clean plate is not a new plate; source forbids taking food away without specifying beyond the dining area.",
            "Card 15's Japanese polite request restructures the source's what-question; qualified register review should choose a natural question form.",
            "Reader 8's 持ち出さない is a provisional service-register rendering of do not take food with you; the source does not state an exact boundary.",
            "Receptionist is a woman in Reader but source card recepcionista is gender neutral; 受付係 preserves neutral card meaning.",
            "Spanish toma café and English gets coffee differ in nuance. The source tomar verb examples support having/drinking coffee, so Japanese コーヒーを飲みます follows Spanish; qualified source decision needed.",
            "Review whether 食事会場 versus 朝食会場 best matches hotel comedor and whether room 214 is spoken にいちよん or にひゃくじゅうよん for audio.",
            "The archived draft names Sam and adds a room-plan check, changes the buffet question and omits the no-food rule; no archived text is promoted.",
            "Pinned Spanish source itself remains reviewed:false.",
        ],
        "missing": [
            "six authored prompt-answer mode pairs", "kana/number readings for learner display",
            "Japanese Reader title", "contextual forms", "complete speaking setup",
            "dictionary senses", "saved-item migration", "exact-text audio and individual listening decisions",
            "qualified Japanese and domain review",
        ],
        "gates": GATES,
    }


def sha_text(value):
    return hashlib.sha256(value.encode()).hexdigest()


if __name__ == "__main__":
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text() != rendered:
            raise SystemExit("Core 5 review packet is stale")
        print("Core 5 source packet current")
    else:
        OUT.write_text(rendered)
        print(OUT)
