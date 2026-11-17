"""Pin Core 2 conflict options to exact source rows without selecting answers."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


record = read_json(HERE / "decision-record.json")
source_meta = record["source"]
source_path = ROOT / source_meta["lessonPath"]
packet_path = ROOT / source_meta["existingPacketPath"]
assert hashlib.sha256(source_path.read_bytes()).hexdigest() == source_meta["lessonSha256"]
assert hashlib.sha256(packet_path.read_bytes()).hexdigest() == source_meta["existingPacketSha256"]
source = read_json(source_path)["lessons"]["2"]
packet = read_json(packet_path)

assert record["pairKey"] == packet["pairKey"] == "Japanese:English"
assert record["track"] == packet["track"] == "travel-breakfast"
assert record["stage"] == packet["stage"] == "core"
assert record["lessonKey"] == packet["lessonKey"] == "core:2"
assert record["stableLessonId"] == packet["stableLessonId"] == "travel-breakfast:2:ja-en"
assert record["reviewRevision"] == record["stableLessonId"] + ":conflict-review-v1"
assert record["selectedAnswers"] is None
assert all(value is False for value in record["gates"].values())
assert all(value is False for value in packet["gates"].values())

expected = [("card", 1), ("reader", 3), ("reader", 7)]
assert len(record["decisions"]) == len(expected)
for decision, (kind, position) in zip(record["decisions"], expected):
    source_row = source["words"][position - 1] if kind == "card" else None
    packet_row = (packet["sourceCards"] if kind == "card" else packet["sourceSettingReader"])[position - 1]
    assert (decision["rowKind"], decision["position"]) == (kind, position)
    assert decision["rowId"] == packet_row["id"]
    if kind == "card":
        assert (decision["sourceSpanish"], decision["sourceEnglish"]) == (source_row["es"], source_row["en"])
    else:
        assert (decision["sourceSpanish"], decision["sourceEnglish"]) == (
            source["passage"]["target"][position - 1],
            source["passage"]["native"][position - 1],
        )
    assert (decision["sourceSpanish"], decision["sourceEnglish"]) == (
        packet_row["sourceSpanish"], packet_row["sourceEnglish"]
    )
    assert packet_row["blockedOnSourceDecision"] is True
    assert packet_row["targetJapaneseDraft"] is None
    assert packet_row["literalJapaneseGlossEn"] is None
    assert decision["selectedJapanese"] is None
    assert len(decision["alternativesNotSelected"]) == 2
    assert all(option["japanese"] and option["literalEnglishGloss"] and option["sourceChangeNeeded"]
               for option in decision["alternativesNotSelected"])
    assert decision["qualifiedReviewQuestion"]

linked = record["linkedSourceRow"]
card17 = packet["sourceCards"][16]
assert linked["rowId"] == card17["id"]
assert (linked["sourceSpanish"], linked["sourceEnglish"], linked["currentJapaneseDraft"]) == (
    card17["sourceSpanish"], card17["sourceEnglish"], card17["targetJapaneseDraft"]
)
metadata = read_json(HERE / "ai-assistance-metadata.json")
assert metadata["authCheck"]["loggedIn"] is False
assert metadata["modelCalls"] == [] and metadata["modelTokens"] == 0
assert metadata["qualifiedReview"] is False
print("PASS Japanese Breakfast Core 2 conflict review: 3 null faces, exact source/IDs, closed gates")
