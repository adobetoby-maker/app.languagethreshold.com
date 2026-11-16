"""Render inert source-pinned Japanese Breakfast Foundation 1, 3 and 5 packets."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CURRICULUM = ROOT / "src/data/core60/es/foundation-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/foundation-travel-breakfast.json"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/foundation-1-10-draft.json"
OUT = HERE / "source-setting-candidates.json"
GATES = {name: False for name in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled", "audioRegistered",
    "listeningReviewed", "offlineRegistered", "progressWritesEnabled", "released",
    "runtimeImported", "ownerRouteEnabled",
)}

TEXT = {
    1: {
        "cards": ["コーヒー", "ジュース", "牛乳", "トルティーヤ", "チュロス", "卵", "砂糖", "メニュー", "パン", "おはようございます！", "こんにちは、お元気ですか。", "サムといいます。よろしくお願いします。", "どうもありがとうございます。また明日！", "さようなら。よい一日を。"],
        "reader": ["サムはオアハカでバリスタのロサにあいさつします。「おはようございます！」", "こんにちは、お元気ですか。", "サムといいます。よろしくお願いします。", "サムはメニューを読んで、オレンジジュースを注文します。", "サムは牛乳入りのコーヒーも注文します。", "サムはコーヒーに砂糖を入れません。", "食べ物には、サムは卵料理をトルティーヤと一緒に注文します。", "ロサはチュロスと甘いパンをすすめます。", "どうもありがとうございます。また明日！"],
        "speakers": ["Narrator", "Rosa", "Sam", "Narrator", "Narrator", "Narrator", "Narrator", "Narrator", "Sam"],
        "focus": "Breakfast words and polite morning greetings in the source Oaxaca café scene.",
        "questions": ["Resolve the source Hi/how-are-you exchange for a first-time morning café greeting: こんにちは and お元気ですか are semantically close but pragmatically odd in this service context.", "Decide whether 甘いパン adequately teaches Oaxaca pan dulce; keep locale and food notes separate from exact-text Reader audio.", "Confirm 卵料理をトルティーヤと一緒に preserves eggs with tortillas, and decide conversational farewell wording."],
    },
    3: {
        "cards": ["熱い", "冷たい", "新鮮な", "甘い", "辛い", "おいしい", "埋まっている", "空いている", "ウェイトレス", "コーヒーはとても熱いです。", "このテーブルは空いていますか。", "パンは今日のものですか。", "サルサはとても辛いです。", "注文が決まりました。"],
        "reader": ["ダニエルはオアハカのカフェにいて、たくさんのテーブルが埋まっています。", "ダニエルはウェイトレスに「このテーブルは空いていますか」と聞きます。", "ウェイトレスのロサは「はい、空いています」と言います。", "パンは今日のものですか。", "はい、甘いパンは新鮮です。", "注文が決まりました。", "ロサはコーヒーとオレンジジュースとサルサのチラキレスを持ってきます。", "コーヒーはとても熱いですが、ジュースは冷たいです。", "サルサはとても辛いですが、おいしいです。"],
        "speakers": ["Narrator", "Narrator", "Narrator", "Daniel", "Rosa", "Daniel", "Narrator", "Daniel", "Daniel"],
        "focus": "Describe temperature, freshness, flavor and table availability in the source Oaxaca café scene; Spanish ser/estar has no one-to-one Japanese lesson objective.",
        "questions": ["Review 新鮮です for fresh bread: the English meaning is retained but the Japanese food collocation is awkward; do not substitute an ungrounded baked-today claim.", "Review ウェイトレス for source mesera; it preserves the woman's role but may be dated in Japanese.", "Review 注文が決まりました as a natural contextual rendering of readiness to order.", "Pin 空いている as あいている for available before any audio.", "Choose a Japanese grammar objective independently; Spanish ser/estar cannot be silently mapped to です."],
    },
    5: {
        "cards": ["パン屋", "カフェ", "市場", "カウンター", "テラス", "レジ", "トイレ", "持ち帰り", "ここで食べる", "パン屋に行きます。", "チラキレスを注文するつもりです。", "私たちはここで朝食をとるつもりです。", "テラス席に座ってもいいですか。", "カードで払えますか。", "卵は好みに合わせて調理してもらえますか。"],
        "reader": ["エマは市場の近くのカフェへ朝食を食べに行くつもりです。", "カウンターでは、バリスタのディエゴがコーヒーをいれています。", "チラキレスを注文するつもりです。", "持ち帰りではなく、ここで食べます。", "テラス席に座ってもいいですか。", "はい、大丈夫です。トイレは奥にあります。", "カードで払えますか。", "はい、レジでお支払いいただけます。", "そのあと、エマはパンを買いにパン屋に行くつもりです。"],
        "speakers": ["Narrator", "Narrator", "Emma", "Emma", "Emma", "Diego", "Emma", "Diego", "Narrator"],
        "focus": "State a breakfast destination and intended order; distinguish for-here/to-go and ask about terrace seating and card payment.",
        "questions": ["Review テラス as a bare place term and テラス席 in the seating question; source terrace must not be silently narrowed.", "Review 卵は好みに合わせて調理してもらえますか for huevos al gusto; this asks whether the café can prepare eggs to preference, not an allergy or safety guarantee.", "Review 注文するつもりです: it retains the source plan but may sound less natural as an immediate café order; do not collapse go/do/can functions.", "Pin 市場 as いちば in this scene before any audio."],
    },
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render():
    source = json.loads(CURRICULUM.read_text())["lessons"]
    reading = json.loads(READER.read_text())["lessons"]
    archive = json.loads(DRAFT.read_text())
    assert archive["reviewed"] is False and archive["registered"] is False
    packets = []
    for n, candidate in TEXT.items():
        lesson = source[n - 1]
        passage = reading[str(n)]["passage"]
        old = archive["lessons"][n - 1]
        stable_id = f"foundation-travel-breakfast:{n}:ja-en"
        assert lesson["n"] == old["n"] == n and old["stableId"] == stable_id
        assert old["sourceEnglishObjective"] == lesson["objective"]
        assert len(lesson["words"]) == len(candidate["cards"])
        assert len(passage["native"]) == len(passage["target"]) == len(candidate["reader"]) == len(candidate["speakers"]) == 9
        revision = f"{stable_id}:source-scene-v1"
        cards = [
            {"id": f"{revision}:card:{i:02d}", "candidatePosition": i, "sourceSpanish": row["es"],
             "sourceEnglish": row["en"], "targetJapaneseDraft": ja, "kind": row["kind"],
             "sourceEnglishIsJapaneseGloss": False, "sourceSpanishNoteInternal": row.get("note")}
            for i, (row, ja) in enumerate(zip(lesson["words"], candidate["cards"]), 1)
        ]
        lines = [
            {"id": f"{revision}:reader:{i:02d}", "candidatePosition": i, "speaker": speaker,
             "sourceSpanish": es, "sourceEnglish": en, "targetJapaneseDraft": ja,
             "sourceEnglishIsJapaneseGloss": False}
            for i, (es, en, ja, speaker) in enumerate(zip(passage["target"], passage["native"], candidate["reader"], candidate["speakers"]), 1)
        ]
        packets.append({
            "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast", "stage": "foundation",
            "lessonKey": f"foundation:{n}", "stableLessonId": stable_id, "candidateRevision": revision,
            "reviewed": False, "source": {"curriculumPath": str(CURRICULUM.relative_to(ROOT)),
                "curriculumSha256": sha(CURRICULUM), "readerPath": str(READER.relative_to(ROOT)),
                "readerSha256": sha(READER), "objectiveEnglish": lesson["objective"],
                "readerTitleSpanish": passage["title"]},
            "archivedDraft": {"path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
                "scene": old["scene"], "cardCount": len(old["cards"]), "readerCount": len(old["reader"])},
            "status": "source-only Japanese-language candidate; unapproved",
            "sourceCards": cards, "sourceSettingReader": lines, "speakingGoalCandidate": candidate["focus"],
            "oldCardPositionPlan": [{"old": i, "candidate": None, "oldEnglish": row["en"],
                "disposition": "retire from candidate only; retain archive; no saved-item migration"}
                for i, row in enumerate(old["cards"], 1)],
            "oldReaderPositionPlan": [{"old": i, "candidate": None, "oldEnglish": row["en"],
                "disposition": "retire from candidate only; retain archive; no saved-item migration"}
                for i, row in enumerate(old["reader"], 1)],
            "savedPositionPolicy": "Archived rows have no stable row IDs. Candidate IDs are revision-scoped. Archived drafts were unregistered. Do not map old positions to new IDs or scoring targets without reviewed semantic migration or tombstones.",
            "modeStatus": "Archived six-mode descriptions are labels, not authored prompt/answer pairs; no answer is registered.",
            "audioNote": "Exact-text Japanese cards and Reader turns need scoped audio, technical verification and distinct per-clip listening decisions if promoted; older clips do not cover this revision.",
            "gates": GATES, "reviewQuestions": candidate["questions"] + [
                "Qualified Japanese, food, Oaxaca locale and source review remains open. AI and structural checks are not approval.",
                "Reconcile cards, Reader, dictionary, speaking, six authored modes, audio and saved-item identity together before any learner/V4 registration.",
            ],
        })
    return {"schema": 1, "track": "travel-breakfast", "stage": "foundation",
            "pairKey": "Japanese:English", "lessons": packets, "reviewed": False, "gates": GATES}


def main():
    rendered = json.dumps(render(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.read_text() == rendered, "source-setting candidates are stale"
        print("PASS Japanese Breakfast Foundation 1, 3 and 5 source-scene build and closed gates")
    else:
        OUT.write_text(rendered)


if __name__ == "__main__":
    main()
