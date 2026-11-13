#!/usr/bin/env python3
"""Build private Japanese Roofing Core 7–9 from pinned English anchors."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-roofing/source-english-core-7-9.json"
OUTPUT = ROOT / "content/japanese-roofing/core-7-9-draft.json"
SOURCE_FILES = (
    "src/data/roofing-curriculum.ts",
    "src/data/roofing-lesson-words.ts",
    "src/data/roofing-lesson-passages.ts",
    "public/lesson-content/es/roofing.json",
)

AUTHOR = {
  7: {
    "title": "既存屋根材の撤去範囲",
    "objective": "撤去する層と材料を作業班に具体的に伝える。",
    "focus": "～まで marks the removal endpoint; ～も adds another component. ～を撤去してください gives an instruction, and ～を理解しましたか checks understanding.",
    "words": [
      "既存屋根材の撤去", "シングル材", "屋根下地", "既存の屋根", "層", "作業範囲", "ルーフィング", "バール", "水切り板金",
      "屋根下地まで全て撤去してください。", "シングル材を廃材用コンテナに投げ入れてください。", "全ての層を撤去してください。", "水切り板金も撤去してください。", "何を撤去するか理解しましたか。", "分かりましたか。",
    ],
    "reader": [
      "今日、既存の屋根の撤去が始まります。", "職長が作業範囲を説明します。", "屋根下地まで全て撤去してください。", "ルーフィングを含め、全ての層を撤去してください。", "水切り板金も撤去してください。", "バールは注意して使ってください。", "シングル材を廃材用コンテナに投げ入れてください。", "何を撤去するか理解しましたか。", "分かりましたか。",
    ],
    "verbs": [("撤去する", "屋根下地まで全て撤去してください。"), ("投げ入れる", "シングル材を廃材用コンテナに投げ入れてください。"), ("使う", "バールは注意して使ってください。"), ("理解する", "何を撤去するか理解しましたか。"), ("始まる", "今日、既存の屋根の撤去が始まります。")],
    "speaking": "屋根下地まで全て撤去してください。何を撤去するか理解しましたか。",
    "modes": {"see": "Find every layer named for removal in the reading.", "recall": "Recall the terms for tear-off, roof deck, and flashing.", "hear": "Distinguish 屋根下地 from 水切り板金 when spoken.", "type": "Type 'Tear off everything down to the deck.' in Japanese.", "say": "Give the removal instruction and ask the crew to confirm it.", "write": "Write which layers and components the scope includes."},
  },
  8: {
    "title": "屋根下地の損傷を伝える",
    "objective": "柔らかい下地や損傷を見つけ、補修が必要だと伝える。",
    "focus": "～ないでください tells someone not to cover a panel; ～たら知らせてください requests a report if a condition is found. ～前に identifies what must happen before work continues.",
    "words": [
      "野地板", "柔らかくなった屋根下地", "損傷", "腐った木材", "補修", "交換する", "板材", "合板", "印を付ける",
      "野地板を傷つけないでください。", "屋根下地が柔らかいか、損傷していると感じたら知らせてください。", "ここで止めてください。続ける前に屋根下地の補修が必要です。", "柔らかい板材を覆わないでください。", "損傷した場所に印を付けてください。", "この合板を交換する必要があります。",
    ],
    "reader": [
      "作業班は屋根からシングル材を撤去します。", "野地板を傷つけないでください。", "屋根下地が柔らかいか、損傷していると感じたら知らせてください。", "作業員が板材に足を乗せ、木材が腐っていると気づきます。", "職長は「ここで止めてください。続ける前に屋根下地の補修が必要です」と言います。", "柔らかい板材を覆わないでください。", "損傷した場所に印を付けてください。", "この合板を交換する必要があります。",
    ],
    "verbs": [("補修する", "作業班は今日、屋根下地を補修します。"), ("印を付ける", "作業員は損傷した場所に印を付けます。"), ("交換する", "今日、この合板を交換します。"), ("覆う", "作業員は柔らかい板材を覆いません。"), ("伝える", "作業員は職長に伝えます。")],
    "speaking": "ここで止めてください。屋根下地が柔らかいので、補修が必要です。",
    "modes": {"see": "Find what the worker notices in the deck panel.", "recall": "Recall sheathing, damage, repair, and plywood.", "hear": "Distinguish 補修 from 交換 when spoken.", "type": "Type 'Do not cover the soft panel.' in Japanese.", "say": "Stop a coworker and report the soft panel to the foreman.", "write": "Write where the damage is and what must happen before continuing."},
  },
  9: {
    "title": "廃材と古い釘の片付け",
    "objective": "廃材、古い釘、屋根下地の清掃を担当者に割り当てる。",
    "focus": "～てから orders actions; ～前に marks the next task's prerequisite. 一人は～、もう一人は～ distributes work between two people.",
    "words": [
      "廃材用コンテナ", "古い釘", "掃く", "廃材", "磁石", "ほうき", "手押し車", "シャベル", "手袋",
      "シングル材を廃材用コンテナに投げ入れてください。", "古い釘を全て抜いてください。", "ルーフィングを敷く前に屋根下地を掃いてください。", "磁石での釘拾いが終わったら知らせてください。", "シングル材の破片を全て拾ってください。", "手袋を着けてください。",
    ],
    "reader": [
      "撤去の後、廃材があちこちにあります。", "手袋を着けてください。", "シングル材を廃材用コンテナに投げ入れてください。", "一人はシャベルを使い、もう一人は手押し車を使います。", "古い釘を全て抜いてください。", "それから庭の地面に磁石をかけます。", "ルーフィングを敷く前に屋根下地を掃いてください。", "磁石で釘を拾い終えたら知らせてください。",
    ],
    "verbs": [("掃く", "ルーフィングを敷く前に屋根下地を掃きます。"), ("投げ入れる", "シングル材を廃材用コンテナに投げ入れます。"), ("抜く", "作業員が古い釘を全て抜きます。"), ("拾う", "シングル材の破片を全て拾います。"), ("使う", "一人はシャベルを使い、もう一人は手押し車を使います。")],
    "speaking": "一人はシングル材の破片を拾ってください。もう一人は古い釘を抜いてください。",
    "modes": {"see": "Find which worker uses the shovel and which uses the wheelbarrow.", "recall": "Recall dumpster, old nails, broom, and magnet.", "hear": "Distinguish 釘 from 磁石 when spoken.", "type": "Type 'Pull all the old nails.' in Japanese.", "say": "Assign one coworker to collect shingles and another to pull nails.", "write": "Write the cleanup order before underlayment is laid."},
  },
}

def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)["lessons"]
    assert [x["n"] for x in source] == [7, 8, 9]
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
        assert OUTPUT.read_text() == expected, "Japanese Roofing Core 7–9 draft is stale"
        print("Japanese Roofing Core 7–9 private source pairs and draft gates pass")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
