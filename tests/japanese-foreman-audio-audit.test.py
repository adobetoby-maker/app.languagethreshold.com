"""Focused read-only checks for the private Foreman audio estimate."""

import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location("foreman_audio_audit", ROOT / "scripts/audit-japanese-foreman-audio.py")
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


class ForemanAudioAuditTest(unittest.TestCase):
    def test_current_draft_is_complete_but_unreviewed(self):
        report = AUDIT.inventory()
        self.assertEqual([report["stages"][stage]["privateLessons"] for stage in AUDIT.STAGES], [10, 30, 20])
        self.assertEqual([report["stages"][stage]["originalContextualReaderDrafts"] for stage in AUDIT.STAGES], [10, 30, 20])
        self.assertEqual(report["plannedClipsTwoVoices"], report["uniqueDisplayStrings"] * 2)
        self.assertEqual(report["spokenCharactersTwoVoices"], report["spokenCharactersPerVoice"] * 2)
        self.assertFalse(report["recordingsGenerated"] or report["listeningReviewed"] or report["humanReviewed"])
        self.assertEqual(report, AUDIT.inventory())

    def test_changed_source_invalidates_hash_and_review_claim_fails(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            target = root / "content/japanese-construction-foreman"
            target.mkdir(parents=True)
            for pattern, _ in AUDIT.STAGES.values():
                for source in AUDIT.COURSE.glob(pattern):
                    shutil.copyfile(source, target / source.name)
            original = AUDIT.inventory(root)
            source = target / "master-runtime-pilot-19-20-ja-en.json"
            data = json.loads(source.read_text())
            data["lessons"][0]["reader"]["sentences"][0]["target"] += "。"
            source.write_text(json.dumps(data, ensure_ascii=False))
            changed = AUDIT.inventory(root)
            self.assertNotEqual(changed["normalizedTextSHA256"], original["normalizedTextSHA256"])
            self.assertNotEqual(changed["sourceFilesSHA256"], original["sourceFilesSHA256"])
            data["reviewed"] = True
            source.write_text(json.dumps(data, ensure_ascii=False))
            with self.assertRaisesRegex(ValueError, "Wrong pair or review state"):
                AUDIT.inventory(root)


if __name__ == "__main__":
    unittest.main()
