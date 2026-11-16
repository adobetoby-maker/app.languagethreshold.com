"""Map legacy review positions to the source-reconciled positions, without migration.

Only exact English matches are candidates. Ambiguous and unmatched rows remain
explicitly unresolved; this file must never be imported into progress storage.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def legacy_path(n: int) -> Path:
    batch = "13-15" if n <= 15 else "16-18" if n <= 18 else "19-20"
    return ROOT / f"content/japanese-travel-lunch/master-{batch}-draft.json"


def candidates_for(value: str, rows: list[dict]) -> list[int]:
    return [i for i, row in enumerate(rows, 1) if row["en"] == value]


def crosswalk(old: list[dict], new: list[dict]) -> list[dict]:
    result = []
    for i, row in enumerate(old, 1):
        matches = candidates_for(row["en"], new)
        result.append(
            {
                "legacyPosition": i,
                "legacyEnglish": row["en"],
                "legacyJapanese": row["ja"],
                "candidatePositions": matches,
                "matchState": (
                    "unmatched" if not matches else
                    "ambiguous" if len(matches) > 1 else
                    "same-position" if matches[0] == i else
                    "moved"
                ),
            }
        )
    return result


def build() -> dict:
    lessons = []
    for n in range(13, 21):
        old_file = legacy_path(n)
        old_batch = json.loads(old_file.read_text())
        old = next(row for row in old_batch["lessons"] if row["n"] == n)
        candidate_file = HERE / f"master-{n}-candidate.json"
        candidate = json.loads(candidate_file.read_text())
        new = candidate.get("lesson", candidate)
        candidate_stable_id = new.get("stableId")
        assert old["stableId"] == candidate_stable_id
        cards = crosswalk(old["cards"], new["cards"])
        reader = crosswalk(old["reader"], new["reader"])
        lessons.append(
            {
                "number": n,
                "stableId": old["stableId"],
                "candidateStableId": candidate_stable_id,
                "legacyPath": str(old_file.relative_to(ROOT)),
                "legacySha256": digest(old_file),
                "candidatePath": str(candidate_file.relative_to(ROOT)),
                "candidateSha256": digest(candidate_file),
                "cards": cards,
                "reader": reader,
            }
        )
    return {
        "schema": 1,
        "status": "review evidence only; no automatic saved-item or progress migration",
        "reviewed": False,
        "registered": False,
        "progressWritesEnabled": False,
        "lessons": lessons,
    }


def main() -> None:
    path = HERE / "legacy-position-crosswalk.json"
    expected = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    import sys
    if "--check" in sys.argv:
        assert path.read_text() == expected, "crosswalk drift"
        print("PASS Japanese Lunch Master 13–20 exact-English legacy position crosswalk")
    else:
        path.write_text(expected)


if __name__ == "__main__":
    main()
