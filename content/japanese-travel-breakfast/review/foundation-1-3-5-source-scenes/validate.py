"""Independently validate the inert Foundation 1, 3 and 5 review packet."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
packet = json.loads((HERE / "source-setting-candidates.json").read_text())
source = json.loads((ROOT / "src/data/core60/es/foundation-travel-breakfast.json").read_text())["lessons"]
reader = json.loads((ROOT / "public/lesson-content/es/foundation-travel-breakfast.json").read_text())["lessons"]
archive = json.loads((ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/foundation-1-10-draft.json").read_text())
all_ids = set()

assert packet["reviewed"] is False and not any(packet["gates"].values())
assert [row["lessonKey"] for row in packet["lessons"]] == ["foundation:1", "foundation:3", "foundation:5"]
for lesson in packet["lessons"]:
    n = int(lesson["lessonKey"].split(":")[-1])
    src = source[n - 1]
    passage = reader[str(n)]["passage"]
    old = archive["lessons"][n - 1]
    stable = f"foundation-travel-breakfast:{n}:ja-en"
    assert lesson["stableLessonId"] == old["stableId"] == stable
    assert lesson["source"]["objectiveEnglish"] == src["objective"]
    for key in ("curriculum", "reader"):
        path = ROOT / lesson["source"][f"{key}Path"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == lesson["source"][f"{key}Sha256"]
    old_path = ROOT / lesson["archivedDraft"]["path"]
    assert hashlib.sha256(old_path.read_bytes()).hexdigest() == lesson["archivedDraft"]["sha256"]
    assert lesson["reviewed"] is False and not any(lesson["gates"].values())
    assert len(lesson["sourceCards"]) == len(src["words"])
    assert len(lesson["sourceSettingReader"]) == len(passage["native"]) == len(passage["target"])
    assert len(lesson["oldCardPositionPlan"]) == len(old["cards"])
    assert len(lesson["oldReaderPositionPlan"]) == len(old["reader"])
    assert all(row["candidate"] is None for row in lesson["oldCardPositionPlan"] + lesson["oldReaderPositionPlan"])
    for i, (candidate, word) in enumerate(zip(lesson["sourceCards"], src["words"]), 1):
        assert candidate["candidatePosition"] == i
        assert candidate["sourceSpanish"] == word["es"] and candidate["sourceEnglish"] == word["en"]
        assert candidate["sourceEnglishIsJapaneseGloss"] is False
        assert candidate["targetJapaneseDraft"]
        assert candidate["id"] not in all_ids
        all_ids.add(candidate["id"])
    for i, (candidate, es, en) in enumerate(zip(lesson["sourceSettingReader"], passage["target"], passage["native"]), 1):
        assert candidate["candidatePosition"] == i
        assert candidate["sourceSpanish"] == es and candidate["sourceEnglish"] == en
        assert candidate["sourceEnglishIsJapaneseGloss"] is False and candidate["targetJapaneseDraft"]
        assert candidate["id"] not in all_ids
        all_ids.add(candidate["id"])

assert len(all_ids) == 70, len(all_ids)
assert "卵料理をトルティーヤと一緒に" in packet["lessons"][0]["sourceSettingReader"][6]["targetJapaneseDraft"]
assert "ウェイトレス" in packet["lessons"][1]["sourceSettingReader"][1]["targetJapaneseDraft"]
assert "卵は好みに合わせて" in packet["lessons"][2]["sourceCards"][14]["targetJapaneseDraft"]
print("PASS Japanese Breakfast Foundation 1, 3 and 5: exact source, 43 cards, 27 Reader turns, stable candidate IDs, false gates and saved-position plan")
