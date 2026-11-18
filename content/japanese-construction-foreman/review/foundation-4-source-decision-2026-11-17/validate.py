#!/usr/bin/env python3
"""Read-only source and gate check for Japanese Foreman Foundation 4."""

import hashlib
import json
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
record = json.loads((HERE / "decision.json").read_text())
assert record["schema"] == 1
assert record["pairKey"] == "Japanese:English"
assert record["stableLessonId"] == "foundation-construction-foreman:4:ja-en"
assert record["reviewed"] is False and not any(record["gates"].values())
assert len(record["cards"]) == 16 and len(record["reader"]) == 9

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

lesson = raw[source["curriculumPath"]]["lessons"][3]
reader = raw[source["readerPath"]]["lessons"]["4"]["passage"]
old = raw[source["japaneseDraftPath"]]["lessons"][3]
assert lesson["n"] == old["n"] == 4
assert record["archivedDraft"]["title"] == old["title"] == "Count the crew and boxes"
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

assert not any(x["japaneseDraft"] is None for x in record["cards"])
assert [x["position"] for x in record["reader"] if x["japaneseDraft"] is None] == [3]
assert "no glasses" in reader["native"][2]
assert "safety glasses" in reader["native"][3]
assert "harness for the roof" in reader["native"][4]
assert "40 pieces of 20-foot rebar" in lesson["words"][15]["en"]
assert "40 pieces of 20-foot rebar" in reader["native"][6]

metadata = json.loads((HERE / "ai-assistance-metadata.json").read_text())
assert metadata["actualModelCalls"] == [] and metadata["actualTokenUse"] == 0
assert metadata["qualifiedReview"] is False
print("PASS Japanese Foreman Foundation 4 exact source, PPE anchors, null and gates")
