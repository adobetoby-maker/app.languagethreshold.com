"""Integrity gates for unpublished Japanese Foreman Core 7–9 inputs."""

import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "foreman_core_builder", ROOT / "scripts/build-japanese-foreman-core-runtime-7-9.py"
)
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


class ForemanCoreRuntimeDraftTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle = json.loads(BUILDER.OUTPUT.read_text())
        cls.source = json.loads(BUILDER.SOURCE.read_text())

    def test_generated_output_is_current_and_private(self):
        self.assertEqual(self.bundle, BUILDER.build())
        self.assertEqual(self.bundle["state"], "private-runtime-draft")
        self.assertFalse(self.bundle["reviewed"])
        self.assertNotIn(BUILDER.COURSE_ID, (ROOT / "src/data/core60/manifest.ts").read_text())
        self.assertFalse((ROOT / f"src/data/core60/ja/{BUILDER.COURSE_ID}.json").exists())

    def test_exact_pair_progress_and_source_alignment(self):
        self.assertEqual(self.bundle["pairKey"], "Japanese:English")
        self.assertEqual(self.bundle["courseId"], "construction-foreman-ja-en")
        self.assertNotEqual(self.bundle["courseId"], self.bundle["sourceModuleId"])
        self.assertEqual(self.bundle["sourceEnglishSubsetSha256"], self.source["englishSubsetSHA256"])
        self.assertEqual([lesson["n"] for lesson in self.bundle["lessons"]], [7, 8, 9])
        self.assertEqual(len({lesson["id"] for lesson in self.bundle["lessons"]}), 3)
        self.assertTrue(all(lesson["id"].startswith(BUILDER.COURSE_ID + ":")
                            for lesson in self.bundle["lessons"]))
        self.assertTrue(all(item["courseId"] == BUILDER.COURSE_ID
                            for item in self.bundle["cards"] + self.bundle["dictionary"]))
        self.assertEqual(len(self.bundle["cards"]), len(self.bundle["dictionary"]))
        earlier = json.loads((ROOT / "content/japanese-construction-foreman/core-runtime-pilot-4-6-ja-en.json").read_text())
        self.assertEqual(earlier["courseId"], self.bundle["courseId"])
        self.assertTrue({lesson["id"] for lesson in earlier["lessons"]}.isdisjoint(
            lesson["id"] for lesson in self.bundle["lessons"]
        ))

    def test_six_modes_reader_cards_speaking_and_checks(self):
        for lesson, source in zip(self.bundle["lessons"], self.source["lessons"]):
            self.assertFalse(lesson["reviewed"])
            self.assertEqual(lesson["modes"], list(BUILDER.MODES))
            self.assertEqual(lesson["sourceObjective"], source["objectiveEnglish"])
            self.assertEqual(
                [(word["es"], word["en"], word["kind"]) for word in lesson["words"]],
                [(word["ja"], word["en"], word["kind"]) for word in source["terms"]],
            )
            self.assertEqual(
                [(line["target"], line["native"]) for line in lesson["reader"]["sentences"]],
                [(line["ja"], line["en"]) for line in source["reading"]],
            )
            self.assertEqual(lesson["speaking"]["locale"], "ja-JP")
            self.assertTrue(lesson["speaking"]["openingLine"])
            self.assertEqual(len(lesson["checks"]), 3)
            for check in lesson["checks"]:
                self.assertIn(check["prompt"].replace("____", check["answer"]),
                              [line["target"] for line in lesson["reader"]["sentences"]])


if __name__ == "__main__":
    unittest.main()
