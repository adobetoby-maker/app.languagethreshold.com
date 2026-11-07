#!/usr/bin/env python3
"""Guard source-pinned, private exact-text audio scope."""

import hashlib
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/build-japanese-travel-breakfast-private-audio-scope.py"
spec = importlib.util.spec_from_file_location("breakfast_audio_scope", SCRIPT)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class BreakfastAudioScopeTests(unittest.TestCase):
    def test_exact_source_and_occurrence_scope(self):
        saved = json.loads(builder.OUTPUT.read_text())
        self.assertEqual(builder.build(), saved)
        self.assertEqual(saved["pairKey"], "Japanese:English")
        self.assertEqual(saved["locale"], "ja-JP")
        self.assertEqual(saved["voicesProposed"], list(builder.VOICES))
        self.assertEqual(saved["counts"]["lessons"], 46)
        self.assertEqual(saved["counts"]["projectedClips"], saved["counts"]["uniqueExactTexts"] * 2)
        for filename, _, _, _ in builder.SOURCES:
            source = (builder.CONTENT / filename).read_bytes()
            self.assertEqual(saved["sourceSha256"][filename], hashlib.sha256(source).hexdigest())
        for item in saved["texts"]:
            self.assertEqual(item["sha256"], hashlib.sha256(item["text"].encode("utf-8")).hexdigest())
            self.assertTrue(item["occurrences"])
        self.assertEqual(len(saved["texts"]), len({item["text"] for item in saved["texts"]}))

    def test_no_review_or_release_is_claimed(self):
        saved = builder.build()
        self.assertEqual(saved["state"], "private-audio-scope-draft")
        self.assertFalse(any(saved["reviewGates"].values()))
        self.assertFalse(saved["reviewGates"]["recordingsGenerated"])
        self.assertFalse(saved["reviewGates"]["registered"])


if __name__ == "__main__":
    unittest.main()
