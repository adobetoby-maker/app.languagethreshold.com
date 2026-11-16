"""Independently check Foundation 4 source meaning, identity and closed gates."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
packet = json.loads((HERE / "source-setting-candidate.json").read_text())
source = json.loads((ROOT / packet["source"]["curriculumPath"]).read_text())["lessons"][3]
reader_lesson = json.loads((ROOT / packet["source"]["readerPath"]).read_text())["lessons"]["4"]
passage = reader_lesson["passage"]
archive = json.loads((ROOT / packet["archivedDraft"]["path"]).read_text())["lessons"][3]
prior = json.loads((ROOT / packet["priorProposal"]["path"]).read_text())

assert packet["lessonKey"] == "foundation:4"
assert packet["stableLessonId"] == archive["stableId"] == "foundation-travel-breakfast:4:ja-en"
assert packet["source"]["objectiveEnglish"] == source["objective"]
assert packet["source"]["focusSpanish"] == source["focus"]
assert packet["source"]["speakingEnglish"] == source["speaking"]
assert packet["source"]["readerVerbExamples"] == [v["example"] for v in reader_lesson["verbs"]]
assert packet["reviewed"] is False and not any(packet["gates"].values())
for section, keys in (("source", ("curriculum", "reader")), ("archivedDraft", ("",)), ("priorProposal", ("",))):
    for key in keys:
        path_key = key + "Path" if key else "path"
        hash_key = key + "Sha256" if key else "sha256"
        path = ROOT / packet[section][path_key]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == packet[section][hash_key]
assert prior["proposals"][0]["lessonKey"] == "foundation:4"
assert len(packet["sourceCards"]) == len(source["words"]) == 15
assert len(packet["sourceSettingReader"]) == len(passage["native"]) == len(passage["target"]) == 8
assert len(packet["oldCardPositionPlan"]) == len(archive["cards"])
assert len(packet["oldReaderPositionPlan"]) == len(archive["reader"])
assert all(row["candidate"] is None for row in packet["oldCardPositionPlan"] + packet["oldReaderPositionPlan"])
ids = set()
for i, (candidate, word) in enumerate(zip(packet["sourceCards"], source["words"]), 1):
    assert candidate["candidatePosition"] == i
    assert candidate["sourceSpanish"] == word["es"] and candidate["sourceEnglish"] == word["en"]
    assert candidate["sourceEnglishIsJapaneseGloss"] is False and candidate["targetJapaneseDraft"]
    assert candidate["literalJapaneseGlossEn"]
    assert candidate["id"].startswith(packet["candidateRevision"] + ":card:")
    assert candidate["id"] not in ids
    ids.add(candidate["id"])
for i, (candidate, es, en) in enumerate(zip(packet["sourceSettingReader"], passage["target"], passage["native"]), 1):
    assert candidate["candidatePosition"] == i
    assert candidate["sourceSpanish"] == es and candidate["sourceEnglish"] == en
    assert candidate["sourceEnglishIsJapaneseGloss"] is False and candidate["targetJapaneseDraft"]
    assert candidate["literalJapaneseGlossEn"]
    assert candidate["id"].startswith(packet["candidateRevision"] + ":reader:")
    assert candidate["id"] not in ids
    ids.add(candidate["id"])
assert len(ids) == 23
assert "生搾り" in packet["sourceCards"][9]["targetJapaneseDraft"]
assert "生搾り" in packet["sourceSettingReader"][1]["targetJapaneseDraft"]
assert packet["sourceSettingReader"][2]["targetJapaneseDraft"].startswith("はい")
assert "レジ" in packet["sourceCards"][13]["targetJapaneseDraft"]
assert "レジ" in packet["sourceSettingReader"][7]["targetJapaneseDraft"]
print("PASS Japanese Breakfast Foundation 4: 15 exact source cards, 8 Reader turns, revision IDs, source hashes, false gates and no saved-position mapping")
