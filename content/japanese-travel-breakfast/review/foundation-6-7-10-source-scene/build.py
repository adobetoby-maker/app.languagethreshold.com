"""Build inert Japanese Breakfast Foundation 6, 7 and 10 source-scene packets."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CURRICULUM = ROOT / "src/data/core60/es/foundation-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/foundation-travel-breakfast.json"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/foundation-1-10-draft.json"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled", "audioRegistered",
    "listeningReviewed", "offlineRegistered", "progressWritesEnabled", "released",
    "runtimeImported", "ownerRouteEnabled", "v4Imported",
)}

LESSONS = {
    6: {
        "cards": [
            "チラキレス", "スクランブルエッグ", "目玉焼き", "豆（フリホーレス）", "チーズ", "ハム",
            "ベーコン", "サルサ・ベルデ（緑のサルサ）", "アボカド", "オートミール",
            "毎日8時に朝ごはんを食べます。", "コーヒーと紅茶、どちらを飲みますか。",
            "ここにお住まいですか。", "私たちは卵に豆を添えて食べます。",
            "私の子どもたちは牛乳を飲みます。", "日曜日は営業していますか。",
        ],
        "reader": [
            "エマは滞在先のホテルで、朝ごはんにサルサ・ベルデのチラキレスを食べます。",
            "エマ：毎日8時に朝ごはんを食べます。",
            "エマはチラキレスにチーズとアボカドをのせます。",
            "同じホテルの別の宿泊客、ルシアはハム入りのスクランブルエッグを食べます。",
            "エマ：コーヒーと紅茶、どちらを飲みますか。",
            "ルシア：私はコーヒーを飲み、子どもたちはオートミールを食べます。",
            "エマ：ここオアハカに住んでいますか。",
            "ルシア：いいえ、プエブラに住んでいます。あちらでは私たちは豆を食べます。",
            "ルシア：家では、夫は目玉焼きとベーコンを食べます。",
        ],
        "speaker": ["Narrator", "Emma", "Narrator", "Narrator", "Emma", "Lucía", "Emma", "Lucía", "Lucía"],
        "speaking": "At the hotel breakfast, tell Lucía what you eat, ask whether she drinks coffee or tea, and ask whether she lives here.",
        "questions": [
            "Qualified Japanese and Mexican-food review should decide whether チラキレス and the generic 豆 adequately teach chilaquiles and frijoles; keep source food notes visible.",
            "The source contrasts informal tú with formal usted. This candidate uses plain-polite 住んでいますか in the Reader and honorific お住まいですか on the formal card; qualified Japanese register review must decide whether this is teachable.",
            "The archived Japanese scene uses Sam, rice and bread; this candidate instead preserves Emma, Lucía, Oaxaca and Puebla.",
        ],
    },
    7: {
        "cards": [
            "何？", "誰？", "どこ？", "いつ？", "いくら？", "どう？", "なぜ？", "どれ？",
            "朝食込み", "甘いパン", "何がおすすめですか。", "トイレはどこですか。",
            "朝食はいくらですか。", "このパンは何という名前ですか。",
            "ハウスコーヒーはどれですか。", "このテーブルの担当はどなたですか。",
        ],
        "reader": [
            "ホテルで、エマとトムは尋ねます。「このテーブルの担当はどなたですか」",
            "ローサ：私が担当します。コーヒーは何になさいますか。",
            "トム：ハウスコーヒーはどれですか。",
            "ローサ：カフェ・デ・オジャです。試してみませんか。",
            "エマ：朝食はいくらですか。それと、いつ終わりますか。",
            "ローサ：朝食込みで、11時に終わります。",
            "トムは甘いパンを指さします。「このパンは何という名前ですか。」",
            "エマ：トイレはどこですか。",
            "ローサ：それはコンチャというパンです。トイレは右側にあります。",
        ],
        "speaker": ["Narrator / Emma and Tom", "Rosa", "Tom", "Rosa", "Emma", "Rosa", "Narrator / Tom", "Emma", "Rosa"],
        "speaking": "Ask the hotel host what breakfast costs, where the restroom is, and what the sweet bread is called; the source scene also names Rosa and her house coffee.",
        "questions": [
            "The source says this particular hotel breakfast is included and ends at 11; the candidate avoids an unsupported room-rate amount or 1,000-yen price.",
            "Qualified Japanese/locale review should assess カフェ・デ・オジャ and コンチャ as Mexican food names and the hotel register.",
            "The archived Japanese scene uses Sam, a 1,000-yen breakfast, anpan and a vague restroom location; it is a distinct locale variant, not the source scene.",
        ],
    },
    10: {
        "cards": [
            "予約", "ベジタリアン向けの選択肢", "情報", "おすすめ料理", "種類", "材料",
            "違う", "すばらしい", "緊急事態", "すみません、わかりません。",
            "もう少しゆっくり話していただけますか。", "これはスペイン語で何と言いますか。",
            "材料は何ですか。", "ベジタリアン向けの選択肢はありますか。",
            "助けてください、緊急事態です！",
        ],
        "reader": [
            "エマはカフェ・ルナに9時の予約を入れています。",
            "壁には、英語とスペイン語で書かれた緊急時の情報があります。",
            "ローサ：今日のおすすめ料理はいつもと違います。鶏肉入りのチラキレスです。",
            "エマ：すみません、わかりません。",
            "エマ：もう少しゆっくり話していただけますか。",
            "エマ：材料は何ですか。",
            "ローサ：材料はトルティーヤ、サルサ・ベルデ、鶏肉、チーズです。",
            "エマ：ベジタリアン向けの選択肢はありますか。",
            "ローサ：はい。ベジタリアン向けの料理はすばらしいですよ。いろいろな種類の野菜が入っています。",
        ],
        "speaker": ["Narrator", "Narrator", "Rosa", "Emma", "Emma", "Emma", "Rosa", "Emma", "Rosa"],
        "speaking": "At Café Luna, tell Rosa you do not understand, ask her to speak more slowly, and ask what the ingredients of today’s specialty are.",
        "questions": [
            "The source objective teaches Spanish cognates, whereas Japanese has no matching -ción/-dad/-ente cognate system. The source card 'How do you say this in Spanish?' remains visible as Spanish-context review evidence; Japanese target-language survival phrasing and the teachable objective need a separate reviewed adaptation before learner use.",
            "The source's emergency information is posted on the wall; this is not an actual emergency or a clinical guidance scene. The separate source card for calling for help is a real emergency phrase and needs its own usage context.",
            "Qualified Japanese/food review should inspect チラキレス, green salsa and vegetarian terminology without inferring ingredient or allergen safety beyond the source.",
            "The archived seasonal-bread Sam scene is a separate draft, not Café Luna's Emma/Rosa chicken-chilaquiles scene. The Spanish/English sign and Japanese dialogue in this Mexican source scene are deliberate parity evidence; qualified review must decide whether to adapt locale or preserve this as a source-context variant.",
        ],
    },
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def packet(n, source, passage, archived):
    data = LESSONS[n]
    old = archived["lessons"][n - 1]
    assert old["stableId"] == f"foundation-travel-breakfast:{n}:ja-en"
    assert old["sourceEnglishObjective"] == source["objective"]
    assert len(data["cards"]) == len(source["words"])
    assert len(data["reader"]) == len(passage["native"]) == len(passage["target"]) == len(data["speaker"])
    prefix = old["stableId"]
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast",
        "stage": "foundation", "lessonKey": f"foundation:{n}", "stableLessonId": prefix,
        "reviewed": False, "status": "source-only Japanese-language candidate; unapproved",
        "source": {
            "curriculumPath": str(CURRICULUM.relative_to(ROOT)), "curriculumSha256": sha(CURRICULUM),
            "readerPath": str(READER.relative_to(ROOT)), "readerSha256": sha(READER),
            "objectiveEnglish": source["objective"], "focusEnglish": source["focus"],
            "speakingEnglish": source["speaking"], "readerTitleSpanish": passage["title"],
        },
        "archivedDraft": {"path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
                          "scene": old["scene"], "cardCount": len(old["cards"]), "readerCount": len(old["reader"])},
        "sourceCards": [
            {"id": f"{prefix}:card:source-scene-v1:{i:02d}",
             "candidateCardRevision": f"{prefix}:card:source-scene-v1", "candidatePosition": i,
             "sourceSpanish": w["es"], "sourceEnglish": w["en"], "kind": w["kind"],
             "sourceNote": w.get("note"), "targetJapaneseDraft": ja}
            for i, (w, ja) in enumerate(zip(source["words"], data["cards"]), 1)
        ],
        "sourceSettingReader": [
            {"id": f"{prefix}:reader:source-scene-v1:{i:02d}",
             "candidateReaderRevision": f"{prefix}:reader:source-scene-v1", "candidatePosition": i,
             "speaker": speaker, "sourceSpanish": es, "sourceEnglish": en,
             "targetJapaneseDraft": ja, "sourceEnglishIsJapaneseGloss": False}
            for i, (es, en, ja, speaker) in enumerate(zip(
                passage["target"], passage["native"], data["reader"], data["speaker"]), 1)
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
        "savedPositionPolicy": "Archived rows have no explicit row IDs. Source-scene candidates use revision-scoped IDs; no shipped saved positions are known because the archived draft was unregistered. No automatic position migration, answer scoring or progress write is authorized.",
        "speakingGoalCandidate": data["speaking"],
        "modeStatus": "Archived six-mode descriptions are labels, not authored prompt/answer pairs; no answer is registered.",
        "audioNote": "Changed exact Japanese text needs a new scoped recording inventory, technical checks and distinct per-clip listening decisions; older recordings do not approve this revision.",
        "gates": GATES, "reviewQuestions": data["questions"],
    }


def build():
    curriculum = json.loads(CURRICULUM.read_text())["lessons"]
    reader = json.loads(READER.read_text())["lessons"]
    archived = json.loads(DRAFT.read_text())
    assert archived["reviewed"] is False and archived["registered"] is False
    return {"schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast",
            "stage": "foundation", "reviewed": False, "gates": GATES,
            "lessons": [packet(n, curriculum[n - 1], reader[str(n)]["passage"], archived)
                        for n in (6, 7, 10)]}


def main():
    out = HERE / "source-setting-candidates.json"
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert out.read_text() == rendered, "source-setting candidates are stale"
        print("PASS Japanese Breakfast Foundation 6/7/10 source-scene build")
    else:
        out.write_text(rendered)


if __name__ == "__main__":
    main()
