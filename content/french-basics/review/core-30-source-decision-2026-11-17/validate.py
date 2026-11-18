from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
packet = json.loads((HERE / "packet.json").read_text())
source_path = HERE / "source-english-core-28-30.json"
source = json.loads(source_path.read_text())
lesson = next(item for item in source["lessons"] if item["n"] == 30)

assert hashlib.sha256(source_path.read_bytes()).hexdigest() == packet["sourceHashes"]["privateSourceEnglish"]
for file_name, key in [("spanish-basics-core.json", "spanishCore"), ("spanish-basics-practice.json", "spanishPractice")]:
    path = ROOT / "src" / "data" / file_name
    assert hashlib.sha256(path.read_bytes()).hexdigest() == packet["sourceHashes"][key]

assert (packet["pairKey"], packet["stage"], packet["n"], packet["stableLessonKey"], packet["stableId"]) == (
    "French:English", "core", 30, "french-basics:30", "french-basics:30:fr-en"
)
assert len(packet["cards"]) == len(lesson["words"]) == 14
assert len(packet["reader"]) == len(lesson["reading"]["native"]) == 6
assert [(row["en"], row["kind"]) for row in packet["cards"]] == [(row["en"], row["kind"]) for row in lesson["words"]]
assert [row["en"] for row in packet["reader"]] == lesson["reading"]["native"]
assert [row["id"] for row in packet["cards"]] == [f"french-basics:30:word:{n}" for n in range(1, 15)]
assert [row["id"] for row in packet["reader"]] == [f"french-basics:30:line:{n}" for n in range(1, 7)]

assert set(packet["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
faces = {row["fr"] for row in packet["cards"] + packet["reader"]}
assert len({mode["targetText"] for mode in packet["modes"].values()}) == 6
for name, mode in packet["modes"].items():
    assert mode["id"] == f"french-basics:30:mode:{name}"
    assert mode["prompt"].strip() and mode["targetText"] in faces
    assert mode["recordedAudio"] is False and mode["readyForLearner"] is False

assert len(packet["forms"]) == 8 and len({form["id"] for form in packet["forms"]}) == 8
assert sum(form["source"] == "aligned-reader" for form in packet["forms"]) == 6
for form in packet["forms"]:
    assert form["reviewed"] is False
    if form["source"] == "aligned-reader":
        reader = packet["reader"][form["sourceReaderTurn"] - 1]
        assert (form["frenchAnswer"], form["englishPrompt"]) == (reader["fr"], reader["en"])

assert packet["cards"][11]["fr"] == packet["reader"][3]["fr"] == packet["modes"]["say"]["targetText"] == "Luis n’a pas d’argent, alors Ana paie pour lui."
assert {pair["kind"] for pair in packet["flaggedPairs"]} == {"card", "card-and-reader"}
assert packet["retiredPrivateFormIds"][0]["sourceReaderTurn"] == 4
assert all(packet[key] is False for key in ("reviewed", "registered", "audioRegistered", "listeningReviewed", "normalCardProjectionAllowed", "normalReaderProjectionAllowed"))
print("PASS French 101 Core 30 exact source, flagged faces, stable IDs, mode/form alignment and closed gates")
