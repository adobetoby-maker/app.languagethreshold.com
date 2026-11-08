#!/usr/bin/env python3
"""Build private Japanese Roofing Core 1–3 from pinned English anchors."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-roofing/source-english-core-1-3.json"
OUTPUT = ROOT / "content/japanese-roofing/core-1-3-draft.json"
SOURCE_FILES = (
    "src/data/roofing-curriculum.ts",
    "src/data/roofing-lesson-words.ts",
    "src/data/roofing-lesson-passages.ts",
    "public/lesson-content/es/roofing.json",
)

AUTHOR = {
  1: {
    "title": "屋根の構成と材料",
    "objective": "現場の屋根構成と主な材料を日本語で確認する。",
    "focus": "この屋根は～です names the system; ～を使います names the material. 陸屋根 and 勾配屋根 distinguish flat and sloped roofs. ～ですか forms a polite question.",
    "words": [
      "シングル材", "屋根瓦", "金属屋根パネル", "屋根下地", "屋根", "屋根構成", "陸屋根", "勾配屋根", "屋根勾配", "天窓",
      "この屋根には何の材料を使いますか。", "今日はアスファルトシングルを施工します。", "この屋根は金属屋根パネルです。", "この屋根は陸屋根ですか、勾配屋根ですか。", "始める前に屋根勾配を確認してください。",
    ],
    "reader": [
      "今日は新しい現場での初日です。", "職長は作業員と一緒に屋根を見て回ります。", "この屋根は陸屋根ではなく、勾配屋根です。", "屋根構成にはアスファルトシングルを使います。", "職長は「この屋根には何の材料を使いますか」と聞きます。", "作業員は屋根を見て、アスファルトシングルだと答えます。", "裏側には天窓もあります。", "始める前に屋根勾配を確認してください。",
    ],
    "verbs": [("確認する", "始める前に屋根勾配を確認してください。"), ("使う", "この屋根には何の材料を使いますか。"), ("施工する", "今日はアスファルトシングルを施工します。"), ("見る", "作業員は屋根を見ます。"), ("歩く", "職長は屋根の上を歩きます。")],
    "speaking": "この屋根は勾配屋根です。今日はアスファルトシングルを施工します。",
    "modes": {"see": "Find the roof type and material in the scene.", "recall": "Recall the terms for roof deck, pitch, and skylight.", "hear": "Distinguish 陸屋根 from 勾配屋根 when spoken.", "type": "Type 'Is the roof flat or sloped?' in Japanese.", "say": "Tell a crew member the roof type and covering material.", "write": "Write two sentences identifying the roof type and its material."},
  },
  2: {
    "title": "下地、防水層、端部",
    "objective": "仕上げ材の下にある屋根下地、防水層、端部の名称を言う。",
    "focus": "～の上に marks a layer above another; ～の前に marks sequence. 軒先 is the lower eave edge, while けらば is the sloped gable edge. ～はどこに付きますか asks placement.",
    "words": [
      "屋根下地", "ルーフィング", "フェルトルーフィング", "水切り金物", "下地板", "軒先", "けらば", "合板", "合成ルーフィング", "まず水切り金物を取り付けてください。", "ルーフィングの前に屋根下地を掃いてください。", "屋根下地は乾いていて、きれいでなければなりません。", "ルーフィングを広げてください。", "水切り金物はどこに付きますか。",
    ],
    "reader": [
      "作業員はシングル材の下にある層を見ます。", "一番下には合板の屋根下地があります。", "屋根下地は乾いていて、きれいでなければなりません。", "その上に、たとえばフェルトルーフィングを敷きます。", "職長は「水切り金物はどこに付きますか」と聞きます。", "作業員は軒先とけらばの端を指します。", "それから職長は「ルーフィングを広げてください」と指示します。",
    ],
    "verbs": [("取り付ける", "まず水切り金物を取り付けてください。"), ("掃く", "ルーフィングの前に屋根下地を掃いてください。"), ("広げる", "それから職長は「ルーフィングを広げてください」と指示します。"), ("指す", "作業員は軒先を指します。"), ("聞く", "職長は「水切り金物はどこに付きますか」と聞きます。")],
    "speaking": "屋根下地はここです。その上にルーフィングを敷きます。",
    "modes": {"see": "Find the deck and the layer above it.", "recall": "Recall the terms for underlayment, eave, and rake.", "hear": "Distinguish 軒先 from けらば when spoken.", "type": "Type 'Where does the drip edge go?' in Japanese.", "say": "Point out the deck, underlayment, and roof edge on a plan.", "write": "Describe the deck and the layer placed above it."},
  },
  3: {
    "title": "水切りと谷部",
    "objective": "雨水が入りやすい屋根の接合部と水切りを特定する。",
    "focus": "～のそばに locates flashing beside a wall; ～に沿って follows a valley. ～を見せてください requests a location, and ～がないか確認する asks to check for leaks.",
    "words": [
      "水切り板金", "段状水切り板金", "谷部", "自己粘着防水シート", "煙突", "壁", "雨漏り", "シーリング材", "屋根用アスファルトセメント", "シングル材の各段の下に段状水切り板金を入れてください。", "谷部に沿って自己粘着防水シートを敷いてください。", "水切り板金をどこに取り付けるか見せてください。", "この屋根の谷部はどこですか。", "煙突の周囲をシーリングしてください。", "谷部に雨漏りがないか確認してください。",
    ],
    "reader": [
      "雨水は屋根の接合部から入り込むことがあります。", "その接合部は谷部や煙突、壁のそばにあります。", "水切り板金は雨水の侵入を防ぐのに役立ちます。", "ここでは壁のそばに段状水切り板金があります。", "職長は「この屋根の谷部はどこですか」と聞きます。", "作業員は手前の谷部を指します。", "水切り板金をどこに取り付けるか見せてください。", "谷部に雨漏りがないか確認してください。",
    ],
    "verbs": [("確認する", "谷部に雨漏りがないか確認します。"), ("見せる", "作業員は水切り板金をどこに取り付けるか見せます。"), ("シーリングする", "作業員は煙突の周囲をシーリングします。"), ("敷く", "作業員は谷部に沿って自己粘着防水シートを敷きます。"), ("聞く", "職長は谷部がどこにあるか聞きます。")],
    "speaking": "この屋根の谷部はどこですか。水切り板金を見せてください。",
    "modes": {"see": "Find the valley and sidewall flashing in the reading.", "recall": "Recall the terms for flashing, valley, and leak.", "hear": "Distinguish 谷部 from 雨漏り when spoken.", "type": "Type 'Show me where the flashing goes.' in Japanese.", "say": "Ask the crew lead to show each valley and flashing location.", "write": "Write where the flashing is and what it helps prevent."},
  },
}

def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)["lessons"]
    assert [x["n"] for x in source] == [1, 2, 3]
    out = {
        "schema": 1, "moduleId": "roofing", "stage": "core", "target": "Japanese", "native": "English",
        "state": "authored-draft-partial", "reviewed": False, "registered": False, "audio": "none",
        "englishSourceSubsetSHA256": hashlib.sha256(raw).hexdigest(),
        "sourceFileSHA256": {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in SOURCE_FILES},
        "lessons": [],
        "reviewGates": {k: False for k in ("independentJapaneseReview", "qualifiedRoofingReview", "sixModeRuntime", "dictionarySenses", "offlineVerified", "recordedAudioListening", "phoneAndNativeAcceptance")},
    }
    for src in source:
        n = src["n"]
        a = AUTHOR[n]
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
        assert OUTPUT.read_text() == expected, "Japanese Roofing Core 1–3 draft is stale"
        print("Japanese Roofing Core 1–3 private source pairs and draft gates pass")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
