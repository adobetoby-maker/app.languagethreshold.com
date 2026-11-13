#!/usr/bin/env python3
"""Check the exact source and closed gates of the Japanese Dinner Master 7 draft."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent


def main():
    batch = json.loads((HERE / "master-7-draft.json").read_text())
    source = batch["source"]
    for path_key, hash_key in (("masterPath", "masterSHA256"), ("contentPath", "contentSHA256")):
        path = ROOT / source[path_key]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == source[hash_key]
    lesson = batch["lessons"][0]
    master = json.loads((ROOT / source["masterPath"]).read_text())["lessons"][6]
    passage = json.loads((ROOT / source["contentPath"]).read_text())["lessons"]["7"]["passage"]["native"]
    assert (batch["courseId"], batch["stageId"], batch["pairKey"], batch["locale"]) == (
        "travel-dinner", "master-travel-dinner", "Japanese:English", "ja-JP")
    assert batch["reviewed"] is batch["registered"] is batch["readyForLearner"] is lesson["reviewed"] is False
    assert batch["audio"] == "none" and lesson["stableId"] == "master-travel-dinner:7:ja-en"
    assert lesson["sourceTitleEnglish"] == master["title"]
    assert lesson["sourceObjectiveEnglish"] == master["objective"]
    assert lesson["sourceSpeakingEnglish"] == master["speaking"]
    assert lesson["speaking"]["goal"] == master["objective"]
    assert [card["en"] for card in lesson["cards"]] == [word["en"] for word in master["words"]]
    assert [turn["en"] for turn in lesson["reader"]] == passage
    assert len(lesson["cards"]) == 24 and len(lesson["reader"]) == 18
    assert all(entry["ja"] for entry in lesson["cards"] + lesson["reader"])
    assert len({card["ja"] for card in lesson["cards"]}) == 24
    assert all(card.get("readingKana") for card in lesson["cards"])
    japanese = " ".join(turn["ja"] for turn in lesson["reader"])
    assert all(term in japanese for term in ("エマ", "プッチ", "マルク", "22時10分", "22時15分", "22時30分", "612", "3907", "4821"))
    assert lesson["cards"][3]["ja"] == "IMEI番号"
    assert lesson["cards"][5]["ja"] == "末尾の数字"
    assert lesson["cards"][6]["ja"] == "フード付きパーカー"
    assert len(lesson["forms"]) >= 5 and all(form.get("question") and form.get("example") for form in lesson["forms"])
    assert set(lesson["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
    for mode in lesson["modes"].values():
        assert lesson["cards"][mode["sourceCard"] - 1]["en"] == mode["cueEnglish"]
    assert lesson["speaking"]["opening"] and lesson["speaking"]["closure"] and lesson["speaking"]["wordBank"]
    print("Japanese Dinner Master 7: 24 exact source cards, 18 aligned Reader lines, six modes and closed gates PASS")


if __name__ == "__main__":
    main()
