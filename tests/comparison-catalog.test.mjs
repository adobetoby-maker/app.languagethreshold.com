import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
const catalog = JSON.parse(readFileSync("src/data/comparison-catalog.generated.json", "utf8"));
test("public role counts and previews stay tied to the shipped curriculum", () => {
  execFileSync(process.execPath, ["scripts/marketing/build-comparison-catalog.mjs", "--check"], {
    stdio: "pipe",
  });
  const ids = new Set();
  for (const course of catalog.courses) {
    assert(!ids.has(course.id), `duplicate course ${course.id}`);
    ids.add(course.id);
    assert.equal(
      course.count,
      course.stages.reduce((sum, stage) => sum + stage.lessons.length, 0),
    );
    const core = course.stages.find((stage) => stage.id === course.id);
    assert(
      core?.lessons.some((l) => l.n === course.sample.n && l.title === course.sample.title),
      `sample is not a real core lesson: ${course.id}`,
    );
    if (course.sample.phrase?.audio) {
      assert.match(
        course.sample.phrase.audio,
        /^\/audio\/(spanish-next|native-v3)\/[a-z0-9-]+\.mp3$/,
      );
      assert(existsSync(`public${course.sample.phrase.audio}`));
    }
  }
});
test("medical, trade and sports courses are counted separately; coaching does not duplicate sports", () => {
  for (const id of [
    "roofing",
    "electrician",
    "nursing",
    "orthopedics",
    "ob-gyn",
    "pain-management",
    "family-medicine",
    "soccer",
    "baseball",
  ]) {
    const course = catalog.courses.find((c) => c.id === id);
    assert(course, id);
    assert.deepEqual(
      course.stages.map((s) => s.lessons.length),
      [10, 30, 20],
      id,
    );
  }
  assert.equal(catalog.courses.find((c) => c.id === "medical-mission-logistics").count, 30);
  assert.equal(catalog.courses.filter((c) => c.id === "soccer").length, 1);
});
