#!/usr/bin/env python3
"""Read-only source and gate check for Japanese Foreman Foundation 3."""

import hashlib
import json
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
record = json.loads((HERE / "decision.json").read_text())
assert record["schema"] == 1
assert record["pairKey"] == "Japanese:English"
assert record["stableLessonId"] == "foundation-construction-foreman:3:ja-en"
assert record["reviewed"] is False and not any(record["gates"].values())
assert len(record["cards"]) == 17 and len(record["reader"]) == 9

source = record["source"]
raw = {}
for path_key, hash_key in (
    ("curriculumPath", "curriculumSha256"),
    ("readerPath", "readerSha256"),
    ("japaneseDraftPath", "japaneseDraftSha256"),
):
    path = source[path_key]
    data = subprocess.check_output(
        ["git", "show", f"{record['sourceCommit']}:{path}"], cwd=ROOT
    )
    assert hashlib.sha256(data).hexdigest() == source[hash_key], path
    raw[path] = json.loads(data)

lesson = raw[source["curriculumPath"]]["lessons"][2]
reader = raw[source["readerPath"]]["lessons"]["3"]["passage"]
old = raw[source["japaneseDraftPath"]]["lessons"][2]
assert lesson["n"] == old["n"] == 3
assert record["archivedDraft"]["title"] == old["title"] == "Name the tool"
assert record["archivedDraft"]["scene"] == old["scene"]
assert source["objectiveEnglish"] == lesson["objective"]
assert source["focusSpanish"] == lesson["focus"]
assert source["readerTitleSpanish"] == reader["title"]

ids = set()
for pos, (row, word) in enumerate(zip(record["cards"], lesson["words"]), 1):
    assert row["position"] == pos
    assert row["id"] == f"{record['candidateRevision']}:card:{pos:02d}"
    assert row["id"] not in ids
    ids.add(row["id"])
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (
        word["es"], word["en"], word["kind"]
    )
    assert row["decisionOpen"] == (row["japaneseDraft"] is None)
    if row["japaneseDraft"] is not None:
        assert row["japaneseDraft"].strip()

for pos, row in enumerate(record["reader"], 1):
    assert row["position"] == pos
    assert row["id"] == f"{record['candidateRevision']}:reader:{pos:02d}"
    assert row["id"] not in ids
    ids.add(row["id"])
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (
        reader["target"][pos - 1], reader["native"][pos - 1]
    )
    assert row["decisionOpen"] == (row["japaneseDraft"] is None)
    if row["japaneseDraft"] is not None:
        assert row["japaneseDraft"].strip()

assert [x["position"] for x in record["cards"] if x["japaneseDraft"] is None] == [6, 17]
assert [x["position"] for x in record["reader"] if x["japaneseDraft"] is None] == [5, 6, 9]
assert "wall level" in lesson["words"][16]["en"]
assert "electrical panel" in reader["native"][8]
assert "still wet" in reader["native"][6]
assert "Luis" in reader["native"][0] and "Pedro" in reader["native"][1]
assert "Sato" in old["scene"] and "Kobayashi" in old["scene"]

metadata = json.loads((HERE / "ai-assistance-metadata.json").read_text())
assert metadata["actualModelCalls"] == [] and metadata["actualTokenUse"] == 0
assert metadata["qualifiedReview"] is False
print("PASS Japanese Foreman Foundation 3 exact source, nulls and closed gates")
