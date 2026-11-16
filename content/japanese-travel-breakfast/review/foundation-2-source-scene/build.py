"""Render the inert, source-pinned Japanese Breakfast Foundation 2 packet."""

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

# Candidate Japanese is authored against each current source position. These are
# proposed expressions, not qualified translations or learner scoring targets.
CARDS = [
    "ペソ", "時刻", "朝", "正午", "カップ", "グラス", "1個", "1人前",
    "1ダース", "1切れ", "アメリカーノを2杯ください。", "4人用のテーブルをお願いします。",
    "甘いパンを3個ください。", "120ペソですか。", "8時半です。",
    "朝食は7時から11時までですか。",
]
READER_LINES = [
    "エマは朝、カフェ・ルナに入ります。",
    "エマは時計を見ます。8時半です。",
    "チラキレスは正午までご用意しています。",
    "アメリカーノを2杯ください。",
    "カップで30ペソ、グラスで35ペソです。",
    "カップでお願いします。それと、甘いパンを3個ください。",
    "1個20ペソ、1ダースで200ペソです。",
    "120ペソですか。",
    "はい、そうです。それと、ケーキは1切れ45ペソです。",
]
SPEAKERS = ["Narrator", "Narrator", "Luis", "Emma", "Luis", "Emma", "Luis", "Emma", "Luis"]
REVIEW_QUESTIONS = [
    "Review 時刻 versus a more beginner-friendly clock-time expression; do not teach 時間 as exclusively duration. 時計を見る is an idiomatic way to check the time.",
    "Review 1個/3個 for pan dulce, 1切れ for cake and 1ダース for a dozen in this Mexican café scene; 甘いパン is a meaning-based proposal, not a claim that pan dulce is a Japanese bakery item.",
    "Luis's Japanese availability turn does not separately say 一人前. Decide whether this source serving nuance needs an explicit Japanese counter without adding one-at-a-time distribution.",
    "Confirm Café Luna, Emma, Luis and chilaquiles transliterations and Japanese counter readings before any audio.",
    "The source total is consistent: 2 × 30 + 3 × 20 = 120 pesos. The dozen's 200 pesos is a bulk price and the 45-peso cake slice is separate.",
    "Qualified Japanese and Mexican food/locale review remains open. AI and structural checks are not approval.",
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render():
    src = json.loads(CURRICULUM.read_text())["lessons"][1]
    passage = json.loads(READER.read_text())["lessons"]["2"]["passage"]
    archive = json.loads(DRAFT.read_text())
    previous = json.loads(PRIOR.read_text())
    old = archive["lessons"][1]
    stable = "foundation-travel-breakfast:2:ja-en"
    revision = stable + ":source-scene-v1"
    assert src["n"] == old["n"] == 2 and old["stableId"] == stable
    assert old["sourceEnglishObjective"] == src["objective"]
    assert archive["reviewed"] is False and archive["registered"] is False
    assert previous["proposals"][0]["lessonKey"] == "foundation:2"
    assert len(src["words"]) == len(CARDS) == 16
    assert len(passage["native"]) == len(passage["target"]) == len(READER_LINES) == len(SPEAKERS) == 9
    cards = [{
        "id": f"{revision}:card:{i:02d}", "candidatePosition": i,
        "sourceSpanish": row["es"], "sourceEnglish": row["en"],
        "targetJapaneseDraft": ja, "kind": row["kind"],
        "sourceEnglishIsJapaneseGloss": False, "sourceSpanishNoteInternal": row.get("note"),
    } for i, (row, ja) in enumerate(zip(src["words"], CARDS), 1)]
    lines = [{
        "id": f"{revision}:reader:{i:02d}", "candidatePosition": i, "speaker": speaker,
        "sourceSpanish": es, "sourceEnglish": en, "targetJapaneseDraft": ja,
        "sourceEnglishIsJapaneseGloss": False,
    } for i, (es, en, ja, speaker) in enumerate(zip(passage["target"], passage["native"], READER_LINES, SPEAKERS), 1)]
    lesson = {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast", "stage": "foundation",
        "lessonKey": "foundation:2", "stableLessonId": stable, "candidateRevision": revision,
        "reviewed": False, "status": "source-only Japanese-language candidate; unapproved",
        "source": {
            "curriculumPath": str(CURRICULUM.relative_to(ROOT)), "curriculumSha256": sha(CURRICULUM),
            "readerPath": str(READER.relative_to(ROOT)), "readerSha256": sha(READER),
            "objectiveEnglish": src["objective"], "readerTitleSpanish": passage["title"],
        },
        "archivedDraft": {
            "path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
            "scene": old["scene"], "cardCount": len(old["cards"]), "readerCount": len(old["reader"]),
        },
        "supersedesPreviousProposal": {
            "path": str(PRIOR.relative_to(ROOT)), "sha256": sha(PRIOR), "lessonKey": "foundation:2",
            "scope": "Foundation 2 only; Foundation 8 remains unchanged",
            "disposition": "superseded for source-scene review; no runtime or saved-item migration",
            "rejectedCandidateReaderId": previous["proposals"][0]["newReaderCandidate"]["id"],
            "reason": "That proposal adds Sam and now to Emma's source clock-time turn and produces ten turns where the current source has nine. Its added speaking cue and one-to-ten Reader position plan are likewise superseded for Foundation 2 only.",
        },
        "sourceCards": cards, "sourceSettingReader": lines,
        "speakingGoalCandidate": "In Café Luna, order two americanos and three pieces of sweet bread, then confirm the stated total in pesos; use 8:30 and the café's noon chilaquiles window as scene cues.",
        "japaneseLearningFocusCandidate": "Count drinks with 杯, items with 個, people with 人 and slices with 切れ; say clock time with 時/半 and a from–until span with から…まで while retaining pesos as the scene currency.",
        "oldCardPositionPlan": [{
            "old": i, "candidate": None, "oldEnglish": row["en"],
            "disposition": "retire from this candidate only; retain archive; no saved-item migration",
        } for i, row in enumerate(old["cards"], 1)],
        "oldReaderPositionPlan": [{
            "old": i, "candidate": None, "oldEnglish": row["en"],
            "disposition": "retire from this candidate only; retain archive; no saved-item migration",
        } for i, row in enumerate(old["reader"], 1)],
        "savedPositionPolicy": "Archived rows have no stable row IDs. New IDs are revision-scoped. The archived draft was unregistered; no shipped saved positions are known. Do not map old positions or the superseded ten-turn proposal to these IDs without reviewed semantic migration or tombstones.",
        "modeStatus": "Archived See/Recall/Hear/Type/Say/Write descriptions are labels, not authored prompt/answer pairs. No answer is registered.",
        "audioNote": "The 16 card and nine Reader Japanese texts need an exact-text audio inventory, technical checks and distinct per-clip listening decisions if approved; older yen/Sam clips cannot cover this revision.",
        "gates": GATES, "reviewQuestions": REVIEW_QUESTIONS,
    }
    return {"schema": 1, "track": "travel-breakfast", "stage": "foundation", "pairKey": "Japanese:English",
            "lessons": [lesson], "reviewed": False, "gates": GATES}


def main():
    rendered = json.dumps(render(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.read_text() == rendered, "source-setting candidate is stale"
        print("PASS Japanese Breakfast Foundation 2 source-scene build and closed gates")
    else:
        OUT.write_text(rendered)


if __name__ == "__main__":
    main()
