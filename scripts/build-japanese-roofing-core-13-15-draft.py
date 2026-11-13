#!/usr/bin/env python3
"""Build private Japanese Roofing Core 13–15 from pinned English anchors."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-roofing/source-english-core-13-15.json"
OUTPUT = ROOT / "content/japanese-roofing/core-13-15-draft.json"
SOURCE_FILES = (
    "src/data/roofing-curriculum.ts",
    "src/data/roofing-lesson-words.ts",
    "src/data/roofing-lesson-passages.ts",
    "public/lesson-content/es/roofing.json",
)

AUTHOR = {
  13: {
    "title": "水切り板金の施工順序",
    "objective": "軒先とケラバの水切り板金について、施工順序を作業員に確認する。",
    "focus": "～の下に and ～の上に contrast placement; ～かどうか asks whether a condition holds. ～てから orders checking the manufacturer's instructions before answering.",
    "words": [
      "水切り板金", "軒先", "ケラバ", "ルーフィング", "端", "順序", "重なり", "角", "施工する",
      "まず水切り板金を施工してください。", "水切り板金はルーフィングの下ですか、それとも上ですか。", "軒先から水切り板金の施工を始めてください。", "角で水切り板金を切ってください。", "この屋根の水切り板金の施工順序を説明してください。",
    ],
    "reader": [
      "今日、作業班は水切り板金を施工します。", "作業を始める前に、職長は施工担当者に話しかけます。", "この屋根の水切り板金の施工順序を説明してください。", "水切り板金はルーフィングの下ですか、それとも上ですか。", "施工担当者は答える前にメーカーの施工説明書を確認します。", "図面に従って、軒先から水切り板金の施工を始めてください。", "角で水切り板金を切ってください。",
    ],
    "verbs": [("施工する", "施工担当者はまず水切り板金を施工します。"), ("始める", "作業班は軒先から水切り板金の施工を始めます。"), ("切る", "施工担当者は角で水切り板金を切ります。"), ("説明する", "施工担当者は水切り板金の施工順序を説明します。"), ("確認する", "施工担当者はメーカーの施工説明書を確認します。")],
    "speaking": "この屋根では水切り板金をどの順序で施工しますか。施工説明書に沿って説明してください。",
    "modes": {"see": "Find where the plan says to start the drip edge.", "recall": "Recall drip edge, eave, rake, and underlayment.", "hear": "Distinguish 軒先 from ケラバ when spoken.", "type": "Type 'Cut the drip edge at the corner.' in Japanese.", "say": "Ask the installer to explain the sequence for this roof.", "write": "Write what the installers check before answering."},
  },
  14: {
    "title": "ルーフィングの重ね幅",
    "objective": "ルーフィングの重ね幅を測り、製品の施工説明書で指定値を確認する。",
    "focus": "～ずに expresses an absence of wrinkles; ～で marks the fastening material. ～によると attributes the six-inch example to the guide, while 製品の施工説明書で確認する asks for the selected product's value.",
    "words": [
      "ルーフィング", "重ね幅", "固定具", "ロール", "アスファルトフェルト", "樹脂キャップ付き釘", "しわ", "インチ", "メーカーの施工説明書",
      "ルーフィングの重ね幅は六インチです。", "ルーフィングをまっすぐ広げてください。", "しわがないようにしてください。", "重ね幅は正しいですか。", "樹脂キャップ付き釘でルーフィングを固定してください。",
    ],
    "reader": [
      "昨日、作業班は屋根下地を清掃しました。", "今日はルーフィングの施工を始めます。", "ルーフィングをまっすぐ広げてください。", "しわがないようにしてください。", "職長はガイドの例を思い出します。ルーフィングの重ね幅は六インチです。", "ただし、メーカーの施工説明書でも確認します。", "重ね幅は正しいですか。", "作業員が重ね幅をもう一度測ります。", "樹脂キャップ付き釘でルーフィングを固定してください。",
    ],
    "verbs": [("広げる", "ルーフィングをまっすぐ広げてください。"), ("固定する", "樹脂キャップ付き釘でルーフィングを固定してください。"), ("測る", "作業員が重ね幅をもう一度測ります。"), ("確認する", "職長はメーカーの施工説明書で確認します。"), ("始める", "今日はルーフィングの施工を始めます。")],
    "speaking": "ガイドの例では重ね幅は六インチです。この製品の施工説明書では何インチですか。",
    "modes": {"see": "Find how the worker rolls out the underlayment.", "recall": "Recall underlayment, overlap, fastener, and wrinkle.", "hear": "Distinguish 重ね幅 from しわ when spoken.", "type": "Type 'Is the overlap correct?' in Japanese.", "say": "Use the guide's six-inch example and ask for the product's specified overlap.", "write": "Write what the worker measures again."},
  },
  15: {
    "title": "谷部の防水シート",
    "objective": "谷部の防水シートの施工を指示し、覆う前に施工状態を見せてもらう。",
    "focus": "～前に places inspection before covering; ～に沿って marks installation along the valley. ～てから orders cutting, peeling, and pressing the sheet.",
    "words": [
      "谷部", "氷・水浸入防止シート", "防水シート", "粘着剤", "剥離紙", "幅", "雨漏り", "水切り板金", "シングル材",
      "谷部に沿って氷・水浸入防止シートを敷いてください。", "覆う前に谷部の防水施工を見せてください。", "剥離紙をはがしてください。", "シートを平らに押さえてください。", "防水シートを必要な長さに切ってください。", "谷部は端まで覆われていますか。",
    ],
    "reader": [
      "谷部は水が勢いよく流れる場所です。", "そのため、作業班は保護を追加します。", "防水シートを必要な長さに切ってください。", "粘着面の剥離紙をはがしてください。", "谷部に沿って氷・水浸入防止シートを敷いてください。", "屋根下地に密着するよう、シートを平らに押さえてください。", "谷部で雨漏りすると、家が傷むことがあります。", "職長が尋ねます。「谷部は端まで覆われていますか。」", "覆う前に谷部の防水施工を見せてください。",
    ],
    "verbs": [("切る", "防水シートを必要な長さに切ってください。"), ("はがす", "粘着面の剥離紙をはがしてください。"), ("追加する", "そのため、作業班は保護を追加します。"), ("押さえる", "屋根下地に密着するよう、シートを平らに押さえてください。"), ("見せる", "覆う前に谷部の防水施工を見せます。")],
    "speaking": "覆う前に谷部の防水施工を見せてください。端まで覆われていますか。",
    "modes": {"see": "Find where the crew adds extra protection.", "recall": "Recall valley, membrane, adhesive, and backing paper.", "hear": "Distinguish 防水シート from 剥離紙 when spoken.", "type": "Type 'Cut the membrane to length.' in Japanese.", "say": "Ask the crew lead to show the valley protection before it is covered.", "write": "Write the order of cutting, peeling, and pressing the sheet."},
  },
}

def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)["lessons"]
    assert [x["n"] for x in source] == [13, 14, 15]
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
        assert OUTPUT.read_text() == expected, "Japanese Roofing Core 13–15 draft is stale"
        print("Japanese Roofing Core 13–15 private source pairs and draft gates pass")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
