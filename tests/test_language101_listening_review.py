import importlib.util
import json
import hashlib
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/build-language101-listening-review.py'
SPEC = importlib.util.spec_from_file_location('language101_listening_review', SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ListeningReviewTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.folder = self.root / 'french-101' / 'foundation-1-complete'
        self.folder.mkdir(parents=True)
        self.clips = {}
        for gender, voice in [('female', 'Aoede'), ('male', 'Charon')]:
            data = (gender.encode() + b'-mp3-data') * 80
            name = f'fr-101-form-abc-{gender}.mp3'
            (self.folder / name).write_bytes(data)
            self.clips[gender] = {'name': name, 'voice': f'fr-FR-Chirp3-HD-{voice}',
                                  'locale': 'fr-FR', 'spokenText': 'Bonjour.', 'bytes': len(data),
                                  'durationSeconds': 1.5, 'sha256': hashlib.sha256(data).hexdigest()}
        self.manifest = self.folder / 'manifest.json'
        self.manifest.write_text(json.dumps({'locale': 'fr-FR', 'clips': {'Bonjour.': {'voices': self.clips}}}))
        self.receipt = self.root / 'review.json'
        self.record = {'course': 'french-101', 'stage': 'foundation', 'lesson': 1,
                       'manifestSHA256': MODULE.sha(self.manifest), 'reviewer': 'Owner',
                       'exportedAt': '2026-11-09T00:00:00Z', 'results': [
                           {'displayText': 'Bonjour.', 'spokenText': 'Bonjour.', 'voice': gender,
                            'sha256': clip['sha256'], 'status': 'accept'}
                           for gender, clip in self.clips.items()]}
        self.receipt.write_text(json.dumps(self.record))

    def test_prefers_complete_lesson_over_smaller_pilot(self):
        pilot = self.root / 'french-101' / 'foundation-1' / 'manifest.json'
        pilot.parent.mkdir()
        pilot.write_text('{}')
        self.assertEqual(MODULE.select_manifest(self.root / 'french-101', 'foundation', 1), self.manifest)

    def test_exact_accepted_receipt(self):
        summary = MODULE.verify_review(self.receipt, self.manifest, 'french-101', 'foundation', 1)
        self.assertEqual((summary['clips'], summary['accepted'], summary['retake']), (2, 2, 0))

    def test_rejects_manifest_drift_and_changed_clip(self):
        self.record['manifestSHA256'] = '0' * 64
        self.receipt.write_text(json.dumps(self.record))
        with self.assertRaisesRegex(ValueError, 'manifest hash mismatch'):
            MODULE.verify_review(self.receipt, self.manifest, 'french-101', 'foundation', 1)
        self.record['manifestSHA256'] = MODULE.sha(self.manifest)
        self.receipt.write_text(json.dumps(self.record))
        (self.folder / self.clips['male']['name']).write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'Audio identity mismatch'):
            MODULE.verify_review(self.receipt, self.manifest, 'french-101', 'foundation', 1)

    def test_rejects_missing_or_duplicate_decisions(self):
        self.record['results'].pop()
        self.receipt.write_text(json.dumps(self.record))
        with self.assertRaisesRegex(ValueError, 'Missing, extra or changed'):
            MODULE.verify_review(self.receipt, self.manifest, 'french-101', 'foundation', 1)
        self.record['results'].append(self.record['results'][0])
        self.receipt.write_text(json.dumps(self.record))
        with self.assertRaisesRegex(ValueError, 'Duplicate decision'):
            MODULE.verify_review(self.receipt, self.manifest, 'french-101', 'foundation', 1)


if __name__ == '__main__':
    unittest.main()
