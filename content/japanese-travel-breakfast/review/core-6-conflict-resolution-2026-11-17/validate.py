"""Check that the Core 6 decision worksheet stays source-pinned and inert."""

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


decision = read_json(HERE / "decision.json")
metadata = read_json(HERE / "ai-assistance-metadata.json")
source = decision["source"]
for path_key, hash_key in (
    ("contentPath", "contentSha256"),
    ("objectivesPath", "objectivesSha256"),
    ("existingPacketPath", "existingPacketSha256"),
):
    path = ROOT / source[path_key]
    require(path.exists(), f"missing source: {path}")
    require(hashlib.sha256(path.read_bytes()).hexdigest() == source[hash_key], f"source drift: {path}")

lesson = read_json(ROOT / source["contentPath"])["lessons"]["6"]
packet = read_json(ROOT / source["existingPacketPath"])
require(
    (decision["schema"], decision["pairKey"], decision["track"], decision["stage"], decision["lessonKey"], decision["stableLessonId"])
    == (1, "Japanese:English", "travel-breakfast", "core", "core:6", "travel-breakfast:6:ja-en"),
    "pair or lesson identity changed",
)
require(decision["reviewed"] is False and decision["selectedAlternativeId"] is None, "decision selected")
require(all(value is False for value in decision["gates"].values()), "gate opened")
require(all(value is False for value in packet["gates"].values()), "source packet gate opened")
require(packet["reviewed"] is False, "source packet reviewed")

reader = packet["sourceSettingReader"]
require(len(reader) == 8, "Reader count changed")
held = decision["heldRow"]
require(held["existingId"] == reader[7]["id"], "held row ID changed")
require(
    (held["sourceSpanish"], held["sourceEnglish"])
    == (lesson["passage"]["target"][7], lesson["passage"]["native"][7])
    == (reader[7]["sourceSpanish"], reader[7]["sourceEnglish"]),
    "held source line changed",
)
require(
    held["targetJapaneseDraft"] is None
    and reader[7]["targetJapaneseDraft"] is None
    and held["learnerFaceEnabled"] is False
    and reader[7]["learnerFaceEnabled"] is False,
    "held Reader face was silently selected",
)

anchors = decision["contextAnchors"]
require([anchor["existingId"] for anchor in anchors] == [reader[2]["id"], reader[4]["id"]], "context IDs changed")
for anchor, index in zip(anchors, (2, 4)):
    require(
        (anchor["sourceSpanish"], anchor["sourceEnglish"], anchor["currentJapaneseDraft"])
        == (lesson["passage"]["target"][index], lesson["passage"]["native"][index], reader[index]["targetJapaneseDraft"]),
        f"Reader {index + 1} context drift",
    )

alternatives = decision["unselectedAlternativesIfSourceRetained"]
require([row["id"] for row in alternatives] == ["reader-8-a", "reader-8-b"], "alternative IDs changed")
for row in alternatives:
    require(row["candidateJapanese"] and row["literalGlossEnglish"], "blank alternative")
    require(row["approved"] is False and row["audioEligible"] is False, "alternative promoted")
require(decision["sourceEditorialAlternative"]["requiresSourceEdit"] is True, "source edit condition lost")
require(decision["sourceEditorialAlternative"]["approved"] is False, "source revision approved")
require(metadata["qualifiedApproval"] is False, "qualified approval claimed")
attempt = metadata["attempt"]
require(
    attempt["exitCode"] == 1
    and attempt["inputTokens"] == attempt["outputTokens"] == 0
    and attempt["actualModelUsage"] == {},
    "CLI metadata does not match logged-out attempt",
)
print("PASS Japanese Breakfast Core 6 conflict worksheet: source pins, held Reader 8, alternatives, closed gates")
