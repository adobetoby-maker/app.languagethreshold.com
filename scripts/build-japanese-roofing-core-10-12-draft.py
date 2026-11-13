#!/usr/bin/env python3
"""Build private Japanese Roofing Core 10–12 from pinned English anchors."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-roofing/source-english-core-10-12.json"
OUTPUT = ROOT / "content/japanese-roofing/core-10-12-draft.json"
SOURCE_FILES = (
    "src/data/roofing-curriculum.ts",
    "src/data/roofing-lesson-words.ts",
    "src/data/roofing-lesson-passages.ts",
    "public/lesson-content/es/roofing.json",
)

AUTHOR = {
  10: {
    "title": "未完成部分をシートで覆う",
    "objective": "帰る前に未完成の屋根部分を示し、養生の段取りを作業班に伝える。",
    "focus": "～前に places an action before departure; ～ない部分 identifies unfinished work. ～たら expresses a change in conditions, and ～てください gives a direct crew instruction.",
    "words": [
      "養生シート", "未完成の部分", "天候", "雨", "風", "天気予報", "ロープ", "雨漏り",
      "今日終えられない部分には養生シートを掛けてください。", "天候が変わったら作業を止めて屋根から下りてください。", "帰る前にこの部分を覆ってください。", "養生シートをしっかり固定してください。", "今夜は雨が降ります。", "確認のため、段取りを繰り返してください。",
    ],
    "reader": [
      "午後四時で、風が吹いています。", "天気予報では今夜は雨が降るそうです。", "裏側には未完成の部分があります。", "雨で露出した屋根下地が濡れることがあります。", "帰る前にこの部分を覆ってください。", "今日終えられない部分には養生シートを掛けてください。", "ロープで養生シートをしっかり固定してください。", "天候が変わったら作業を止めて屋根から下りてください。", "確認のため、段取りを繰り返してください。",
    ],
    "verbs": [("覆う", "帰る前にこの部分を覆ってください。"), ("固定する", "ロープで養生シートをしっかり固定してください。"), ("止める", "天候が変わったら作業を止めてください。"), ("下りる", "天候が変わったら屋根から下ります。"), ("繰り返す", "確認のため、段取りを繰り返します。")],
    "speaking": "裏側の未完成部分に養生シートを掛けてください。段取りを繰り返して確認しましょう。",
    "modes": {"see": "Find the unfinished section in the scene.", "recall": "Recall tarp, forecast, rope, and leak.", "hear": "Distinguish 雨 from 風 when spoken.", "type": "Type 'Cover this section before we leave.' in Japanese.", "say": "Explain which section needs a tarp and ask the crew to repeat the plan.", "write": "Write the covering sequence before departure."},
  },
  11: {
    "title": "最初の段の墨出し",
    "objective": "最初の段の墨線、軒先、スターター材の位置を説明する。",
    "focus": "～から marks the measurement starting point; ～に沿って marks placement along an edge. ～てから orders measuring and marking before laying the first course.",
    "words": [
      "墨線", "最初の段", "スターター材", "軒先", "巻き尺", "寸法", "まっすぐ", "軒先の出幅",
      "最初の段のために墨線を引いてください。", "ここ、軒先から始めてください。", "線はまっすぐですか。", "端から測ってください。", "スターター材を軒先に沿って置いてください。",
    ],
    "reader": [
      "まず、職長が巻き尺を取り出します。", "軒先の端から測り、図面に測定点を書き込みます。", "そして「最初の段のために墨線を引いてください」と言います。", "二人の作業員が墨つぼの糸を張り、はじきます。", "線はまっすぐですか。", "職長がもう一度寸法を確認します。", "ここ、軒先から始めてください。", "スターター材を軒先に沿って置いてください。", "軒先の出幅の寸法は作業図面に記されています。",
    ],
    "verbs": [("測る", "職長は軒先の端から測ります。"), ("墨線を引く", "作業員は最初の段のために墨線を引きます。"), ("始める", "作業員はここ、軒先から始めます。"), ("置く", "スターター材を軒先に沿って置きます。"), ("確認する", "職長はもう一度寸法を確認します。")],
    "speaking": "最初の段の墨線はここに引いてください。軒先の端から測ります。",
    "modes": {"see": "Find where the foreman marks measurement points.", "recall": "Recall chalk line, first course, eave, and starter strip.", "hear": "Distinguish 墨線 from 巻き尺 when spoken.", "type": "Type 'Is the line straight?' in Japanese.", "say": "Show a new worker where to run the first-course chalk line.", "write": "Write where the overhang measurement is recorded."},
  },
  12: {
    "title": "継ぎ目のずらし方",
    "objective": "継ぎ目をずらす施工パターンを確認し、この現場の仕様を尋ねる。",
    "focus": "～ないように expresses the desired nonalignment; ～によると attributes the six-inch example to the guide. この現場では asks for this job's actual specification.",
    "words": [
      "継ぎ目", "ずらし", "段", "シングル材", "パターン", "インチ", "揃える", "仕様", "切る",
      "継ぎ目を六インチずつずらしてください。", "継ぎ目が一直線に揃ってはいけません。", "この現場では、継ぎ目をどれだけずらしますか。", "この現場の仕様を確認してください。", "次の段の継ぎ目を確認してください。",
    ],
    "reader": [
      "作業班はすでにアスファルトシングル材の最初の段を敷いています。", "これからの各段には配置のパターンが必要です。", "継ぎ目が一直線に揃ってはいけません。", "ガイドには「継ぎ目を六インチずつずらす」とあります。", "しかし、現場ごとに仕様は異なります。", "作業員が「この現場では、継ぎ目をどれだけずらしますか」と尋ねます。", "職長は事務所に電話し、「この現場の仕様を確認してください」と伝えます。", "その間に、次の段の継ぎ目を確認してください。",
    ],
    "verbs": [("ずらす", "ガイドによると、継ぎ目を六インチずつずらします。"), ("確認する", "次の段の継ぎ目を確認してください。"), ("確かめる", "この現場の仕様を確かめてください。"), ("揃える", "この段では継ぎ目を一直線に揃えません。"), ("切る", "この現場のパターンに合わせてシングル材を切ります。")],
    "speaking": "ガイドには六インチずつずらすとあります。この現場の仕様を確認してください。",
    "modes": {"see": "Find how the joints relate to one another.", "recall": "Recall joint, stagger, course, and specification.", "hear": "Distinguish 継ぎ目 from ずらし when spoken.", "type": "Type 'What is the stagger for this job?' in Japanese.", "say": "Cite the guide's six-inch example, then ask the lead for this job's specification.", "write": "Write why the foreman calls the office."},
  },
}

def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)["lessons"]
    assert [x["n"] for x in source] == [10, 11, 12]
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
        assert OUTPUT.read_text() == expected, "Japanese Roofing Core 10–12 draft is stale"
        print("Japanese Roofing Core 10–12 private source pairs and draft gates pass")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
