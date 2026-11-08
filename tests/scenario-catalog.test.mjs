import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
test("scenario catalog matches source and every practice link preserves its mission", () => {
  execFileSync(process.execPath, ["scripts/marketing/build-scenario-catalog.mjs", "--check"]);
  const catalog = JSON.parse(readFileSync("src/data/scenario-catalog.generated.json"));
  const ids = new Set();
  for (const module of catalog.modules) {
    const { missions } = JSON.parse(readFileSync(`public${module.path}`));
    assert.equal(missions.length, module.count);
    for (const task of missions) {
      assert(!ids.has(task.id));
      ids.add(task.id);
      const url = new URL(task.href, "https://app.languagethreshold.com");
      assert.equal(url.searchParams.get("mission"), task.id);
      assert.equal(
        url.searchParams.get("module"),
        module.id === "core-speaking" ? "core" : module.id,
      );
      assert.equal(url.searchParams.get("target"), "Spanish");
      assert(["A1", "A2", "B1"].includes(task.level));
      assert(task.objectives.length);
    }
    for (const [level, count] of Object.entries(module.levels)) {
      assert.equal(missions.filter((t) => t.level === level).length, count);
    }
  }
  assert.equal(ids.size, catalog.count);
  assert.equal(
    Object.values(catalog.levels).reduce((a, b) => a + b, 0),
    catalog.count,
  );
});
