#!/usr/bin/env python3
"""Build private Japanese Roofing Core 16–18 from pinned English anchors."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-roofing/source-english-core-16-18.json"
OUTPUT = ROOT / "content/japanese-roofing/core-16-18-draft.json"
SOURCE_FILES = (
    "src/data/roofing-curriculum.ts",
    "src/data/roofing-lesson-words.ts",
    "src/data/roofing-lesson-passages.ts",
    "public/lesson-content/es/roofing.json",
)

AUTHOR = {
  16: {
    "title": "釘打ち位置の確認",
    "objective": "指定された釘打ち帯から外れた釘を見つけ、位置を直すよう伝える。",
    "focus": "～の中に and ～の外に contrast placement; ～すぎる describes a nail placed too high. ～てください gives an instruction and ～を見せてください requests a demonstration.",
    "words": [
      "釘打ち帯", "高すぎる位置に打たれた釘", "固定具", "釘", "シングル材", "釘打ち機", "釘打ち範囲", "粘着帯", "シングル材のタブ",
      "釘打ち帯の中に打ってください。高すぎる位置には打たないでください。", "その釘は位置が高すぎます。", "釘は釘打ち範囲の中に収めてください。", "この段を直してください。", "このようにしてください。", "釘打ち帯がどこにあるか見せてください。",
    ],
    "reader": [
      "職長は新しい段のアスファルトシングル材を確認します。", "釘打ち帯の外側に、高すぎる位置の釘を見つけます。", "その釘は位置が高すぎます。", "釘打ち帯がどこにあるか見せてください。", "釘は釘打ち範囲の中に収めてください。", "この段を直してください。", "職長は釘打ち機を手に取り、「このようにしてください」と言います。", "その後、ペドロは一本ずつ釘をより注意深く確認します。",
    ],
    "verbs": [("打つ", "ペドロは釘打ち帯の中に釘を打ちます。"), ("確認する", "職長は新しい段のアスファルトシングル材を確認します。"), ("直す", "ペドロはこの段の高すぎる位置の釘を直します。"), ("収める", "作業員は釘を釘打ち範囲の中に収めます。"), ("見せる", "職長が釘打ち帯の位置を見せます。")],
    "speaking": "釘打ち帯の中に打ってください。その釘は位置が高すぎるので、この段を直してください。",
    "modes": {"see": "Find the nail placed outside the nailing strip.", "recall": "Recall nailing strip, nail gun, and nailing zone.", "hear": "Distinguish 釘打ち帯 from 粘着帯 when spoken.", "type": "Type 'That nail is too high.' in Japanese.", "say": "Tell a worker to nail in the strip and explain the correction.", "write": "Write what Pedro checks after the correction."},
  },
  17: {
    "title": "釘打ちパターンの確認",
    "objective": "製品ごとの釘の本数と配置をメーカーの施工説明書で確認する。",
    "focus": "～によると attributes the four-nail example to the guide; ～ごとに marks each shingle. ～てから orders reading product instructions before choosing the pattern.",
    "words": [
      "釘打ちパターン", "シングル材", "メーカーの施工説明書", "釘", "固定具", "釘打ち機", "包装紙", "製品", "釘の本数",
      "シングル材一枚につき釘を四本打ちます。", "釘打ちパターンを決める前に製品の施工説明書を確認してください。", "このシングル材には釘が何本必要ですか。", "包装紙を読んでください。", "どのシングル材にも同じパターンを使ってください。", "この製品の正確な釘打ちパターンが必要です。",
    ],
    "reader": [
      "今日、作業班はアスファルトシングル材の新しい梱包を開けます。", "作業員が「このシングル材には釘が何本必要ですか」と尋ねます。", "ガイドの例では、一枚につき釘が四本です。", "ただし、メーカーごとに施工説明書があります。", "梱包の包装紙を読んでください。", "釘打ちパターンを決める前に製品の施工説明書を確認してください。", "この製品の正確な釘打ちパターンが必要です。", "その後、どのシングル材にも同じパターンを使ってください。",
    ],
    "verbs": [("確認する", "釘打ちパターンを決める前に製品の施工説明書を確認してください。"), ("読む", "梱包の包装紙を読んでください。"), ("必要とする", "この製品には正確な釘打ちパターンが必要です。"), ("使う", "どのシングル材にも同じパターンを使ってください。"), ("開ける", "今日、作業班はアスファルトシングル材の新しい梱包を開けます。")],
    "speaking": "ガイドの例では一枚につき四本です。この製品の正確な釘打ちパターンを確認してください。",
    "modes": {"see": "Find the guide's example nail count.", "recall": "Recall nail pattern, wrapper, and manufacturer instructions.", "hear": "Distinguish 釘の本数 from 釘打ちパターン when spoken.", "type": "Type 'How many nails does this shingle need?' in Japanese.", "say": "Use the guide's four-nail example, then ask for this product's pattern.", "write": "Write what the worker checks before setting the pattern."},
  },
  18: {
    "title": "釘の打ち込みすぎ",
    "objective": "釘が深く打ち込まれすぎた状態を見つけ、釘打ち機の調整を求める。",
    "focus": "～すぎる describes excessive depth; ～ないでください gives a negative instruction. ～てから orders checking depth before continuing.",
    "words": [
      "深く打ち込みすぎた釘", "シングル材", "釘打ち機", "空気圧", "コンプレッサー", "深さ", "釘の頭", "ホース", "調整する",
      "釘を深く打ち込みすぎないでください。", "止めてください。釘が深すぎます。", "空気圧を下げてください。", "釘の頭は表面と同じ高さにしてください。", "その隣に新しい釘を打ってください。", "釘打ち機を調整してください。",
    ],
    "reader": [
      "職長は屋根を歩きながら釘打ち機の音を聞きます。", "いくつかの釘は深く打ち込みすぎたように見えます。", "職長は手を上げて「止めてください。釘が深すぎます」と言います。", "釘の頭は表面と同じ高さでなければなりません。", "作業員はコンプレッサーとホースを確認します。", "空気圧を下げてください。", "釘打ち機を調整してください。", "その隣に新しい釘を打ってください。", "続ける前に、いくつかのシングル材で打ち込みの深さを確認してください。",
    ],
    "verbs": [("調整する", "釘打ち機を調整してください。"), ("確認する", "作業員はコンプレッサーとホースを確認します。"), ("下げる", "空気圧を下げてください。"), ("打つ", "その隣に新しい釘を打ってください。"), ("打ち込む", "釘を深く打ち込みすぎないでください。")],
    "speaking": "作業を止めてください。釘が深すぎます。釘打ち機を調整してください。",
    "modes": {"see": "Find the overdriven nails in the scene.", "recall": "Recall nail gun, air pressure, nail head, and depth.", "hear": "Distinguish 空気圧 from 深さ when spoken.", "type": "Type 'Stop. The nails are too deep.' in Japanese.", "say": "Stop installation and ask for the nail gun to be adjusted.", "write": "Write what is checked before work continues."},
  },
}

def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)["lessons"]
    assert [x["n"] for x in source] == [16, 17, 18]
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
        assert OUTPUT.read_text() == expected, "Japanese Roofing Core 16–18 draft is stale"
        print("Japanese Roofing Core 16–18 private source pairs and draft gates pass")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
