import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { test } from "node:test";

const script = "scripts/generate-japanese-hd-audio.py";
const privateOutput = "/tmp/lt-japanese-audio-scope-test-nonexistent";

test("Japanese 101 Foundation 2 dry run pins only its 17 source strings", () => {
  const result = JSON.parse(
    execFileSync(
      "python3",
      [
        script,
        "--module",
        "foundation-japanese-basics",
        "--lesson",
        "2",
        "--output",
        privateOutput,
        "--limit",
        "20",
      ],
      { encoding: "utf8" },
    ),
  );
  assert.deepEqual(result.scope, { module: "foundation-japanese-basics", lesson: 2 });
  assert.equal(result.selectedTexts, 17);
  assert.equal(result.existingClips, 0);
  assert.equal(result.plannedClips, 20);
  assert.equal(result.paidSynthesis, false);
});

test("lesson batch refuses the accepted pilot output directory", () => {
  const result = spawnSync(
    "python3",
    [script, "--module", "foundation-japanese-basics", "--lesson", "2", "--limit", "1"],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /separate --output directory/);
});

test("lesson batch refuses an unsupported module", () => {
  const result = spawnSync(
    "python3",
    [script, "--module", "spanish-basics", "--lesson", "2", "--output", privateOutput],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unsupported Japanese 101 module/);
});
