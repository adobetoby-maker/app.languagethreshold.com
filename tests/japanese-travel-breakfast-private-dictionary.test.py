#!/usr/bin/env python3
"""Guard exact card-pair inventory and release state."""

import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/build-japanese-travel-breakfast-private-dictionary.py"
spec = importlib.util.spec_from_file_location("breakfast_dictionary", SCRIPT)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class BreakfastDictionaryTests(unittest.TestCase):
    def test_every_card_placement_has_the_exact_pair_and_source(self):
        inventory = builder.build()
        self.assertEqual(inventory["pairKey"], "Japanese:English")
        self.assertFalse(inventory["reviewed"])
        self.assertFalse(inventory["registered"])
        self.assertEqual(inventory["counts"]["foundationLessons"], 10)
        self.assertEqual(inventory["counts"]["coreLessons"], 30)
        self.assertEqual(inventory["counts"]["placements"], 522)
        self.assertEqual(inventory["counts"]["exactPairs"], 404)
        entries = {(entry["target"], entry["native"]): entry for entry in inventory["entries"]}
        self.assertEqual(len(entries), len({entry["id"] for entry in entries.values()}))
        for _, filename, stage_id, _ in builder.SOURCES:
            source = json.loads((builder.CONTENT / filename).read_text())
            for lesson in source["lessons"]:
                for position, card in enumerate(lesson["cards"], 1):
                    entry = entries[(card["ja"], card["en"])]
                    self.assertIn({
                        "stage": "foundation" if stage_id.startswith("foundation-") else "core",
                        "stageId": stage_id,
                        "lesson": lesson["n"],
                        "stableLessonId": lesson["stableId"],
                        "cardPosition": position,
                        "sourceFile": filename,
                        **({"note": card["note"]} if card.get("note") else {}),
                    }, entry["occurrences"])

    def test_ambiguity_is_visible_without_collapsing_exact_glosses(self):
        inventory = builder.build()
        self.assertEqual(inventory["counts"]["ambiguousHeadwords"], 11)
        self.assertEqual(inventory["counts"]["kindConflicts"], 2)
        by_target = {}
        for entry in inventory["entries"]:
            by_target.setdefault(entry["target"], []).append(entry)
            self.assertFalse(entry["reviewed"])
        self.assertEqual(
            {target for target, entries in by_target.items() if len(entries) > 1},
            {
                "ありがとうございます", "お会計", "わかりません", "カフェオレ", "予約",
                "少なめ", "席", "料金", "明細", "確認してください", "調理器具",
            },
        )
        self.assertEqual(
            {entry["target"] for entry in inventory["entries"] if entry["needsKindReview"]},
            {"ありますか", "カードで払えますか"},
        )
        self.assertEqual({entry["native"] for entry in by_target["わかりません"]},
                         {"I do not know", "I do not understand"})
        self.assertTrue(all(entry["needsSenseReview"] for entry in by_target["わかりません"]))


if __name__ == "__main__":
    unittest.main()
