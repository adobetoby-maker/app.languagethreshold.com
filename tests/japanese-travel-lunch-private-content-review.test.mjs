import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const script = "content/japanese-travel-lunch/build-private-content-review.py";

test("Japanese Lunch review packet covers 60 source-pinned lessons and fails on changed output", () => {
  const folder = mkdtempSync(join(tmpdir(), "lt-ja-lunch-review-"));
  const output = join(folder, "content-review.html");
  const evidencePath = join(folder, "evidence.json");
  const run = (...args) => spawnSync("python3", [script, "--output", output, "--evidence", evidencePath, ...args],
    { encoding: "utf8" });
  try {
    assert.equal(run().status, 0);
    assert.equal(run("--check").status, 0);
    const page = readFileSync(output, "utf8");
    const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
    assert.equal((page.match(/<section id=/g) ?? []).length, 60);
    assert.match(page, /Foundation 1: Greeting at a lunch counter/);
    assert.match(page, /Master 20:/);
    assert.match(page, /119番に電話して、救急車を呼んでください/);
    assert.equal(evidence.pairKey, "Japanese:English");
    assert.equal(evidence.reviewed, false);
    assert.equal(evidence.registered, false);
    assert.equal(evidence.lessons, 60);
    writeFileSync(output, `${page}changed`);
    assert.notEqual(run("--check").status, 0);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
