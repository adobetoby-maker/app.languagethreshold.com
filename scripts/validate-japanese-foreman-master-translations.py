#!/usr/bin/env python3
"""Check English source alignment of Master translation drafts, not Japanese quality."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/data/core60/es/master-construction-foreman.json"
source = json.loads(SOURCE.read_text())
batches = [
    ("master-translation-1-3-draft.json", 1, 3),
    ("master-translation-4-6-draft.json", 4, 6),
    ("master-translation-7-9-draft.json", 7, 9),
    ("master-translation-10-12-draft.json", 10, 12),
    ("master-translation-13-15-draft.json", 13, 15),
]

for filename, first, last in batches:
    path = ROOT / "content/japanese-construction-foreman" / filename
    draft = json.loads(path.read_text())
    originals = source["lessons"][first - 1 : last]
    expected_hash = hashlib.sha256(
        json.dumps(originals, ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()
    assert draft["englishSubsetSHA256"] == expected_hash, filename
    assert draft["source"] == "src/data/core60/es/master-construction-foreman.json"
    assert (draft["moduleId"], draft["target"], draft["native"], draft["stage"]) == (
        "construction-foreman", "Japanese", "English", "master"
    )
    assert draft["state"] == "translation-draft" and draft["reviewed"] is False
    assert [lesson["n"] for lesson in draft["lessons"]] == list(range(first, last + 1))
    for translated, original in zip(draft["lessons"], originals):
        n = original["n"]
        assert translated["titleEnglish"] == original["title"], n
        assert translated["objectiveEnglish"] == original["objective"], n
        assert translated["speakingEnglish"] == original["speaking"], n
        assert translated["grammarFocusSpanish"] == original["grammar"]["focus"], n
        assert translated["grammarExamplesEnglish"] == [
            example["en"] for example in original["grammar"]["examples"]
        ], n
        assert [(word["en"], word["kind"]) for word in translated["terms"]] == [
            (word["en"], word["kind"]) for word in original["words"]
        ], n
        assert all(word.get("ja", "").strip() for word in translated["terms"]), n
        assert translated.get("speakingJapanese", "").strip(), n
        if "911" in original["speaking"]:
            assert "911" in translated["speakingJapanese"], (
                n,
                "US emergency number changed in Japanese speaking prompt",
            )
        assert translated.get("grammarTeachingJapanese", "").strip(), n
        assert len(translated.get("grammarExamplesJapanese", [])) == len(
            original["grammar"]["examples"]
        ), n
        assert all(example.strip() for example in translated["grammarExamplesJapanese"]), n

print(f"Japanese Foreman: {sum(last - first + 1 for _, first, last in batches)} Master translation drafts match English source; linguistic review remains separate.")
