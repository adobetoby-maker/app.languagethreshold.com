"""Private Foreman runtime bundle integrity and progress isolation checks."""

import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "foreman_builder", ROOT / "scripts/build-japanese-foreman-foundation-runtime.py"
)
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


class ForemanRuntimeDraftTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle = json.loads(BUILDER.OUTPUT.read_text())

    def test_generated_output_is_current_and_private(self):
        self.assertEqual(self.bundle, BUILDER.build())
        self.assertEqual(self.bundle["state"], "private-runtime-draft")
        self.assertFalse(self.bundle["reviewed"])
        manifest = (ROOT / "src/data/core60/manifest.ts").read_text()
        self.assertNotIn(BUILDER.COURSE_ID, manifest)
        self.assertFalse((ROOT / f"src/data/core60/ja/{BUILDER.COURSE_ID}.json").exists())

    def test_exact_pair_and_progress_ids(self):
        self.assertEqual(self.bundle["pairKey"], "Japanese:English")
        self.assertEqual(self.bundle["courseId"], "foundation-construction-foreman-ja-en")
        self.assertNotEqual(self.bundle["courseId"], self.bundle["sourceModuleId"])
        self.assertEqual([x["n"] for x in self.bundle["lessons"]], list(range(1, 11)))
        self.assertEqual(len({x["id"] for x in self.bundle["lessons"]}), 10)
        self.assertTrue(all(x["id"].startswith(self.bundle["courseId"] + ":")
                            for x in self.bundle["lessons"]))
        self.assertTrue(all(x["courseId"] == self.bundle["courseId"]
                            for x in self.bundle["cards"] + self.bundle["dictionary"]))
        self.assertEqual(len({x["id"] for x in self.bundle["cards"]}), len(self.bundle["cards"]))

    def test_six_mode_inputs_reader_speaking_and_dictionary(self):
        self.assertGreater(len(self.bundle["cards"]), 100)
        self.assertEqual(len(self.bundle["cards"]), len(self.bundle["dictionary"]))
        for lesson in self.bundle["lessons"]:
            self.assertEqual(lesson["modes"], list(BUILDER.MODES))
            self.assertFalse(lesson["reviewed"])
            self.assertEqual(lesson["speaking"]["locale"], "ja-JP")
            self.assertTrue(lesson["speaking"]["openingLine"])
            self.assertGreaterEqual(len(lesson["reader"]["sentences"]), 6)
            self.assertEqual(len(lesson["grammar"]["examples"]), 2)
            self.assertGreaterEqual(len(lesson["checks"]), 3)
            for item in lesson["checks"]:
                self.assertIn(item["prompt"].replace("____", item["answer"]),
                              [line["target"] for line in lesson["reader"]["sentences"]])


if __name__ == "__main__":
    unittest.main()
