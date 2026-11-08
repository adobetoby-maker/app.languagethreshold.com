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

test("deployed scenario JSON resolves to its static file before the SSR catch-all", async () => {
  const { runInNewContext } = await import("node:vm");
  const source = readFileSync("scripts/vercel-adapter.mjs", "utf8");
  const configBlock = source.slice(source.indexOf("// Output config:"));
  let config;
  runInNewContext(configBlock, {
    out: ".vercel/output",
    process: { env: {} },
    assessmentCleanupSchedule: () => ({}),
    console: { log() {} },
    writeFileSync: (_path, text) => {
      config = JSON.parse(text);
    },
  });
  const catalog = JSON.parse(readFileSync("src/data/scenario-catalog.generated.json"));
  for (const module of catalog.modules) {
    const rule = config.routes.find((r) => new RegExp(`^${r.src}$`).test(module.path));
    assert(rule, module.path);
    const destination = module.path.replace(new RegExp(`^${rule.src}$`), rule.dest);
    assert.equal(destination, module.path, `SSR intercepted ${module.path}`);
    assert.doesNotThrow(() => JSON.parse(readFileSync(`public${destination}`)));
  }
});
