#!/usr/bin/env python3
"""Build private Japanese Roofing Core 4–6 from pinned English anchors."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-roofing/source-english-core-4-6.json"
OUTPUT = ROOT / "content/japanese-roofing/core-4-6-draft.json"
SOURCE_FILES = (
    "src/data/roofing-curriculum.ts",
    "src/data/roofing-lesson-words.ts",
    "src/data/roofing-lesson-passages.ts",
    "public/lesson-content/es/roofing.json",
)

AUTHOR = {
  4: {
    "title": "棟、換気口、排水",
    "objective": "棟と屋根の排水部材を日本語で示す。",
    "focus": "～に沿って describes placement along the ridge. ～から離れて describes water moving away from a house. ～はどこに付きますか asks where a component goes.",
    "words": [
      "棟包み材", "換気口", "雨どい", "竪どい", "鼻隠し板", "棟", "棟換気口", "箱形換気口", "軒裏", "小屋裏",
      "棟換気口は棟に沿って設置します。", "竪どいはどこに付きますか。", "雨どいが詰まっています。", "水は家から離れる方向に流れなければなりません。", "小屋裏には換気が必要です。",
    ],
    "reader": [
      "屋根の一番高いところが棟です。", "棟換気口は棟に沿って設置します。", "小屋裏には換気が必要です。", "その下の屋根の端には、鼻隠し板と軒裏があります。", "雨どいが詰まっています。", "水は家から離れる方向に流れなければなりません。", "職長は「竪どいはどこに付きますか」と聞きます。", "作業員は家の角にある竪どいを指します。",
    ],
    "verbs": [("必要である", "小屋裏には換気が必要です。"), ("沿う", "棟換気口は棟に沿っています。"), ("聞く", "職長は「竪どいはどこに付きますか」と聞きます。"), ("指す", "作業員は家の角にある竪どいを指します。"), ("流れる", "水は家から離れる方向に流れます。")],
    "speaking": "棟換気口は棟に沿って設置します。竪どいはどこに付きますか。",
    "modes": {"see": "Find the ridge vent and downspout in the scene.", "recall": "Recall ridge, gutter, fascia, and soffit in Japanese.", "hear": "Distinguish 雨どい from 竪どい when spoken.", "type": "Type 'The gutter is clogged.' in Japanese.", "say": "Describe where the ridge vent and downspout go.", "write": "Write two sentences about ventilation and water drainage."},
  },
  5: {
    "title": "釘と副資材の発注",
    "objective": "屋根用の釘とシーリング材を明確に発注する。",
    "focus": "～が必要です states a need; ～はありますか checks stock. ～を届けられますか asks about delivery, and ～を確認してください requests confirmation.",
    "words": [
      "屋根用釘", "樹脂キャップ付き釘", "屋根用アスファルトセメント", "釘", "ステープル", "ねじ", "亜鉛めっき釘", "箱", "シーリング材",
      "屋根用釘が二箱必要です。", "樹脂キャップ付き釘はありますか。", "この現場ではどの釘が指定されていますか。", "いつ届けられますか。", "注文を確認してください。",
    ],
    "reader": [
      "職長は仕入れ先に電話します。", "職長は「屋根用釘が二箱必要です」と言います。", "樹脂キャップ付き釘はありますか。", "職長は現場の仕様書を読み、指定された釘を確認します。", "屋根用アスファルトセメントとシーリング材も必要です。", "いつ届けられますか。", "仕入れ先は一覧を確認し、納品日を伝えます。", "注文を確認してください。",
    ],
    "verbs": [("必要である", "屋根用釘が二箱必要です。"), ("注文する", "この現場ではどの釘を注文する必要がありますか。"), ("できる", "いつ届けられますか。"), ("届ける", "仕入れ先は明日、釘を届けます。"), ("確認する", "注文を確認してください。")],
    "speaking": "屋根用釘が二箱必要です。指定された釘はありますか。",
    "modes": {"see": "Find the specified fastener and the delivery date in the reading.", "recall": "Recall roofing nails, sealant, and plastic cap nails.", "hear": "Distinguish 釘 from ねじ when spoken.", "type": "Type 'When can you deliver them?' in Japanese.", "say": "Call a supplier and ask about specified nails and delivery.", "write": "Write a short order for nails and sealant."},
  },
  6: {
    "title": "朝の班ミーティング",
    "objective": "作業区域、担当、資材の仮置き場所を朝の打ち合わせで確認する。",
    "focus": "～前に sets a sequence; 誰が identifies the person responsible. ～を見せてください asks someone to show a location; ～があれば知らせてください invites a report.",
    "words": [
      "班長", "資材仮置き場", "既存屋根材の撤去", "作業班", "職長", "作業区域", "担当作業", "屋根の施工計画", "危険箇所", "納品",
      "始める前に今日の屋根の施工計画を確認しましょう。", "撤去班を率いるのは誰ですか。", "資材をどこに仮置きするか見せてください。", "危険箇所を見つけたら知らせてください。", "全員、計画を理解しましたか。", "始める前に質問はありますか。",
    ],
    "reader": [
      "朝七時に作業班が集まります。", "職長は「始める前に今日の屋根の施工計画を確認しましょう」と言います。", "職長は「撤去班を率いるのは誰ですか」と聞きます。", "班長のルイスが手を挙げます。", "一人ひとりに作業区域と担当作業があります。", "資材をどこに仮置きするか見せてください。", "危険箇所を見つけたら知らせてください。", "全員、計画を理解しましたか。", "始める前に質問はありますか。",
    ],
    "verbs": [("率いる", "ルイスは撤去班を率います。"), ("理解する", "全員、計画を理解しましたか。"), ("ある", "一人ひとりに担当作業があります。"), ("始める", "七時半に既存屋根材の撤去を始めます。"), ("見つける", "危険箇所を見つけたら知らせてください。")],
    "speaking": "始める前に今日の計画を確認しましょう。資材はどこに仮置きしますか。",
    "modes": {"see": "Find the crew lead and each worker's assignment.", "recall": "Recall work zone, staging area, and tear-off.", "hear": "Distinguish 班長 from 職長 when spoken.", "type": "Type 'Does everyone understand the plan?' in Japanese.", "say": "Lead a brief about assignments and staging.", "write": "Write a short morning brief naming the work zone and material staging area."},
  },
}

def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)["lessons"]
    assert [x["n"] for x in source] == [4, 5, 6]
    out = {
        "schema": 1, "moduleId": "roofing", "stage": "core", "target": "Japanese", "native": "English",
        "state": "authored-draft-partial", "reviewed": False, "registered": False, "audio": "none",
        "englishSourceSubsetSHA256": hashlib.sha256(raw).hexdigest(),
        "sourceFileSHA256": {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in SOURCE_FILES},
        "lessons": [],
        "reviewGates": {k: False for k in ("independentJapaneseReview", "qualifiedRoofingReview", "sixModeRuntime", "dictionarySenses", "offlineVerified", "recordedAudioListening", "phoneAndNativeAcceptance")},
    }
    for src in source:
        n, a = src["n"], AUTHOR[src["n"]]
        assert len(a["words"]) == len(src["words"])
        assert len(a["reader"]) == len(src["readingEnglish"])
        assert len(a["verbs"]) == len(src["verbs"])
        assert set(a["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
        out["lessons"].append({
            "n": n, "stableId": f"roofing:{n}:ja-en", "reviewed": False,
            "titleEnglish": src["titleEnglish"], "sourceEnglishObjective": src["objectiveEnglishSource"],
            "sourceEnglishSpeaking": src["speakingEnglishSource"],
            "title": a["title"], "objective": a["objective"], "focus": a["focus"],
            "cards": [{"ja": ja, "en": w["en"], "kind": w["kind"]} for w, ja in zip(src["words"], a["words"])],
            "reader": [{"ja": ja, "en": en} for en, ja in zip(src["readingEnglish"], a["reader"])],
            "forms": [{"base": base, "exampleJa": example, **v} for v, (base, example) in zip(src["verbs"], a["verbs"])],
            "speaking": {"role": "roofing crew member", "opening": a["speaking"], "goal": src["speakingEnglishSource"]},
            "modes": a["modes"],
        })
    return json.dumps(out, ensure_ascii=False, indent=2) + "\n"

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "Japanese Roofing Core 4–6 draft is stale"
        print("Japanese Roofing Core 4–6 private source pairs and draft gates pass")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
